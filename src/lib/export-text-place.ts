// -----------------------------------------------------------------------------
// Native placement of measured text runs
//
// The layered export captures a plate from the REAL renderer with the glyphs
// made invisible, then re-emits each measured run as a native PowerPoint text
// box. Because the geometry, size, weight, spacing and colour are all read off
// the settled DOM, the exported copy matches the build exactly instead of the
// approximations the hand-written module renderers produced.
// -----------------------------------------------------------------------------

import { describeTextRun } from "./pptx-text-props";
import type { TextRun } from "./export-text-layer";

export interface TextPlacementTarget {
  addText: (text: string, opts: Record<string, unknown>) => unknown;
}

/**
 * Emit every measured run onto a pptxgenjs slide. Boxes get zero inset so the
 * text lands on the same pixel as the plate it replaces. Every value comes from
 * `describeTextRun`, which the text formatting inspector also reads.
 */
export function placeTextRuns(
  slide: TextPlacementTarget,
  runs: TextRun[],
  opts?: { objectNamePrefix?: string },
): number {
  let placed = 0;
  runs.forEach((run, i) => {
    const p = describeTextRun(run);
    if (!p) return;
    slide.addText(p.text, {
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      fontSize: p.fontSize,
      fontFace: p.fontFace,
      bold: p.bold,
      italic: p.italic,
      underline: p.underline ? { style: "sng" } : undefined,
      color: p.color,
      transparency: p.transparency,
      align: p.align,
      valign: p.valign,
      charSpacing: p.charSpacing,
      lineSpacing: p.lineSpacing,
      margin: 0,
      inset: 0,
      wrap: p.wrap,
      shrinkText: false,
      isTextBox: true,
      objectName: `${opts?.objectNamePrefix ?? "TP Text"} ${i + 1}`,
    });
    placed += 1;
  });
  return placed;
}

