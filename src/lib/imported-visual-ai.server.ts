// AI visual reader for imported decks (server-only).
//
// Two jobs, one model call per slide batch:
//
//  1. READ  — a slide whose data only exists as a picture (screenshot of a
//     chart, a dashboard export, an infographic) is sent to a vision model,
//     which reads the figures out of the image.
//  2. BUILD — a slide whose figures only exist in the copy gets a visual
//     designed for it, so the number stops being a bullet and becomes a chart.
//
// The model may only choose from our own visual modules, and every proposal is
// validated against that module's data contract before it is returned, so a
// proposal can never produce an empty chart.

import { visualModules, type VisualModuleDigest } from "@/lib/agent/data-visuals";
import { plottedFieldsFor, visualDataGap } from "@/lib/agent/visual-data-gaps";
import { serializeBrandGuide } from "@/lib/ai-core";

const MODEL = "google/gemini-2.5-flash";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type VisualReadSlide = {
  index: number;
  title?: string;
  bullets?: string[];
  notes?: string;
  figures?: string[];
  /** "image-graphic" | "stripped" | "stat-copy" — drives the instruction. */
  signal: string;
  /** Signed URLs for the slide's imagery (read by the vision pass). */
  imageUrls?: string[];
};

export type VisualProposal = {
  index: number;
  moduleId: string;
  moduleName: string;
  content: Record<string, unknown>;
  rationale: string;
  confidence: number;
  /** Where the numbers came from — shown to the reviewer before they accept. */
  source: "read-from-image" | "from-copy" | "placeholder";
  /** Figures the model could not source; the reviewer must supply them. */
  placeholders: string[];
  warnings: string[];
};

export type VisualReadResult = {
  proposals: VisualProposal[];
  model: string;
  error?: string;
};

/** Compact catalog: every module the model may choose, with its data contract. */
export function visualCatalogForPrompt(): string {
  return candidateModules()
    .map((m) => {
      const keys = plottedFieldsFor(m);
      return `${m.module_id} — ${m.name} (${m.family}${m.chart_kind ? `, ${m.chart_kind}` : ""}): ${m.what_it_shows.slice(0, 120)}
   plots: ${keys.join(", ") || "n/a"}
   shape: ${JSON.stringify(pickShape(m, keys))}`;
    })
    .join("\n");
}

function candidateModules(): VisualModuleDigest[] {
  return [...visualModules("data"), ...visualModules("process")];
}

/** Only the plotted keys of the example, so the prompt stays small. */
function pickShape(m: VisualModuleDigest, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = m.example_content[k];
    out[k] = Array.isArray(v) ? v.slice(0, 2) : v;
  }
  return out;
}

const schema = {
  type: "object",
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          moduleId: { type: "string" },
          contentJson: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" },
          placeholders: { type: "array", items: { type: "string" } },
        },
        required: ["index", "moduleId", "contentJson", "rationale", "confidence", "source"],
        additionalProperties: false,
      },
    },
  },
  required: ["slides"],
  additionalProperties: false,
};

function userContent(slides: VisualReadSlide[]) {
  const blocks: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: [
        "Slides to convert (JSON):",
        JSON.stringify(
          slides.map((s) => ({
            index: s.index,
            title: s.title ?? "",
            bullets: (s.bullets ?? []).slice(0, 14),
            notes: (s.notes ?? "").slice(0, 400),
            figures_found_in_copy: s.figures ?? [],
            signal: s.signal,
            images_attached: (s.imageUrls ?? []).length,
          })),
        ),
      ].join("\n"),
    },
  ];
  // Attach imagery per slide, labelled, so the model can attribute what it reads.
  for (const s of slides) {
    for (const url of (s.imageUrls ?? []).slice(0, 2)) {
      blocks.push({ type: "text", text: `Image for slide index ${s.index}:` });
      blocks.push({ type: "image_url", image_url: { url } });
    }
  }
  return blocks;
}

