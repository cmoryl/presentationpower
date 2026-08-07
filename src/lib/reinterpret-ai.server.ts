// AI reinterpretation planner (server-only logic).
//
// Given the raw copy of an imported PPTX deck, ask the model to re-author it in
// our design system: pick a native layout per slide from DESIGN_CATALOG and
// tighten the copy into TransPerfect voice. Grounded in the division knowledge
// base so re-written copy cannot drift from verified facts.

import { DESIGN_CATALOG } from "@/lib/reinterpret-design";
import { serializeBrandGuide } from "@/lib/ai-core";
import type { AiSlidePlan } from "@/lib/reinterpret-plan";
import type { GroundingCitation } from "@/lib/grounding-citations";

export type PlannerSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes?: string;
  imageCount: number;
  /** Variant the deterministic mapper chose — the planner's starting point. */
  currentVariantId: string;
};

export type PlannerResult = {
  plans: AiSlidePlan[];
  sources: GroundingCitation[];
  model: string;
  error?: string;
};

const MODEL = "google/gemini-2.5-flash";

const schema = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          variantId: { type: "string" },
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
          confidence: { type: "number" },
          sourceRefs: { type: "array", items: { type: "number" } },
        },
        required: ["index", "variantId", "rationale", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["slides"],
  additionalProperties: false,
};

export async function planReinterpretation(args: {
  supabase: unknown;
  divisionId?: string | null;
  deckTitle: string;
  slides: PlannerSlide[];
}): Promise<PlannerResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { plans: [], sources: [], model: MODEL, error: "AI is not configured" };

  const { safeGrounding } = await import("@/lib/knowledge-grounding.server");
  const { toCitations } = await import("@/lib/grounding-citations");

  const { block: grounding, snippets } = await safeGrounding({
    supabase: args.supabase,
    divisionId: args.divisionId ?? null,
    query: [args.deckTitle, ...args.slides.slice(0, 14).map((s) => s.title)]
      .filter(Boolean)
      .join(" "),
    limit: 8,
  });
  const sources = toCitations(snippets);

  const catalog = DESIGN_CATALOG.map(
    (d) => `${d.variantId} — ${d.name}: ${d.description.slice(0, 160)}`,
  ).join("\n");

  const system = [
    "You are the TransPerfect presentation art director. You re-author imported PowerPoint decks into our native design system.",
    args.divisionId ? serializeBrandGuide(args.divisionId) : "",
    grounding,
    "For EVERY slide you receive, choose the layout from the catalog below whose content shape the slide's copy genuinely satisfies, then tighten the copy for that layout.",
    "",
    "Layout catalog (choose `variantId` from this list only):",
    catalog,
    "",
    "Rules:",
    "- Never invent facts, figures, client names, or claims. Re-word only what the slide already says; a number may only change format, never value.",
    "- Keep every distinct idea from the source bullets. Merge only true duplicates.",
    "- Prefer a layout that matches the content's structure: numbers → stat layouts, dates/phases → sequence layouts, layered systems → architecture/pyramid, one long statement → editorial/manifesto, section title only → poster/divider.",
    "- Vary the layouts across the deck: never recommend the same variantId for two consecutive slides.",
    "- `title`: one clause, under 90 characters, sentence case, no hype words (unlock, revolutionize, seamless, leverage, game-changing).",
    "- `bullets`: short parallel phrases. For stat layouts write each bullet as \"<number><unit> — <label>\". For sequence layouts lead with the date/phase token.",
    "- `rationale`: one sentence naming the signal that drove the layout choice. A human reviewer reads this before approving.",
    "- `confidence`: 0–1, lower it when the copy only weakly fits the layout.",
    "- `sourceRefs`: excerpt numbers from the verified knowledge above that you relied on; empty array when none.",
    "- Return one entry per input slide, in order.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Deck: ${args.deckTitle}`,
    "Slides (JSON):",
    JSON.stringify(
      args.slides.map((s) => ({
        index: s.index,
        title: s.title,
        bullets: s.bullets,
        notes: (s.notes ?? "").slice(0, 400),
        images: s.imageCount,
        currentLayout: s.currentVariantId,
      })),
    ),
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_reinterpretation_plan",
              description: "Return the per-slide layout + copy plan.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_reinterpretation_plan" } },
      }),
    });

    if (res.status === 429)
      return { plans: [], sources, model: MODEL, error: "AI rate limit reached — try again shortly." };
    if (res.status === 402)
      return { plans: [], sources, model: MODEL, error: "AI credits exhausted." };
    if (!res.ok)
      return { plans: [], sources, model: MODEL, error: `AI planner failed (${res.status}).` };

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };
    const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return { plans: [], sources, model: MODEL, error: "AI returned no plan." };
    const parsed = JSON.parse(raw) as { slides?: AiSlidePlan[] };
    return { plans: Array.isArray(parsed.slides) ? parsed.slides : [], sources, model: MODEL };
  } catch (e) {
    return { plans: [], sources, model: MODEL, error: (e as Error).message };
  }
}
