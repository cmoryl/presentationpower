// -----------------------------------------------------------------------------
// Event print pipeline — spec → renderable format → press geometry.
//
// One place decides, for a venue spec, (a) the DOM frame the renderer draws at,
// (b) the safe-area fractions copy must respect, and (c) the press geometry the
// delivered PDF/AI uses. Large-format items are delivered at a documented
// fraction of final size (standard trade practice: a 10ft banner is supplied at
// 25% with "print at 400%" on the manifest) so files stay openable.
// -----------------------------------------------------------------------------

import type { EventPrintSpec } from "./event-spec-intake";
import type { SocialFormat } from "./social-formats";

/** Longest DOM edge we render a signage frame at, in CSS px. */
const MAX_RENDER_EDGE = 2200;
/** Smallest DOM edge worth rendering (small badges would otherwise be tiny). */
const MIN_RENDER_EDGE = 900;

/** Effective press DPI target by physical size — viewing distance scales. */
export function pressDpiFor(spec: EventPrintSpec): number {
  const maxIn = Math.max(spec.widthIn, spec.heightIn);
  if (maxIn <= 12) return 300;
  if (maxIn <= 36) return 200;
  if (maxIn <= 96) return 150;
  return 100;
}

/**
 * Delivery scale. 1 = final size. Anything larger than a 4ft edge is supplied
 * proportionally reduced so the PDF stays a workable file at press DPI.
 */
export function deliveryScaleFor(spec: EventPrintSpec): number {
  const maxIn = Math.max(spec.widthIn, spec.heightIn);
  if (maxIn <= 48) return 1;
  if (maxIn <= 120) return 0.5;
  if (maxIn <= 360) return 0.25;
  return 0.1;
}

export type PressGeometry = {
  /** Trim size of the delivered file, in inches (after delivery scale). */
  trimWidthIn: number;
  trimHeightIn: number;
  /** Bleed per edge in the delivered file, in inches. */
  bleedIn: number;
  /** Scale the file is supplied at (1 = final size). */
  scale: number;
  /** Percentage the printer must enlarge by (100 = none). */
  printAtPct: number;
  /** DPI at final size once enlarged. */
  finalDpi: number;
  /** DPI of the delivered file itself. */
  fileDpi: number;
  /** True when the raster ceiling, not the size class, set the DPI. */
  rasterLimited: boolean;
};

/**
 * Raster ceiling for a single composed plate. Beyond this a browser canvas
 * silently returns blank pixels, so the honest move is to lower the DPI (large
 * signage is viewed from metres away) and say so in the manifest.
 */
export const MAX_PLATE_EDGE_PX = 8000;

export function pressGeometryFor(spec: EventPrintSpec): PressGeometry {
  const scale = deliveryScaleFor(spec);
  const target = pressDpiFor(spec);

  // Pixels needed are a property of the FINAL size — supplying at 50% does not
  // reduce them. Whichever final edge is longest decides the achievable DPI.
  const longestFinalIn = Math.max(spec.widthIn, spec.heightIn) + spec.bleedIn * 2;
  const ceilingDpi = Math.floor(MAX_PLATE_EDGE_PX / Math.max(longestFinalIn, 1));
  const finalDpi = Math.max(24, Math.min(target, ceilingDpi));
  const fileDpi = Math.min(600, Math.round(finalDpi / scale));

  return {
    trimWidthIn: round3(spec.widthIn * scale),
    trimHeightIn: round3(spec.heightIn * scale),
    bleedIn: round3(spec.bleedIn * scale),
    scale,
    printAtPct: Math.round(100 / scale),
    finalDpi,
    fileDpi,
    rasterLimited: ceilingDpi < target,
  };
}

/**
 * The DOM frame for a spec. Aspect matches the trim exactly (within rounding),
 * and safe-area fractions carry the venue's safe inset so the shared renderer
 * keeps headline + lockup inside it at any size.
 */
export function specToFormat(spec: EventPrintSpec): SocialFormat {
  const aspect = spec.widthIn / spec.heightIn;
  const longIn = Math.max(spec.widthIn, spec.heightIn);
  const shortIn = Math.min(spec.widthIn, spec.heightIn);
  // Fit the long edge into the render budget, but never render so small that
  // type shaping degrades.
  let ppi = MAX_RENDER_EDGE / longIn;
  if (shortIn * ppi < MIN_RENDER_EDGE) ppi = MIN_RENDER_EDGE / shortIn;
  if (longIn * ppi > MAX_RENDER_EDGE) ppi = MAX_RENDER_EDGE / longIn;

  const width = Math.round(spec.widthIn * ppi);
  const height = Math.max(1, Math.round(width / aspect));
  const safeFracW = Math.min(0.2, spec.safeIn / spec.widthIn);
  const safeFracH = Math.min(0.2, spec.safeIn / spec.heightIn);

  return {
    id: `event-spec-${spec.id}`,
    label: spec.label,
    platform: "signage",
    category: "signage",
    width,
    height,
    aspect: width / height,
    safeArea: { top: safeFracH, bottom: safeFracH, left: safeFracW, right: safeFracW },
    intent: `Venue signage — ${spec.widthIn}in × ${spec.heightIn}in`,
    tune: tuneFor(spec, width / height),
  };
}

/**
 * Signage is read from metres away, so type runs larger and copy runs shorter
 * than a social frame of the same aspect. Extreme ratios (banners, runners)
 * drop the summary entirely.
 */
function tuneFor(spec: EventPrintSpec, aspect: number): SocialFormat["tune"] {
  const extreme = aspect >= 2.4 || aspect <= 1 / 2.4;
  const small = Math.max(spec.widthIn, spec.heightIn) <= 8; // badges, cards
  if (small) {
    return {
      padPct: 7,
      titlePct: 9,
      summaryPct: 3.2,
      showSummary: false,
      titleLines: 3,
      lockupSize: "xs",
      imageLayout: "panel",
    };
  }
  if (extreme) {
    return {
      padPct: 6,
      eyebrowPct: 2.2,
      titlePct: 13,
      showSummary: false,
      titleLines: 3,
      lockupSize: "sm",
      copyScaleMul: 1.05,
      imageLayout: "bleed",
    };
  }
  return {
    padPct: 6.5,
    eyebrowPct: 2.4,
    titlePct: 11,
    summaryPct: 3.4,
    showSummary: true,
    titleLines: 4,
    lockupSize: "md",
    imageLayout: "bleed",
  };
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/** Group specs for the UI: same physical family renders as one block. */
export function specFamily(spec: EventPrintSpec): "large-format" | "rigid" | "small-format" {
  const maxIn = Math.max(spec.widthIn, spec.heightIn);
  if (maxIn > 48) return "large-format";
  if (maxIn > 8) return "rigid";
  return "small-format";
}
