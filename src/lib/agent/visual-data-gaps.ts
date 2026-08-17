// Deterministic "is this visual actually populated?" check.
//
// The agent could insert a chart module and only write text (title/kicker),
// which renders — and exports to PPTX — as an empty chart frame even though the
// narrative mentions figures. Nothing enforced the data contract, so this
// module derives the plotted keys for every data/process module from its real
// seed content and reports concrete gaps the agent must fill.

import { visualModules, validateVisualContent, type VisualModuleDigest } from "./data-visuals";

export type VisualDataGap = {
  module_id: string;
  module_name: string;
  family: "data" | "process";
  /** Content keys this module plots from; every one must carry real values. */
  plotted_fields: string[];
  /** The subset that is missing, empty, or all-zero right now. */
  empty_fields: string[];
  problems: string[];
  notes: string[];
  /** Real example content for this module — mirror these keys exactly. */
  example_content: Record<string, unknown>;
};

let cache: VisualModuleDigest[] | null = null;
function digests(): VisualModuleDigest[] {
  cache ??= visualModules("all");
  return cache;
}

export function visualDigestFor(variantId: string): VisualModuleDigest | null {
  return digests().find((d) => d.module_id === variantId) ?? null;
}

/** Keys that decorate a visual rather than plot it — never required. */
const OPTIONAL_KEYS = new Set([
  "legend",
  "axis",
  "scale",
  "segments",
  "callout",
  "source",
  "quadrants",
  "encoding",
  "pillars",
  "summary",
]);

/** True when a value carries at least one real (non-zero, non-empty) datum. */
function hasData(value: unknown, depth = 0): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.some((v) => hasData(v, depth + 1));
  if (typeof value === "object") {
    if (depth > 3) return false;
    return Object.values(value as Record<string, unknown>).some((v) => hasData(v, depth + 1));
  }
  return false;
}

/** True when a value carries at least one plottable, non-zero number. */
function hasNumber(value: unknown, depth = 0): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  // "99.98%", "$284K", "1.24" all count — a bare label does not.
  if (typeof value === "string") return /\d/.test(value) && Number.isFinite(Number(value.replace(/[^\d.-]/g, "")));
  if (Array.isArray(value)) return value.some((v) => hasNumber(v, depth + 1));
  if (value && typeof value === "object") {
    if (depth > 3) return false;
    return Object.values(value as Record<string, unknown>).some((v) => hasNumber(v, depth + 1));
  }
  return false;
}

/**
 * Keys a module plots from: anything the seed content expresses as a collection
 * (arrays of rows, numeric series) or as a nested object carrying such a
 * collection. Text-only keys (title, kicker, headline, source) never qualify.
 */
export function plottedFieldsFor(digest: VisualModuleDigest): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(digest.example_content)) {
    if (OPTIONAL_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      keys.push(key);
      continue;
    }
    if (value && typeof value === "object") {
      const nested = Object.values(value as Record<string, unknown>);
      if (nested.some((v) => Array.isArray(v))) keys.push(key);
    }
  }
  // capacity path wins if the taxonomy declared one explicitly
  const declared = digest.items_path?.split(".")[0];
  if (declared && !keys.includes(declared)) keys.unshift(declared);
  return keys;
}

/**
 * Returns null when the slide is not a visual module or is fully populated;
 * otherwise the concrete gap the agent has to close.
 */
export function visualDataGap(
  variantId: string,
  content: Record<string, unknown> | null | undefined,
): VisualDataGap | null {
  const digest = visualDigestFor(variantId);
  if (!digest) return null;

  const c = (content ?? {}) as Record<string, unknown>;
  const plotted = plottedFieldsFor(digest);
  if (plotted.length === 0) return null;

  const empty = plotted.filter((key) => !hasData(c[key]));
  // A data module whose plotted fields hold only labels is still an empty chart.
  const numberless =
    digest.family === "data" && empty.length === 0 && !plotted.some((key) => hasNumber(c[key]));
  if (empty.length === 0 && !numberless) return null;

  // The shared validator is advisory here: its row-count and nested-path checks
  // read the trimmed example content, so they must never gate on their own.
  const validation = validateVisualContent(digest.module_id, c);

  return {
    module_id: digest.module_id,
    module_name: digest.name,
    family: digest.family,
    plotted_fields: plotted,
    empty_fields: empty,
    problems: [
      ...(empty.length
        ? [
            `This visual renders nothing: ${empty
              .map((k) => `"${k}"`)
              .join(", ")} carries no values, so the chart/diagram exports as an empty frame. Write the real figures into those exact keys with update_slide_content.`,
          ]
        : []),
      ...(numberless
        ? [
            `This chart has labels but no figures: ${plotted
              .map((k) => `"${k}"`)
              .join(", ")} contain no numeric values, so nothing is plotted. Write the actual numbers as numbers.`,
          ]
        : []),
    ],
    notes: [...validation.problems, ...validation.notes],
    example_content: digest.example_content,
  };
}


export type SlideForAudit = {
  position: number;
  variant_id: string;
  content: Record<string, unknown> | null;
};

export type VisualAuditRow = { position: number } & VisualDataGap;

/** Every unpopulated visual in a deck, in slide order. */
export function auditVisualData(slides: SlideForAudit[]): {
  ok: boolean;
  visual_slides: number;
  unpopulated: VisualAuditRow[];
  instruction: string;
} {
  const unpopulated: VisualAuditRow[] = [];
  let visualSlides = 0;
  for (const slide of slides) {
    if (!visualDigestFor(slide.variant_id)) continue;
    visualSlides += 1;
    const gap = visualDataGap(slide.variant_id, slide.content);
    if (gap) unpopulated.push({ position: slide.position, ...gap });
  }
  return {
    ok: unpopulated.length === 0,
    visual_slides: visualSlides,
    unpopulated,
    instruction: unpopulated.length
      ? "Each slide listed above shows an empty chart or diagram on screen and in the PowerPoint export. For every one: take the figures already mentioned in the slide copy, the user's brief or search_knowledge, shape them exactly like example_content (same keys, same nesting, numeric values as numbers) and write them with update_slide_content. If a figure is genuinely unknown, use a visibly marked placeholder value rather than leaving the field empty, and tell the user which slides need real numbers. Re-run this audit until it returns ok."
      : "Every data and process visual in this deck carries real plotted values.",
  };
}
