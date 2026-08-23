// -----------------------------------------------------------------------------
// SOCIAL CORNER SWEEP — single source of truth for the corner-rounding coverage
//
// The visual regression sweep (scripts/visual-regression-social-corners.mjs)
// must not hard-code how many styles, formats, modes or brands exist. It reads
// this config out of the running app instead, so:
//
//   - add a format to SOCIAL_FORMATS  -> swept automatically
//   - add a style to SOCIAL_STYLES    -> swept automatically
//   - add a mode/brand below          -> swept automatically
//
// Counts live nowhere but here (derived, never typed by hand). The baseline
// records the coverage fingerprint, so new combinations show up as "new cases"
// rather than silently going unswept.
// -----------------------------------------------------------------------------

import { SOCIAL_FORMATS } from "./social-formats";
import { SOCIAL_STYLES } from "./social-styles";

export type SweepMode = "light" | "dark";

export type SocialCornerSweepCase = {
  /** `<mode>/<style>__<format>` — matches the baseline case key. */
  key: string;
  mode: SweepMode;
  brandId: string;
  styleId: string;
  formatId: string;
};

/** Knobs the harness and the script share. Change them in ONE place. */
export const SOCIAL_CORNER_SWEEP = {
  /** Appearance modes swept for every style × format. */
  modes: ["light", "dark"] as SweepMode[],
  /** Brand modes swept. Add ids here to widen coverage. */
  brands: ["bm-enterprise"],
  /** Stable display short edge — radius is measured relative to it. */
  shortEdge: 360,
  /** Renderer promise: plate radius <= this share of the frame's short edge. */
  maxRadiusPct: 6,
  /** Allowed drift of a measured radius, in CSS px. */
  radiusTolerancePx: 0.75,
  /** Corner crop size, px (must contain any legal radius). */
  cropPx: 40,
  /** Max share of differing pixels in a crop before it's a regression. */
  pixelTolerancePct: 0.35,
} as const;

export function sweepStyleIds(): string[] {
  return SOCIAL_STYLES.map((s) => s.id);
}

export function sweepFormatIds(): string[] {
  return SOCIAL_FORMATS.map((f) => f.id);
}

/** Full expected coverage matrix, derived — never hand-counted. */
export function sweepCases(): SocialCornerSweepCase[] {
  const cases: SocialCornerSweepCase[] = [];
  for (const mode of SOCIAL_CORNER_SWEEP.modes) {
    for (const brandId of SOCIAL_CORNER_SWEEP.brands) {
      for (const styleId of sweepStyleIds()) {
        for (const formatId of sweepFormatIds()) {
          cases.push({
            key: `${mode}/${styleId}__${formatId}`,
            mode,
            brandId,
            styleId,
            formatId,
          });
        }
      }
    }
  }
  return cases;
}

/** Order-independent digest of the coverage matrix (FNV-1a). */
export function sweepFingerprint(): string {
  let h = 0x811c9dc5;
  for (const ch of sweepCases()
    .map((c) => c.key)
    .sort()
    .join("\u0000")) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export type SocialCornerSweepPlan = {
  config: typeof SOCIAL_CORNER_SWEEP;
  styles: string[];
  formats: string[];
  cases: SocialCornerSweepCase[];
  counts: { styles: number; formats: number; modes: number; brands: number; cases: number };
  fingerprint: string;
};

/** What the harness publishes to the sweep script. */
export function sweepPlan(): SocialCornerSweepPlan {
  const styles = sweepStyleIds();
  const formats = sweepFormatIds();
  const cases = sweepCases();
  return {
    config: SOCIAL_CORNER_SWEEP,
    styles,
    formats,
    cases,
    counts: {
      styles: styles.length,
      formats: formats.length,
      modes: SOCIAL_CORNER_SWEEP.modes.length,
      brands: SOCIAL_CORNER_SWEEP.brands.length,
      cases: cases.length,
    },
    fingerprint: sweepFingerprint(),
  };
}
