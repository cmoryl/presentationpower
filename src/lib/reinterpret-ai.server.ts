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
  /** Deep-read evidence from the importer (see reinterpret-evidence.ts). */
  layoutName?: string;
  layoutSignature?: string;
  hidden?: boolean;
  hasAnimation?: boolean;
  textBlocks?: unknown[];
  charts?: unknown[];
  tables?: unknown[];
  diagrams?: unknown[];
  media?: unknown[];
  links?: string[];
  figures?: string[];
};

export type PlannerResult = {
  plans: AiSlidePlan[];
  sources: GroundingCitation[];
  model: string;
  error?: string;
};

const MODEL = "google/gemini-2.5-flash";

/** Slides per request — small batches keep every slide's evidence in focus. */
const BATCH = 5;


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
          /** What the slide is actually saying and doing, read from its evidence. */
          reading: { type: "string" },
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

type RawPlan = AiSlidePlan & { reading?: string };

function slidePayload(s: PlannerSlide) {
  return {
    index: s.index,
    sourceLayout: s.layoutName,
    placeholders: s.layoutSignature,
    hiddenSlide: s.hidden || undefined,
    animated: s.hasAnimation || undefined,
    title: s.title,
    bullets: s.bullets,
    // Full speaker notes: often the only place the argument is spelled out.
    speakerNotes: (s.notes ?? "").slice(0, 3000) || undefined,
    // Every text frame with its real position, size and emphasis, so the model
    // can read hierarchy (hero stat vs caption vs kicker) not just a bullet list.
    textFrames: s.textBlocks?.length ? s.textBlocks : undefined,
    charts: s.charts?.length ? s.charts : undefined,
    tables: s.tables?.length ? s.tables : undefined,
    diagrams: s.diagrams?.length ? s.diagrams : undefined,
    media: s.media?.length ? s.media : undefined,
    links: s.links?.length ? s.links : undefined,
    numbersOnSlide: s.figures?.length ? s.figures : undefined,
    images: s.imageCount,
    currentLayout: s.currentVariantId,
  };
}

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
    "You receive a DEEP READ of each source slide: its template layout, every text frame with position (stage %), font size and weight, the full speaker notes, chart categories/series/values, table headers and rows, SmartArt node hierarchies, media, links, and every number that appears on the slide.",
    "Interpret each slide individually and completely BEFORE choosing a layout. Work through it in this order:",
    "1. Read the text frames in position order — the largest, highest frame is usually the point of the slide; small low frames are captions, sources or footers.",
    "2. Read the speaker notes: they often carry the argument, the caveat, or the real headline.",
    "3. Read the data objects: chart series and table rows tell you what kind of comparison the slide is making (trend, share, ranking, before/after, process, hierarchy).",
    "4. Decide what this one slide is trying to prove, then pick the catalog layout whose structure carries that proof — never the layout that merely fits the word count.",
    "",
    "Layout catalog (choose `variantId` from this list only):",
    catalog,
    "",
    "Rules:",
    "- Never invent facts, figures, client names, or claims. Re-word only what the slide already says; a number may only change format, never value.",
    "- Keep every distinct idea in the slide — from bullets, text frames, tables, diagram nodes and notes. Merge only true duplicates. Continuation pages are authored downstream for anything that overflows, so never drop an idea to make it fit.",
    "- Use the deep read: a hero number in a large frame → stat layout; chart series → the matching chart/data layout; dated or numbered frames → sequence/timeline; nested diagram nodes → hierarchy/pyramid/process; one long statement in a big frame → editorial/manifesto; a title-only frame → poster/divider; 4+ images or logo copy → logo wall.",
    "- Vary the layouts across the deck: never recommend the same variantId for two consecutive slides.",
    "- `reading`: 1–2 sentences stating what the slide actually says and which evidence told you (frame sizes, notes, chart series, table rows).",
    "- `title`: one clause, under 90 characters, sentence case, no hype words (unlock, revolutionize, seamless, leverage, game-changing).",
    '- `bullets`: short parallel phrases carrying the slide\'s substance. For stat layouts write each bullet as "<number><unit> — <label>". For sequence layouts lead with the date/phase token.',
    "- `rationale`: one sentence naming the signal that drove the layout choice. A human reviewer reads this before approving.",
    "- `confidence`: 0–1, lower it when the evidence only weakly fits the layout.",
    "- `sourceRefs`: excerpt numbers from the verified knowledge above that you relied on; empty array when none.",
    "- Return one entry per input slide, in order.",
  ]
    .filter(Boolean)
    .join("\n");

  async function planBatch(batch: PlannerSlide[], firstOfDeck: boolean) {
    const user = [
      `Deck: ${args.deckTitle}`,
      firstOfDeck
        ? "This is the opening run of slides."
        : "These slides continue the same deck — keep the layout rhythm varied.",
      `Interpret each of these ${batch.length} slides in full depth. Slides (deep-read JSON):`,
      JSON.stringify(batch.map(slidePayload)),
    ].join("\n");

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
              description: "Return the per-slide reading, layout and copy plan.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_reinterpretation_plan" } },
      }),
    });

    if (!res.ok) return { plans: [] as RawPlan[], status: res.status };

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
      }>;
    };
    const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return { plans: [] as RawPlan[], status: 200 };
    const parsed = JSON.parse(raw) as { slides?: RawPlan[] };
    return { plans: Array.isArray(parsed.slides) ? parsed.slides : [], status: 200 };
  }

  try {
    const batches: PlannerSlide[][] = [];
    for (let i = 0; i < args.slides.length; i += BATCH) batches.push(args.slides.slice(i, i + BATCH));

    const all: RawPlan[] = [];
    let lastStatus = 200;
    for (let b = 0; b < batches.length; b++) {
      // Sequential: the gateway rate limit is shared, and each batch is a deep
      // read the model should not have to interleave with the next one.
      const out = await planBatch(batches[b]!, b === 0);
      lastStatus = out.status;
      if (out.status === 429 && all.length === 0)
        return {
          plans: [],
          sources,
          model: MODEL,
          error: "AI rate limit reached — try again shortly.",
        };
      if (out.status === 402 && all.length === 0)
        return { plans: [], sources, model: MODEL, error: "AI credits exhausted." };
      all.push(...out.plans);
    }

    if (all.length === 0)
      return {
        plans: [],
        sources,
        model: MODEL,
        error:
          lastStatus === 200 ? "AI returned no plan." : `AI planner failed (${lastStatus}).`,
      };

    // Fold the slide reading into the reviewer-visible rationale so the depth of
    // the interpretation is auditable in the approval panel.
    const plans: AiSlidePlan[] = all.map(({ reading, ...p }) => ({
      ...p,
      rationale: reading ? `${reading.trim()} ${(p.rationale ?? "").trim()}`.trim() : p.rationale,
    }));

    return { plans, sources, model: MODEL };
  } catch (e) {
    return { plans: [], sources, model: MODEL, error: (e as Error).message };
  }
}

