// ── Open-space auto-fill ──────────────────────────────────────────────────
//
// The problem this solves: the module library is authored at a fixed 1920×1080
// type scale, tuned for a *full* page. A cover with four words, a stat row with
// two figures or a three-bullet "so what" slide therefore leaves a third of the
// sheet empty while the type stays small — the deck reads under-designed. The
// opposite case exists too: a nine-item grid with long labels crowds.
//
// The fix is one shared, deterministic sizing pass that runs for EVERY module:
// measure how much content the slide actually carries, then hand the renderer a
// set of multipliers (display / body / kicker type, figure height, gap, plate
// padding). Sparse pages grow into their open space; dense pages tighten their
// gaps instead of shrinking their words. Because the multipliers are computed
// from the slide data (not from the DOM), the editor, present, share and the
// offscreen PPTX export stage all agree — a slide never re-flows between the
// screen and the exported file.
//
// A client-side guard (see OpenSpaceFill.tsx) can still dial the multipliers
// back one step at a time if a real measurement finds overflow, so growth can
// never crowd the sheet.

/** Multipliers applied to the authored type / spacing scale. */
export type FillScale = {
  /** Display + section titles. */
  display: number;
  /** Body copy, bullets, card text. */
  body: number;
  /** Kickers, eyebrows, axis and meta labels. */
  kicker: number;
  /** Stat figures and big numerals. */
  figure: number;
  /** Chart / diagram / media block height. */
  block: number;
  /** Row and column gaps. */
  gap: number;
  /** Callout, card and plate padding. */
  plate: number;
  /** Chart / diagram labels: axis ticks, legends, series and node labels. */
  label: number;
};

export const NEUTRAL_FILL: FillScale = {
  display: 1,
  body: 1,
  kicker: 1,
  figure: 1,
  block: 1,
  gap: 1,
  plate: 1,
  label: 1,
};

/** Hard caps — growth stays inside a range that still reads as designed. */
const CAP = {
  display: [0.9, 1.26],
  body: [0.92, 1.2],
  kicker: [0.94, 1.14],
  figure: [0.9, 1.3],
  block: [0.94, 1.34],
  gap: [0.82, 1.3],
  plate: [0.86, 1.24],
  // Chart labels are the most fragile text on a slide: they sit in fixed
  // gutters next to axes and inside nodes, so they grow and shrink least.
  label: [0.96, 1.08],
} as const satisfies Record<keyof FillScale, readonly [number, number]>;

const clampTo = (key: keyof FillScale, v: number) => {
  const [lo, hi] = CAP[key];
  return Math.min(hi, Math.max(lo, Math.round(v * 1000) / 1000));
};

/** Clamp an arbitrary scale object into the safe range. */
export function clampFill(scale: FillScale): FillScale {
  return {
    display: clampTo("display", scale.display),
    body: clampTo("body", scale.body),
    kicker: clampTo("kicker", scale.kicker),
    figure: clampTo("figure", scale.figure),
    block: clampTo("block", scale.block),
    gap: clampTo("gap", scale.gap),
    plate: clampTo("plate", scale.plate),
    label: clampTo("label", scale.label ?? 1),
  };
}

// ── Readability floors and ceilings ───────────────────────────────────────
//
// The multipliers above keep growth *proportional*; these bounds keep it
// *legible*. They are absolute stage px (the deck renders at 1920×1080 and is
// scaled as a whole), and they are applied in `fillPx`, so all ~400 authored
// type sizes inherit them without touching a single call site.
//
// Rules:
//  • A shrink may never push text under its floor. Authored sizes already below
//    a floor are left alone (never enlarged) — the authored design still wins.
//  • Growth may never push text over its ceiling, so a two-word cover can't
//    turn into a billboard and a stat figure can't crash into its label.
export const TYPE_FLOOR_PX: Record<keyof FillScale, number> = {
  display: 30,
  body: 18,
  kicker: 13,
  figure: 40,
  label: 14,
  // Non-type axes: no readability floor beyond their multiplier cap.
  block: 0,
  gap: 0,
  plate: 0,
};

export const TYPE_CEIL_PX: Record<keyof FillScale, number> = {
  display: 168,
  body: 46,
  kicker: 30,
  figure: 240,
  label: 28,
  block: Number.POSITIVE_INFINITY,
  gap: Number.POSITIVE_INFINITY,
  plate: Number.POSITIVE_INFINITY,
};

