/**
 * TRACKED SINGLE-LINE FIT (emit-time width floor)
 * ===============================================
 *
 * `pptx-text-props.ts` / `export-text-place.ts` size DOM-measured runs from the
 * wider of (measured width, estimated tracked advance). The hand-authored
 * per-variant emitters in `pptx-export.ts` do NOT go through either path: they
 * pass a designed box width plus `charSpacing`, so a letter-spaced eyebrow or
 * footer can be geometrically wider than its box. PowerPoint then either wraps
 * it into a box only tall enough for one line (clipping the second) or clips the
 * tail outright — the `tracked-overflow` defect class.
 *
 * This module is the central floor for those emitters: given the text and the
 * pptxgenjs options, it returns the width (and x shift for centred / right
 * copy) the box needs so the tracked string fits on ONE line. It runs inside the
 * slide's addText wrapper, so every variant benefits without touching hundreds
 * of call sites.
 *
 * Measurement is an estimate, not a browser measure (the exporter runs where no
 * measurer is guaranteed), so the per-character factors are deliberately on the
 * generous side of Geist's real metrics: an over-wide single-line box is
 * harmless, a hair-narrow one clips.
 */

const PT_PER_IN = 72;

/** Advance width of one character as a fraction of the font size. */
function charEm(ch: string): number {
  if (ch === " ") return 0.29;
  if (/[.,:;'`!|]/.test(ch)) return 0.3;
  if (/[ilj]/.test(ch)) return 0.31;
  if (/[ftr(){}\[\]\-–—]/.test(ch)) return 0.37;
  if (/[·•]/.test(ch)) return 0.42;
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[0-9]/.test(ch)) return 0.62;
  if (/[IJ]/.test(ch)) return 0.36;
  if (/[MW]/.test(ch)) return 0.9;
  if (/[A-Z]/.test(ch)) return 0.69;
  return 0.62;
}

/** Estimated advance of `text` in points, including tracking after each glyph. */
export function estimateAdvancePt(
  text: string,
  sizePt: number,
  bold: boolean,
  trackingPt = 0,
): number {
  let em = 0;
  for (const ch of text) em += charEm(ch);
  const base = em * sizePt * (bold ? 1.045 : 1);
  return base + Math.max(0, trackingPt) * Math.max(0, text.length - 1);
}

export interface TrackedFitInput {
  /** Flattened run text. */
  text: string;
  x: number;
  w: number;
  h: number;
  fontSize?: number;
  bold?: boolean;
  /** pptxgenjs `charSpacing`, in points. */
  charSpacing?: number;
  align?: string;
  lineSpacing?: number;
  wrap?: boolean;
  shrinkText?: boolean;
  slideWidthIn: number;
}

export interface TrackedFitResult {
  x: number;
  w: number;
}

/**
 * Width floor for a tracked, effectively single-line box. Returns `null` when
 * the box is already wide enough, is multi-line by design, carries no tracking,
 * or auto-fits (PowerPoint shrinks it itself).
 */
export function fitTrackedBox(input: TrackedFitInput): TrackedFitResult | null {
  const text = input.text.trim();
  if (!text || text.includes("\n")) return null;
  if (input.shrinkText) return null;
  const sizePt = input.fontSize ?? 0;
  if (!(sizePt > 0) || !(input.w > 0)) return null;
  const tracking = Math.max(0, input.charSpacing ?? 0);
  const noWrap = input.wrap === false;
  // A single word cannot reflow, so a box narrower than it clips no matter how
  // tall it is — that case needs the floor even without tracking.
  const singleWord = !/\s/.test(text);
  // Untracked wrapping copy reflows exactly as designed — leave it alone.
  if (!tracking && !noWrap && !singleWord) return null;

  // Only boxes that cannot HOLD a second line: usable height is the box minus
  // the default vertical insets (tIns + bIns = 0.1in). A box with room for two
  // lines was designed to wrap and is left alone.
  const lineIn = (input.lineSpacing ?? sizePt * 1.2) / PT_PER_IN;
  const usableIn = Math.max(0, input.h - 0.1);
  if (!noWrap && !singleWord && usableIn >= lineIn * 2) return null;

  const insetIn = 0.2; // OOXML default lIns + rIns
  const neededIn =
    estimateAdvancePt(text, sizePt, Boolean(input.bold), tracking) / PT_PER_IN + insetIn;
  const slack = Math.min(0.12, Math.max(0.04, neededIn * 0.02));
  const wantIn = neededIn + slack;
  if (wantIn <= input.w + 0.002) return null;

  const align = input.align === "center" ? "center" : input.align === "right" ? "right" : "left";
  const grow = wantIn - input.w;
  let x = input.x;
  if (align === "center") x = input.x - grow / 2;
  else if (align === "right") x = input.x - grow;
  // Keep the widened box on the slide, preserving the optical anchor as far as
  // the canvas allows.
  const maxW = Math.min(wantIn, input.slideWidthIn);
  x = Math.max(0, Math.min(x, input.slideWidthIn - maxW));
  return { x: Number(x.toFixed(3)), w: Number(maxW.toFixed(3)) };
}