export async function readImportedVisuals(args: {
  divisionId?: string | null;
  deckTitle: string;
  slides: VisualReadSlide[];
}): Promise<VisualReadResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { proposals: [], model: MODEL, error: "AI is not configured" };
  if (args.slides.length === 0) return { proposals: [], model: MODEL };

  const system = [
    "You are the TransPerfect presentation art director. You convert the graphical content of an imported PowerPoint deck into our own live visual modules.",
    args.divisionId ? serializeBrandGuide(args.divisionId) : "",
    "",
    "For each slide, choose the module from the catalog whose data shape the slide's information genuinely fits, then write that module's plotted data.",
    "",
    "Module catalog (choose moduleId from this list only):",
    visualCatalogForPrompt(),
    "",
    "Rules:",
    "- `contentJson` is a JSON object string for the chosen module. It MUST contain every key listed under `plots:` for that module, using exactly the shape shown, with numbers written as numbers.",
    "- Read figures out of the attached image when one is provided (signal `image-graphic` or `stripped`): transcribe the axis labels, categories, series names and values you can actually see. Never guess a value you cannot read.",
    "- When the signal is `stat-copy`, build the visual from the figures already present in the slide copy. Keep the value exactly as written; only the format may change.",
    "- Never invent a number, client name, or claim that is not in the image or the copy. If a series needs a value you cannot source, write 0 and add a label suffixed \" — TBD\", then list that label in `placeholders`.",
    "- `source`: \"read-from-image\" when the values came from the picture, \"from-copy\" when they came from the text, \"placeholder\" when most values had to be stubbed.",
    "- Also write a short `title` in the content: one clause, sentence case, no hype words (unlock, revolutionize, seamless, leverage, game-changing).",
    "- Prefer variety across the batch: do not choose the same moduleId for two consecutive slides unless the data shape demands it.",
    "- `rationale`: one sentence naming what you saw and why that module fits. A human reviews this before accepting.",
    "- Return exactly one entry per input slide, in order.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent(args.slides) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_visual_proposals",
              description: "Return one visual module proposal per slide.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_visual_proposals" } },
      }),
    });

    if (res.status === 429)
      return { proposals: [], model: MODEL, error: "AI rate limit reached — try again shortly." };
    if (res.status === 402)
      return {
        proposals: [],
        model: MODEL,
        error: "AI credits exhausted — add credits in Lovable to keep converting visuals.",
      };
    if (!res.ok)
      return { proposals: [], model: MODEL, error: `Visual reader failed (${res.status}).` };

    const json = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return { proposals: [], model: MODEL, error: "AI returned no proposals." };

    const parsed = JSON.parse(raw) as {
      slides?: Array<{
        index: number;
        moduleId: string;
        contentJson: string;
        rationale: string;
        confidence: number;
        source: string;
        placeholders?: string[];
      }>;
    };

    const catalog = candidateModules();
    const proposals: VisualProposal[] = [];
    for (const p of parsed.slides ?? []) {
      const digest = catalog.find((m) => m.module_id === p.moduleId);
      if (!digest) continue;

      let content: Record<string, unknown> = {};
      try {
        const obj = JSON.parse(p.contentJson || "{}");
        if (obj && typeof obj === "object" && !Array.isArray(obj)) content = obj;
      } catch {
        // fall through — the gap check below reports it as unusable
      }

      const warnings: string[] = [];
      const gap = visualDataGap(digest.module_id, content);
      if (gap) warnings.push(...gap.problems);

      proposals.push({
        index: p.index,
        moduleId: digest.module_id,
        moduleName: digest.name,
        content,
        rationale: p.rationale ?? "",
        confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0)),
        source:
          p.source === "read-from-image" || p.source === "from-copy" || p.source === "placeholder"
            ? p.source
            : "placeholder",
        placeholders: (p.placeholders ?? []).slice(0, 12),
        warnings,
      });
    }

    return { proposals, model: MODEL };
  } catch (e) {
    return { proposals: [], model: MODEL, error: (e as Error).message };
  }
}