/** Resolved px bounds for one authored size on one axis. */
export function typeBounds(px: number, axis: keyof FillScale): { min: number; max: number } {
  const [lo, hi] = CAP[axis];
  // Floor: the readable minimum, but never above what the designer authored.
  const min = Math.max(px * lo, Math.min(px, TYPE_FLOOR_PX[axis]));
  // Ceiling: the multiplier cap, trimmed by the absolute legibility ceiling —
  // but an authored size already at/above the ceiling simply stops growing.
  const max = Math.max(min, Math.min(px * hi, Math.max(px, TYPE_CEIL_PX[axis])));
  return { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 };
}

// ── Content load ──────────────────────────────────────────────────────────

const words = (v: unknown): number =>
  typeof v === "string" ? v.trim().split(/\s+/).filter(Boolean).length : 0;

const TEXTY = /^(title|subtitle|kicker|eyebrow|heading|label|body|text|copy|lead|summary|caption|quote|note|takeaway|value|unit|stat|name|role|detail|description|question|answer)/i;

/** Words carried anywhere inside a content tree (arrays and nested objects). */
function countWords(value: unknown, depth = 0): number {
  if (depth > 4) return 0;
  if (typeof value === "string") return words(value);
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countWords(v, depth + 1), 0);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<number>((n, [k, v]) => {
      if (/^(background|media|image|video|logo|imagery|url|path|src|id|skin|accent)/i.test(k)) {
        return n;
      }
      if (typeof v === "string" && !TEXTY.test(k) && v.length > 240) return n;
      return n + countWords(v, depth + 1);
    }, 0);
  }
  return 0;
}

/** Number of repeated items (bullets, cards, steps, rows, stats). */
function countItems(content: Record<string, unknown>): number {
  let n = 0;
  for (const [k, v] of Object.entries(content)) {
    if (!Array.isArray(v)) continue;
    if (/^(background|images|media|logos|assets)/i.test(k)) continue;
    n += v.length;
  }
  return n;
}

/** True when the slide already spends its open space on a picture or chart. */
function hasVisual(content: Record<string, unknown>): boolean {
  return Object.entries(content).some(
    ([k, v]) =>
      Boolean(v) &&
      /^(background|image|imageUrl|media|video|chart|infographic|spec|diagram|imagery|photo)/i.test(k),
  );
}

export type FillLoad = {
  /** 0 (nearly empty page) → 1 (full page). */
  load: number;
  words: number;
  items: number;
  visual: boolean;
};

/**
 * How full the authored content is, normalised against a "comfortably full"
 * 1920×1080 page: roughly 110 words plus six repeated items.
 */
export function measureLoad(content: unknown): FillLoad {
  const c = (content && typeof content === "object" ? content : {}) as Record<string, unknown>;
  const w = countWords(c);
  const items = countItems(c);
  const visual = hasVisual(c);
  // Items cost page space beyond their words (each carries a card / rule / gap).
  const raw = w / 118 + items / 7.5 + (visual ? 0.34 : 0);
  return { load: Math.min(1.6, Math.round(raw * 1000) / 1000), words: w, items, visual };
}

// ── Family tuning ─────────────────────────────────────────────────────────

/** How aggressively a module family may grow into its open space. */
export type FillFamily = "cover" | "statement" | "stats" | "chart" | "grid" | "content";

/**
 * Map a module variant id to a fill family. Cover / divider / close pages are
 * the biggest wins (few words, whole sheet), grids the tightest.
 */
export function fillFamilyFor(variantId: string | null | undefined): FillFamily {
  const id = (variantId ?? "").toUpperCase();
  if (/COVER|TITLE|DIVIDER|SECTION|CLOSE|THANK|SF-0?1\b/.test(id)) return "cover";
  if (/QUOTE|STATEMENT|BIG|MANIFEST|MOMENT|PULL/.test(id)) return "statement";
  if (/STAT|METRIC|KPI|FIGURE|PROOF|IMPACT|NUMBER/.test(id)) return "stats";
  if (/CHART|DASH|GAUGE|GRAPH|TREND|PLOT|FUNNEL|MAP/.test(id)) return "chart";
  if (/GRID|BENTO|MATRIX|TABLE|CARD|MOSAIC|LOGO/.test(id)) return "grid";
  return "content";
}

/** Per-family growth appetite: how much of the available slack each axis takes. */
const APPETITE: Record<FillFamily, Record<keyof FillScale, number>> = {
  cover: { label: 0.25, display: 1, body: 0.6, kicker: 0.5, figure: 0.7, block: 0.5, gap: 1, plate: 0.7 },
  statement: { label: 0.25, display: 0.95, body: 0.7, kicker: 0.5, figure: 0.7, block: 0.5, gap: 0.9, plate: 0.7 },
  stats: { label: 0.5, display: 0.6, body: 0.6, kicker: 0.45, figure: 1, block: 0.8, gap: 0.8, plate: 0.9 },
  chart: { label: 0.6, display: 0.5, body: 0.55, kicker: 0.4, figure: 0.8, block: 1, gap: 0.7, plate: 0.8 },
  grid: { display: 0.4, body: 0.5, kicker: 0.35, figure: 0.6, block: 0.7, gap: 0.5, plate: 0.6, label: 0.3 },
  content: { display: 0.7, body: 0.7, kicker: 0.45, figure: 0.7, block: 0.8, gap: 0.8, plate: 0.75, label: 0.4 },
};

