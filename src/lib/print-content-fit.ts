// CONTENT-FIT MODE
// ---------------------------------------------------------------------------
// Single-page print pieces have a fixed trim. When copy grows past it the page
// silently clips. Content-fit watches measured overflow and, once it passes a
// threshold (15% of the page by default), recovers space in two stages:
//
//   1. Margin relief  — pull the side margins in (`--print-fit-pad`), which
//      widens the measure so long paragraphs need fewer lines.
//   2. Scale relief   — shrink typography, iconography and spacing uniformly
//      (`--print-fit-scale`), because every print value is authored through
//      cq()/padCq() which multiply by that variable.
//
// Both knobs have floors so a piece never becomes unreadable; if the floors
// are reached and content still overflows, the editor keeps showing the hard
// overflow warning so the author can cut copy instead.

export type PrintContentFitSettings = {
  enabled: boolean;
  /** Overflow fraction (0..1) that must be exceeded before fitting kicks in. */
  threshold: number;
  /** Lower bound for the uniform scale knob. */
  minScale: number;
  /** Lower bound for the side-margin multiplier. */
  minPad: number;
  /** Try margin relief before shrinking type. */
  marginRelief: boolean;
};

export const PRINT_CONTENT_FIT_DEFAULTS: PrintContentFitSettings = {
  enabled: true,
  threshold: 0.15,
  minScale: 0.82,
  minPad: 0.68,
  marginRelief: true,
};

export function resolveContentFit(
  partial: Partial<PrintContentFitSettings> | undefined,
): PrintContentFitSettings {
  const s = { ...PRINT_CONTENT_FIT_DEFAULTS, ...(partial ?? {}) };
  return {
    enabled: Boolean(s.enabled),
    threshold: clamp(s.threshold, 0.02, 0.6),
    minScale: clamp(s.minScale, 0.6, 1),
    minPad: clamp(s.minPad, 0.4, 1),
    marginRelief: Boolean(s.marginRelief),
  };
}

export type PrintFitKnobs = { scale: number; pad: number };

export const NEUTRAL_FIT: PrintFitKnobs = { scale: 1, pad: 1 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}

const PAD_STEP = 0.06;
const SCALE_STEP = 0.02;

/**
 * One relief step. Called repeatedly by the frame after each measurement, so
 * fitting converges on the smallest reduction that actually clears the trim
 * (measuring beats predicting — reflow is non-linear).
 */
export function nextFitStep(
  current: PrintFitKnobs,
  overflowFrac: number,
  settings: PrintContentFitSettings,
): PrintFitKnobs | null {
  if (!settings.enabled) return null;
  if (overflowFrac <= settings.threshold) return null;

  if (settings.marginRelief && current.pad > settings.minPad + 1e-6) {
    return { ...current, pad: Math.max(settings.minPad, current.pad - PAD_STEP) };
  }
  if (current.scale > settings.minScale + 1e-6) {
    // Bigger overflow → bigger first bite, then fine steps.
    const bite = overflowFrac > 0.35 ? SCALE_STEP * 3 : SCALE_STEP;
    return { ...current, scale: Math.max(settings.minScale, current.scale - bite) };
  }
  return null;
}

/** True when the knobs are doing nothing. */
export function isNeutralFit(k: PrintFitKnobs): boolean {
  return k.scale >= 0.999 && k.pad >= 0.999;
}

/** CSS custom properties for the fit wrapper. */
export function fitStyleVars(k: PrintFitKnobs): Record<string, string> {
  return {
    "--print-fit-scale": k.scale.toFixed(4),
    "--print-fit-pad": k.pad.toFixed(4),
  };
}

export function describeFit(k: PrintFitKnobs): string {
  const parts: string[] = [];
  if (k.scale < 0.999) parts.push(`type & icons ${Math.round(k.scale * 100)}%`);
  if (k.pad < 0.999) parts.push(`side margins ${Math.round(k.pad * 100)}%`);
  return parts.length ? parts.join(" · ") : "no adjustment needed";
}
