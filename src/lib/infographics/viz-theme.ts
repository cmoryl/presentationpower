// Mode- and pack-aware chart theme resolution.
//
// Why this exists: every BrandMode in taxonomy.ts carries a single
// mode-agnostic `ink` (#03002C) and a light `surface`. Feeding those straight
// into ECharts meant that in dark mode — and under every alternate look — the
// axes, labels and several series colours were drawn in near-black on a
// near-black slide. The charts *were* rendering; they were invisible, which is
// why the MV-VIZ cards read as "missing graphs".
//
// So chart ink/surface/palette are resolved here against the surface the chart
// actually sits on: the active style pack's tokens when a look is applied,
// otherwise the brand tokens re-grounded for light/dark. Every palette entry is
// contrast-checked against that surface and lifted along the shortest safe path
// until it can be seen.

import type { BrandMode } from "@/lib/taxonomy";
import type { StylePack } from "@/lib/style-packs";
import type { InfographicTheme } from "./spec";
import { paletteFromTheme } from "./echarts-theme";

const DARK_SURFACE = "#03002C";
const DARK_INK = "#EAF0FF";

/** Minimum contrast a series colour must have against the chart surface. */
const MIN_SERIES_CONTRAST = 2.4;

function parse(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0]! + h[0]!, 16);
    const g = parseInt(h[1]! + h[1]!, 16);
    const b = parseInt(h[2]! + h[2]!, 16);
    return [r, g, b];
  }
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((n) =>
      Math.round(Math.min(255, Math.max(0, n)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function relLuminance(hex: string): number {
  const rgb = parse(hex);
  if (!rgb) return 0.5;
  const ch = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(hex: string, toward: string, t: number): string {
  const a = parse(hex);
  const b = parse(toward);
  if (!a || !b) return hex;
  return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

/**
 * Nudge `hex` toward white (on a dark surface) or black (on a light surface)
 * until it clears `min` contrast against `surface`. Hue is preserved — we only
 * travel along lightness, so a division accent still reads as itself.
 */
export function ensureVizContrast(hex: string, surface: string, min = MIN_SERIES_CONTRAST): string {
  if (!parse(hex)) return hex;
  const surfaceIsDark = relLuminance(surface) < 0.45;
  const target = surfaceIsDark ? "#FFFFFF" : "#000000";
  let out = hex;
  for (let i = 1; i <= 12 && contrast(out, surface) < min; i++) {
    out = mix(hex, target, i * 0.07);
  }
  return out;
}

export type VizThemeInput = {
  brand: BrandMode;
  mode: "light" | "dark";
  pack?: StylePack | null;
};

/** Resolve the chart theme for the surface the chart is actually drawn on. */
export function vizTheme({ brand, mode, pack }: VizThemeInput): InfographicTheme {
  // A pack owns its mode — the look IS light or dark.
  const effectiveMode: "light" | "dark" = pack ? pack.mode : mode;

  const surface = pack
    ? pack.tokens.surface
    : effectiveMode === "dark"
      ? DARK_SURFACE
      : brand.tokens.surface;

  const ink = pack ? pack.tokens.ink : effectiveMode === "dark" ? DARK_INK : brand.tokens.ink;

  const rawAccent = pack ? pack.tokens.accentText || pack.tokens.accent : brand.tokens.accent;
  const rawPrimary = pack ? pack.tokens.primary : brand.tokens.primary;

  const accent = ensureVizContrast(rawAccent, surface, 3);
  const primary = ensureVizContrast(rawPrimary, surface, 3);

  // Seed palette: a pack brings its own family (accent, alt accent, primary,
  // swatch); the brand system derives one from accent + primary. Either way
  // every entry is contrast-guarded against the resolved surface.
  const seed = pack
    ? Array.from(
        new Set(
          [
            pack.tokens.accent,
            pack.tokens.accentAlt,
            pack.tokens.primary,
            ...(pack.swatch ?? []),
          ].filter((c): c is string => typeof c === "string" && c.startsWith("#")),
        ),
      )
    : paletteFromTheme({ mode: effectiveMode, accent, primary, ink, surface });

  const guarded = Array.from(
    new Set(seed.map((c) => ensureVizContrast(c, surface, MIN_SERIES_CONTRAST))),
  );
  const palette = separatePalette(guarded, surface);

  return {
    divisionId: brand.id,
    mode: effectiveMode,
    accent,
    primary,
    ink,
    surface,
    palette: palette.length >= 3 ? palette : [accent, primary, ...palette],
    fontFamily: pack?.type?.body,
  };
}

/**
 * Order a contrast-guarded palette so neighbouring series always read apart,
 * then force a luminance step between neighbours that still collide.
 *
 * Two problems the audit sweep surfaced: hue-ramp palettes put near-identical
 * colours next to each other (invisible series boundaries), and a palette can
 * be hue-varied but luminance-flat, which collapses to one grey on press.
 * Greedy nearest-farthest ordering fixes the first; a lightness nudge along the
 * safe axis (away from the surface) fixes the second without touching hue.
 */
export function separatePalette(colors: string[], surface: string): string[] {
  const pool = colors.filter((c) => parse(c));
  if (pool.length < 3) return colors;

  const dist = (a: string, b: string) => {
    const pa = parse(a)!;
    const pb = parse(b)!;
    const rgb = Math.sqrt(
      2 * (pa[0] - pb[0]) ** 2 + 4 * (pa[1] - pb[1]) ** 2 + 3 * (pa[2] - pb[2]) ** 2,
    );
    const lum = Math.abs(relLuminance(a) - relLuminance(b)) * 400;
    return rgb + lum;
  };

  // Keep entry 0 (the brand accent) as the lead colour, then always take the
  // remaining colour that sits farthest from the one just placed.
  const out = [pool[0]!];
  const rest = pool.slice(1);
  while (rest.length > 0) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < rest.length; i += 1) {
      const score = dist(rest[i]!, out[out.length - 1]!);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    out.push(rest.splice(bestIdx, 1)[0]!);
  }

  const surfaceIsDark = relLuminance(surface) < 0.45;
  const away = surfaceIsDark ? "#FFFFFF" : "#000000";
  const toward = surfaceIsDark ? "#0A1230" : "#FFFFFF";
  for (let i = 1; i < out.length; i += 1) {
    const prev = out[i - 1]!;
    const tooClose = (c: string) =>
      contrast(c, prev) < 1.4 || Math.abs(relLuminance(c) - relLuminance(prev)) < 0.07;
    let best = out[i]!;
    for (let step = 1; step <= 8 && tooClose(best); step += 1) {
      // Alternate direction so a long palette fans out instead of drifting to
      // one end of the range — but never accept a nudge that breaks the
      // colour's own contrast against the chart surface.
      const candidates = [
        mix(out[i]!, i % 2 === 0 ? away : toward, step * 0.09),
        mix(out[i]!, away, step * 0.09),
      ];
      const ok = candidates.find(
        (c) => contrast(c, surface) >= MIN_SERIES_CONTRAST && !tooClose(c),
      );
      if (ok) best = ok;
    }
    out[i] = contrast(best, surface) >= MIN_SERIES_CONTRAST ? best : out[i]!;
  }
  return Array.from(new Set(out));
}

function vizContrastLocal(a: string, b: string): number {
  return contrast(a, b);
}

