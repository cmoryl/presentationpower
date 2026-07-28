/**
 * Single source of truth for the TransPerfect division accent ramp.
 *
 * Every hairline frame gradient (and any other surface that travels the full
 * division ramp) MUST read from here — or from the matching CSS custom
 * properties `--tp-accent-1 … --tp-accent-7` defined in `src/styles.css`.
 *
 * Do not inline these hexes anywhere else. A parity test
 * (`src/lib/__tests__/accent-ramp-parity.test.ts`) fails the build if the CSS
 * tokens drift from this list.
 */

export const DIVISION_ACCENT_RAMP = [
  "#13b1f3", // City blue
  "#5ce1e6", // Aqua
  "#a6fa87", // Green
  "#ffeb66", // Yellow
  "#ff9b70", // Peach
  "#ec388a", // Pink
  "#c2a3ff", // Lavender
] as const;

export type DivisionAccent = (typeof DIVISION_ACCENT_RAMP)[number];

/** Shared intensity contract for hairline frames, so every usage matches. */
export const ACCENT_RAMP_INTENSITY = {
  /** Border thickness of the masked gradient frame. */
  hairlineWidthPx: 1,
  /** Dormant state — frame is invisible until hover/selection. */
  idleOpacity: 0,
  /** Hover state. */
  hoverOpacity: 0.45,
  /** Selected / active state. */
  activeOpacity: 1,
  /** Rotation period (seconds) for hover and active states. */
  hoverSpinSeconds: 7,
  /** Rotation period (seconds) when the card is selected. */
  activeSpinSeconds: 5.5,
  /** Opacity transition (ms). */
  transitionMs: 260,
} as const;

/**
 * Builds the canonical conic gradient used by the hairline frame, closing the
 * loop on the first stop so the rotation is seamless.
 */
export function accentConicGradient(from = "var(--tp-frame-angle)"): string {
  const stops = [...DIVISION_ACCENT_RAMP, DIVISION_ACCENT_RAMP[0]].join(", ");
  return `conic-gradient(from ${from}, ${stops})`;
}

/** Linear variant of the same ramp, for bars/underlines that need cohesion. */
export function accentLinearGradient(angle = "90deg"): string {
  return `linear-gradient(${angle}, ${DIVISION_ACCENT_RAMP.join(", ")})`;
}
