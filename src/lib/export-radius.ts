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
