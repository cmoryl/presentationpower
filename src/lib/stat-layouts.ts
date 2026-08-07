// Stat typography layouts.
//
// A statistic is composed as a *figure*: the numeral is the primary shape and
// the geometry around it is drawn in relation to its optical box. This module
// owns two things:
//
//   1. `StatShape` — the catalog of typographic shape presets (with authoring
//      metadata so pickers can render a labelled list).
//   2. Per-module layout config — an intentional default layout for each slide
//      module, plus the resolution order that lets a deck, a slide or a single
//      tile override it.
//
// Kept dependency-free (no React, no DOM) so exporters, tests and pickers can
// all read the same source of truth. `StatFigure` in
// `src/components/slide/primitives.tsx` draws these.

export type StatShape =
  | "auto"
  | "none"
  | "ghost"
  | "rule"
  | "slab"
  | "notch"
  | "column"
  | "arc"
  // ── added presets ──
  | "spine"
  | "bracket"
  | "dial"
  | "strike"
  | "frame"
  | "ledger"
  | "steps"
  | "stack";

export type StatShapePreset = {
  id: StatShape;
  label: string;
  /** One-line authoring description shown in pickers. */
  description: string;
  /** Reads best when a 0..1 `progress` value is supplied. */
  usesProgress?: boolean;
  /** Grouping for pickers. */
  family: "baseline" | "counterform" | "gauge" | "frame" | "editorial";
};

export const STAT_SHAPE_PRESETS: StatShapePreset[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Deck default: ghost counterform behind the numeral + accent baseline rule.",
    family: "baseline",
  },
  {
    id: "none",
    label: "Pure type",
    description: "No geometry — the numeral carries the whole figure.",
    family: "baseline",
  },
  {
    id: "ghost",
    label: "Ghost counterform",
    description: "Oversized outlined numeral behind the ink, read as texture.",
    family: "counterform",
  },
  {
    id: "rule",
    label: "Baseline rule",
    description: "Heavy accent rule under the numeral, length keyed to the value.",
    family: "baseline",
  },
  {
    id: "slab",
    label: "Accent slab",
    description: "Accent slab set across the numeral's lower third, plus a progress track.",
    family: "counterform",
    usesProgress: true,
  },
  {
    id: "notch",
    label: "Cap notches",
    description: "Bracket notches framing the numeral's cap line.",
    family: "frame",
  },
  {
    id: "column",
    label: "Progress column",
    description: "Thin progress track beneath the numeral.",
    family: "gauge",
    usesProgress: true,
  },
  {
    id: "arc",
    label: "Semicircular gauge",
    description: "Half-round gauge with the numeral seated in its counter.",
    family: "gauge",
    usesProgress: true,
  },
  {
    id: "spine",
    label: "Edge spine",
    description: "Vertical accent spine on the leading edge — reads as an editorial rail.",
    family: "editorial",
  },
  {
    id: "bracket",
    label: "Brackets",
    description: "Heavy accent brackets hugging the numeral left and right.",
    family: "frame",
  },
  {
    id: "dial",
    label: "Ring dial",
    description: "Full circular ring behind the numeral, swept by the progress value.",
    family: "gauge",
    usesProgress: true,
  },
  {
    id: "strike",
    label: "Midline strike",
    description: "Accent line struck through the numeral's midline.",
    family: "counterform",
  },
  {
    id: "frame",
    label: "Hairline frame",
    description: "Thin accent frame around the figure's optical box.",
    family: "frame",
  },
  {
    id: "ledger",
    label: "Editorial ledger",
    description: "Full-width hairline ledger with an accent tick under the numeral's start.",
    family: "editorial",
  },
  {
    id: "steps",
    label: "Stepped bars",
    description: "Five stepped bars beneath the numeral, filled by the progress value.",
    family: "gauge",
    usesProgress: true,
  },
  {
    id: "stack",
    label: "Editorial stack",
    description: "Hairline divider above the numeral with the label stacked as a masthead.",
    family: "editorial",
  },
];

export const STAT_SHAPES: StatShape[] = STAT_SHAPE_PRESETS.map((p) => p.id);

export function statShapePreset(shape: StatShape): StatShapePreset {
  return STAT_SHAPE_PRESETS.find((p) => p.id === shape) ?? STAT_SHAPE_PRESETS[0];
}

export function isStatShape(value: unknown): value is StatShape {
  return typeof value === "string" && (STAT_SHAPES as string[]).includes(value);
}

export type StatLayout = {
  shape: StatShape;
  /** Optical alignment of the figure inside its tile. */
  align?: "start" | "center";
  /** 0..1 fallback sweep for gauge/track shapes when the data has no ratio. */
  progress?: number;
};

export const DEFAULT_STAT_LAYOUT: StatLayout = { shape: "auto", align: "start" };

/**
 * Intentional per-module stat typography. Each module gets the treatment that
 * suits its composition rather than every deck defaulting to `auto`:
 * hero figures get counterform texture, KPI rails get tracks, matrices get
 * quiet ledgers so dozens of figures don't fight each other.
 */
