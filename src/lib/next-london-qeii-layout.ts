// Layout engine for the natively rebuilt QEII Centre floor plans.
//
// The issued artwork records each room name with the font size the venue's own
// PDF used on a differently scaled page, so printing that number straight onto
// our cropped plan sets the type far too large. This module owns every typesetting
// decision for a rebuilt plan:
//
//   * one calibrated type scale, floored and ceilinged against the plan extent,
//   * multi-line room names rebuilt from the separate lines the sheet prints,
//   * a deterministic collision pass so a room name, its event line and its
//     division lockup never sit on top of another room's block,
//   * hard clamping inside the plan, so nothing runs off the sheet edge.
//
// A room name is never dropped: if a block cannot be made to fit, the event line
// and the lockup come off first and the reason is reported back in plain language
// for the page to show. The ground behind a plan stays a solid brand token.

import {
  spaceUseLine,
  spaceUseLineWithoutDivisions,
  spaceUseMarks,
  type SpaceUseMark,
} from "@/lib/next-london-space-use";
import type { QeiiFloorVector, QeiiLabel } from "@/lib/next-london-qeii-vectors";
import { qeiiRoomEdit, type QeiiMapEdits } from "@/lib/qeii-map-edits";

import {
  qeiiHolderBox,
  qeiiObjectBoxes,
  qeiiRectInside,
  qeiiRectsOverlap,
  type QeiiRect,
} from "@/lib/next-london-qeii-geometry";

/**
 * Issued cap-height → rendered em size.
 *
 * Measured against the issued sheets: a 4th-floor room name prints at about
 * 2.5% of the plan width, where the recorded number would set it at 3.7%.
 */
export const QEII_LABEL_EM = 0.66;

/** Type floor and ceiling as a share of the plan width, so no sheet shouts. */
export const QEII_LABEL_MIN_SHARE = 0.013;
export const QEII_LABEL_MAX_SHARE = 0.042;

/** The event line and the lockup are set from the room name's size. */
export const QEII_USE_RATIO = 0.74;
export const QEII_MARK_RATIO = 1.9;

export type QeiiLayoutOptions = {
  labelScale?: number;
  showUse?: boolean;
  showMarks?: boolean;
  /** Multiplies the division lockup height; 1 keeps the house setting. */
  markScale?: number;
  /** Saved live edits: corrected names, corrected lines, nudged positions. */
  edits?: QeiiMapEdits;
};

export type QeiiBox = { x0: number; y0: number; x1: number; y1: number };

export type QeiiLayoutBlock = {
  key: string;
  /** The room name as the venue issued it — the key every edit is held under. */
  room: string;
  /** Centre of the first name line. */
  x: number;
  y: number;
  angle: number;
  /** Rendered em size of the room name. */
  size: number;
  /** The name exactly as the sheet prints it, one entry per printed line. */
  lines: string[];
  /** What the space holds at the event, or undefined when it is not printed. */
  use?: string;
  /**
   * The event line as it prints, one entry per row. A long line in a narrow slot
   * is broken over its own words rather than printed wider than the room.
   */
  useLines: string[];
  useSize: number;
  marks: SpaceUseMark[];
  markH: number;
  box: QeiiBox;
};


export type QeiiLayout = {
  blocks: QeiiLayoutBlock[];
  /** Plain-language record of anything the layout had to hold back. */
  notes: string[];
};

/** Rough advance width per character for Geist at semibold, in em. */
function advance(ch: string): number {
  if (" ·.,'’:;!|il".includes(ch)) return 0.31;
  if ("ftrj()[]-".includes(ch)) return 0.42;
  if ("mwMW".includes(ch)) return 0.92;
  if (ch >= "A" && ch <= "Z") return 0.66;
  if (ch >= "0" && ch <= "9") return 0.6;
  return 0.55;
}

/** Estimated printed width of a line at a given em size. */
export function qeiiTextWidth(text: string, size: number): number {
  let em = 0;
  for (const ch of text) em += advance(ch);
  return em * size;
}

/** Rendered em size for a label, calibrated and clamped to the plan extent. */
export function qeiiFontSize(label: QeiiLabel, floor: QeiiFloorVector, scale = 1): number {
  const raw = label.size * QEII_LABEL_EM * scale;
  const min = floor.w * QEII_LABEL_MIN_SHARE * scale;
  const max = floor.w * QEII_LABEL_MAX_SHARE * scale;
  return Math.round(Math.min(max, Math.max(min, raw)) * 100) / 100;
}

type Group = { labels: QeiiLabel[]; size: number; x: number; y: number; angle: number };

/**
 * Rebuild the names the sheet prints on two or more lines.
 *
 * The extractor records every printed line separately, so "First" / "Aid" and
 * "Berners-" / "Lee" arrive as two labels. Lines of the same size, at the same
 * turn, sitting directly under one another belong to one name. Copy is never
 * rewritten — the lines are only kept together.
 */
