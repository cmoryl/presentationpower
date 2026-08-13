// Snapping + geometry helpers for the direct-manipulation slide canvas.
//
// Everything works in stage units (1920 × 1080) so the same math applies at any
// rendered scale. Snap targets, in priority order of usefulness:
//   • slide edges and centers
//   • the safe margin frame
//   • sibling object edges and centers
//   • a coarse grid (fallback when nothing else is near)

export const STAGE_W = 1920;
export const STAGE_H = 1080;
export const MARGIN_X = 96;
export const MARGIN_Y = 64;
export const GRID = 20;
export const SNAP_TOLERANCE = 10;

export type Box = { x: number; y: number; w: number; h: number };
export type Guide = { axis: "x" | "y"; at: number; kind: "edge" | "center" | "margin" | "object" };

type Target = { at: number; kind: Guide["kind"] };

/**
 * Precomputed snap targets for one drag gesture.
 *
 * Sibling geometry does not change while a drag is in flight, so the editor
 * builds these once on pointer-down instead of rebuilding 3n targets per axis
 * on every pointer-move (which is what made big decks feel sticky).
 */
export type SnapTargets = { x: Target[]; y: Target[] };

function axisTargets(axis: "x" | "y", others: readonly Box[]): Target[] {
  const max = axis === "x" ? STAGE_W : STAGE_H;
  const margin = axis === "x" ? MARGIN_X : MARGIN_Y;
  const out: Target[] = [
    { at: 0, kind: "edge" },
    { at: max, kind: "edge" },
    { at: max / 2, kind: "center" },
    { at: margin, kind: "margin" },
    { at: max - margin, kind: "margin" },
  ];
  for (const o of others) {
    const start = axis === "x" ? o.x : o.y;
    const size = axis === "x" ? o.w : o.h;
    out.push(
      { at: start, kind: "object" },
      { at: start + size / 2, kind: "object" },
      { at: start + size, kind: "object" },
    );
  }
  return out;
}

export function buildSnapTargets(others: readonly Box[]): SnapTargets {
  return { x: axisTargets("x", others), y: axisTargets("y", others) };
}


/** Best snap for a set of candidate edge positions along one axis. */
function bestSnap(
  edges: { value: number; offset: number }[],
  targets: Target[],
  tolerance: number,
): { delta: number; guide: Guide } | null {
  let best: { delta: number; guide: Guide; dist: number } | null = null;
  for (const e of edges) {
    for (const t of targets) {
      const dist = Math.abs(t.at - e.value);
      if (dist > tolerance) continue;
      if (best && dist >= best.dist) continue;
      best = {
        dist,
        delta: t.at - e.value,
        guide: { axis: "x", at: t.at, kind: t.kind },
      };
    }
  }
  return best ? { delta: best.delta, guide: best.guide } : null;
}

export type SnapResult = { box: Box; guides: Guide[] };

/**
 * Snap a moving box (or selection bounds) against the stage and siblings.
 * Pass `opts.targets` (from `buildSnapTargets`) to skip rebuilding targets.
 */
export function snapMove(
  box: Box,
  others: readonly Box[],
  opts: { enabled: boolean; tolerance?: number; targets?: SnapTargets } = { enabled: true },
): SnapResult {
  if (!opts.enabled) return { box: roundBox(box), guides: [] };
  const tol = opts.tolerance ?? SNAP_TOLERANCE;
  const targets = opts.targets ?? buildSnapTargets(others);
  const guides: Guide[] = [];
  let { x, y } = box;

  const hx = bestSnap(
    [
      { value: box.x, offset: 0 },
      { value: box.x + box.w / 2, offset: box.w / 2 },
      { value: box.x + box.w, offset: box.w },
    ],
    targets.x,
    tol,
  );
  if (hx) {
    x += hx.delta;
    guides.push({ ...hx.guide, axis: "x" });
  }

  const hy = bestSnap(
    [
      { value: box.y, offset: 0 },
      { value: box.y + box.h / 2, offset: box.h / 2 },
      { value: box.y + box.h, offset: box.h },
    ],
    targets.y,
    tol,
  );

  if (hy) {
    y += hy.delta;
    guides.push({ ...hy.guide, axis: "y" });
  }

  // Nothing nearby → fall back to the grid so freehand drags still land clean.
  if (!hx) x = Math.round(x / GRID) * GRID;
  if (!hy) y = Math.round(y / GRID) * GRID;

  return { box: roundBox({ ...box, x, y }), guides };
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Resize from a handle, snapping only the edges the handle actually moves. */
export function snapResize(
  start: Box,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  others: readonly Box[],
  opts: {
    enabled: boolean;
    minW?: number;
    minH?: number;
    tolerance?: number;
    targets?: SnapTargets;
  } = { enabled: true },

): SnapResult {
  const minW = opts.minW ?? 40;
  const minH = opts.minH ?? 24;
  const tol = opts.tolerance ?? SNAP_TOLERANCE;
  const guides: Guide[] = [];

  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;

  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.startsWith("n");
  const south = handle.startsWith("s");

  if (west) left += dx;
  if (east) right += dx;
  if (north) top += dy;
  if (south) bottom += dy;

  if (opts.enabled) {
    const targets = opts.targets ?? buildSnapTargets(others);
    const tx = targets.x;
    const ty = targets.y;

    if (west) {
      const s = bestSnap([{ value: left, offset: 0 }], tx, tol);
      if (s) {
        left += s.delta;
        guides.push({ ...s.guide, axis: "x" });
      }
    }
    if (east) {
      const s = bestSnap([{ value: right, offset: 0 }], tx, tol);
      if (s) {
        right += s.delta;
        guides.push({ ...s.guide, axis: "x" });
      }
    }
    if (north) {
      const s = bestSnap([{ value: top, offset: 0 }], ty, tol);
      if (s) {
        top += s.delta;
        guides.push({ ...s.guide, axis: "y" });
      }
    }
    if (south) {
      const s = bestSnap([{ value: bottom, offset: 0 }], ty, tol);
      if (s) {
        bottom += s.delta;
        guides.push({ ...s.guide, axis: "y" });
      }
    }
  }

  if (right - left < minW) {
    if (west) left = right - minW;
    else right = left + minW;
  }
  if (bottom - top < minH) {
    if (north) top = bottom - minH;
    else bottom = top + minH;
  }

  return {
    box: roundBox({ x: left, y: top, w: right - left, h: bottom - top }),
    guides,
  };
}

export function roundBox(b: Box): Box {
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
}

export function boundsOf(boxes: readonly Box[]): Box {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  // Single pass, no array spreads — this runs on every pointer-move.
  let x = Infinity;
  let y = Infinity;
  let r = -Infinity;
  let bt = -Infinity;
  for (const b of boxes) {
    if (b.x < x) x = b.x;
    if (b.y < y) y = b.y;
    if (b.x + b.w > r) r = b.x + b.w;
    if (b.y + b.h > bt) bt = b.y + b.h;
  }
  return { x, y, w: r - x, h: bt - y };
}


/** Keep a box inside the stage while allowing deliberate partial bleed. */
export function clampToStage(b: Box, allowBleed = 0.5): Box {
  const slackX = b.w * allowBleed;
  const slackY = b.h * allowBleed;
  return {
    ...b,
    x: Math.max(-slackX, Math.min(STAGE_W - b.w + slackX, b.x)),
    y: Math.max(-slackY, Math.min(STAGE_H - b.h + slackY, b.y)),
  };
}

export function rectsIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
