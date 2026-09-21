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

import { spaceUseLine, spaceUseMarks, type SpaceUseMark } from "@/lib/next-london-space-use";
import type { QeiiFloorVector, QeiiLabel } from "@/lib/next-london-qeii-vectors";
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
};

export type QeiiBox = { x0: number; y0: number; x1: number; y1: number };

export type QeiiLayoutBlock = {
  key: string;
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
    const lines = group.labels.map((l) => l.text);
    const room = lines.join(" ").replace(/-\s/g, "-");
    const fullUse = options.showUse ? spaceUseLine(room, floor.id) : undefined;
    const allMarks = options.showMarks ? spaceUseMarks(room, floor.id) : [];

    // The space the artwork actually draws for this room, and the objects inside it.
    const holder: QeiiRect | undefined = qeiiHolderBox(floor.shapes, group.x, group.y);
    const nearby = objects.filter(
      (o) => !(group.x >= o.x0 && group.x <= o.x1 && group.y >= o.y0 && group.y <= o.y1),
    );

    type Variant = { use?: string; marks: SpaceUseMark[] };
    const variants: Variant[] = [];
    if (fullUse && allMarks.length) variants.push({ use: fullUse, marks: allMarks });
    if (fullUse && allMarks.length) variants.push({ use: shortUse(fullUse), marks: allMarks });
    if (fullUse) variants.push({ use: fullUse, marks: [] });
    if (fullUse) variants.push({ use: shortUse(fullUse), marks: [] });
    if (allMarks.length) variants.push({ use: undefined, marks: allMarks });
    variants.push({ use: undefined, marks: [] });

    type Fit = {
      variant: Variant;
      box: QeiiBox;
      size: number;
      useSize: number;
      markH: number;
      dx: number;
      dy: number;
    };

    const measure = (variant: Variant, size: number, dx = 0, dy = 0): Fit => {
      const useSize =
        Math.round(Math.min(size * 0.92, Math.max(size * QEII_USE_RATIO, minSize)) * 100) / 100;
      const markH = Math.round(size * QEII_MARK_RATIO * (options.markScale ?? 1) * 100) / 100;
      const nameWidth = Math.max(...lines.map((t) => qeiiTextWidth(t, size)));
      const nameHeight = size * (0.72 + (lines.length - 1) * 1.05);
      const markRow = variant.marks.reduce((w, m) => w + markH * m.ratio + size * 0.35, 0);
      const width = Math.max(
        nameWidth,
        variant.use ? qeiiTextWidth(variant.use, useSize) : 0,
        markRow > 0 ? markRow - size * 0.35 : 0,
      );
      const above = nameHeight / 2 + (variant.marks.length ? markH + size * 0.5 : 0);
      const below = nameHeight / 2 + (variant.use ? useSize * 1.5 : 0);
      return {
        variant,
        box: boxFor(group.x + dx, group.y + dy, group.angle, width, above, below),
        dx,
        dy,
        size: Math.round(size * 100) / 100,
        useSize,
        markH,
      };
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
    let chosen: Fit | undefined;
    let insideHolder = true;
    // Content first, size second: a full block is set smaller before any line
    // comes off it, and only then does the event line or the lockup give way.
    // A small nudge inside the room is tried before the type is made smaller, so a
    // name clears a lift symbol or a marker dot at its proper size.
    const nudges = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
    for (const useHolder of [true, false]) {
      for (const variant of variants) {
        for (const step of steps) {
          const size = Math.max(minSize, baseSize * step);
          for (const nudge of nudges) {
            const fit = measure(variant, size, 0, nudge * size);
            if (clearOf(fit, useHolder)) {
              chosen = fit;
              insideHolder = useHolder;
              break;
            }
          }
          if (chosen) break;
          if (baseSize * step <= minSize) break;
        }
        if (chosen) break;
      }
      if (chosen) break;
    }

    if (!chosen) {
      // The name itself always prints. Record what came off it and why.
      chosen = measure({ use: undefined, marks: [] }, Math.max(minSize, baseSize * 0.52));
      insideHolder = false;
      noteSet.add(
        `${room} sits too tight on this plan for its event line — read it in the floor list below.`,
      );
    } else {
      if (fullUse && !chosen.variant.use) {
        noteSet.add(
          `${room} has no room for its event line on the plan — read it in the floor list below.`,
        );
      }
      if (allMarks.length && !chosen.variant.marks.length) {
        noteSet.add(`${room} has no room for its division lockup on the plan.`);
      }
    }
    if (holder && !insideHolder) {
      noteSet.add(`${room} is printed wider than the space the issued artwork draws for it.`);
    }

    placed.push(chosen.box);
    blocks.push({
      key: `${room}-${group.order}`,
      x: group.x + chosen.dx,
      y: group.y + chosen.dy,
      angle: group.angle,
      size: chosen.size,
      lines,
      use: chosen.variant.use,
      useSize: chosen.useSize,
      marks: chosen.variant.marks,
      markH: chosen.markH,
      box: chosen.box,
    });
  }

  return { blocks, notes: [...noteSet] };
}
