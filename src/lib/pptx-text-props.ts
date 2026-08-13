// -----------------------------------------------------------------------------
// PPTX text property projection
//
// One source of truth for the values the layered export actually writes into
// PowerPoint for a measured text run. `export-text-place.ts` emits exactly these
// numbers, and the text formatting inspector reads exactly these numbers, so the
// inspector can never drift from the file.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";
import type { TextRun } from "./export-text-layer";

export const PPTX_SLIDE_W_IN = 13.333;
export const PPTX_SLIDE_H_IN = 7.5;

/** Stage px → inches on the 16:9 slide. */
export const inX = (px: number) => (px / STAGE_W) * PPTX_SLIDE_W_IN;
export const inY = (px: number) => (px / STAGE_H) * PPTX_SLIDE_H_IN;
/** Stage px → points (1080px ≙ 540pt, so exactly half). */
export const pxToPt = (px: number) => (px / STAGE_H) * PPTX_SLIDE_H_IN * 72;

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export interface PptxTextProps {
  /** Trimmed string written to the text box. */
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontFace: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  transparency?: number;
  align: "left" | "center" | "right";
  valign: "top" | "middle";
  /** Points; undefined lets PowerPoint use the font metrics. */
  lineSpacing?: number;
  /** Points of tracking; undefined = none emitted. */
  charSpacing?: number;
  wrap: boolean;
  /**
   * Paragraph-level properties. Because every run is emitted as its own
   * absolutely-placed text box, first-line indent and block spacing are already
   * baked into x / y / w / h — `emitted` records what actually reaches the file
   * so the inspector never overstates the export.
   */
  paragraph: {
    /** Inches of first-line indent measured on the DOM. */
    indentIn: number;
    /** Inches of left / right paragraph inset (padding) measured on the DOM. */
    marginLeftIn: number;
    marginRightIn: number;
    /** Points of space before / after measured on the DOM. */
    spaceBeforePt: number;
    spaceAfterPt: number;
    /** Points written to the file (0 = absorbed by box geometry). */
    emittedSpaceBeforePt: number;
    emittedSpaceAfterPt: number;
    emittedIndentIn: number;
    /** Wrapping behaviour projected onto PowerPoint. */
    wrap: boolean;
    breakWords: boolean;
    hyphenate: boolean;
    /** CSS white-space as rendered (pre* keeps hard line breaks). */
    whiteSpace: string;
    /** Bullet marker style, when the source element is a list item. */
    bullet: string | null;
  };
  /** Source CSS values kept for the inspector (not written to the file). */
  source: {
    fontSizePx: number;
    lineHeightPx: number;
    letterSpacingPx: number;
    cssWeight: string;
    lineHeightRatio: number | null;
    trackingEm: number | null;
    singleLine: boolean;
  };
}

/**
 * Project a measured run onto the exact set of pptxgenjs options the exporter
 * sends. Returns null when the run is skipped (empty text / degenerate size).
 */
export function describeTextRun(run: TextRun): PptxTextProps | null {
  const text = run.text.trim();
  if (!text) return null;
  const size = pxToPt(run.fontSizePx);
  if (!Number.isFinite(size) || size <= 0) return null;

  return {
    text,
    x: r3(inX(run.x)),
    y: r3(inY(run.y)),
    w: r3(Math.min(PPTX_SLIDE_W_IN, inX(run.w) + (run.singleLine ? 0.06 : 0.04))),
    h: r3(Math.min(PPTX_SLIDE_H_IN, inY(run.h) + 0.02)),
    fontSize: r1(size),
    fontFace: run.fontFamily,
    bold: run.bold,
    italic: run.italic,
    underline: run.underline,
    color: run.color,
    transparency: run.transparency > 0 ? run.transparency : undefined,
    align: run.align === "justify" ? "left" : run.align,
    valign: run.valign,
    lineSpacing: run.lineHeightPx > 0 ? r1(pxToPt(run.lineHeightPx)) : undefined,
    charSpacing: run.letterSpacingPx ? r1(pxToPt(run.letterSpacingPx)) : undefined,
    wrap: !run.singleLine,
    source: {
      fontSizePx: r1(run.fontSizePx),
      lineHeightPx: r1(run.lineHeightPx),
      letterSpacingPx: r3(run.letterSpacingPx),
      cssWeight: run.bold ? "600+ (bold)" : "< 600 (regular)",
      lineHeightRatio:
        run.lineHeightPx > 0 && run.fontSizePx > 0 ? r3(run.lineHeightPx / run.fontSizePx) : null,
      trackingEm: run.fontSizePx > 0 ? r3(run.letterSpacingPx / run.fontSizePx) : null,
      singleLine: run.singleLine,
    },
  };
}
