/**
 * SOCIAL MODULE FIT ENGINE
 * ---------------------------------------------------------------------------
 * Print section modules are authored against a portrait page (816px wide, all
 * internal type in `cqw` units). Social frames are square, portrait-tall, or
 * extreme landscape. Dropping a page module straight into a 1080×1920 story
 * either overflows the safe rect or leaves half the frame empty.
 *
 * This module owns the deterministic geometry for that adaptation:
 *  - the safe rect of a social format (platform chrome + frame padding),
 *  - the virtual page width a module is rendered at,
 *  - a monotonic relief ladder that trades typographic size and optional
 *    content for vertical room until the module fits without overlap.
 *
 * Pure functions only — the React frame measures, this file decides.
 */

import { PAGE_W } from "@/components/print/print-primitives";
import type { SocialFormat } from "@/lib/social-formats";
import { aspectClass } from "@/lib/social-formats";

export type SocialFitRelief = {
  level: number;
  /** Virtual page width multiplier. Wider page + same box = smaller type,
   *  so more content fits vertically without any overlap. */
  pageWidthScale: number;
  /** Render icon chips inside the module. */
  icons: boolean;
  /** Hard cap on repeated items (stats, features, logos, rows). */
  maxItems: number;
  /** Drop long supporting paragraphs. */
  dropSummary: boolean;
  /** Drop meta rails / captions. */
  dropMeta: boolean;
  /** Human-readable note for the fit report. */
  note: string;
};

/** Monotonic ladder — each rung buys vertical room and costs presence. */
export const SOCIAL_RELIEF_LADDER: SocialFitRelief[] = [
  {
    level: 0,
    pageWidthScale: 1,
    icons: true,
    maxItems: 6,
    dropSummary: false,
    dropMeta: false,
    note: "Native page proportions",
  },
  {
    level: 1,
    pageWidthScale: 1.09,
    icons: true,
    maxItems: 5,
    dropSummary: false,
    dropMeta: false,
    note: "Type eased ~8% to clear the safe rect",
  },
  {
    level: 2,
    pageWidthScale: 1.2,
    icons: true,
    maxItems: 4,
    dropSummary: false,
    dropMeta: true,
    note: "Type eased, meta rail dropped",
  },
  {
    level: 3,
    pageWidthScale: 1.34,
    icons: false,
    maxItems: 3,
    dropSummary: true,
    dropMeta: true,
    note: "Icons + supporting paragraph dropped",
  },
  {
    level: 4,
    pageWidthScale: 1.5,
    icons: false,
    maxItems: 2,
    dropSummary: true,
    dropMeta: true,
    note: "Headline-only reduction — consider a compact module",
  },
];

export const SOCIAL_RELIEF_MAX = SOCIAL_RELIEF_LADDER.length - 1;

export function reliefAt(level: number): SocialFitRelief {
  return SOCIAL_RELIEF_LADDER[Math.max(0, Math.min(SOCIAL_RELIEF_MAX, Math.round(level)))];
}

export type SocialSafeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Frame padding as a fraction of the short edge, per aspect class. */
function padPct(format: SocialFormat): number {
  switch (aspectClass(format)) {
    case "landscape-wide":
      return 4.5;
    case "landscape":
      return 5;
    case "square":
      return 5.5;
    case "portrait":
      return 5.5;
    case "portrait-tall":
      return 6.5;
  }
}

/** Safe rect in format pixels: platform chrome insets + frame padding. */
export function socialSafeRect(format: SocialFormat, padScale = 1): SocialSafeRect {
  const short = Math.min(format.width, format.height);
  const pad = (short * padPct(format) * padScale) / 100;
  const safe = format.safeArea ?? {};
  const left = pad + (safe.left ?? 0) * format.width;
  const right = pad + (safe.right ?? 0) * format.width;
  const top = pad + (safe.top ?? 0) * format.height;
  const bottom = pad + (safe.bottom ?? 0) * format.height;
  return {
    left,
    top,
    width: Math.max(120, format.width - left - right),
    height: Math.max(120, format.height - top - bottom),
  };
}

export type SocialFitInput = {
  format: SocialFormat;
  /** Natural height of the module measured at `pageWidth`, in page px. */
  naturalHeight: number;
  relief: SocialFitRelief;
  /** Growth multiplier from the growth ladder (1 = native page width). */
  growth?: number;
};

