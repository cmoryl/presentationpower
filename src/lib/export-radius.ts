/**
 * Corner-radius parity between the on-screen stage and the exported PPTX.
 * ----------------------------------------------------------------------
 * The renderer speaks CSS pixels on a 1920×1080 stage; PowerPoint speaks
 * inches on a 13.333×7.5in slide, and pptxgenjs converts a `roundRect`
 * radius into the shape's `adj` guide:
 *
 *   adj = round(radiusIn * EMU_PER_IN * 100000 / min(wEmu, hEmu))
 *
 * That integer quantisation is the ONLY place a corner can drift, so every
 * exported radius must come from a design token through {@link pxToRadiusIn}
 * (or {@link pillRadiusIn} for fully-rounded pills). Never inline an inch
 * literal in the exporter — the corner-radius regression test fails on it.
 */

import { CHIP_RADIUS_PX, MEDIA_RADIUS_PX, SUMMARY_BAND } from "@/lib/surface-tokens";

/** Design stage width, px (VariantRenderer / ScaledSlide). */
export const STAGE_W_PX = 1920;
/** PPTX slide width, in (16:9). */
export const SLIDE_W_IN = 13.333;
/** Stage px per PPTX inch. */
export const PX_PER_IN = STAGE_W_PX / SLIDE_W_IN;
/** English Metric Units per inch (OOXML). */
export const EMU_PER_IN = 914400;

/** Convert a stage-pixel corner radius into the PPTX inch radius. */
export function pxToRadiusIn(px: number): number {
  return px / PX_PER_IN;
}

/** Radius for a fully-rounded pill of height `hIn` (inches). */
export function pillRadiusIn(hIn: number): number {
  return hIn / 2;
}

/** Canonical exported radii, derived from the app's design tokens. */
export const EXPORT_RADIUS_IN = {
  /** Photo plates + bento tiles (22px). */
  media: pxToRadiusIn(MEDIA_RADIUS_PX),
  /** Summary / house bands (18px). */
  band: pxToRadiusIn(SUMMARY_BAND.radius),
  /** Logo tiles, gantt bars, small chips (12px). */
  chip: pxToRadiusIn(CHIP_RADIUS_PX),
} as const;

/** Mirror of pptxgenjs' `adj` computation for a roundRect. */
export function rectRadiusAdj(radiusIn: number, wIn: number, hIn: number): number {
  const minEmu = Math.min(wIn, hIn) * EMU_PER_IN;
  return Math.round((radiusIn * EMU_PER_IN * 100000) / minEmu);
}

/**
 * The radius PowerPoint actually paints, in stage px, after `adj`
 * quantisation and the 50000 (half the short side) clamp.
 */
export function renderedRadiusPx(radiusIn: number, wIn: number, hIn: number): number {
  const adj = Math.min(rectRadiusAdj(radiusIn, wIn, hIn), 50000);
  return ((adj / 100000) * Math.min(wIn, hIn)) * PX_PER_IN;
}

/** Absolute px drift between the intended token radius and what PPT paints. */
export function radiusDriftPx(px: number, wIn: number, hIn: number): number {
  const intended = Math.min(px, (Math.min(wIn, hIn) / 2) * PX_PER_IN);
  return Math.abs(renderedRadiusPx(pxToRadiusIn(px), wIn, hIn) - intended);
}

// -----------------------------------------------------------------------------
// Scale / DPI parity
//
// The vector path is resolution independent: `adj` is derived from inches, so
// the exported corner is identical at 144, 220 and 300 DPI. The RASTER path is
// not — decor plates are captured at a device-pixel-ratio derived from the
// chosen DPI, so a 22px stage corner is painted at 22 × ratio raster pixels and
// any rounding there is a real, visible corner change once the plate is scaled
// back down onto the 13.333in slide. These helpers make that scaling explicit
// so the parity test can diff corners across every supported setting.
// -----------------------------------------------------------------------------

/** A token radius expressed in raster pixels at a capture scale. */
export function radiusPxAtScale(px: number, scale: number): number {
  return px * scale;
}

/**
 * Corner drift, in stage px, introduced by painting at `scale` when the raster
 * backend snaps the radius to a whole device pixel.
 */
export function scaleRadiusDriftPx(px: number, scale: number): number {
  if (!(scale > 0)) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.round(radiusPxAtScale(px, scale)) / scale - px);
}

/**
 * Analytic coverage of a rounded-rect corner, sampled on the stage grid.
 *
 * Returns an `n × n` alpha map (0..1) of the top-left corner box for a radius
 * painted at `scale`, resampled back to stage pixels. Comparing these maps
 * across capture scales is a true pixel diff of the corner: identical maps mean
 * PowerPoint receives the same silhouette at every DPI setting.
 */
export function cornerCoverageMap(
  radiusPx: number,
  scale: number,
  n = 32,
  samplesPerPx = 4,
): number[] {
  // Radius as the raster backend would paint it, mapped back to stage units.
  const r = Math.round(radiusPxAtScale(radiusPx, scale)) / scale;
  const out: number[] = [];
  const step = 1 / samplesPerPx;
  for (let py = 0; py < n; py++) {
    for (let px = 0; px < n; px++) {
      let hits = 0;
      let total = 0;
      for (let sy = 0; sy < samplesPerPx; sy++) {
        for (let sx = 0; sx < samplesPerPx; sx++) {
          const x = px + (sx + 0.5) * step;
          const y = py + (sy + 0.5) * step;
          total++;
          // Inside the shape unless it falls outside the corner arc.
          if (x >= r || y >= r) {
            hits++;
          } else {
            const dx = r - x;
            const dy = r - y;
            if (dx * dx + dy * dy <= r * r) hits++;
          }
        }
      }
      out.push(hits / total);
    }
  }
  return out;
}

/** Max / mean absolute difference between two coverage maps. */
export function coverageDiff(a: number[], b: number[]): { max: number; mean: number } {
  const len = Math.min(a.length, b.length);
  let max = 0;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > max) max = d;
    sum += d;
  }
  return { max, mean: len ? sum / len : 0 };
}
