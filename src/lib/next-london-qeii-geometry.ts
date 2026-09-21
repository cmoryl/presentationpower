// Shared geometry for the natively rebuilt QEII Centre floor plans.
//
// The issued artwork is filled polygons and stroked wall lines. Both the room
// colouring and the typesetting engine need to ask the same geometric questions —
// which drawn shape holds a point, how big that shape is, and where its edges
// run — so those primitives live here once rather than twice.

import type { QeiiShape } from "@/lib/next-london-qeii-vectors";

export type QeiiRing = { pts: [number, number][] };
export type QeiiRect = { x0: number; y0: number; x1: number; y1: number };

/** Every closed outline in a path, in sheet units. */
export function qeiiRings(d: string): QeiiRing[] {
  const out: QeiiRing[] = [];
  let pts: [number, number][] = [];
  const tokens = d.match(/[MLZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t === "M" || t === "L") {
      const x = Number(tokens[i + 1]);
      const y = Number(tokens[i + 2]);
      if (t === "M" && pts.length > 2) {
        out.push({ pts });
        pts = [];
      }
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
      i += 3;
      continue;
    }
    if (t === "Z") {
      if (pts.length > 2) out.push({ pts });
      pts = [];
      i += 1;
      continue;
    }
    i += 1;
  }
  if (pts.length > 2) out.push({ pts });
  return out;
}

export function qeiiRingArea(ring: QeiiRing): number {
  let a = 0;
  for (let i = 0; i < ring.pts.length; i += 1) {
    const [x1, y1] = ring.pts[i]!;
    const [x2, y2] = ring.pts[(i + 1) % ring.pts.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Even-odd point test against one outline. */
export function qeiiInRing(ring: QeiiRing, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.pts.length - 1; i < ring.pts.length; j = i, i += 1) {
    const [xi, yi] = ring.pts[i]!;
    const [xj, yj] = ring.pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function qeiiRingBox(ring: QeiiRing): QeiiRect {
  const xs = ring.pts.map((p) => p[0]);
  const ys = ring.pts.map((p) => p[1]);
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
}

/** Bounding box of a whole path, or undefined when it holds no outline. */
export function qeiiShapeBox(shape: QeiiShape): QeiiRect | undefined {
  const rs = qeiiRings(shape.d);
  if (!rs.length) return undefined;
  const boxes = rs.map(qeiiRingBox);
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

/** Whether a filled shape holds a point, and the area of the outline that does. */
export function qeiiShapeHolds(shape: QeiiShape, x: number, y: number): { held: boolean; area: number } {
  if (!shape.fill) return { held: false, area: 0 };
  let held = false;
  let area = 0;
  for (const ring of qeiiRings(shape.d)) {
    if (qeiiInRing(ring, x, y)) {
      held = !held;
      area = Math.max(area, qeiiRingArea(ring));
    }
  }
  return { held, area };
}

/**
 * The tightest outline that holds a point, across every drawn shape.
 *
 * Used to keep a room's name, event line and lockup inside the space the
 * artwork actually draws for that room.
 */
export function qeiiHolderBox(shapes: QeiiShape[], x: number, y: number): QeiiRect | undefined {
  let best: { area: number; box: QeiiRect } | undefined;
  for (const shape of shapes) {
    if (!shape.fill) continue;
    for (const ring of qeiiRings(shape.d)) {
      if (!qeiiInRing(ring, x, y)) continue;
      const area = qeiiRingArea(ring);
      if (area <= 0) continue;
      if (!best || area < best.area) best = { area, box: qeiiRingBox(ring) };
    }
  }
  return best?.box;
}

export function qeiiRectsOverlap(a: QeiiRect, b: QeiiRect, pad = 0): boolean {
  return a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
}

export function qeiiRectInside(inner: QeiiRect, outer: QeiiRect, pad = 0): boolean {
  return (
    inner.x0 >= outer.x0 + pad &&
    inner.y0 >= outer.y0 + pad &&
    inner.x1 <= outer.x1 - pad &&
    inner.y1 <= outer.y1 - pad
  );
}

/**
 * Small drawn objects a room name must not print over: lift symbols, WC and
 * accessibility glyphs, stair runs, the marker dots. Anything under this share
 * of the plan area is treated as an object rather than a space.
 */
export const QEII_OBJECT_AREA_SHARE = 0.004;

export function qeiiObjectBoxes(shapes: QeiiShape[], planArea: number): QeiiRect[] {
  const limit = planArea * QEII_OBJECT_AREA_SHARE;
  const out: QeiiRect[] = [];
  for (const shape of shapes) {
    // Only drawn objects count: a filled glyph or marker. Stroked wall runs are
    // the room's own outline, and a caption is allowed to sit against one.
    if (!shape.fill) continue;
    for (const ring of qeiiRings(shape.d)) {
      const box = qeiiRingBox(ring);
      const w = box.x1 - box.x0;
      const h = box.y1 - box.y0;
      if (w <= 0 || h <= 0) continue;
      if (w * h > limit) continue;
      out.push(box);
    }
  }
  return out;
}
