// Cutting an exact room cell out of the issued QEII Centre plan blocks.
//
// The issued artwork draws a whole wing as one filled block and then draws the
// internal walls on top as white stroked runs. So a room like Churchill has no
// polygon of its own: to fill the space a room actually occupies we have to cut
// the block along those wall runs and keep the piece the room name sits in.
//
// The cut is a real geometric difference of straight-edged outlines, so every
// corner and diagonal in the result is the angle the issued artwork drew — no
// tracing, no rasterising, no rounding of walls into steps. The same cut cell
// travels to the screen plan, the SVG, Illustrator, PowerPoint and Word, so a
// coloured room is the identical shape in every format.
//
// If the walls do not close a room (an open doorway, a run the artwork leaves
// off), the cut piece is the whole block again — that is reported plainly rather
// than painting a neighbour's space.

import * as clip from "polygon-clipping";
import { qeiiRings, qeiiRingArea, qeiiInRing, type QeiiRing } from "@/lib/next-london-qeii-geometry";
import type { QeiiFloorVector, QeiiShape } from "@/lib/next-london-qeii-vectors";

type Pt = [number, number];
type Ring = Pt[];
type Poly = Ring[];
type MultiPoly = Poly[];

/** Coordinates are snapped to this many decimals so the cut is stable. */
const PRECISION = 1000;
const snap = (n: number): number => Math.round(n * PRECISION) / PRECISION;

/**
 * Extra width added to each wall run before it is cut out of a block.
 *
 * The wall is drawn on top of the fill, so cutting slightly wider than the drawn
 * line keeps a colour from showing as a hairline along a wall.
 */
const WALL_BITE = 0.35;

/** Every drawn run of a stroked path, as a list of points in plan units. */
export function qeiiStrokeRuns(d: string): Pt[][] {
  const tokens = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const push = (x: number, y: number) => run.push([x, y]);
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/^[MLCZmlcz]$/.test(t)) {
      cmd = t.toUpperCase();
      i += 1;
      if (cmd === "M") {
        if (run.length > 1) runs.push(run);
        run = [];
      }
      if (cmd === "Z" && run.length > 1) {
        run.push([run[0]![0], run[0]![1]]);
      }
      continue;
    }
    if (cmd === "M" || cmd === "L") {
      push(num(), num());
      if (cmd === "M") cmd = "L";
    } else if (cmd === "C") {
      num();
      num();
      num();
      num();
      push(num(), num());
    } else {
      i += 1;
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** One wall run widened into a closed outline, so it can be cut from a block. */
function runBand(run: Pt[], half: number): MultiPoly {
  const parts: MultiPoly = [];
  for (let i = 0; i + 1 < run.length; i += 1) {
    const [x1, y1] = run[i]!;
    const [x2, y2] = run[i + 1]!;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    // Unit along the run and across it; the band is extended by its own half
    // width at each end so two runs meeting at a corner cut cleanly.
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * half;
    const ny = ux * half;
    const ax = x1 - ux * half;
    const ay = y1 - uy * half;
    const bx = x2 + ux * half;
    const by = y2 + uy * half;
    parts.push([
      [
        [snap(ax + nx), snap(ay + ny)],
        [snap(bx + nx), snap(by + ny)],
        [snap(bx - nx), snap(by - ny)],
        [snap(ax - nx), snap(ay - ny)],
        [snap(ax + nx), snap(ay + ny)],
      ],
    ]);
  }
  return parts;
}

function ringToClip(ring: QeiiRing): Ring {
  const pts = ring.pts.map(([x, y]) => [snap(x), snap(y)] as Pt);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) pts.push([first[0], first[1]]);
  return pts;
}

function polyArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i + 1 < ring.length; i += 1) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function inClipRing(ring: Ring, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** A cut polygon written back as SVG path data in plan units. */
export function qeiiPolyPath(poly: Poly): string {
  return poly
    .map((ring) => {
      const pts = ring.slice();
      if (pts.length > 1) {
        const a = pts[0]!;
        const b = pts[pts.length - 1]!;
        if (a[0] === b[0] && a[1] === b[1]) pts.pop();
      }
      return (
        pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z"
      );
    })
    .join(" ");
}

export type QeiiRoomCell = {
  room: string;
  /** Index of the block the room is drawn inside. */
  shapeIndex: number;
  /** The cut outline, as SVG path data in plan units. */
  d: string;
  /** Share of the block this cell takes; a whole-block cell is not a room. */
  share: number;
};

/** Largest filled outline of a shape that holds a point. */
function holdingRing(shape: QeiiShape, x: number, y: number): QeiiRing | undefined {
  let best: { ring: QeiiRing; area: number } | undefined;
  for (const ring of qeiiRings(shape.d)) {
    if (!qeiiInRing(ring, x, y)) continue;
    const area = qeiiRingArea(ring);
    if (area <= 0) continue;
    if (!best || area > best.area) best = { ring, area };
  }
  return best?.ring;
}

/**
 * Cut the block holding a point along every wall run that crosses it, and return
 * the piece the point sits in.
 *
 * `undefined` means the walls do not enclose the point — nothing is coloured on
 * a guess.
 */
export function qeiiCutCell(
  floor: QeiiFloorVector,
  shapeIndex: number,
  x: number,
  y: number,
): { d: string; share: number } | undefined {
  const block = floor.shapes[shapeIndex];
  if (!block?.fill) return undefined;
  const ring = holdingRing(block, x, y);
  if (!ring) return undefined;
  const outer: Poly = [ringToClip(ring)];
  const blockArea = polyArea(outer[0]!);
  if (blockArea <= 0) return undefined;

  const xs = outer[0]!.map((p) => p[0]);
  const ys = outer[0]!.map((p) => p[1]);
  const bx0 = Math.min(...xs);
  const bx1 = Math.max(...xs);
  const by0 = Math.min(...ys);
  const by1 = Math.max(...ys);

  const bands: MultiPoly = [];
  for (const shape of floor.shapes) {
    if (!shape.stroke) continue;
    const half = Math.max((shape.w ?? 1) / 2, 0.2) + WALL_BITE;
    for (const run of qeiiStrokeRuns(shape.d)) {
      // Only runs that reach into this block can cut it.
      const touches = run.some(
        ([rx, ry]) => rx >= bx0 - 2 && rx <= bx1 + 2 && ry >= by0 - 2 && ry <= by1 + 2,
      );
      if (!touches) continue;
      bands.push(...runBand(run, half));
    }
  }
  if (!bands.length) return undefined;

  let pieces: MultiPoly;
  try {
    pieces = clip.difference(outer as never, bands as never) as unknown as MultiPoly;
  } catch {
    return undefined;
  }
  const hit = pieces.find((poly) => poly[0] && inClipRing(poly[0], x, y));
  if (!hit || !hit[0]) return undefined;
  const area = polyArea(hit[0]) - hit.slice(1).reduce((s, h) => s + polyArea(h), 0);
  if (area <= 0) return undefined;
  return { d: qeiiPolyPath(hit), share: area / blockArea };
}

/** A cut cell only counts as a room when the walls really close it off. */
export const QEII_CELL_MAX_SHARE = 0.9;
