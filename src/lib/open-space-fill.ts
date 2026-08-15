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
};

export const NEUTRAL_FILL: FillScale = {
  display: 1,
  body: 1,
  kicker: 1,
  figure: 1,
  block: 1,
  gap: 1,
  plate: 1,
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
  };
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
  cover: { display: 1, body: 0.6, kicker: 0.5, figure: 0.7, block: 0.5, gap: 1, plate: 0.7 },
  statement: { display: 0.95, body: 0.7, kicker: 0.5, figure: 0.7, block: 0.5, gap: 0.9, plate: 0.7 },
  stats: { display: 0.6, body: 0.6, kicker: 0.45, figure: 1, block: 0.8, gap: 0.8, plate: 0.9 },
  chart: { display: 0.5, body: 0.55, kicker: 0.4, figure: 0.8, block: 1, gap: 0.7, plate: 0.8 },
  grid: { display: 0.4, body: 0.5, kicker: 0.35, figure: 0.6, block: 0.7, gap: 0.5, plate: 0.6 },
  content: { display: 0.7, body: 0.7, kicker: 0.45, figure: 0.7, block: 0.8, gap: 0.8, plate: 0.75 },
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
    // Gaps give way first when the page overflows.
    gap: Math.min(mix(scale.gap), 1 - t * 0.12),
    plate: Math.min(mix(scale.plate), 1 - t * 0.08),
  });
}

/** CSS custom properties consumed by the slide primitives. */
export function fillCssVars(scale: FillScale): Record<string, string> {
  return {
    "--fill-display": String(scale.display),
    "--fill-body": String(scale.body),
    "--fill-kicker": String(scale.kicker),
    "--fill-figure": String(scale.figure),
    "--fill-block": String(scale.block),
    "--fill-gap": String(scale.gap),
    "--fill-plate": String(scale.plate),
  };
}

/** `calc()` helper: an authored px size multiplied by one fill axis. */
export function fillPx(px: number, axis: keyof FillScale = "body"): string {
  return `calc(${px}px * var(--fill-${axis}, 1))`;
}
