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
function runBand(run: Pt[], half: number, bridge = 0): MultiPoly {
  const parts: MultiPoly = [];
  const last = run.length - 1;
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
    // A run that stops a hair short of the block wall leaves the two spaces joined,
    // so the first and last segment may be carried a little further along their own
    // direction to close that gap. The direction is the issued line's own, never a
    // guessed one.
    const startPad = half + (i === 0 ? bridge : 0);
    const endPad = half + (i + 1 === last ? bridge : 0);
    const ax = x1 - ux * startPad;
    const ay = y1 - uy * startPad;
    const bx = x2 + ux * endPad;
    const by = y2 + uy * endPad;
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

/**
 * Tidy a cut outline so it opens as clean vector artwork.
 *
 * A boolean subtraction leaves hairline anchors where wall bands cross: points a
 * ten-thousandth of a unit apart, and long straight runs broken into dozens of
 * micro-segments. They are invisible on screen but they are what makes an edge
 * look ragged when a vendor zooms in, and they turn one wall into a hundred
 * anchor points in Illustrator. Only noise is removed: every point kept sits on
 * the issued line within 0.04 plan units, so real corners and angles survive
 * exactly as drawn.
 */
export function qeiiTidyPoly(poly: Poly): Poly {
  const EPS = 0.04;
  const out: Poly = [];
  for (const ring of poly) {
    const pts: Ring = [];
    for (const p of ring) {
      const q: Pt = [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
      const last = pts[pts.length - 1];
      if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) < EPS) continue;
      pts.push(q);
    }
    // Closing point is implicit in the path data.
    while (pts.length > 1) {
      const a = pts[0]!;
      const b = pts[pts.length - 1]!;
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) >= EPS) break;
      pts.pop();
    }
    // Drop points that sit on the straight line between their neighbours.
    let changed = true;
    while (changed && pts.length > 3) {
      changed = false;
      for (let i = 0; i < pts.length && pts.length > 3; i += 1) {
        const a = pts[(i - 1 + pts.length) % pts.length]!;
        const b = pts[i]!;
        const c = pts[(i + 1) % pts.length]!;
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (len === 0) continue;
        const dev =
          Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / len;
        if (dev < EPS) {
          pts.splice(i, 1);
          i -= 1;
          changed = true;
        }
      }
    }
    if (pts.length < 3) continue;
    const closed: Ring = [...pts, [pts[0]![0], pts[0]![1]]];
    // A sliver this small is subtraction debris, not a piece of the room.
    if (polyArea(closed) < 0.75) continue;
    out.push(closed);
  }
  return out;
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

/**
 * Whether a fill is the pale ink the issued sheets draw walls and partitions in.
 *
 * Only a near-white fill counts: a coloured block is a space, not a wall.
 */
