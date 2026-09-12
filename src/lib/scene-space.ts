// Spatial realism for in-situ scene plates.
//
// Perspective mounting (scene-perspective.ts) lands a print on the measured
// corners of a photographed surface. That fixes geometry. It does not, on its
// own, make the print sit in *space*: a real photograph also tells you where
// the camera stood, how far the surface runs away from the lens, which end of
// the print is deeper into the room, and what the air and the lens do to that
// deep end. Those are the cues the eye reads before it reads the artwork, and
// getting them wrong is what leaves a render feeling "placed".
//
// This module derives that spatial read from geometry we already measured — no
// new hand-tuned numbers per scene:
//
//   * vanishing point   where the surface's own parallel edges converge
//   * horizon / eye line the height the camera's lens sat at, on the plate
//   * camera attitude    level, looking up at the surface, or down onto it
//   * depth axis         which edge of the print is further from the lens
//   * depth ratio        how much bigger the near edge is than the far edge
//   * aerial perspective how much haze, shade and defocus the far end takes
//
// The far end of a receding surface is further away, so it is very slightly
// hazier, very slightly darker, and — at a real aperture — very slightly softer
// than the near end. Applying that *gradient* rather than one flat value across
// the print is the difference between a warped rectangle and a photograph.

import {
  quadBounds,
  quadForeshortening,
  type ScenePoint,
  type SceneQuad,
} from "@/lib/scene-perspective";

/** Which edge of the printed face lies deepest into the room. */
export type DepthAxis = "none" | "left" | "right" | "up" | "down";

export interface SceneSpace {
  /**
   * Where the surface's parallel edges converge, in plate fractions. Null when
   * the surface is frontal (parallel edges stay parallel), which is correct and
   * not a fault: a square-on wall has no vanishing point in frame.
   */
  vanishing: ScenePoint | null;
  /**
   * The camera's eye line as a plate fraction (0 = top of plate). Derived from
   * the vanishing point of the surface's horizontal edges, so it is the real
   * horizon of the photograph, not a guess.
   */
  eyeLine: number | null;
  /** Level, tilted up at the surface, or tilted down onto it. */
  attitude: "level" | "looking-up" | "looking-down";
  /** Deepest edge of the print. */
  depthAxis: DepthAxis;
  /** Near edge ÷ far edge. 1 = frontal; 2 = the near end reads twice as big. */
  depthRatio: number;
  /** 0 = frontal, 1 = extremely raked. The single strength dial for the cues. */
  rake: number;
  /** Aerial haze on the far end, 0..0.12. */
  haze: number;
  /** Extra shade on the far end, 0..0.16. */
  farShade: number;
  /** Lens defocus at the far end in px at a 1000px-wide plate, 0..3.2. */
  defocus: number;
}

const EPS = 1e-6;

function len(a: ScenePoint, b: ScenePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Intersection of the lines p1→p2 and p3→p4, or null when they are parallel
 * (within a tolerance) or the meeting point is implausibly far off-plate.
 */
export function lineIntersection(
  p1: ScenePoint,
  p2: ScenePoint,
  p3: ScenePoint,
  p4: ScenePoint,
): ScenePoint | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const p = { x: p1.x + d1x * t, y: p1.y + d1y * t };
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  // Beyond ~40 plate widths the convergence is numerically meaningless; the
  // surface is frontal for every practical purpose.
  if (Math.abs(p.x) > 40 || Math.abs(p.y) > 40) return null;
  return p;
}

/**
 * The full spatial read of a measured face quad. Everything is derived, so a
 * corrected quad automatically corrects the space cues with it.
 */
