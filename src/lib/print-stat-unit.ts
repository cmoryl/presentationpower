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