function isWallFill(hex: string): boolean {
  const v = hex.replace("#", "");
  if (v.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.85;
}

/** Longest gap between two dots of the same dotted partition line, in plan units. */
const DOT_LINK = 4;
/** A near-white fill this small is a dot of a dotted partition, not a wall block. */
const DOT_AREA = 4;

/**
 * The issued sheets draw movable partitions as a dotted line: a chain of tiny
 * near-white squares. Each chain is joined into one run so the partition cuts the
 * block like any other wall. Only dots that really are in one chain are joined —
 * no line is invented between separate marks.
 */
function dottedRuns(dots: Pt[]): Pt[][] {
  const used = new Array<boolean>(dots.length).fill(false);
  const runs: Pt[][] = [];
  const near = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= DOT_LINK;
  for (let i = 0; i < dots.length; i += 1) {
    if (used[i]) continue;
    used[i] = true;
    const run: Pt[] = [dots[i]!];
    // Walk forwards from this dot, then backwards from the start, so the run
    // follows the chain in drawn order.
    for (const dir of [0, 1]) {
      let end = run[dir === 0 ? run.length - 1 : 0]!;
      for (;;) {
        let next = -1;
        let best = Infinity;
        for (let j = 0; j < dots.length; j += 1) {
          if (used[j] || !near(end, dots[j]!)) continue;
          const dist = Math.hypot(end[0] - dots[j]![0], end[1] - dots[j]![1]);
          if (dist < best) {
            best = dist;
            next = j;
          }
        }
        if (next < 0) break;
        used[next] = true;
        end = dots[next]!;
        if (dir === 0) run.push(end);
        else run.unshift(end);
      }
    }
    if (run.length >= 4) runs.push(run);
  }
  return runs;
}

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
  others: { x: number; y: number }[] = [],
  bridge = 0,
  /** Reviewer-authorised divider runs, for a space the venue draws undivided. */
  extraRuns: Pt[][] = [],
): { d: string; share: number; planShare: number } | undefined {
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
  const dots: Pt[] = [];
  const reaches = (pts: Pt[]) =>
    pts.some(([rx, ry]) => rx >= bx0 - 2 && rx <= bx1 + 2 && ry >= by0 - 2 && ry <= by1 + 2);
  // Some issued sheets draw the walls as white filled shapes on top of the block
  // rather than as stroked runs. Both cut the block the same way.
  for (const shape of floor.shapes) {
    if (!shape.fill || shape.fill === block.fill) continue;
    if (!isWallFill(shape.fill)) continue;
    for (const ring of qeiiRings(shape.d)) {
      const clipped = ringToClip(ring);
      if (!reaches(clipped)) continue;
      const area = polyArea(clipped);
      // A shape at least as big as the block is the sheet ground, not a wall.
      if (area <= 0 || area >= blockArea * 0.9) continue;
      if (area <= DOT_AREA) {
        const cx = clipped.reduce((t, p) => t + p[0], 0) / clipped.length;
        const cy = clipped.reduce((t, p) => t + p[1], 0) / clipped.length;
        dots.push([cx, cy]);
        continue;
      }
      bands.push([clipped]);
    }
  }
  // Neighbouring spaces the sheet draws as their own blocks overlapping this one
  // (a wing drawn on top, a service core) are not part of this room either, so
  // the colour is trimmed off them rather than showing past the walls.
  floor.shapes.forEach((shape, index) => {
    if (index === shapeIndex || !shape.fill || isWallFill(shape.fill)) return;
    for (const ring of qeiiRings(shape.d)) {
      if (qeiiInRing(ring, x, y)) continue;
      const clipped = ringToClip(ring);
      if (!reaches(clipped)) continue;
      const area = polyArea(clipped);
      if (area <= DOT_AREA || area >= blockArea * 0.9) continue;
      bands.push([clipped]);
    }
  });
  for (const run of dottedRuns(dots)) bands.push(...runBand(run, 1.1 + WALL_BITE, bridge));
  // A divider the reviewer asked for cuts the block exactly like a drawn wall.
  for (const run of extraRuns) bands.push(...runBand(run, 1.1 + WALL_BITE, bridge));
  for (const shape of floor.shapes) {
    if (!shape.stroke) continue;
    const half = Math.max((shape.w ?? 1) / 2, 0.2) + WALL_BITE;
    for (const run of qeiiStrokeRuns(shape.d)) {
      // Only runs that reach into this block can cut it.
      if (!reaches(run)) continue;
      bands.push(...runBand(run, half, bridge));
    }
  }
  if (!bands.length) return undefined;

  let pieces: MultiPoly;
  try {
    pieces = clip.difference(outer as never, bands as never) as unknown as MultiPoly;
  } catch {
    return undefined;
  }
  const raw = pieces.find((poly) => poly[0] && inClipRing(poly[0], x, y));
  if (!raw || !raw[0]) return undefined;
  // The piece is only this room's when no other room's label sits in it. Two labels
  // in one piece means the wall between them is not drawn in the issued artwork.
  if (others.some((o) => inClipRing(raw[0]!, o.x, o.y))) return undefined;
  const hit = qeiiTidyPoly(raw);
  if (!hit[0]) return undefined;
  // The tidy pass must not move the room out from under its own label.
  if (!inClipRing(hit[0], x, y)) return undefined;
  const area = polyArea(hit[0]) - hit.slice(1).reduce((s, h) => s + polyArea(h), 0);
  if (area <= 0) return undefined;
  const planArea = floor.w * floor.h;
  return {
    d: qeiiPolyPath(hit),
    share: area / blockArea,
    planShare: planArea > 0 ? area / planArea : 1,
  };
}


/**
 * Cut a room cell, carrying wall runs a little further along their own direction
 * if the first pass leaves two rooms joined. Returns `undefined` when no pass
 * closes the room — nothing is coloured on a guess.
 */
export function qeiiCutRoomCell(
  floor: QeiiFloorVector,
  shapeIndex: number,
  x: number,
  y: number,
  others: { x: number; y: number }[] = [],
  extraRuns: Pt[][] = [],
): { d: string; share: number; planShare: number } | undefined {
  // A few issued wall runs stop farther short of the adjoining outer wall than
  // the early floors do (notably Moore/Rutherford and the ground-floor service
  // bays). Continue only along the line's own issued angle; never draw a new
  // divider between labels.
  for (const bridge of [0, 2, 4, 8, 12, 16, 24]) {
    const cut = qeiiCutCell(floor, shapeIndex, x, y, others, bridge, extraRuns);
    if (cut) return cut;
  }
  return undefined;
}

/** A cut cell only counts as a room when the walls really close it off. */
export const QEII_CELL_MAX_SHARE = 0.9;

/**
 * A cut piece bigger than this share of the sheet is the circulation ground, not
 * a room — a goods-lift or entrance caption printed on the open floor. Those keep
 * a colour tag behind the name instead of flooding the plan.
 */
export const QEII_CELL_MAX_PLAN_SHARE = 0.22;
