/**
 * Print statistic unit splitting.
 *
 * Print statistics must always read as a single numeric line followed by
 * text on its own line(s). Short symbol units ("%", "+", "x", "K", "M")
 * belong inline with the number; word units ("countries", "years",
 * "languages") must never sit beside the numeral — they drop to the text
 * line below so the number never wraps or crowds.
 */

export type StatUnitParts = {
  /** Symbol-ish unit that stays glued to the numeral. */
  inline?: string;
  /** Word unit that must render on the text line beneath the numeral. */
  word?: string;
};

const LETTERS = /[A-Za-z]/g;

export function statUnitParts(unit?: string | null): StatUnitParts {
  const u = (unit ?? "").trim();
  if (!u) return {};
  const letters = u.match(LETTERS)?.length ?? 0;
  // 0-2 letters (%, +, x, K, M, B, hr, GB) stay inline; 3+ letters is a word.
  if (letters <= 2 && u.length <= 3) return { inline: u };
  return { word: u };
}

/** Whitespace guard so a value + inline unit never breaks across lines. */
export const STAT_VALUE_NOWRAP = { whiteSpace: "nowrap" as const };

/**
 * Deterministic stat-value auto-fit.
 *
 * Print stat tiles are narrow and their values are nowrap, so a long value
 * ("PDF → interactive", "Eliminated") used to clip or spill out of the tile.
 * This estimates the rendered width in character-weight units and returns a
 * scale factor so the value shrinks to fit instead of breaking the tile.
 *
 * fitChars = how many weighted units fit at the tile's full font size.
 */
function charWeight(ch: string): number {
  if (/\d/.test(ch)) return 0.6;
  if (ch === " ") return 0.35;
  if (/[A-Z]/.test(ch)) return 0.78;
  if (/[a-z]/.test(ch)) return 0.55;
  // arrows, punctuation, symbols (→, %, +, /) render wider
  return 0.9;
}

export function statValueFitScale(
  value: string | null | undefined,
  inlineUnit?: string | null,
  fitChars = 9,
  minScale = 0.5,
): number {
  const text = (value ?? "").trim();
  if (!text) return 1;
  let units = 0;
  for (const ch of text) units += charWeight(ch);
  if (inlineUnit) {
    // inline units render at a slightly smaller size beside the value
    for (const ch of inlineUnit.trim()) units += charWeight(ch) * 0.8;
    units += 0.2; // the small gap between value and unit
  }
  if (units <= fitChars) return 1;
  return Math.max(minScale, fitChars / units);
}
