// Phase D · Conversational Deck Copilot
// A tool-using Claude agent that edits slides in a bounded in-memory copy
// and returns the changed slides + assistant reply.

import { createServerFn } from "@tanstack/react-start";
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
import {
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
} from "@/lib/taxonomy";
import { ICON_LIBRARY } from "@/lib/icon-library";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const SlideIn = z.object({
  index: z.number().int().nonnegative(),
  sectionId: z.string(),
  sectionName: z.string().optional(),
  variantId: z.string(),
  layoutId: z.string(),
  content: z.record(z.unknown()),
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
// Helpers
// ---------------------------------------------------------------------------

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const cur = out[k];
    if (
      v && typeof v === "object" && !Array.isArray(v) &&
      cur && typeof cur === "object" && !Array.isArray(cur)
    ) {
      out[k] = deepMerge(cur as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Flatten leaf values for numeric-guardrail scan.
function collectNumericLeaves(obj: unknown, out: string[] = []): string[] {
  if (obj == null) return out;
  if (typeof obj === "number") {
    out.push(String(obj));
    return out;
  }
  if (typeof obj === "string") {
    // pure-number-ish string (with optional %, commas, decimals, +/-)
    if (/^[-+]?\d[\d,]*(\.\d+)?%?$/.test(obj.trim())) out.push(obj.trim());
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v) => collectNumericLeaves(v, out));
    return out;
  }
  if (typeof obj === "object") {
    Object.values(obj).forEach((v) => collectNumericLeaves(v, out));
  }
  return out;
}

const NUMERIC_INTENT_RE = /\b(number|numeric|stat|metric|figure|percent|%|update.*(number|stat|percent)|change.*(number|stat|percent))\b/i;

function userMentionsNumbers(userMessage: string): boolean {
  return NUMERIC_INTENT_RE.test(userMessage) || /\d/.test(userMessage);
}

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
          description: "Optional — set the icon on content.items[itemIndex].icon instead of content.icon",
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
];

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const copilotTurn = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }): Promise<CopilotResult> => {
    if (!hasAnthropicKey()) return { ok: false, error: ANTHROPIC_SETUP_MESSAGE };

    // In-memory working copy the tools mutate.
    type WorkSlide = {
      index: number;
      sectionId: string;
      variantId: string;
      layoutId: string;
      content: Record<string, unknown>;
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
        originalNumerics: collectNumericLeaves(s.content),
      };
      originals.set(s.index, ws);
      return ws;
    });
    const findSlide = (idx: number) => working.find((s) => s.index === idx);

    const canTouchStats = userMentionsNumbers(data.userMessage);

    const executeTool = async (call: { name: string; input: Record<string, unknown> }): Promise<unknown> => {
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
          if (!patch || typeof patch !== "object") return { error: "patch must be an object" };
          const nextContent = deepMerge(s.content, patch);
          // Numeric guardrail: unless user asked for numeric edits, reject
          // patches that alter numeric leaves.
          if (!canTouchStats) {
            const nextNumerics = collectNumericLeaves(nextContent);
            const before = [...s.originalNumerics].sort().join("|");
            const after = [...nextNumerics].sort().join("|");
            if (before !== after) {
              return {
                error:
                  "Rejected: this patch would change numeric stats/dates but the user's message did not request numeric edits.",
              };
            }
          }
          s.content = nextContent;
          return { ok: true, index: idx };
        }
        case "set_slide_icon": {
          const idx = Number(call.input.index);
          const iconRef = String(call.input.iconRef ?? "").trim();
          const itemIndex = call.input.itemIndex;
          const s = findSlide(idx);
          if (!s) return { error: `No slide at index ${idx}` };
          if (!iconRef) return { error: "iconRef required" };
          if (typeof itemIndex === "number") {
            const items = Array.isArray(s.content.items) ? [...(s.content.items as Array<Record<string, unknown>>)] : [];
            if (itemIndex < 0 || itemIndex >= items.length) return { error: "itemIndex out of range" };
            items[itemIndex] = { ...items[itemIndex], icon: iconRef };
            s.content = { ...s.content, items };
          } else {
            s.content = { ...s.content, icon: iconRef };
          }
          return { ok: true };
        }
        case "search_icons": {
          const q = String(call.input.query ?? "").trim().toLowerCase();
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
        default:
          return { error: `Unknown tool: ${call.name}` };
      }
    };

    const brandBlock = [
      serializeBrandGuide(data.brandModeId),
      serializeBrandhubIntel(data.brandModeId),
      governanceBlock(),
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
    const changed: CopilotResult extends { ok: true; updatedSlides: infer U } ? U : never = [];
    const changedIndices: number[] = [];
    for (const s of working) {
      const o = originals.get(s.index)!;
      const contentChanged = !deepEqual(o.content, s.content) ||
        s.variantId !== data.slides.find((d) => d.index === s.index)!.variantId ||
        s.layoutId !== data.slides.find((d) => d.index === s.index)!.layoutId;
      if (contentChanged) {
        changed.push({
          index: s.index,
          variantId: s.variantId,
          layoutId: s.layoutId,
          content: s.content,
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