/** Headroom at zero load — the most each axis may grow before appetite. */
const HEADROOM: Record<keyof FillScale, number> = {
  display: 0.26,
  body: 0.2,
  kicker: 0.14,
  figure: 0.3,
  block: 0.34,
  gap: 0.3,
  plate: 0.24,
  // Labels get a sliver of headroom only — enough to stay legible on an airy
  // chart, never enough to collide with the plot area.
  label: 0.08,
};

/** Squeeze applied when the page is over-full (load > 1). */
const SQUEEZE: Record<keyof FillScale, number> = {
  display: 0.1,
  body: 0.08,
  kicker: 0.06,
  figure: 0.1,
  block: 0.06,
  gap: 0.18,
  plate: 0.14,
  // A crowded chart tightens its labels last, and barely: unreadable ticks are
  // worse than a tight plot.
  label: 0.04,
};

export type FillInput = {
  content: unknown;
  variantId?: string | null;
  /** Pack geometry `fill` density (0–1); denser scaffolds want less growth. */
  density?: number;
  /** Off switch — returns the authored scale untouched. */
  enabled?: boolean;
};

/**
 * The auto-fill pass. Returns type / spacing multipliers for a slide.
 *
 * Sparse pages (load → 0) grow type, figures and gaps up to the per-family
 * headroom; a comfortably full page (load ≈ 1) gets the authored scale back;
 * an over-full page tightens gaps and plate padding first, and only trims type
 * slightly, so words never end up unreadably small.
 */
export function computeFill(input: FillInput): FillScale & { load: number; family: FillFamily } {
  const family = fillFamilyFor(input.variantId);
  const { load } = measureLoad(input.content);
  if (input.enabled === false) return { ...NEUTRAL_FILL, load, family };

  // A dense scaffold already paints structure into the open space, so the type
  // has less work to do: 0.85 fill → keep ~62% of the growth.
  const densityDamp = 1 - Math.min(0.45, Math.max(0, (input.density ?? 0.6) - 0.5) * 0.9);
  const slack = Math.max(0, 1 - load); // open space, 0–1
  const over = Math.max(0, load - 1); // crowding, 0–0.6

  const axis = (key: keyof FillScale) => {
    const grow = HEADROOM[key] * APPETITE[family][key] * slack * densityDamp;
    const shrink = SQUEEZE[key] * Math.min(1, over / 0.5);
    return clampTo(key, 1 + grow - shrink);
  };

  return {
    display: axis("display"),
    body: axis("body"),
    kicker: axis("kicker"),
    figure: axis("figure"),
    block: axis("block"),
    gap: axis("gap"),
    plate: axis("plate"),
    label: axis("label"),
    load,
    family,
  };
}

/** Pull the whole scale back toward 1 — used by the overflow guard. */
export function relaxFill(scale: FillScale, step: number): FillScale {
  const t = Math.min(1, Math.max(0, step));
  const mix = (v: number) => 1 + (v - 1) * (1 - t);
  return clampFill({
    display: mix(scale.display),
    body: mix(scale.body),
    kicker: mix(scale.kicker),
    figure: mix(scale.figure),
    block: mix(scale.block),
    label: mix(scale.label ?? 1),
    // Gaps give way first when the page overflows.
    gap: Math.min(mix(scale.gap), 1 - t * 0.12),
    plate: Math.min(mix(scale.plate), 1 - t * 0.08),
  });
}

/**
 * The Tailwind spacing base multiplier. Every `gap-*`, `p-*` and `m-*` utility
 * inside a slide derives from `--spacing`, so re-basing it scales a module's
 * whole rhythm at once. Kept in a deliberately narrow band: spacing also drives
 * fixed widths/heights, and a big jump would push a tight page over its edges
 * (the overflow guard would then claw it straight back).
 */
export function fillSpaceScale(scale: FillScale): number {
  return Math.min(1.1, Math.max(0.93, 1 + (scale.gap - 1) * 0.4));
}