export function sceneSpace(quad: SceneQuad): SceneSpace {
  const [tl, tr, br, bl] = quad;
  const top = len(tl, tr);
  const bottom = len(bl, br);
  const left = len(tl, bl);
  const right = len(tr, br);

  // Horizontal edges (top, bottom) converge at the horizon: their meeting point
  // is on the camera's eye line by definition.
  const horizontalVp = lineIntersection(tl, tr, bl, br);
  // Vertical edges converge above or below when the lens is tilted.
  const verticalVp = lineIntersection(tl, bl, tr, br);

  const eyeLine = horizontalVp ? horizontalVp.y : null;
  const bounds = quadBounds(quad);
  const faceMidY = bounds.y + bounds.h / 2;

  let attitude: SceneSpace["attitude"] = "level";
  if (verticalVp) {
    // Verticals converging upward means the lens is tilted up at the surface.
    attitude = verticalVp.y < bounds.y ? "looking-up" : "looking-down";
  } else if (eyeLine !== null) {
    if (eyeLine < faceMidY - 0.06) attitude = "looking-down";
    else if (eyeLine > faceMidY + 0.06) attitude = "looking-up";
  }

  // Which end is deeper: the shorter of a pair of opposite edges is the far one.
  const hDelta = Math.abs(left - right) / Math.max(left, right, EPS);
  const vDelta = Math.abs(top - bottom) / Math.max(top, bottom, EPS);
  let depthAxis: DepthAxis = "none";
  let depthRatio = 1;
  if (hDelta >= vDelta && hDelta > 0.012) {
    depthAxis = left < right ? "left" : "right";
    depthRatio = Math.max(left, right) / Math.max(EPS, Math.min(left, right));
  } else if (vDelta > 0.012) {
    depthAxis = top < bottom ? "up" : "down";
    depthRatio = Math.max(top, bottom) / Math.max(EPS, Math.min(top, bottom));
  }

  const rake = Math.min(1, Math.max(0, 1 - quadForeshortening(quad)));
  // Depth strength combines the rake with how strongly the near end dominates:
  // a lightly turned wall takes almost nothing, a floor laid away from the lens
  // takes the full amount.
  const depth = Math.min(1, rake * 0.7 + Math.min(1, (depthRatio - 1) / 0.9) * 0.6);

  return {
    vanishing: horizontalVp ?? verticalVp ?? null,
    eyeLine,
    attitude,
    depthAxis,
    depthRatio: Number(depthRatio.toFixed(3)),
    rake: Number(rake.toFixed(3)),
    haze: Number((depth * 0.11).toFixed(4)),
    farShade: Number((depth * 0.15).toFixed(4)),
    defocus: Number((depth * 3.1).toFixed(3)),
  };
}

/**
 * CSS gradient angle whose 0% stop sits on the FAR end of the surface, so the
 * haze and shade stops can be written far→near.
 */
export function depthGradientAngle(axis: DepthAxis): number {
  switch (axis) {
    case "left":
      return 90; // starts left (far), runs right
    case "right":
      return 270;
    case "up":
      return 180; // starts top (far), runs down
    case "down":
      return 0;
    default:
      return 0;
  }
}

/** Mask direction for a far-end defocus, as a CSS gradient `to` keyword. */
export function depthMaskDirection(axis: DepthAxis): string {
  switch (axis) {
    case "left":
      return "to left";
    case "right":
      return "to right";
    case "up":
      return "to top";
    case "down":
      return "to bottom";
    default:
      return "to bottom";
  }
}

/**
 * Real camera height in mm, when the plate's face was measured in the real
 * world and the eye line is a known fraction of that face. This is the honest
 * scale check: a foyer wall's eye line must land near 1500–1750 mm, or the
 * quad — not the artwork — is wrong.
 */
export function cameraHeightMm(
  space: SceneSpace,
  quad: SceneQuad,
  surface: { hMm: number },
  faceBottomMm = 0,
): number | null {
  if (space.eyeLine === null) return null;
  const b = quadBounds(quad);
  if (!(b.h > 0)) return null;
  // Fraction of the face height, measured up from its bottom edge.
  const fromBottom = (b.y + b.h - space.eyeLine) / b.h;
  const mm = faceBottomMm + fromBottom * surface.hMm;
  return Number.isFinite(mm) ? Math.round(mm) : null;
}

/** Human-readable eye height for captions, e.g. "eye 1.6 m". */
export function eyeHeightLabel(mm: number | null): string | null {
  if (mm === null) return null;
  return `eye ${(mm / 1000).toFixed(2)} m`;
}

const AXIS_WORD: Record<DepthAxis, string> = {
  none: "square to the lens",
  left: "running away to the left",
  right: "running away to the right",
  up: "receding upward",
  down: "receding toward the floor",
};

/** One-line spatial read for a preview caption. */
export function spaceLabel(space: SceneSpace): string {
  const parts = [AXIS_WORD[space.depthAxis]];
  if (space.depthAxis !== "none") parts.push(`near end ${space.depthRatio.toFixed(2)}×`);
  parts.push(
    space.attitude === "level"
      ? "lens level"
      : space.attitude === "looking-up"
        ? "lens tilted up"
        : "lens tilted down",
  );
  return parts.join(" · ");
}

/**
 * Physical plausibility of a measured quad. These are the failures that read as
 * wrong to the eye even when the corners "look" fine in a coordinate list.
 */
export function spaceWarnings(space: SceneSpace, quad: SceneQuad): string[] {
  const out: string[] = [];
  if (!isConvex(quad)) out.push("face corners are not a convex quad (bow-tie or folded face)");
  if (space.depthRatio > 3.4)
    out.push(`near end is ${space.depthRatio.toFixed(2)}× the far end — implausibly steep`);
  if (space.eyeLine !== null && (space.eyeLine < -3 || space.eyeLine > 4))
    out.push("horizon falls absurdly far off the plate");
  return out;
}

/** True when the four corners wind consistently — a real, unfolded face. */
export function isConvex(quad: SceneQuad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i]!;
    const b = quad[(i + 1) % 4]!;
    const c = quad[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
}
