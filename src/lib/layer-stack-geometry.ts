/**
 * MV-PROC-LAYER-STACK geometry — one source of truth for lane and accent-rail
 * corner rounding on both surfaces.
 * ----------------------------------------------------------------------------
 * The lane body is a rounded plate; the accent rail on its left edge is a thin
 * vertical bar. A 5px bar cannot carry the lane's 18px corner radius — it
 * renders as a pinched wedge — so the rail is always a *pill* (radius = half
 * its shortest side) inset from the lane's rounded corners.
 *
 * Lane heights change with lane count, and the exported slide is measured in
 * inches while the stage is measured in pixels, so both radii are derived here
 * and clamped against the available height. That keeps rounding identical for
 * 2-lane (tall) and 5-lane (short) stacks, and across slide aspect ratios.
 */

import { SUMMARY_BAND } from "@/lib/surface-tokens";
import { pillRadiusIn, pxToRadiusIn } from "@/lib/export-radius";

/** Lane plate corner radius on the 1920px stage. */
export const LANE_RADIUS_PX = SUMMARY_BAND.radius; // 18
/** Accent rail width on the stage, px. */
export const RAIL_W_PX = 5;
/** Nominal vertical inset of the rail from the lane's top/bottom edge, px. */
export const RAIL_INSET_PX = 14;
/** The rail never gets shorter than this, px. */
export const RAIL_MIN_H_PX = 12;
/** The rail's inset never eats more than this fraction of the lane height. */
export const RAIL_INSET_MAX_RATIO = 0.18;

/** Radius of a rounded plate of height `h`, clamped so it can never exceed a
 *  half-height (which would silently turn the plate into a stadium). */
export function laneCornerRadiusPx(laneHPx: number): number {
  return Math.min(LANE_RADIUS_PX, Math.max(0, laneHPx) / 2);
}

export interface RailBoxPx {
  /** Inset from the lane's top and bottom edge, px. */
  inset: number;
  /** Rail width, px. */
  width: number;
  /** Rail height, px. */
  height: number;
  /** Rail corner radius, px — always a true pill. */
  radius: number;
}

/** Accent-rail box for a lane of height `laneHPx` on the stage. */
export function railBoxPx(laneHPx: number): RailBoxPx {
  const laneH = Math.max(0, laneHPx);
  const inset = Math.min(RAIL_INSET_PX, laneH * RAIL_INSET_MAX_RATIO);
  const height = Math.max(Math.min(RAIL_MIN_H_PX, laneH), laneH - inset * 2);
  return {
    inset,
    width: RAIL_W_PX,
    height,
    radius: Math.min(RAIL_W_PX, height) / 2,
  };
}

/** Lane height for a stack of `count` lanes inside a band, in stage px. */
export function laneHeightPx(bandHPx: number, count: number, gapPx: number): number {
  const n = Math.max(1, Math.round(count));
  return (bandHPx - gapPx * (n - 1)) / n;
}

/** Lane height for a stack of `count` lanes inside a band, in inches. */
export function laneHeightIn(
  bandTopIn: number,
  bandBottomIn: number,
  count: number,
  gapIn: number,
): number {
  const n = Math.max(1, Math.round(count));
  return (bandBottomIn - bandTopIn - gapIn * (n - 1)) / n;
}

/** Exported lane plate radius, in — same token as the stage, height-clamped. */
export function laneCornerRadiusIn(laneHIn: number): number {
  return Math.min(pxToRadiusIn(LANE_RADIUS_PX), pillRadiusIn(Math.max(0, laneHIn)));
}

export interface RailBoxIn {
  /** Absolute rail top, in. */
  y: number;
  /** Rail width, in. */
  w: number;
  /** Rail height, in. */
  h: number;
  /** pptxgenjs `rectRadius`, in — always a true pill. */
  rectRadius: number;
}

/** Accent-rail box for an exported lane at `yIn` with height `laneHIn`. */
export function railBoxIn(yIn: number, laneHIn: number): RailBoxIn {
  const px = railBoxPx(inToStagePx(laneHIn));
  const h = stagePxToIn(px.height);
  const w = stagePxToIn(px.width);
  return {
    y: yIn + stagePxToIn(px.inset),
    w,
    h,
    rectRadius: pillRadiusIn(Math.min(w, h)),
  };
}

function inToStagePx(valueIn: number): number {
  return valueIn / pxToRadiusIn(1);
}

function stagePxToIn(px: number): number {
  return pxToRadiusIn(px);
}
