/**
 * SPECTRUM STYLE — the single source of truth for the corporate deck look
 * defined by the TransPerfect PowerPoint Style Guide (MarComm, Q4 2026).
 *
 * Every corporate surface — browser module renderers, PPTX emitters, sales
 * presets and the presentation agent — reads the spec from here. Values are
 * mirrored from `SPECTRUM` in brand-colors.ts; this file adds the geometry,
 * type scale and ordering rules, plus the helpers that apply them.
 *
 * The six principles (guide pg. 3):
 *   1. Light first — white→lilac canvas on every slide, no dark pages.
 *   2. One hero per slide — one number, key word or photo is biggest.
 *   3. Spectrum in order — aqua first, blue second, violet third.
 *   4. Frost, not flat — containers are frosted glass with one soft shadow.
 *   5. Type is design — big numbers and key words carry the slide, in gradient.
 *   6. Equal and aligned — same size, same baseline, same gap.
 */

import { BRAND, SPECTRUM } from "./brand-colors";

/** Stage px per inch on the 1920×1080 (13.333″×7.5″) slide stage. */
export const STAGE_PX_PER_IN = 144;

// ─── Type scale (guide spec sheet, pg. 21) ──────────────────────────────────
// Geist only; PowerPoint fallback is Verdana. Nothing on a slide below 12 pt.
export const SPECTRUM_TYPE = {
  fontFamily: "Geist",
  pptxFallback: "Verdana",
  /** Slide title: 36 pt Regular, Ink, sentence case, tight spacing. */
  title: { pt: 36, weight: 400, color: SPECTRUM.ink, tracking: "tight" },
  /** Card title: 18–22 pt Medium, Ink. */
  cardTitle: { ptMin: 18, ptMax: 22, weight: 500, color: SPECTRUM.ink },
  /** Body: 13–14 pt Regular, #3D3B5C. */
  body: { ptMin: 13, ptMax: 14, weight: 400, color: SPECTRUM.body },
  /** Eyebrow: 13 pt SemiBold, CAPS, #003FC7, wide tracking. */
  eyebrow: { pt: 13, weight: 600, color: SPECTRUM.eyebrow, caps: true, tracking: "wide" },
  /** Stat: 44–55 pt SemiBold, spectrum gradient. */
  stat: { ptMin: 44, ptMax: 55, weight: 600, gradient: true },
  /** Hero number: 110 pt, one per slide, gradient, always labeled. */
  heroNumber: { pt: 110, perSlide: 1, gradient: true, labeled: true },
  /** Nothing smaller than 12 pt. */
  minimumPt: 12,
} as const;

// ─── Spectrum ordering ──────────────────────────────────────────────────────

export type SpectrumStage = (typeof SPECTRUM.stages)[number];

/**
 * The stage for a position in a sequence — aqua first, blue second, violet
 * third, then repeating. Color comes from position, never at random.
 */
export function spectrumStage(index: number): SpectrumStage {
  const stages = SPECTRUM.stages;
  return stages[((index % stages.length) + stages.length) % stages.length]!;
}

/** 135° brand→light gradient for a stage's numerals and hero words. */
export function spectrumGradientCss(index: number): string {
  const s = spectrumStage(index);
  return `linear-gradient(135deg, ${s.brand} 0%, ${s.light} 100%)`;
}

/**
 * Solid fallback for contexts without gradient text (PPTX export): the
 * stage's deep step, per the guide rule "colored text uses the deep step".
 */
export function spectrumDeepHex(index: number): string {
  return spectrumStage(index).deep;
}

/** 90° aqua→blue→violet line for rules, trackers and progressions. */
export const SPECTRUM_LINE_GRADIENT = `linear-gradient(90deg, ${SPECTRUM.stages[0].brand} 0%, ${SPECTRUM.stages[1].brand} 50%, ${SPECTRUM.stages[2].brand} 100%)`;

// ─── Frost card (guide pg. 11–12) ───────────────────────────────────────────

export const FROST_CARD = {
  /** Corner radius in stage px (0.22″ × 144 px/in ≈ 32). */
  radiusPx: Math.round(SPECTRUM.frostCard.radiusIn * STAGE_PX_PER_IN),
  /** 90° white → #F0F3FB fill. */
  fillCss: `linear-gradient(180deg, ${SPECTRUM.frostCard.fillFrom} 0%, ${SPECTRUM.frostCard.fillTo} 100%)`,
  /** 0.75 pt #D6DCF0 keyline (≈1 px at stage scale). */
  borderCss: `1px solid ${SPECTRUM.frostCard.line}`,
  /** One soft shadow: ink at 7%, 18 pt blur, 7 pt distance (≈24 px / 9 px). */
  shadowCss: `0 ${Math.round((SPECTRUM.frostCard.shadowDistancePt / 72) * STAGE_PX_PER_IN)}px ${Math.round((SPECTRUM.frostCard.shadowBlurPt / 72) * STAGE_PX_PER_IN)}px rgba(3, 0, 44, ${SPECTRUM.frostCard.shadowAlpha})`,
  /** Inner tiles are solid white; never more than three layers deep. */
  innerTileBg: "#FFFFFF",
  maxLayers: 3,
} as const;

// ─── Canvas, layout, imagery, wordmark ──────────────────────────────────────

/** The light canvas every corporate slide sits on. */
export const SPECTRUM_CANVAS_CSS = `linear-gradient(180deg, ${SPECTRUM.canvas.from} 0%, ${SPECTRUM.canvas.to} 100%)`;

/** Soft aqua (bottom-left) and lilac (bottom-right) light the canvas edges, as on every guide page. */
export const SPECTRUM_CANVAS_GLOWS = [
  "radial-gradient(60% 55% at 0% 100%, rgba(161,251,249,0.38) 0%, rgba(161,251,249,0) 70%)",
  "radial-gradient(60% 60% at 100% 100%, rgba(194,163,255,0.30) 0%, rgba(194,163,255,0) 70%)",
] as const;

export const SPECTRUM_LAYOUT = {
  /** Left/right margins, inches. */
  marginIn: 0.75,
  /** Repeated items: same size, equal gaps. */
  equalGaps: true,
} as const;

export const SPECTRUM_IMAGERY = {
  /** Photo frame corner radius range, pt (24–40 per guide). */
  frameRadiusPtMin: 24,
  frameRadiusPtMax: 40,
  /** Thin white frame + soft shadow; no circles, orbs or full-bleed. */
  frame: "thin-white",
  noOrbs: true,
  noFullBleed: true,
} as const;

export const SPECTRUM_WORDMARK = {
  /** Navy wordmark on light; white only on the GlobalLink card or a photo. */
  color: SPECTRUM.ink,
  /** Bottom-right, 84 pt wide, once per slide. */
  position: "bottom-right",
  widthPt: 84,
  perSlide: 1,
} as const;

/** The one deep block allowed: the GlobalLink card gradient, one per slide. */
export const GLOBALLINK_CARD_GRADIENT = `linear-gradient(135deg, ${SPECTRUM.globalLinkCard.join(", ")})`;

/** White text is only legal on the GlobalLink card or on a photo. */
export function spectrumTextColor(role: keyof typeof SPECTRUM_TYPE extends never ? never : "title" | "body" | "eyebrow"): string {
  return role === "title" ? SPECTRUM.ink : role === "eyebrow" ? SPECTRUM.eyebrow : SPECTRUM.body;
}

export { BRAND, SPECTRUM };
