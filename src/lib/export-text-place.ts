// -----------------------------------------------------------------------------
// Native placement of measured text runs
//
// The layered export captures a plate from the REAL renderer with the glyphs
// made invisible, then re-emits each measured run as a native PowerPoint text
// box. Because the geometry, size, weight, spacing and colour are all read off
// the settled DOM, the exported copy matches the build exactly instead of the
// approximations the hand-written module renderers produced.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";
import type { TextRun } from "./export-text-layer";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

/** Stage px → inches on the 16:9 slide. */
const inX = (px: number) => (px / STAGE_W) * SLIDE_W;
const inY = (px: number) => (px / STAGE_H) * SLIDE_H;
/** Stage px → points (1080px ≙ 540pt, so exactly half). */
const pt = (px: number) => (px / STAGE_H) * SLIDE_H * 72;

export interface TextPlacementTarget {
  addText: (text: string, opts: Record<string, unknown>) => unknown;
}

/**
 * Emit every measured run onto a pptxgenjs slide. Boxes get zero inset so the
 * text lands on the same pixel as the plate it replaces.
 */
export function placeTextRuns(
  slide: TextPlacementTarget,
  runs: TextRun[],
  opts?: { objectNamePrefix?: string },
): number {
  let placed = 0;
  runs.forEach((run, i) => {
    const text = run.text.trim();
    if (!text) return;
    const size = pt(run.fontSizePx);
    if (!Number.isFinite(size) || size <= 0) return;
    // PowerPoint line spacing is in points; only send it when the design set a
    // real line-height, otherwise let the font metrics decide.
    const lineSpacing = run.lineHeightPx > 0 ? pt(run.lineHeightPx) : undefined;
    slide.addText(text, {
      x: inX(run.x),
      y: inY(run.y),
      // Give wrapped copy a hair of slack so PowerPoint's slightly wider
      // metrics cannot force an extra line break the build never had.
      w: Math.min(SLIDE_W, inX(run.w) + (run.singleLine ? 0.06 : 0.04)),
      h: Math.min(SLIDE_H, inY(run.h) + 0.02),
      fontSize: Math.round(size * 10) / 10,
      fontFace: run.fontFamily,
      bold: run.bold,
      italic: run.italic,
      underline: run.underline ? { style: "sng" } : undefined,
      color: run.color,
      transparency: run.transparency > 0 ? run.transparency : undefined,
      align: run.align === "justify" ? "left" : run.align,
      valign: run.valign,
      charSpacing: run.letterSpacingPx ? Math.round(pt(run.letterSpacingPx) * 10) / 10 : undefined,
      lineSpacing,
      margin: 0,
      inset: 0,
      wrap: !run.singleLine,
      shrinkText: false,
      isTextBox: true,
      objectName: `${opts?.objectNamePrefix ?? "TP Text"} ${i + 1}`,
    });
    placed += 1;
  });
  return placed;
}
