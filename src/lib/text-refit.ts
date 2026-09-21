// ---------------------------------------------------------------------------
// Multilingual text auto-refit.
//
// Translated copy is longer than the English it replaces — German runs ~35%
// longer, French and Spanish ~25% — so a headline that sat on two lines in
// English clips or overruns its box once it is localised. This module holds the
// pure arithmetic for refitting that copy inside the approved brand minimums:
//
//   • font size may shrink, but never below the legibility floor and never
//     past REFIT_MIN_SCALE of the authored size,
//   • leading tightens only inside the approved band,
//   • tracking may tighten a fraction of an em, never loosen,
//   • if the copy still does not fit at the floor, the plan says so (`clipped`)
//     rather than quietly cutting words.
//
// Backgrounds are untouched: this only sizes type.
// ---------------------------------------------------------------------------

/** Absolute legibility floor in px — smaller type is never shipped. */
export const REFIT_FLOOR_PX = 11;
/** The most a slot may shrink relative to its authored size. */
export const REFIT_MIN_SCALE = 0.62;
/** Tightest leading multiple allowed by the type rules. */
export const REFIT_MIN_LEADING = 1.02;
/** Tightest tracking allowance, in em. Copy is never tracked looser. */
export const REFIT_TRACK_FLOOR_EM = -0.016;

export type RefitInput = {
  /** Authored (current) font size in px. */
  fontPx: number;
  /** Authored line-height as a multiple of font size. Optional. */
  lineHeight?: number;
  /** Measured content / box ratio. 1 or less means it already fits. */
  overflowRatio: number;
  /** Per-surface floor; defaults to the brand floor. */
  floorPx?: number;
  /** Per-surface shrink limit; defaults to REFIT_MIN_SCALE. */
  minScale?: number;
};

export type RefitPlan = {
  fontPx: number;
  lineHeight: number | null;
  letterSpacingEm: number;
  /** Applied scale relative to the authored size. */
  scale: number;
  /** True when the copy still overflows at the floor — reported, never hidden. */
  clipped: boolean;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Work out the type treatment that makes measured copy fit its box.
 *
 * Height overflow scales roughly with the square root of the size change (type
 * reflows into fewer lines as it shrinks), so the plan asks for a little less
 * than the raw ratio and the caller re-measures — a handful of passes converge
 * quickly and never overshoot into needlessly small type.
 */
export function refitPlan(input: RefitInput): RefitPlan {
  const floor = Math.max(1, input.floorPx ?? REFIT_FLOOR_PX);
  const minScale = Math.min(1, Math.max(0.2, input.minScale ?? REFIT_MIN_SCALE));
  const ratio = Number.isFinite(input.overflowRatio) ? input.overflowRatio : 1;
  const authored = Math.max(1, input.fontPx);

  if (ratio <= 1.005) {
    return {
      fontPx: round2(authored),
      lineHeight: input.lineHeight ?? null,
      letterSpacingEm: 0,
      scale: 1,
      clipped: false,
    };
  }

  const wanted = 1 / Math.sqrt(ratio);
  const floorScale = floor / authored;
  const limit = Math.max(minScale, Math.min(1, floorScale));
  const scale = Math.max(limit, wanted);
  const fontPx = Math.max(floor, authored * scale);

  // Leading and tracking tighten in proportion to how hard the refit worked,
  // both inside their approved bands.
  const effort = Math.min(1, (1 - scale) / (1 - minScale || 1));
  const lineHeight =
    input.lineHeight != null
      ? Math.max(REFIT_MIN_LEADING, input.lineHeight - (input.lineHeight - REFIT_MIN_LEADING) * effort)
      : null;
  const letterSpacingEm = round2(REFIT_TRACK_FLOOR_EM * effort * 1000) / 1000;

  return {
    fontPx: round2(fontPx),
    lineHeight: lineHeight != null ? round2(lineHeight) : null,
    letterSpacingEm,
    scale: round2(fontPx / authored),
    // Even at the floor the copy is longer than the box: the caller reports it.
    clipped: wanted < limit - 0.001,
  };
}

/**
 * Average character-count expansion when English copy is translated. Sourced
 * from the recorded localisation guidance; used to warn before a translation
 * lands, and to bias the first refit pass on a translated deck.
 */
export const LANGUAGE_EXPANSION: Record<string, number> = {
  en: 1,
  de: 1.35,
  nl: 1.3,
  pl: 1.3,
  fi: 1.3,
  ru: 1.22,
  fr: 1.25,
  es: 1.25,
  pt: 1.25,
  it: 1.2,
  sv: 1.15,
  da: 1.15,
  no: 1.15,
  tr: 1.15,
  ar: 1.1,
  he: 1.05,
  ko: 0.85,
  "zh-hans": 0.6,
  "zh-hant": 0.6,
  zh: 0.6,
  ja: 0.65,
};

/** Expansion factor for a language tag ("de-DE" → German). Unknown → 1.2. */
export function expectedExpansion(lang: string | null | undefined): number {
  if (!lang) return 1;
  const tag = lang.trim().toLowerCase();
  if (LANGUAGE_EXPANSION[tag] != null) return LANGUAGE_EXPANSION[tag]!;
  const base = tag.split(/[-_]/)[0]!;
  if (LANGUAGE_EXPANSION[base] != null) return LANGUAGE_EXPANSION[base]!;
  return 1.2;
}

/**
 * Pre-translation risk check: how long the copy is likely to become, and
 * whether that runs past the slot's recommended character cap.
 */
export function expansionRisk(
  text: string | null | undefined,
  lang: string | null | undefined,
  capChars: number,
): { chars: number; expandedChars: number; factor: number; overCap: boolean } {
  const chars = (text ?? "").trim().length;
  const factor = expectedExpansion(lang);
  const expandedChars = Math.round(chars * factor);
  return { chars, expandedChars, factor, overCap: capChars > 0 && expandedChars > capChars };
}

export type BoxMeasure = {
  /** Content size of the text itself. */
  contentW: number;
  contentH: number;
  /** Space the text is allowed to occupy. */
  boxW: number;
  boxH: number;
  /** True when the slot wraps; a nowrap slot only overflows horizontally. */
  wraps?: boolean;
};

/** Content/box ratio for a measured slot. 1 or less means it fits. */
export function overflowRatio(m: BoxMeasure): number {
  const tolerance = 1;
  const hRatio = m.boxH > 0 ? m.contentH / Math.max(1, m.boxH + tolerance) : 1;
  const wRatio = m.boxW > 0 ? m.contentW / Math.max(1, m.boxW + tolerance) : 1;
  // A wrapping slot overflows vertically; a nowrap slot overflows sideways.
  const ratio = m.wraps === false ? Math.max(hRatio, wRatio) : Math.max(hRatio, wRatio);
  return Math.max(1, Number.isFinite(ratio) ? ratio : 1);
}
