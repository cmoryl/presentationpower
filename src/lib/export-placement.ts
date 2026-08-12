// -----------------------------------------------------------------------------
// Export placement fingerprints
//
// Animation in this app is presentation-only: the intro cascade sets inline
// `animation` on elements and clears it on animationend, and the offscreen
// export stage refuses to animate at all. Those are invariants, not guarantees —
// a new keyframe that leaves behind a transform, a `scale` that never returns to
// 1, or a layout-affecting property in a cascade would silently move content in
// every exported PPTX plate and print raster.
//
// This module turns "where is everything" into a comparable value: a normalized
// geometry fingerprint of the rendered tree, measured in design space (1920×1080
// for slides, page pixels for print). The verification harness captures it
// before an intro runs, after the cascade settles, and after cleanup, and
// compares all three against a committed baseline. Zero tolerance by default:
// any drift is a regression.
// -----------------------------------------------------------------------------

/** One measured element in design space. */
export interface PlacementEntry {
  /** Stable, document-ordered key: `<index>:<tag><markers>`. */
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacementFingerprint {
  /** Design-space width the entries are normalized to. */
  width: number;
  height: number;
  entries: PlacementEntry[];
  /** FNV-1a digest of the serialized entries. */
  digest: string;
}

export interface PlacementDrift {
  key: string;
  field: "x" | "y" | "w" | "h" | "missing" | "added";
  from: number | null;
  to: number | null;
  deltaPx: number;
}

/**
 * Everything whose position a viewer would notice: the render planes, every
 * element the intro cascade touches (`data-intro-item` / `data-intro-step`),
 * stats, media tiles, icon wells, chrome, and all copy. Deliberately broad — a
 * fingerprint that only tracked containers would miss a stat that swelled and
 * never settled back.
 */
export const PLACEMENT_SELECTOR = [
  // Render planes (SlideChrome) + print page root
  "[data-plane]",
  "[data-slide-content-plane]",
  "[data-slide-logo-plane]",
  "[data-slide-footer-plane]",
  "[data-print-page]",
  // Animated targets — the whole point of the check
  "[data-intro-item]",
  "[data-intro-step]",
  // Figures, media, icons, chrome
  "[data-stat-value]",
  "[data-stat-figure]",
  "[data-stat-shape]",
  "[data-step-tile]",
  "[data-step-copy]",
  "[data-step-summary]",
  "[data-chain-connector]",
  "[data-media-tile]",
  "[data-icon-well]",
  "[data-logo-tile]",
  "[data-slide-logo]",
  "[data-slide-footer]",
  // Copy and imagery
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "img",
  "svg",
  "figure",
].join(",");

/** Tags that never carry placement signal even when they hold text. */
const SKIP_TAGS = new Set(["script", "style", "template", "br", "defs", "title"]);

/** True when `el` renders text directly (no element children with text). */
function isTextLeaf(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return false;
  if (!(el.textContent ?? "").trim()) return false;
  for (const child of Array.from(el.children)) {
    if ((child.textContent ?? "").trim()) return false;
  }
  return true;
}


/** Markers folded into an element's key so keys survive DOM reordering. */
const KEY_ATTRS = [
  "data-plane",
  "data-stat-value",
  "data-slide-logo",
  "data-print-page",
  "data-variant-id",
] as const;

/** Sub-pixel quantisation. 1/100th of a design px — below any visible drift. */
function q(n: number): number {
  return Math.round(n * 100) / 100;
}

function keyFor(el: Element, index: number): string {
  const markers = KEY_ATTRS.filter((a) => el.hasAttribute(a))
    .map((a) => `${a}=${el.getAttribute(a) || ""}`)
    .join("|");
  const tag = el.tagName.toLowerCase();
  return `${String(index).padStart(4, "0")}:${tag}${markers ? `[${markers}]` : ""}`;
}

/** FNV-1a, hex. Deterministic and dependency-free. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function serializePlacement(entries: PlacementEntry[]): string {
  return entries.map((e) => `${e.key}|${e.x},${e.y},${e.w},${e.h}`).join("\n");
}

export function placementDigest(entries: PlacementEntry[]): string {
  return fnv1a(serializePlacement(entries));
}

/**
 * Measure a mounted stage / print page. `designWidth`/`designHeight` describe
 * the coordinate space the fingerprint is expressed in, so a stage captured at
 * any CSS scale produces the same numbers.
 */
export function capturePlacement(
  root: HTMLElement,
  opts: {
    designWidth: number;
    designHeight: number;
    selector?: string;
    /** Set false to measure only marked/structural nodes (default true). */
    textLeaves?: boolean;
  },
): PlacementFingerprint {
  const box = root.getBoundingClientRect();
  const sx = box.width > 0 ? opts.designWidth / box.width : 1;
  const sy = box.height > 0 ? opts.designHeight / box.height : 1;
  const selector = opts.selector ?? PLACEMENT_SELECTOR;
  // One document-ordered pass: marked/structural elements plus every text leaf,
  // so copy that carries no semantic tag is measured too.
  const nodes = Array.from(root.querySelectorAll("*")).filter(
    (el) => el.matches(selector) || (opts.textLeaves !== false && isTextLeaf(el)),
  );
  const entries: PlacementEntry[] = [];
  nodes.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    // Zero-area nodes (mask helpers, empty spans) carry no placement signal and
    // add noise across environments.
    if (r.width < 0.5 || r.height < 0.5) return;
    entries.push({
      key: keyFor(el, i),
      x: q((r.left - box.left) * sx),
      y: q((r.top - box.top) * sy),
      w: q(r.width * sx),
      h: q(r.height * sy),
    });
  });
  return {
    width: opts.designWidth,
    height: opts.designHeight,
    entries,
    digest: placementDigest(entries),
  };
}

/**
 * Compare two fingerprints. `tolerancePx` defaults to 0 — placement after an
 * animation must be byte-identical, not merely close.
 */
export function diffPlacement(
  baseline: PlacementEntry[],
  next: PlacementEntry[],
  tolerancePx = 0,
): PlacementDrift[] {
  const a = new Map(baseline.map((e) => [e.key, e]));
  const b = new Map(next.map((e) => [e.key, e]));
  const drift: PlacementDrift[] = [];
  for (const [key, base] of a) {
    const cur = b.get(key);
    if (!cur) {
      drift.push({ key, field: "missing", from: base.x, to: null, deltaPx: Infinity });
      continue;
    }
    for (const field of ["x", "y", "w", "h"] as const) {
      const delta = Math.abs(cur[field] - base[field]);
      if (delta > tolerancePx) {
        drift.push({ key, field, from: base[field], to: cur[field], deltaPx: q(delta) });
      }
    }
  }
  for (const [key, cur] of b) {
    if (!a.has(key)) {
      drift.push({ key, field: "added", from: null, to: cur.x, deltaPx: Infinity });
    }
  }
  return drift;
}

/** Human-readable one-liners for a CI log. */
export function formatDrift(drift: PlacementDrift[], limit = 12): string[] {
  return drift
    .slice(0, limit)
    .map((d) =>
      d.field === "missing" || d.field === "added"
        ? `${d.key}: ${d.field}`
        : `${d.key}: ${d.field} ${d.from} → ${d.to} (${d.deltaPx}px)`,
    );
}