export function qeiiLabelGroups(floor: QeiiFloorVector): Group[] {
  const used = new Set<number>();
  const groups: Group[] = [];
  const labels = floor.labels;
  for (let i = 0; i < labels.length; i += 1) {
    if (used.has(i)) continue;
    const head = labels[i]!;
    const run = [head];
    used.add(i);
    for (let j = i + 1; j < labels.length; j += 1) {
      if (used.has(j)) continue;
      const next = labels[j]!;
      const tail = run[run.length - 1]!;
      const sameTurn = Math.abs((next.angle ?? 0) - (tail.angle ?? 0)) < 0.5;
      const sameSize = Math.abs(next.size - tail.size) < 0.4;
      const sameColumn = Math.abs(next.x - tail.x) <= tail.size * 1.4;
      const stacked = next.y - tail.y > 0 && next.y - tail.y <= tail.size * 1.6;
      if (sameTurn && sameSize && sameColumn && stacked) {
        run.push(next);
        used.add(j);
      }
    }
    groups.push({
      labels: run,
      size: head.size,
      x: run.reduce((t, l) => t + l.x, 0) / run.length,
      y: head.y,
      angle: head.angle ?? 0,
    });
  }
  return groups;
}

function boxFor(
  x: number,
  y: number,
  angle: number,
  width: number,
  above: number,
  below: number,
): QeiiBox {
  const turned = Math.abs(Math.abs(angle) - 90) < 15;
  const w = turned ? above + below : width;
  const h = turned ? width : above + below;
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}

function overlaps(a: QeiiBox, b: QeiiBox, pad: number): boolean {
  return a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
}

/** How much of a drawn object a block would cover, used to pick the least bad spot. */
function overlapArea(a: QeiiBox, b: QeiiBox): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}


function inside(b: QeiiBox, floor: QeiiFloorVector, pad: number): boolean {
  return b.x0 >= pad && b.y0 >= pad && b.x1 <= floor.w - pad && b.y1 <= floor.h - pad;
}

/** The event line without its function, used when the full line will not fit. */
function shortUse(use: string): string {
  const cut = use.indexOf(" · ");
  return cut > 0 ? use.slice(cut + 3) : use;
}

/**
 * Typeset every room name on a rebuilt plan without a single collision.
 *
 * Bigger names are placed first, so a plenary keeps its full block and a small
 * facility label gives way. Nothing is invented and no room name is hidden.
 */