export const MODULE_STAT_LAYOUTS: Record<string, StatLayout> = {
  // Hero / monumental figures — the numeral is the slide.
  "MV-STAT-HERO-NUMBER": { shape: "ghost", align: "start" },
  "MV-ED-HERO-BLEED": { shape: "spine", align: "start" },
  "MV-ED-HERO-ORB": { shape: "dial", align: "center", progress: 0.68 },
  "MV-INS-BIG-IDEA": { shape: "ghost", align: "start" },
  "MV-CLOSE-METRIC-PROMISE": { shape: "bracket", align: "center" },

  // Typographic walls / mosaics — quiet geometry, lots of figures.
  "MV-STAT-TYPE-WALL": { shape: "ledger", align: "start" },
  "MV-STAT-MOSAIC": { shape: "strike", align: "start" },
  "MV-NUMBERS-TRIPTYCH": { shape: "stack", align: "center" },
  "MV-BENTO-5": { shape: "ledger", align: "start" },
  "MV-CLIENT-MATRIX": { shape: "ledger", align: "start" },
  "MV-DEC-MATRIX": { shape: "frame", align: "start" },
  "MV-MATRIX-2X2": { shape: "frame", align: "start" },

  // Rails, dashboards and gauges — tracks and dials carry the ratio.
  "MV-STAT-KPI-RAIL": { shape: "column", align: "start", progress: 0.72 },
  "MV-KPI-DASHBOARD": { shape: "column", align: "start", progress: 0.72 },
  "MV-STAT-ACTUAL-TARGET": { shape: "steps", align: "start", progress: 0.64 },
  "MV-STAT-ORBIT": { shape: "dial", align: "center", progress: 0.7 },
  "MV-DASH-GAUGE-ROW": { shape: "arc", align: "center", progress: 0.66 },
  "MV-DASH-PERFORMANCE": { shape: "column", align: "start", progress: 0.7 },
  "MV-DASH-SUMMARY": { shape: "rule", align: "start" },
  "MV-DASH-REGION-STATS": { shape: "steps", align: "start", progress: 0.6 },
  "MV-DASH-REPORT-CARDS": { shape: "frame", align: "start" },
  "MV-DASH-BREAKDOWN": { shape: "column", align: "start", progress: 0.6 },
  "MV-LOC-WORLD-STATS": { shape: "steps", align: "start", progress: 0.58 },

  // Editorial / photography compositions — no busy geometry over media.
  "MV-STAT-EDITORIAL-DASH": { shape: "ledger", align: "start" },
  "MV-STAT-IMAGE-TYPE": { shape: "none", align: "start" },
  "MV-ED-STAT-PHOTO": { shape: "spine", align: "start" },
  "MV-IMG-STAT-CALLOUT": { shape: "spine", align: "start" },
  "MV-QUOTE-METRIC": { shape: "stack", align: "start" },
  "MV-PROOF-TESTIMONIAL": { shape: "none", align: "start" },

  // Proof / context stat grids.
  "MV-PROOF-STATS-2": { shape: "rule", align: "start" },
  "MV-PROOF-STATS-3": { shape: "rule", align: "start" },
  "MV-PROOF-STATS-4": { shape: "notch", align: "start" },
  "MV-CTX-STAT-GRID": { shape: "notch", align: "start" },
  "MV-CTX-COST": { shape: "slab", align: "start", progress: 0.78 },
  "MV-CTX-TREND": { shape: "column", align: "start", progress: 0.66 },
  "MV-CASE-METRICS": { shape: "bracket", align: "start" },
  "MV-INS-OPPORTUNITY-SIZE": { shape: "ghost", align: "start" },
};

/** Family-level fallbacks applied when a module has no explicit entry. */
const FAMILY_STAT_LAYOUTS: Array<[string, StatLayout]> = [
  ["MV-STAT-", { shape: "ledger", align: "start" }],
  ["MV-DASH-", { shape: "column", align: "start", progress: 0.68 }],
  ["MV-KPI-", { shape: "column", align: "start", progress: 0.72 }],
  ["MV-VIZ-", { shape: "rule", align: "start" }],
  ["MV-ED-", { shape: "spine", align: "start" }],
  ["MV-PROOF-", { shape: "rule", align: "start" }],
];

/** The intentional layout for a module id (never null — falls back to auto). */
export function statLayoutForVariant(variantId?: string | null): StatLayout {
  if (!variantId) return DEFAULT_STAT_LAYOUT;
  const exact = MODULE_STAT_LAYOUTS[variantId];
  if (exact) return exact;
  const family = FAMILY_STAT_LAYOUTS.find(([prefix]) => variantId.startsWith(prefix));
  return family ? family[1] : DEFAULT_STAT_LAYOUT;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Parse an authored layout fragment (slide content / tile content). */
export function parseStatLayout(input: unknown): Partial<StatLayout> | null {
  if (!input) return null;
  if (isStatShape(input)) return { shape: input };
  if (typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const raw = o.statShape ?? o.shape;
  const out: Partial<StatLayout> = {};
  if (isStatShape(raw)) out.shape = raw;
  if (o.align === "center" || o.align === "start") out.align = o.align;
  const prog = o.statProgress ?? o.progress;
  if (typeof prog === "number" && Number.isFinite(prog)) out.progress = clamp01(prog);
  return Object.keys(out).length ? out : null;
}

/**
 * Resolution order (last wins): module default → slide content override →
 * per-tile override. Lets a deck keep intentional module defaults while a
 * single tile opts into a different typographic layout.
 */
export function resolveStatLayout(
  variantId?: string | null,
  slideContent?: Record<string, unknown> | null,
  tile?: unknown,
): StatLayout {
  const base = statLayoutForVariant(variantId);
  const slideOverride =
    parseStatLayout(slideContent?.statLayout) ?? parseStatLayout(slideContent ?? null);
  const tileOverride = parseStatLayout(tile);
  return { ...base, ...(slideOverride ?? {}), ...(tileOverride ?? {}) };
}