/** CSS custom properties consumed by the slide primitives. */
export function fillCssVars(scale: FillScale): Record<string, string> {
  return {
    // Re-base Tailwind's spacing unit so gaps and padding breathe with the type.
    "--spacing": `calc(0.25rem * ${fillSpaceScale(scale)})`,
    "--fill-display": String(scale.display),
    "--fill-body": String(scale.body),
    "--fill-kicker": String(scale.kicker),
    "--fill-figure": String(scale.figure),
    "--fill-block": String(scale.block),
    "--fill-gap": String(scale.gap),
    "--fill-plate": String(scale.plate),
    "--fill-label": String(scale.label ?? 1),
  };
}

/**
 * `calc()` helper: an authored px size multiplied by one fill axis, wrapped in
 * a readability `clamp()`.
 *
 * The clamp is the guarantee: whatever the auto-fill pass, the client overflow
 * guard or a pack's density does to the multiplier, the rendered size stays
 * between this axis' readable floor and its legibility ceiling (see
 * `typeBounds`). Because every authored size in the module library goes through
 * this helper, the guarantee holds on screen, in present/share and on the
 * offscreen export stage alike.
 */
export function fillPx(px: number, axis: keyof FillScale = "body"): string {
  const grown = `calc(${px}px * var(--fill-${axis}, 1))`;
  if (!Number.isFinite(px) || px <= 0) return grown;
  const { min, max } = typeBounds(px, axis);
  if (min >= max) return `${min}px`;
  return `clamp(${min}px, ${grown}, ${max}px)`;
}

/** Chart / diagram label text: the `label` axis plus its 14–28px guard rails. */
export function chartLabelPx(px: number): string {
  return fillPx(px, "label");
}

// ── Line-height rules ─────────────────────────────────────────────────────
//
// Type that grows must lead tighter, or a display line that gained 26% gains
// 26% of leading too and the block walks off the page; type that shrinks must
// lead looser so dense body copy stays scannable. Leading therefore moves
// *against* the fill multiplier, at a per-role rate, inside per-role bounds.
const LEADING_RULE: Record<
  "display" | "body" | "kicker" | "figure" | "label",
  { base: number; rate: number; min: number; max: number }
> = {
  // Big type: strong compensation, may ride as tight as 0.94.
  display: { base: 1.06, rate: 0.5, min: 0.94, max: 1.18 },
  // Body copy: never tighter than 1.3 — the readability floor for paragraphs.
  body: { base: 1.4, rate: 0.35, min: 1.3, max: 1.56 },
  kicker: { base: 1.25, rate: 0.25, min: 1.15, max: 1.4 },
  figure: { base: 1, rate: 0.5, min: 0.86, max: 1.1 },
  // Labels sit in one-line gutters; keep them near-single-spaced.
  label: { base: 1.2, rate: 0.2, min: 1.1, max: 1.32 },
};

/**
 * Line height for one fill axis as a CSS value.
 *
 * `base` overrides the role default when a module authored its own leading.
 */
export function fillLeading(
  axis: "display" | "body" | "kicker" | "figure" | "label" = "body",
  base?: number,
): string {
  const rule = LEADING_RULE[axis];
  const b = typeof base === "number" && base > 0 ? base : rule.base;
  const min = Math.max(rule.min, Math.min(b, rule.min));
  const max = Math.max(b, rule.max);
  return `clamp(${min}, calc(${b} - (var(--fill-${axis}, 1) - 1) * ${rule.rate}), ${max})`;
}

/** Leading bounds for one axis — used by tests and the export stage. */
export function leadingBounds(axis: keyof typeof LEADING_RULE) {
  return { ...LEADING_RULE[axis] };
}

// ── Chart label constraints ───────────────────────────────────────────────
//
// Chart and diagram labels live inside a fixed-viewBox SVG, so they inflate
// with the *plot* (the `block` axis, which may grow 34%) rather than with the
// `label` axis. A 16px axis tick then renders at 21px and swamps its own
// gridlines, while a crowded chart shrinks its ticks below legibility.
//
// `chartLabelSize` converts an authored SVG label size into the size to emit so
// that, after the block scales, the label lands on the `label` axis instead —
// clamped to the 14–28px legibility band (never enlarging a label the designer
// deliberately authored smaller than the floor, e.g. a 9px sparkline tick).
export function chartLabelSize(
  px: number,
  fill: { label?: number; block?: number } | null | undefined,
): number {
  if (!Number.isFinite(px) || px <= 0) return px;
  const label = fill?.label ?? 1;
  const block = fill?.block ?? 1;
  const floor = Math.min(px, TYPE_FLOOR_PX.label);
  const ceil = Math.max(px, TYPE_CEIL_PX.label);
  // Where the label should land on screen, once the block has scaled.
  const target = Math.min(ceil, Math.max(floor, px * label));
  // Emit the pre-scale size that produces that on-screen size.
  const emitted = block > 0 ? target / block : target;
  return Math.round(emitted * 100) / 100;
}