export function qeiiPlanLayout(floor: QeiiFloorVector, options: QeiiLayoutOptions = {}): QeiiLayout {
  const scale = options.labelScale ?? 1;
  const groups = qeiiLabelGroups(floor)
    .map((g, i) => ({ ...g, order: i }))
    .sort((a, b) => b.size - a.size || a.y - b.y || a.order - b.order);

  const placed: QeiiBox[] = [];
  const blocks: QeiiLayoutBlock[] = [];
  const noteSet = new Set<string>();

  // Lift symbols, WC and access glyphs, stair runs and the marker dots: drawn
  // objects a room name must never print across.
  const objects = qeiiObjectBoxes(floor.shapes, floor.w * floor.h);

  for (const group of groups) {
    const head = group.labels[0]!;
    const baseSize = qeiiFontSize(head, floor, scale);
    const minSize = Math.max(floor.w * QEII_LABEL_MIN_SHARE * scale, 0.01);
    const issuedLines = group.labels.map((l) => l.text);
    const room = issuedLines.join(" ").replace(/-\s/g, "-");
    // A live correction replaces the printed name and the line beneath it; the
    // schedule is still read against the name the venue issued.
    const edit = qeiiRoomEdit(options.edits, room);
    const lines = edit?.name ? [edit.name] : issuedLines;
    const issuedUse = options.showUse ? spaceUseLine(room, floor.id) : undefined;
    const allMarks = options.showMarks ? spaceUseMarks(room, floor.id) : [];
    const overridden = edit?.use !== undefined;
    const fullUse = overridden ? (edit!.use || undefined) : issuedUse;
    // With the division lockup printed, the division's name is not repeated as text.
    const markedUse = overridden
      ? fullUse
      : allMarks.length
        ? options.showUse
          ? spaceUseLineWithoutDivisions(
              room,
              floor.id,
              allMarks.map((m) => m.divisionId),
            )
          : undefined
        : fullUse;


    // The space the artwork actually draws for this room, and the objects inside it.
    const holder: QeiiRect | undefined = qeiiHolderBox(floor.shapes, group.x, group.y);
    const nearby = objects.filter(
      (o) => !(group.x >= o.x0 && group.x <= o.x1 && group.y >= o.y0 && group.y <= o.y1),
    );

    type Variant = { use?: string; marks: SpaceUseMark[] };
    const variants: Variant[] = [];
    if (markedUse && allMarks.length) variants.push({ use: markedUse, marks: allMarks });
    // Where the schedule records nothing but the division itself, the approved
    // lockup is the better reading of that line, so it is tried before the words.
    if (allMarks.length && !markedUse) variants.push({ use: undefined, marks: allMarks });
    if (fullUse) variants.push({ use: fullUse, marks: [] });
    if (fullUse) variants.push({ use: shortUse(fullUse), marks: [] });
    if (allMarks.length) variants.push({ use: undefined, marks: allMarks });
    variants.push({ use: undefined, marks: [] });



    type Fit = {
      variant: Variant;
      lines: string[];
      useLines: string[];
      box: QeiiBox;
      size: number;
      useSize: number;
      markH: number;
      dx: number;
      dy: number;
    };

    const measure = (
      variant: Variant,
      size: number,
      dx = 0,
      dy = 0,
      markFactor = 1,
      ls: string[] = lines,
      us: string[] = variant.use ? [variant.use] : [],
    ): Fit => {
      const useSize =
        Math.round(Math.min(size * 0.92, Math.max(size * QEII_USE_RATIO, minSize)) * 100) / 100;
      const markH =
        Math.round(size * QEII_MARK_RATIO * (options.markScale ?? 1) * markFactor * 100) / 100;

      const nameWidth = Math.max(...ls.map((t) => qeiiTextWidth(t, size)));
      const nameHeight = size * (0.72 + (ls.length - 1) * 1.05);
      const markRow = variant.marks.reduce((w, m) => w + markH * m.ratio + size * 0.35, 0);
      const width = Math.max(
        nameWidth,
        ...us.map((t) => qeiiTextWidth(t, useSize)),
        markRow > 0 ? markRow - size * 0.35 : 0,
      );
      const above = nameHeight / 2 + (variant.marks.length ? markH + size * 0.5 : 0);
      const below =
        nameHeight / 2 + (us.length ? useSize * (1.5 + (us.length - 1) * 1.15) : 0);
      return {
        variant,
        lines: ls,
        useLines: us,
        box: boxFor(group.x + dx, group.y + dy, group.angle, width, above, below),
        dx,
        dy,
        size: Math.round(size * 100) / 100,
        useSize,
        markH,
      };
    };

    /**
     * Row sets for an event line: the whole line first, then breaks over its own
     * words. No word is shortened, reordered or dropped.
     */
    const useSetsFor = (use?: string): string[][] => {
      if (!use) return [[]];
      const sets: string[][] = [[use]];
      const words = use.split(" ").filter(Boolean);
      for (const rows of [2, 3]) {
        if (words.length < rows * 2) continue;
        const per = Math.ceil(words.length / rows);
        const wrapped: string[] = [];
        for (let w = 0; w < words.length; w += per) wrapped.push(words.slice(w, w + per).join(" "));
        if (wrapped.length > 1) sets.push(wrapped);
      }
      return sets;
    };


    const clearOf = (fit: Fit, useHolder: boolean): boolean => {
      if (!inside(fit.box, floor, 2)) return false;
      if (placed.some((p) => overlaps(fit.box, p, fit.size * 0.18))) return false;
      if (nearby.some((o) => overlaps(fit.box, o, fit.size * 0.12))) return false;
      if (useHolder && holder && !qeiiRectInside(fit.box, holder, fit.size * 0.22)) return false;
      return true;
    };

    // Type steps down inside its own room before any line comes off it, so a long
    // name stays whole and stays inside the space the artwork draws for it.
    const steps = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52];
    // A long caption in a narrow slot is broken over its own words rather than
    // printed wider than the space the artwork draws. Only the line breaks change
    // — no word is shortened, reordered or dropped.
    const lineSets: string[][] = [lines];
    // A corrected name prints exactly as it was typed, so only issued copy is broken.
    if (lines.length === 1 && !edit?.name) {
      const words = lines[0]!.split(" ").filter(Boolean);
      for (const rows of [2, 3]) {
        if (words.length < rows) continue;
        const per = Math.ceil(words.length / rows);
        const wrapped: string[] = [];
        for (let w = 0; w < words.length; w += per) wrapped.push(words.slice(w, w + per).join(" "));
        if (wrapped.length > 1) lineSets.push(wrapped);
      }
    }
    let chosen: Fit | undefined;
    let insideHolder = true;
    // Content first, size second: a full block is set smaller before any line
    // comes off it, and only then does the event line or the lockup give way.
    // A small nudge inside the room is tried before the type is made smaller, so a
    // name clears a lift symbol or a marker dot at its proper size. Sideways nudges
    // are tried too, so a name anchored hard against a wall is drawn back inside the
    // space rather than printed half over the edge of it.
    const nudges: Array<[number, number]> = [
      [0, 0],
      [0, 0.35],
      [0, -0.35],
      [0.35, 0],
      [-0.35, 0],
      [0, 0.7],
      [0, -0.7],
      [0.7, 0],
      [-0.7, 0],
      [0, 1.05],
      [0, -1.05],
      [1.05, 0],
      [-1.05, 0],
      [0, 1.4],
      [0, -1.4],
      [1.4, 0],
      [-1.4, 0],
      [0, 2.2],
      [0, -2.2],
      [2.2, 0],
      [-2.2, 0],
    ];
    // A tight room sets its lockup smaller before it loses it altogether; the
    // floor is the room name's own height, below which the lockup would not read.
    const markFactors = [1, 0.86, 0.72, 0.6, 0.5];
    for (const useHolder of [true, false]) {
      for (const variant of variants) {
        for (const step of steps) {
          const size = Math.max(minSize, baseSize * step);
          for (const markFactor of variant.marks.length ? markFactors : [1]) {
            if (markFactor < 1 && QEII_MARK_RATIO * markFactor < 1) break;
            for (const ls of lineSets) {
              for (const us of useSetsFor(variant.use)) {
                for (const [ndx, ndy] of nudges) {
                  const fit = measure(variant, size, ndx * size, ndy * size, markFactor, ls, us);
                  if (clearOf(fit, useHolder)) {
                    chosen = fit;
                    insideHolder = useHolder;
                    break;
                  }
                }
                if (chosen) break;
              }
              if (chosen) break;
            }


            if (chosen) break;
          }
          if (chosen) break;
          if (baseSize * step <= minSize) break;
        }
        if (chosen) break;
      }
      if (chosen) break;
    }



    if (!chosen) {
      // The name itself always prints, so the last resort is to walk it a short
      // way off its anchor at the smallest allowed size rather than let it sit
      // across a drawn symbol. If nothing is genuinely clear, the least covered
      // position is used and the crowding is reported instead of hidden.
      const small = Math.max(minSize, baseSize * 0.52);
      const bare = { use: undefined, marks: [] };
      const walk = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.2, -3.2];
      let best: Fit | undefined;
      let bestCover = Infinity;
      for (const dy of walk) {
        for (const dx of walk) {
          const fit = measure(bare, small, dx * small, dy * small);
          if (clearOf(fit, false)) {
            best = fit;
            bestCover = 0;
            break;
          }
          const cover = nearby.reduce((sum, o) => sum + overlapArea(fit.box, o), 0);
          if (cover < bestCover) {
            best = fit;
            bestCover = cover;
          }
        }
        if (bestCover === 0) break;
      }
      chosen = best ?? measure(bare, small);
      insideHolder = false;
      noteSet.add(
        bestCover === 0
          ? `${room} is moved slightly off its printed position to clear a symbol, and its event line is in the floor list below.`
          : `${room} sits too tight on this plan for its event line — read it in the floor list below.`,
      );

    } else {
      if (fullUse && !chosen.variant.use && !(chosen.variant.marks.length && !markedUse)) {
        noteSet.add(
          `${room} has no room for its event line on the plan — read it in the floor list below.`,
        );

      }
      if (allMarks.length && !chosen.variant.marks.length) {
        noteSet.add(`${room} has no room for its division lockup on the plan.`);
      }
    }
    // Only report this when the block genuinely runs outside the space the artwork
    // draws for the room. A block that simply had to give way to a neighbouring
    // name is still inside its own room, and saying otherwise misreads the sheet.
    if (holder && !qeiiRectInside(chosen.box, holder, chosen.size * 0.22)) {
      noteSet.add(`${room} is printed wider than the space the issued artwork draws for it.`);
    }


    // A saved nudge is a deliberate human correction, so it is applied after the
    // automatic placement and moves the whole block, ring and all.
    const nx = edit?.dx ?? 0;
    const ny = edit?.dy ?? 0;
    const box = {
      x0: chosen.box.x0 + nx,
      y0: chosen.box.y0 + ny,
      x1: chosen.box.x1 + nx,
      y1: chosen.box.y1 + ny,
    };
    placed.push(box);
    blocks.push({
      key: `${room}-${group.order}`,
      room,
      x: group.x + chosen.dx + nx,
      y: group.y + chosen.dy + ny,
      angle: group.angle,
      size: chosen.size,
      lines: chosen.lines,

      use: chosen.variant.use,
      useSize: chosen.useSize,
      marks: chosen.variant.marks,
      markH: chosen.markH,
      box,
    });

  }

  return { blocks, notes: [...noteSet] };
}
