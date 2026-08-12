// Post-swap AI refit (server-only logic).
//
// When a user manually swaps a slide onto a different module variant, the
// deterministic merge in `swapVariant` only carries over keys the two layouts
// happen to share. Everything else falls back to seeded placeholder copy, and
// anything the author parked in speaker notes never lands on the slide at all.
//
// This planner takes the slide's *whole* payload — the post-swap content shape,
// the pre-swap content it came from, and the speaker notes — and re-authors it
// into the target layout's field structure. It only ever moves or re-words copy
// that already exists on the slide; it never invents facts.

import { serializeBrandGuide } from "@/lib/ai-core";
import type { GroundingCitation } from "@/lib/grounding-citations";

export type RefitRequest = {
  supabase: unknown;
  divisionId?: string | null;
  deckTitle: string;
  /** Target module the user just switched to. */
  variantId: string;
  variantName: string;
  variantDescription: string;
  /** Capacity envelope from the taxonomy (items min/max, char budgets). */
  capacity: Record<string, unknown>;
  editableFields: string[];
  /** Content AFTER the swap — defines the exact key shape to return. */
  templateContent: Record<string, unknown>;
  /** Content BEFORE the swap — the authored source of truth. */
  sourceContent: Record<string, unknown>;
  /** Speaker notes; often holds detail that belongs on the slide. */
  notes?: string;
};

export type RefitResult = {
  content?: Record<string, unknown>;
  summary?: string;
  usedNotes?: boolean;
  sources: GroundingCitation[];
  model: string;
  error?: string;
};

const MODEL = "google/gemini-2.5-flash";

const schema = {
  type: "object",
  properties: {
    // The re-authored slide content, serialized as JSON so any variant shape
    // round-trips without a per-variant schema.
    contentJson: { type: "string" },
    summary: { type: "string" },
    usedNotes: { type: "boolean" },
  },
  required: ["contentJson", "summary", "usedNotes"],
  additionalProperties: false,
};

function clip(value: unknown, max = 6000): string {
  try {
    const str = JSON.stringify(value ?? {});
    return str.length > max ? `${str.slice(0, max)}…` : str;
  } catch {
    return "{}";
  }
}

export async function refitSlideContent(args: RefitRequest): Promise<RefitResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { sources: [], model: MODEL, error: "AI is not configured" };

  const { safeGrounding } = await import("@/lib/knowledge-grounding.server");
  const { toCitations } = await import("@/lib/grounding-citations");

  const { block: grounding, snippets } = await safeGrounding({
    supabase: args.supabase,
    divisionId: args.divisionId ?? null,
    query: [args.deckTitle, String(args.sourceContent["title"] ?? ""), args.notes ?? ""]
      .filter(Boolean)
      .join(" ")
      .slice(0, 600),
    limit: 6,
  });
  const sources = toCitations(snippets);

  const system = [
    "You are the TransPerfect presentation art director. A human has just switched one slide onto a different layout module. Your job is to re-fit everything the slide already knows into that module's field structure so nothing is lost and no placeholder copy survives.",
    args.divisionId ? serializeBrandGuide(args.divisionId) : "",
    grounding,
    "",
    `Target module: ${args.variantId} — ${args.variantName}. ${args.variantDescription}`,
    `Capacity envelope: ${clip(args.capacity, 600)}`,
    `Editable fields: ${args.editableFields.join(", ") || "(unspecified)"}`,
    "",
    "Rules:",
    "- Return `contentJson`: a JSON object using EXACTLY the keys present in the template content. Never add keys, never drop keys.",
    "- Preserve key types: a string stays a string, an array of objects stays an array of objects with the same sub-keys.",
    "- Populate every field with real slide material. Replace any seeded placeholder copy that survived the swap.",
    "- Source priority: the pre-swap content first, then the speaker notes. Notes routinely hold detail the author never got onto the slide — mine them for labels, step bodies, stats and supporting lines that the new layout has room for.",
    "- Never invent facts, figures, client names, dates or claims. Re-word and re-shape only what the slide or its notes already state. A number may change format, never value.",
    "- Respect the capacity envelope: trim to the item maximum by merging the weakest items, and pad up to the minimum only from real source material — if there is not enough, use fewer items rather than inventing any.",
    "- Keep imagery, video and path fields (mediaUrl, mediaSeed, mediaPath, video*) byte-identical to the template; never rewrite a URL or storage path.",
    "- Titles: one clause, sentence case, under 90 characters, no hype words (unlock, revolutionize, seamless, leverage, game-changing).",
    "- Bodies and item labels: short parallel phrases inside the field's char budget.",
    "- `summary`: one sentence for the reviewer naming what moved where (e.g. which notes detail became which field).",
    "- `usedNotes`: true only when speaker-note material actually landed in the returned content.",
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    `Deck: ${args.deckTitle}`,
    `Template content (target key shape, post-swap): ${clip(args.templateContent)}`,
    `Source content (pre-swap, authored): ${clip(args.sourceContent)}`,
    `Speaker notes: ${(args.notes ?? "").slice(0, 4000) || "(none)"}`,
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
              name: "return_refit_content",
              description: "Return the re-authored slide content for the target module.",
              parameters: schema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_refit_content" } },
      }),
    });

    if (res.status === 429)
      return { sources, model: MODEL, error: "AI rate limit reached — try again shortly." };
    if (res.status === 402) return { sources, model: MODEL, error: "AI credits exhausted." };
    if (!res.ok) return { sources, model: MODEL, error: `AI refit failed (${res.status}).` };

    const json = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return { sources, model: MODEL, error: "AI returned no content." };

    const parsed = JSON.parse(raw) as {
      contentJson?: string;
      summary?: string;
      usedNotes?: boolean;
    };
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(parsed.contentJson ?? "{}") as Record<string, unknown>;
    } catch {
      return { sources, model: MODEL, error: "AI returned malformed content." };
    }

    // Hard guard: only template keys survive, and media/video/path fields are
    // restored from the template so the model can never rewrite a storage path.
    const safe: Record<string, unknown> = { ...args.templateContent };
    for (const key of Object.keys(args.templateContent)) {
      if (/^(media|video)/i.test(key) || /(Url|Path)$/.test(key)) continue;
      if (content[key] !== undefined) safe[key] = content[key];
    }

    return {
      content: safe,
      summary: parsed.summary ?? "",
      usedNotes: Boolean(parsed.usedNotes),
      sources,
      model: MODEL,
    };
  } catch (e) {
    return { sources, model: MODEL, error: (e as Error).message };
  }
}
