// -----------------------------------------------------------------------------
// QEII Centre floor plans — the drawing itself, as shapes an Office file can
// carry.
//
// The plan geometry in next-london-qeii-vectors.ts is the issued artwork, path
// for path. This module turns that geometry into plain segment lists, inked the
// same way the on-screen plan inks it, so PowerPoint and Word can each rebuild
// the drawing as real shapes instead of showing a picture of it.
// -----------------------------------------------------------------------------

import { qeiiCellsByShape, qeiiColourPaint } from "@/lib/next-london-qeii-rooms";
import { qeiiRepeatedSymbolShapes, qeiiWallWidth } from "@/lib/next-london-qeii-symbols";
import { qeiiPlanInk, type QeiiPlanOptions } from "@/lib/next-london-qeii-plan";
import { qeiiLookWallWeight, qeiiStyledPaint } from "@/lib/next-london-qeii-style";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiSeg =
  | { k: "M"; x: number; y: number }
  | { k: "L"; x: number; y: number }
  | { k: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { k: "Z" };

/** One drawn shape of a plan: its outline plus the ink it carries. */
export type QeiiDrawShape = {
  segs: QeiiSeg[];
  fill?: string;
  stroke?: string;
  /** Stroke width in plan units. */
  strokeW: number;
  /**
   * Shapes sharing a group name travel as one selection in the exports — a
   * division lockup is one object to move, not dozens of separate outlines.
   */
  group?: string;
  /** Human-readable object name exposed by PowerPoint and Word. */
  name?: string;
};


/**
 * Read an issued path into segments, in plan units.
 *
 * The imported geometry only ever uses absolute M, L, C and Z, but relative
 * commands are read too so a hand-added path cannot silently vanish.
 */
export function qeiiPathSegs(d: string): QeiiSeg[] {
  const tokens = d.match(/[MLCZmlcz]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const out: QeiiSeg[] = [];
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/^[MLCZmlcz]$/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === "Z" || cmd === "z") {
        out.push({ k: "Z" });
        cx = sx;
        cy = sy;
      }
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const base = rel ? { x: cx, y: cy } : { x: 0, y: 0 };
    if (cmd === "M" || cmd === "m") {
      const x = base.x + num();
      const y = base.y + num();
      out.push({ k: "M", x, y });
      cx = sx = x;
      cy = sy = y;
      // A repeated pair after M continues as a line, per SVG.
      cmd = rel ? "l" : "L";
    } else if (cmd === "L" || cmd === "l") {
      const x = base.x + num();
      const y = base.y + num();
      out.push({ k: "L", x, y });
      cx = x;
      cy = y;
    } else if (cmd === "C" || cmd === "c") {
      const x1 = base.x + num();
      const y1 = base.y + num();
      const x2 = base.x + num();
      const y2 = base.y + num();
      const x = base.x + num();
      const y = base.y + num();
      out.push({ k: "C", x1, y1, x2, y2, x, y });
      cx = x;
      cy = y;
    } else {
      i += 1;
    }
  }
  return out;
}

/**
 * Every drawn shape of a plan, inked exactly as the plan inks it on screen —
 * same hidden repeated symbols, same room colouring, same wall weight.
 */
export function qeiiDrawShapes(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): QeiiDrawShape[] {
  const face = options.face ?? "issued";
  // The master style sheet decides the look, so a download matches the screen.
  const paint = qeiiStyledPaint(qeiiColourPaint(floor, options.roomColours ?? {}), face);
  const cellsByShape = qeiiCellsByShape(paint);
  const hidden = options.showAllSymbols ? new Set<number>() : qeiiRepeatedSymbolShapes(floor);
  const wall = qeiiLookWallWeight(face, options.wallWeight);
  const gain = qeiiWallGain(floor.id);
  const out: QeiiDrawShape[] = [];
  floor.shapes.forEach((s, i) => {
    if (hidden.has(i)) return;
    const segs = qeiiPathSegs(s.d);
    if (!segs.length) return;
    const fill = paint.fills.get(i) ?? qeiiPlanInk(s.fill, face);
    const stroke = qeiiPlanInk(s.stroke, face);
    out.push({
      segs,
      fill: fill ?? undefined,
      stroke: stroke ?? undefined,
      strokeW: stroke ? qeiiWallWidth(s, wall, gain) : 0,
    });

    // Rooms drawn inside this block, cut along the issued wall runs, so a colour
    // fills the whole room as its own editable shape in PowerPoint and Word.
    for (const cell of cellsByShape.get(i) ?? []) {
      const cellSegs = qeiiPathSegs(cell.d);
      if (cellSegs.length)
        out.push({
          segs: cellSegs,
          fill: cell.hex ?? qeiiPlanInk(s.fill, face) ?? undefined,
          strokeW: 0,
          name: `Room — ${cell.room}`,
        });
    }
  });
  return out;
}

/** Outer bounds of a segment list, in plan units. */
export function qeiiSegsBox(segs: QeiiSeg[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const hit = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  };
  for (const s of segs) {
    if (s.k === "Z") continue;
    hit(s.x, s.y);
    if (s.k === "C") {
      hit(s.x1, s.y1);
      hit(s.x2, s.y2);
    }
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  return { x0, y0, x1, y1 };
}
