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
// Light-mode alphas are deliberately stronger than a "hint": at 0.05 fill the
// tint disappeared entirely once the deck was rasterised to PDF (print gamma +
// JPEG chroma subsampling eat sub-6% washes), so the light modules read as
// plain white boxes. These values stay subtle on screen but survive export.
export const ACCENT_ALPHA = {
  light: { fill: 0.1, wash: 0.17, ring: 0.32, seam: 0.9, glow: 0.22 },
  dark: { fill: 0.08, wash: 0.14, ring: 0.3, seam: 0.85, glow: 0.35 },
} as const;

// ── Accent ink (accent used as TEXT) ───────────────────────────────────────
// Deep division accents (Blue 500 #003FC7, Pink #EC388A, Red #E53D2E) sit at
// very low luminance, so on the navy slide surface they blend into the
// background — section numbers and stat figures effectively vanish. On white
// the bright accents (Aqua, Yellow, Green) do the same. `accentInk` shifts
// luminance only (hue preserved) until the colour clears AA against the mode's
// base surface; if the accent can never clear it without losing its identity we
// fall back to plain white / navy ink so nothing is ever unreadable.
// Dark plates range from the flat navy base to the brighter aurora blues that
// bloom behind module cards — accent ink must clear contrast against the
// BRIGHTEST plate, otherwise step numbers and stat figures disappear wherever
// an orb sits behind them (very visible once flattened to PDF).
const DARK_SURFACES = ["#03002C", "#0A1230", "#12225E", "#1B3A8C"];
const LIGHT_SURFACES = ["#FFFFFF", "#F2F2F2"];

function rgbOf(hex: string): { r: number; g: number; b: number } | null {
  let h = (hex || "").replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lum(hex: string): number {
  const rgb = rgbOf(hex);
  if (!rgb) return 0;
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b);
}

function ratio(a: string, b: string): number {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Minimum relative luminance for accent ink on dark slides (aurora-proof). */
const DARK_INK_MIN_LUM = 0.36;

/** Mix a colour toward white (hue preserved) until it reaches `minLum`. */
function liftToLum(rgb: { r: number; g: number; b: number }, minLum: number): string {
  for (let step = 1; step <= 24; step++) {
    const t = (step / 24) * 0.9;
    const candidate = toHex({
      r: rgb.r + (255 - rgb.r) * t,
      g: rgb.g + (255 - rgb.g) * t,
      b: rgb.b + (255 - rgb.b) * t,
    });
    if (lum(candidate) >= minLum) return candidate;
  }
  return "#FFFFFF";
}

/**
 * Accent hex tuned for use as text/figure colour on the current mode surface.
 * `target` defaults to 4.5 (AA body); pass 3 for large display figures.
 */
export function accentInk(
  accentHex: string | null | undefined,
  mode: AccentMode,
  target = 4.5,
): string {
  const dark = isDark(mode);
  const surfaces = dark ? DARK_SURFACES : LIGHT_SURFACES;
  const a = accentHex || FALLBACK_ACCENT;
  const rgb = rgbOf(a);
  if (!rgb) return dark ? "#FFFFFF" : "#03002C";
  // On dark slides, contrast against the flat plates is not enough: the violet/
  // blue aurora orbs that bloom behind module cards are far brighter than any
  // fixed surface, so a deep accent (Blue 500, Pink, Red) still sinks into the
  // bloom wherever an orb sits behind a numeral or an icon badge. Enforce an
  // absolute brightness floor as well, mixing toward white (hue preserved)
  // until the ink is luminous enough to sit on top of the brightest bloom.
  if (dark && lum(a) < DARK_INK_MIN_LUM) return liftToLum(rgb, DARK_INK_MIN_LUM);
  if (surfaces.every((bg) => ratio(a, bg) >= target)) return a;
  const pole = dark ? { r: 255, g: 255, b: 255 } : { r: 10, g: 15, b: 40 };
  // Mix toward the pole in small steps; stop as soon as AA is cleared. Cap the
  // mix at 0.8 so the hue is still recognisably the division's.
  for (let step = 1; step <= 16; step++) {
    const t = (step / 16) * 0.8;
    const candidate = toHex({
      r: rgb.r + (pole.r - rgb.r) * t,
      g: rgb.g + (pole.g - rgb.g) * t,
      b: rgb.b + (pole.b - rgb.b) * t,
    });
    if (surfaces.every((bg) => ratio(candidate, bg) >= target)) return candidate;
  }
  return dark ? "#FFFFFF" : "#03002C";
}

/** Convenience: accent ink for large display figures (AA large = 3:1). */
export function accentFigureInk(
  accentHex: string | null | undefined,
  mode: AccentMode,
): string {
  return accentInk(accentHex, mode, 3);
}

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
  /** Accent tuned for TEXT on this mode's surface (AA body, 4.5:1). */
  ink: string;
  /** Accent tuned for LARGE display figures on this mode's surface (3:1). */
  figureInk: string;
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
    panelGradient: `linear-gradient(180deg, ${hexA(a, 0.26)} 0%, ${hexA(a, 0.12)} 34%, rgba(255,255,255,0.6) 74%, rgba(255,255,255,0) 100%)`,
    ink: accentInk(a, mode),
    figureInk: accentFigureInk(a, mode),
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
    ["--tp-accent-ink" as string]: t.ink,
    ["--tp-accent-figure-ink" as string]: t.figureInk,
  } as CSSProperties;
}
