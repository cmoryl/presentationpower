// Text and frame rules for the London map sheets.
//
// Every string on a map sheet is drawn as SVG <text>, which does not wrap, clip
// or shrink by itself: a long room name, a custom title, an operator's footer
// note or a wide legend simply runs out of its box and off the sheet — and the
// same overflow then prints to PNG and PDF.
//
// This module is the single place that decides how copy is fitted:
//
//  1. MEASURE — `textWidth` estimates the drawn width of a string in the sheet
//     face (Geist) at a given size and letter-spacing.
//  2. FIT     — `truncateToWidth` trims with an ellipsis; `fitFontSize` shrinks
//     type down to a legibility floor before trimming is considered.
//  3. FRAME   — `clampSpan` and `fitInFrame` keep a drawn box inside its frame,
//     so nothing crosses a margin, a rule or another block.
//  4. PACK    — `packRow` lays chips out in rows and reports how many rows were
//     needed, so the sheet can reserve exactly that much height. Drawing and
//     measuring therefore never disagree.
//
// Rules of the house: no copy is ever drawn wider than the frame that owns it,
// type never drops below its floor, and any measured band that can wrap must
// report its height from the SAME function the drawing uses.

/**
 * Average glyph advance as a fraction of font size, for Geist at the weights
 * used on the sheets. Deliberately a touch generous so a fitted string errs on
 * the side of being smaller than its box rather than one pixel over it.
 */
const GLYPH = 0.58;
/** Capitals (the sheet's eyebrows, room names and chips) run wider. */
const GLYPH_CAPS = 0.66;

export const ELLIPSIS = "…";

/** Smallest type the sheets are allowed to print, in px at sheet scale. */
export const MIN_TYPE_PX = 7;

/** Estimated drawn width of a string. */
export function textWidth(text: string, size: number, tracking = 0): number {
  if (!text) return 0;
  const caps = text === text.toUpperCase() && /[A-Z]/.test(text);
  const per = (caps ? GLYPH_CAPS : GLYPH) * size + tracking;
  return Math.max(0, text.length * per - tracking);
}

/** Trim to fit `maxW`, adding an ellipsis. Returns "" when nothing can fit. */
export function truncateToWidth(text: string, size: number, maxW: number, tracking = 0): string {
  if (maxW <= 0) return "";
  if (textWidth(text, size, tracking) <= maxW) return text;
  let out = text;
  while (out.length > 1 && textWidth(out + ELLIPSIS, size, tracking) > maxW) {
    out = out.slice(0, -1);
  }
  const trimmed = out.replace(/[\s,.·-]+$/, "");
  const candidate = `${trimmed || out}${ELLIPSIS}`;
  return textWidth(candidate, size, tracking) <= maxW ? candidate : "";
}

/**
 * Largest size in [min, size] that fits `text` into `maxW`. When even the floor
 * does not fit, the floor is returned and the caller is expected to truncate.
 */
export function fitFontSize(
  text: string,
  size: number,
  maxW: number,
  min = MIN_TYPE_PX,
  tracking = 0,
): number {
  if (maxW <= 0) return min;
  let s = size;
  while (s > min && textWidth(text, s, tracking) > maxW) s -= 0.25;
  return Math.max(min, Math.round(s * 100) / 100);
}

export type FittedText = { text: string; size: number; width: number };

/**
 * The house rule for a single line in a fixed box: shrink first (down to the
 * floor), then trim. Never returns copy wider than `maxW`.
 */
export function fitInFrame(
  text: string,
  size: number,
  maxW: number,
  min = MIN_TYPE_PX,
  tracking = 0,
): FittedText {
  const s = fitFontSize(text, size, maxW, min, tracking);
  const fitted = truncateToWidth(text, s, maxW, tracking);
  return { text: fitted, size: s, width: textWidth(fitted, s, tracking) };
}

/** Keep a span of width `w` inside [left, right]; left edge wins when tight. */
export function clampSpan(x: number, w: number, left: number, right: number): number {
  if (w >= right - left) return left;
  return Math.min(Math.max(x, left), right - w);
}

export type PackedChip = { index: number; x: number; row: number };

/**
 * Greedy row packing shared by every chip band (asset key, room key). Returns a
 * placement per chip plus the row count, so the sheet reserves exactly the
 * height the drawing uses.
 */
export function packRow(
  widths: readonly number[],
  frameW: number,
  gap = 0,
): { chips: PackedChip[]; rows: number } {
  const chips: PackedChip[] = [];
  let x = 0;
  let row = 0;
  widths.forEach((w, index) => {
    if (x > 0 && x + w > frameW) {
      row += 1;
      x = 0;
    }
    chips.push({ index, x, row });
    x += w + gap;
  });
  return { chips, rows: widths.length ? row + 1 : 0 };
}
