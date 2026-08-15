// Division-aware ECharts theme builder. Every chart in the platform reads
// its accent/primary/ink colors from the same slide brand tokens so the
// aurora + free-form treatment stays consistent.

import type { InfographicTheme } from "./spec";
// Shared accent helper — single implementation project-wide.
import { hexA } from "@/lib/accent-tokens";



/** Rotate hue of a hex color by `deg` degrees. Cheap HSL round-trip. */
function shift(hex: string, deg: number, lPct = 0): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  hh = (hh + deg / 360) % 1;
  if (hh < 0) hh += 1;
  const l2 = Math.min(1, Math.max(0, l + lPct));
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s;
  const p = 2 * l2 - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const rr = Math.round(hue2rgb(hh + 1 / 3) * 255);
  const gg = Math.round(hue2rgb(hh) * 255);
  const bb = Math.round(hue2rgb(hh - 1 / 3) * 255);
  return `#${[rr, gg, bb].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function paletteFromTheme(theme: InfographicTheme): string[] {
  if (theme.palette && theme.palette.length > 0) return theme.palette;
  const a = theme.accent;
  const p = theme.primary;
  return [
    a,
    p,
    shift(a, 32, 0.08),
    shift(p, -32, 0.06),
    shift(a, -48, -0.05),
    shift(p, 48, -0.04),
    shift(a, 96, 0.04),
    shift(p, -96, -0.02),
  ];
}

/**
 * Build a lightweight ECharts option preset. Callers spread this into their
 * per-chart option and override series-specific bits.
 */
export function buildEchartsBase(theme: InfographicTheme, fill = 1) {
  // Auto-fill: label ink grows with the slide's open space, clamped so a chart
  // never turns into oversized type.
  const k = Math.min(1.3, Math.max(0.9, fill));
  const fz = (px: number) => Math.round(px * k);
  const isDark = theme.mode === "dark";
  const strong = theme.ink;
  const muted = isDark ? hexA(theme.ink, 0.7) : hexA(theme.ink, 0.65);
  const faint = isDark ? hexA(theme.ink, 0.28) : hexA(theme.ink, 0.22);
  const hairline = isDark ? hexA(theme.ink, 0.14) : hexA(theme.ink, 0.1);
  const palette = paletteFromTheme(theme);
  return {
    backgroundColor: "transparent",
    color: palette,
    textStyle: {
      color: strong,
      fontFamily:
        theme.fontFamily ||
        "Geist, Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial",
      // Charts are read at slide scale (projected, or a scaled-down card), so
      // label ink runs a step heavier than a dashboard would use.
      fontSize: fz(15),
    },
    animation: false,
    grid: { left: 40, right: 24, top: 32, bottom: 40, containLabel: true },
    tooltip: {
      backgroundColor: isDark ? "rgba(9,10,30,0.92)" : "rgba(255,255,255,0.96)",
      borderColor: hairline,
      borderWidth: 1,
      textStyle: { color: strong },
      extraCssText: `backdrop-filter: blur(16px); box-shadow: 0 8px 32px ${hexA(theme.primary, 0.18)};`,
    },
    legend: {
      textStyle: { color: muted, fontSize: fz(14) },
      itemGap: 20,
      itemWidth: 12,
      itemHeight: 12,
      icon: "roundRect",
    },
    xAxis: {
      axisLine: { lineStyle: { color: faint } },
      axisTick: { show: false },
      axisLabel: { color: muted, fontSize: fz(14) },
      splitLine: { show: false },
    },
    yAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: muted, fontSize: fz(14) },
      splitLine: { lineStyle: { color: hairline, type: "dashed" } },
    },
  };
}

export const echartsInk = (theme: InfographicTheme) => ({
  strong: theme.ink,
  muted: theme.mode === "dark" ? hexA(theme.ink, 0.7) : hexA(theme.ink, 0.65),
  faint: theme.mode === "dark" ? hexA(theme.ink, 0.28) : hexA(theme.ink, 0.22),
  hairline: theme.mode === "dark" ? hexA(theme.ink, 0.14) : hexA(theme.ink, 0.1),
});
