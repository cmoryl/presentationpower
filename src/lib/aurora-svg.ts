// Serializes the AuroraLayer visual as a standalone SVG data URL so PPTX/PDF
// exports can embed the exact same brand-accented atmospheric backdrop that
// the on-screen AuroraLayer paints. Mirrors the math in
// src/components/slide/flagship.tsx (auroraOrbs + mixHex + shiftHue) but
// depends on nothing React so it can run in export code paths.

import type { BrandMode } from "@/lib/taxonomy";

export function auroraSvgDataUrl(
  seed: string,
  brand: BrandMode,
  mode: "dark" | "light" = "dark",
  baseTint?: string,
): string {
  const base = baseTint ?? (mode === "dark" ? "#03002C" : brand.tokens.surface ?? "#FFFFFF");
  const orbs = auroraOrbs(seed, brand, mode);
  // Mirror AuroraLayer's on-screen opacities so every division's exported
  // slide reads at the same intensity as the live editor preview.
  const layerOpacity = auroraLayerOpacity(mode);
  const vignetteAlpha = mode === "dark" ? 0.55 : 0.5;
  const orbR = mode === "dark" ? "55%" : "85%";
  const midStop = mode === "dark" ? "22%" : "30%";
  const outerStop = mode === "dark" ? "50%" : "60%";
  const blurStd = mode === "dark" ? 38 : 65;
  // Frosted-glass wash: per-brand tuned in dark mode so each division keeps
  // the "orbs peek through glass" look without flattening into a single
  // colour field. Darker/heavier accents get a lower alpha (they already
  // read strongly through the wash); lighter/pastel accents get a slightly
  // higher alpha to tame brightness. The wash colour itself is a mix of a
  // neutral navy and the brand's own surface so the film subtly carries
  // the brand tint instead of washing everything to a single grey.
  const wash = darkGlassWash(brand);
  const glassColor = mode === "dark" ? wash.color : "#FFFFFF";
  const glassAlpha = mode === "dark" ? wash.alpha : 0.32;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
  <defs>
    ${orbs
      .map(
        (o, i) => `
    <radialGradient id="orb-${i}" cx="50%" cy="50%" r="${orbR}">
      <stop offset="0%" stop-color="${o.color}" stop-opacity="${o.alpha}" />
      <stop offset="${midStop}" stop-color="${o.color}" stop-opacity="${o.alpha * 0.6}" />
      <stop offset="${outerStop}" stop-color="${o.color}" stop-opacity="${o.alpha * 0.2}" />
      <stop offset="100%" stop-color="${o.color}" stop-opacity="0" />
    </radialGradient>`,
      )
      .join("")}
    <filter id="aurora-blur" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="${blurStd}" edgeMode="duplicate" />
    </filter>
    <radialGradient id="vignette" cx="50%" cy="${mode === "dark" ? "60%" : "55%"}" r="${mode === "dark" ? "80%" : "85%"}">
      <stop offset="${mode === "dark" ? "30%" : "55%"}" stop-color="${base}" stop-opacity="0" />
      <stop offset="${mode === "dark" ? "130%" : "125%"}" stop-color="${base}" stop-opacity="${vignetteAlpha}" />
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="${base}" />
  <g filter="url(#aurora-blur)" opacity="${layerOpacity}">
    ${orbs
      .map(
        (o, i) => `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}" fill="url(#orb-${i})" />`,
      )
      .join("")}
  </g>
  <rect width="1280" height="720" fill="${glassColor}" fill-opacity="${glassAlpha}" />
  <rect width="1280" height="720" fill="url(#vignette)" />
</svg>`;

  // Use encodeURIComponent to keep the payload safe for data URLs.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface AuroraOrbSpec {
  color: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
}

export function auroraOrbs(
  seed: string,
  brand: BrandMode,
  mode: "dark" | "light" = "dark",
): AuroraOrbSpec[] {
  // Deterministic hash → three offset orbs painted purely from the brand's
  // own tokens. Mirrors auroraOrbs() in src/components/slide/flagship.tsx so
  // PPTX/PDF exports match what the on-screen AuroraLayer renders for the
  // same seed + brand + mode.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
  const sibling = shiftHue(brand.tokens.accent, 28, 0.06);
  const isCorporate = brand.tokens.primary.toLowerCase() === "#003fc7";
  const darkFirst = isCorporate
    ? brand.tokens.primary
    : shiftHue(brand.tokens.accent, -14, 0.04);
  const lightPrimary = mixHex(brand.tokens.accent, brand.tokens.surface, 0.45);
  const palette =
    mode === "dark"
      ? [darkFirst, brand.tokens.accent, sibling]
      : [lightPrimary, brand.tokens.accent, sibling];
  const alphaBase = mode === "dark" ? 0.62 : 0.45;
  const alphaRange = mode === "dark" ? 0.18 : 0.12;
  // Light mode nudges orbs to different anchor points than dark so the
  // same seed produces a distinct, softer composition on white surfaces.
  const lightShiftX = [-80, 140, -40];
  const lightShiftY = [90, -60, 120];
  return Array.from({ length: 3 }).map((_, i) => ({
    color: palette[i] ?? brand.tokens.accent,
    x: 120 + rand() * 1040 + (mode === "light" ? lightShiftX[i] ?? 0 : 0),
    y: 60 + rand() * 600 + (mode === "light" ? lightShiftY[i] ?? 0 : 0),
    rx: (mode === "dark" ? 380 : 620) + rand() * (mode === "dark" ? 240 : 420),
    ry: (mode === "dark" ? 320 : 540) + rand() * (mode === "dark" ? 200 : 360),
    alpha: alphaBase + rand() * alphaRange,
  }));
}

/** Canonical surface tint used behind AuroraLayer for a given mode. */
export function auroraBaseTint(brand: BrandMode, mode: "dark" | "light"): string {
  return mode === "dark" ? "#03002C" : brand.tokens.surface ?? "#FFFFFF";
}

/** Layer opacity applied to the orb <g> in both renderer and exporter. */
export function auroraLayerOpacity(mode: "dark" | "light", intensity = 1): number {
  return intensity * (mode === "dark" ? 0.7 : 0.55);
}

/**
 * Per-brand dark-mode frosted-glass wash. Tuned so every division keeps the
 * "orbs peek through glass" character instead of collapsing into a single
 * color field. Alpha is derived from the brand accent's luminance (brighter
 * accents get a hair more wash to tame them; deep/saturated accents get
 * less so they still glow through). Wash colour mixes a neutral navy with
 * the brand surface to carry a subtle brand tint into the film.
 */
export function darkGlassWash(brand: BrandMode): { color: string; alpha: number } {
  const NEUTRAL = "#0B1330";
  const surface = brand.tokens.surface ?? NEUTRAL;
  const color = mixHex(NEUTRAL, surface, 0.35);
  const lum = relLuminance(brand.tokens.accent);
  // lum ~0 (deep) → 0.06 alpha; lum ~1 (bright/pastel) → 0.14 alpha.
  const alpha = Math.max(0.05, Math.min(0.15, 0.06 + lum * 0.09));
  return { color, alpha };
}

function relLuminance(hex: string): number {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return 0.5;
  const int = parseInt(m[1], 16);
  const rgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}



function mixHex(a: string, b: string, t: number): string {
  const pa = /^#?([a-f\d]{6})$/i.exec(a);
  const pb = /^#?([a-f\d]{6})$/i.exec(b);
  if (!pa || !pb) return a;
  const ia = parseInt(pa[1], 16);
  const ib = parseInt(pb[1], 16);
  const ar = (ia >> 16) & 255,
    ag = (ia >> 8) & 255,
    ab_ = ia & 255;
  const br = (ib >> 16) & 255,
    bg = (ib >> 8) & 255,
    bb_ = ib & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab_ + (bb_ - ab_) * t);
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(bl)}`;
}

function shiftHue(hex: string, deg: number, dl = 0): string {
  const m = /^#?([a-f\d]{6})$/i.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  let r = ((int >> 16) & 255) / 255;
  let g = ((int >> 8) & 255) / 255;
  let b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);
  if (max !== min) {
    const d = max - min;
    if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) hh = ((b - r) / d + 2) / 6;
    else hh = ((r - g) / d + 4) / 6;
  }
  hh = (hh + deg / 360) % 1;
  const newL = Math.max(0, Math.min(1, l + dl));
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
  const p = 2 * newL - q;
  r = hue2rgb(p, q, hh + 1 / 3);
  g = hue2rgb(p, q, hh);
  b = hue2rgb(p, q, hh - 1 / 3);
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