export type SocialFitResult = {
  /** Virtual page width the module renders at. */
  pageWidth: number;
  /** Transform scale applied to the page-width module inside the frame. */
  scale: number;
  /** Rendered height inside the frame, in format px. */
  renderedHeight: number;
  safe: SocialSafeRect;
  /** >0 means the module spills past the safe rect (overlap risk). */
  overflowPx: number;
  /** Overflow as a fraction of safe height. */
  overflowPct: number;
  /** Fraction of the safe rect the module occupies vertically. */
  fillPct: number;
  ok: boolean;
  /** Too little content for the frame — leaves an awkward empty band. */
  sparse: boolean;
};

export function pageWidthFor(relief: SocialFitRelief, growth = 1): number {
  return Math.round((PAGE_W * relief.pageWidthScale) / clampGrowth(growth));
}

/**
 * GROWTH LADDER (the inverse of relief)
 * ------------------------------------------------------------------------
 * A short module (a quote, a single stat) measured at native page width can
 * occupy well under half a story frame, which reads as a mistake rather than
 * as negative space. Narrowing the virtual page enlarges every `cqw` unit, so
 * the same module fills more of the safe rect with no layout risk.
 *
 * Quantized rungs (not a continuous solve) so the measure -> decide -> render
 * loop cannot oscillate: growth only ever steps up, and only while the
 * measured fill stays under the comfortable band.
 */
export const SOCIAL_GROWTH_STEPS = [1, 1.12, 1.26, 1.42] as const;
export const SOCIAL_GROWTH_MAX = SOCIAL_GROWTH_STEPS.length - 1;

function clampGrowth(growth: number): number {
  return Math.max(1, Math.min(SOCIAL_GROWTH_STEPS[SOCIAL_GROWTH_MAX], growth));
}

/** Fill fraction we aim for before we stop enlarging. */
export const SOCIAL_FILL_TARGET = 0.72;

/**
 * Next growth rung to try, or null when the module already reads full enough
 * (or enlarging further would risk the safe rect).
 */
export function nextGrowthStep(fit: SocialFitResult, stepIndex: number): number | null {
  if (!fit.ok) return null;
  if (stepIndex >= SOCIAL_GROWTH_MAX) return null;
  if (fit.fillPct >= SOCIAL_FILL_TARGET) return null;
  return stepIndex + 1;
}

export function computeSocialFit({
  format,
  naturalHeight,
  relief,
  growth = 1,
}: SocialFitInput): SocialFitResult {
  const safe = socialSafeRect(format);
  const pageWidth = pageWidthFor(relief, growth);
  const scale = safe.width / pageWidth;
  const renderedHeight = naturalHeight * scale;
  const overflowPx = renderedHeight - safe.height;
  return {
    pageWidth,
    scale,
    renderedHeight,
    safe,
    overflowPx,
    overflowPct: overflowPx / safe.height,
    fillPct: renderedHeight / safe.height,
    ok: overflowPx <= 1,
    sparse: renderedHeight > 0 && renderedHeight < safe.height * 0.45,
  };
}

/**
 * Next rung to try. Returns null when the module already fits, or when the
 * ladder is exhausted (the UI then reports a genuine design error instead of
 * silently clipping).
 */
export function nextRelief(fit: SocialFitResult, relief: SocialFitRelief): SocialFitRelief | null {
  if (fit.ok) return null;
  if (relief.level >= SOCIAL_RELIEF_MAX) return null;
  return reliefAt(relief.level + 1);
}

/** One-line health summary for the studio banner. */
export function fitSummary(fit: SocialFitResult, relief: SocialFitRelief): string {
  if (!fit.ok) {
    return `Overflows the safe area by ${Math.round(fit.overflowPct * 100)}% even at maximum relief — trim copy or pick a compact module.`;
  }
  if (fit.sparse) {
    return `Fits, but fills only ${Math.round(fit.fillPct * 100)}% of the safe area — a taller module or more content would read better.`;
  }
  return `Fits the safe area at ${Math.round(fit.fillPct * 100)}% fill · ${relief.note.toLowerCase()}.`;
}
