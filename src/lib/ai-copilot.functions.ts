// Phase D · Conversational Deck Copilot
// A tool-using Claude agent that edits slides in a bounded in-memory copy
// and returns the changed slides + assistant reply.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ANTHROPIC_SETUP_MESSAGE,
  callAnthropicWithTools,
  governanceBlock,
  hasAnthropicKey,
  serializeBrandGuide,
  serializeBrandhubIntel,
  type AnthropicToolDef,
} from "@/lib/ai-core";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId, variantsForSection } from "@/lib/taxonomy";
import { ICON_LIBRARY } from "@/lib/icon-library";
import {
  applyContentPatch,
  applyIcon,
  collectNumericLeaves,
  deepEqual,
  resolveVariantSwap,
  userMentionsNumbers,
} from "@/lib/slide-ops";


// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const SlideIn = z.object({
  index: z.number().int().nonnegative(),
  sectionId: z.string(),
  sectionName: z.string().optional(),
  variantId: z.string(),
  layoutId: z.string(),
  content: z.record(z.string(), z.unknown()),
  notes: z.string().optional(),
});

const ChatMsg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const Input = z.object({
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  brief: z
    .object({
      prospect: z.string().optional(),
      industry: z.string().optional(),
      audience: z.string().optional(),
      meetingObjective: z.string().optional(),
    })
    .optional(),
  strategy: z
    .object({
      narrativeArc: z.string().optional(),
      openingHook: z.string().optional(),
      closingAsk: z.string().optional(),
    })
    .optional(),
  slides: z.array(SlideIn).min(1),
  messages: z.array(ChatMsg).max(30).optional(),
  userMessage: z.string().min(1).max(2000),
});

export type CopilotInput = z.infer<typeof Input>;

export type CopilotUpdatedSlide = {
  index: number;
  variantId: string;
  layoutId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  notes?: string;
};

export type CopilotResult =
  | {
      ok: true;
      reply: string;
      updatedSlides: CopilotUpdatedSlide[];
      changedIndices: number[];
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers — merge/guardrail/variant logic lives in @/lib/slide-ops so the MCP
// tools apply exactly the same rules to persisted slides.
// ---------------------------------------------------------------------------


function copilotInstructions(userMessage: string): string {
  const canTouchStats = userMentionsNumbers(userMessage);
  return [
    "# Copilot Instructions",
    "You are the TransPerfect deck copilot. Obey the brand voice and governance.",
    "- Prefer the smallest edit that satisfies the user's ask. Never rewrite unrelated content.",
    "- Use tools to inspect and edit slides. Never invent slides that don't exist.",
    "- update_slide_content merges shallowly (deep-merge on objects). Only include the fields you're changing.",
    "- Never alter numeric stats, dates, currency values, or citations unless the user's message explicitly asks for it.",
    canTouchStats
      ? "- The user's message references numbers/stats, so numeric edits are permitted where clearly requested."
      : "- The current user message does NOT mention numbers/stats — leave every numeric leaf value unchanged.",
    "- When a request is ambiguous (which slide? which item?), ask a short clarifying question instead of guessing.",
    "- Ground every factual claim, stat, client name, or capability statement in the retrieved knowledge below or in search_knowledge results. Call search_knowledge before writing new copy that asserts a fact.",
    "- If the knowledge base has nothing on a claim, say so in your reply rather than inventing it.",
    "- For icon changes: prefer curated names (e.g. 'Rocket', 'ShieldCheck'). You may also return 'pack:name' refs from search_icons.",
    "- Variant swaps must be valid for the slide's sectionId; use list_taxonomy_variants first if unsure.",
    "- Keep the final reply short (1-3 sentences) summarizing what you changed and why.",
    `\n# Current user turn\n${userMessage}`,

  ].join("\n");
}

const TOOLS: AnthropicToolDef[] = [
  {
    name: "get_slide",
    description: "Return the full current content of a slide by 0-based index.",
    input_schema: {
      type: "object",
      properties: { index: { type: "integer", minimum: 0 } },
      required: ["index"],
    },
  },
  {
    name: "update_slide_content",
    description:
      "Merge a partial patch into the slide's content (deep merge on objects). Only include changed fields.",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "integer", minimum: 0 },
        patch: { type: "object", description: "Partial content object to merge" },
      },
      required: ["index", "patch"],
    },
  },
  {
    name: "set_slide_icon",
    description:
      "Set the icon on the slide's top-level content.icon field. iconRef is a curated name (e.g. 'Rocket') or 'pack:name'.",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "integer", minimum: 0 },
        iconRef: { type: "string" },
        itemIndex: {
          type: "integer",
          minimum: 0,
          description:
            "Optional — set the icon on content.items[itemIndex].icon instead of content.icon",
        },
      },
      required: ["index", "iconRef"],
    },
  },
  {
    name: "search_icons",
    description: "Fuzzy-search the curated icon library. Returns up to `limit` matches.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 25 },
      },
      required: ["query"],
    },
  },
  {
    name: "list_taxonomy_variants",
    description: "List permitted module variants for a sectionId (e.g. SF-06).",
    input_schema: {
      type: "object",
      properties: { sectionId: { type: "string" } },
      required: ["sectionId"],
    },
  },
  {
    name: "change_slide_variant",
    description:
      "Change the slide's variantId (must be valid for its section). Layout auto-corrects to a permitted one. Content is preserved where possible.",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "integer", minimum: 0 },
        variantId: { type: "string" },
      },
      required: ["index", "variantId"],
    },
  },
  {
    name: "update_slide_notes",
    description:
      "Set the private speaker notes for a slide. Notes are free text used only during presenter mode and PPTX export; they never appear on the slide itself.",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "integer", minimum: 0 },
        notes: { type: "string", description: "Full speaker notes text. Replaces existing notes." },
      },
      required: ["index", "notes"],
    },
  },
  {
    name: "search_knowledge",
    description:
      "Search the division-scoped knowledge base (knowledge entries, brand intel, uploaded brand assets) for verified facts, stats, proof points, and client references. Use before asserting any fact.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you need facts about." },
        limit: { type: "integer", minimum: 1, maximum: 12 },
      },
      required: ["query"],
    },
  },
];


// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const copilotTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data, context: authContext }): Promise<CopilotResult> => {
    if (!hasAnthropicKey()) return { ok: false, error: ANTHROPIC_SETUP_MESSAGE };

    const { retrieveGrounding, formatGroundingBlock } = await import(
      "@/lib/knowledge-grounding.server"
    );


    // In-memory working copy the tools mutate.
    type WorkSlide = {
      index: number;
      sectionId: string;
      variantId: string;
      layoutId: string;
      content: Record<string, unknown>;
      notes: string;
      originalNumerics: string[];
    };
    const originals = new Map<number, WorkSlide>();
    const working: WorkSlide[] = data.slides.map((s) => {
      const ws: WorkSlide = {
        index: s.index,
        sectionId: s.sectionId,
        variantId: s.variantId,
        layoutId: s.layoutId,
        content: structuredClone(s.content) as Record<string, unknown>,
        notes: s.notes ?? "",
        originalNumerics: collectNumericLeaves(s.content),
      };
      originals.set(s.index, { ...ws, content: structuredClone(ws.content) });
      return ws;
    });

    const findSlide = (idx: number) => working.find((s) => s.index === idx);

    const canTouchStats = userMentionsNumbers(data.userMessage);

    const executeTool = async (call: {
      name: string;
      input: Record<string, unknown>;
    }): Promise<unknown> => {
      switch (call.name) {
        case "get_slide": {
          const idx = Number(call.input.index);
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          return {
            index: s.index,
            sectionId: s.sectionId,
            variantId: s.variantId,
            layoutId: s.layoutId,
            variantName: byId(MODULE_VARIANTS, s.variantId)?.name,
            content: s.content,
          };
        }
        case "update_slide_content": {
          const idx = Number(call.input.index);
          const patch = (call.input.patch ?? {}) as Record<string, unknown>;
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          const merged = applyContentPatch(s.content, patch, {
            allowNumericEdits: canTouchStats,
            baselineNumerics: s.originalNumerics,
          });
          if (!merged.ok) return { error: merged.error };
          s.content = merged.value;
          return { ok: true, index: idx };
        }
        case "set_slide_icon": {
          const idx = Number(call.input.index);
          const itemIndex = call.input.itemIndex;
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          const next = applyIcon(
            s.content,
            String(call.input.iconRef ?? ""),
            typeof itemIndex === "number" ? itemIndex : undefined,
          );
          if (!next.ok) return { error: next.error };
          s.content = next.value;
          return { ok: true };
        }

        case "search_icons": {
          const q = String(call.input.query ?? "")
            .trim()
            .toLowerCase();
          const limit = Math.max(1, Math.min(25, Number(call.input.limit) || 10));
          if (!q) return { results: [] };
          const hits = ICON_LIBRARY.filter(
            (i) => i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q),
          )
            .slice(0, limit)
            .map((i) => ({ name: i.name, label: i.label, group: i.group }));
          return { results: hits };
        }
        case "list_taxonomy_variants": {
          const sectionId = String(call.input.sectionId ?? "");
          const sf = byId(SECTION_FRAMEWORKS, sectionId);
          if (!sf) return { error: `Unknown sectionId ${sectionId}` };
          return {
            sectionId,
            sectionName: sf.name,
            variants: variantsForSection(sectionId).map((v) => ({
              id: v.id,
              name: v.name,
              description: v.description,
              permittedLayoutIds: v.permittedLayoutIds,
            })),
          };
        }
        case "change_slide_variant": {
          const idx = Number(call.input.index);
          const variantId = String(call.input.variantId ?? "");
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          const permitted = variantsForSection(s.sectionId);
          const next = permitted.find((v) => v.id === variantId);
          if (!next) {
            return {
              error: `Variant ${variantId} not permitted for section ${s.sectionId}. Call list_taxonomy_variants first.`,
            };
          }
          s.variantId = variantId;
          if (!next.permittedLayoutIds.includes(s.layoutId)) {
            s.layoutId = next.permittedLayoutIds[0];
          }
          return { ok: true, variantId, layoutId: s.layoutId };
        }
        case "update_slide_notes": {
          const idx = Number(call.input.index);
          const notes = String(call.input.notes ?? "");
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          s.notes = notes;
          return { ok: true, index: idx, length: notes.length };
        }
        case "search_knowledge": {
          const query = String(call.input.query ?? "").trim();
          if (!query) return { error: "query required" };
          const limit = Math.max(1, Math.min(12, Number(call.input.limit) || 6));
          try {
            const { snippets, divisionScoped } = await retrieveGrounding({
              supabase: authContext.supabase,
              divisionId: data.brandModeId,
              query,
              limit,
            });
            return {
              divisionScoped,
              results: snippets.map((s) => ({
                source: s.source,
                title: s.title,
                body: s.body,
                tags: s.tags,
              })),
            };
          } catch (e) {
            return { error: `Knowledge lookup failed: ${(e as Error).message}` };
          }
        }

        default:
          return { error: `Unknown tool: ${call.name}` };
      }
    };

    // Upfront grounding: retrieve division-scoped facts for the current turn so
    // the model starts from verified knowledge, not just static guide text.
    let groundingBlock = "";
    try {
      const { snippets } = await retrieveGrounding({
        supabase: authContext.supabase,
        divisionId: data.brandModeId,
        query: [
          data.userMessage,
          data.brief?.prospect,
          data.brief?.industry,
          data.brief?.audience,
          data.brief?.meetingObjective,
          data.strategy?.narrativeArc,
        ]
          .filter(Boolean)
          .join(" "),
        limit: 8,
      });
      groundingBlock = formatGroundingBlock(snippets);
    } catch {
      // Fail soft — the copilot still runs on brand guide + governance.
    }

    const brandBlock = [
      serializeBrandGuide(data.brandModeId),
      serializeBrandhubIntel(data.brandModeId),
      governanceBlock(),
      groundingBlock,
      data.subCompany ? `# Sub-company\n${data.subCompany}` : "",
      data.brief
        ? `# Brief\n- Prospect: ${data.brief.prospect ?? "—"}\n- Industry: ${data.brief.industry ?? "—"}\n- Audience: ${data.brief.audience ?? "—"}\n- Objective: ${data.brief.meetingObjective ?? "—"}`
        : "",
      data.strategy
        ? `# Strategy\n- Arc: ${data.strategy.narrativeArc ?? "—"}\n- Hook: ${data.strategy.openingHook ?? "—"}\n- Ask: ${data.strategy.closingAsk ?? "—"}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");


    // Compact slide summary for context (Claude reads full via get_slide).
    const slideSummary = working
      .map((s) => {
        const v = byId(MODULE_VARIANTS, s.variantId);
        const title = typeof s.content.title === "string" ? s.content.title : "";
        return `#${s.index} · ${s.sectionId} · ${v?.name ?? s.variantId}${title ? ` — "${title}"` : ""}`;
      })
      .join("\n");

    const historyMessages = (data.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await callAnthropicWithTools(
      [brandBlock, copilotInstructions(data.userMessage)],
      [
        ...historyMessages,
        {
          role: "user",
          content: `Deck outline (${working.length} slides):\n${slideSummary}\n\nRequest: ${data.userMessage}`,
        },
      ],
      TOOLS,
      executeTool,
      { maxIterations: 6, maxTokens: 4096, temperature: 0.2 },
    );

    if (!result.ok) {
      return { ok: false, error: `Anthropic error ${result.status}: ${result.body}` };
    }

    // Diff working vs originals.
    const changed: CopilotUpdatedSlide[] = [];
    const changedIndices: number[] = [];
    for (const s of working) {
      const o = originals.get(s.index)!;
      const orig = data.slides.find((d) => d.index === s.index)!;
      const notesChanged = s.notes !== (orig.notes ?? "");
      const changedAny =
        !deepEqual(o.content, s.content) ||
        s.variantId !== orig.variantId ||
        s.layoutId !== orig.layoutId ||
        notesChanged;
      if (changedAny) {
        changed.push({
          index: s.index,
          variantId: s.variantId,
          layoutId: s.layoutId,
          content: s.content,
          notes: notesChanged ? s.notes : undefined,
        });
        changedIndices.push(s.index);
      }
    }

    return {
      ok: true,
      reply: result.text || "Done.",
      updatedSlides: changed,
      changedIndices,
    };
  });
