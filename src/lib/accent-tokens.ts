/**
 * Shared division-accent theme tokens.
 *
 * Single source of truth for every accent-derived colour, tint and gradient used
 * on slide module surfaces (GlassTile, hand-rolled module boxes in
 * VariantRenderer, matrix/quadrant cells, print surfaces...). Components must
 * read these tokens instead of hand-rolling `rgba()` strings so that switching
 * the active division re-colours every module page identically.
 */
import type { CSSProperties } from "react";

export type AccentMode = "light" | "dark" | string | undefined;

/** Fallback accent when no division accent is resolved (TransPerfect Blue 500). */
export const FALLBACK_ACCENT = "#003FC7";

/** hex (#rgb / #rrggbb) -> rgba() string. */
export function hexA(hex: string, alpha: number): string {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return `rgba(0, 63, 199, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const isDark = (mode: AccentMode) => mode === "dark";

/** Alpha scale for accent surfaces, per mode. Keep every consumer on these. */
export const ACCENT_ALPHA = {
  light: { fill: 0.05, wash: 0.08, ring: 0.2, seam: 0.85, glow: 0.22 },
  dark: { fill: 0.08, wash: 0.14, ring: 0.3, seam: 0.85, glow: 0.35 },
} as const;

export interface AccentTokens {
  /** Resolved accent hex. */
  accent: string;
  /** Flat tinted fill for a module surface. */
  fill: string;
  /** Corner radial wash layered over the fill. */
  wash: string;
  /** Hairline ring / border colour. */
  ring: string;
  /** Full-width top-edge seam gradient (fades at both ends). */
  seam: string;
  /** Soft outer underglow (dark surfaces only; empty string on light). */
  glow: string;
  /** Enterprise-White / light "outline-free" vertical gradient panel fill. */
  panelGradient: string;
}

export function accentTokens(
  accentHex: string | null | undefined,
  mode: AccentMode,
  opts: { emphasis?: number } = {},
): AccentTokens {
  const a = accentHex || FALLBACK_ACCENT;
  const e = opts.emphasis ?? 1;
  const s = isDark(mode) ? ACCENT_ALPHA.dark : ACCENT_ALPHA.light;
  return {
    accent: a,
    fill: hexA(a, s.fill * e),
    wash: `radial-gradient(120% 90% at 0% 0%, ${hexA(a, s.wash * e)} 0%, transparent 64%)`,
    ring: hexA(a, s.ring * e),
    seam: `linear-gradient(90deg, ${hexA(a, 0)} 0%, ${hexA(a, s.seam)} 22%, ${a} 50%, ${hexA(a, s.seam)} 78%, ${hexA(a, 0)} 100%)`,
    glow: isDark(mode) ? `0 12px 40px -18px ${hexA(a, s.glow)}` : "",
    panelGradient: `linear-gradient(180deg, ${hexA(a, 0.16)} 0%, ${hexA(a, 0.06)} 34%, rgba(255,255,255,0.55) 70%, rgba(255,255,255,0) 100%)`,
  };
}

/** Neutral (accent-less) module surface, so callers never branch on their own. */
export function neutralSurface(mode: AccentMode): CSSProperties {
  const dark = isDark(mode);
  return {
    background: dark ? "rgba(255,255,255,0.03)" : "rgba(10,15,28,0.02)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)"}`,
  };
}

/** Accent-tinted module-card surface (fill + wash + ring). */
export function accentSurface(
  accentHex: string | null | undefined,
  mode: AccentMode,
  opts: { emphasis?: number } = {},
): CSSProperties {
  if (!accentHex) return neutralSurface(mode);
  const t = accentTokens(accentHex, mode, opts);
  return {
    background: t.fill,
    backgroundImage: t.wash,
    border: `1px solid ${t.ring}`,
  };
}

/**
 * CSS custom properties for the active accent, so CSS (including print
 * stylesheets) can consume the same ramp without duplicating literals.
 */
export function accentCssVars(
  accentHex: string | null | undefined,
  mode: AccentMode,
): CSSProperties {
  const t = accentTokens(accentHex, mode);
  return {
    ["--tp-accent" as string]: t.accent,
    ["--tp-accent-fill" as string]: t.fill,
    ["--tp-accent-wash" as string]: t.wash,
    ["--tp-accent-ring" as string]: t.ring,
    ["--tp-accent-seam" as string]: t.seam,
    ["--tp-accent-panel" as string]: t.panelGradient,
  } as CSSProperties;
}
