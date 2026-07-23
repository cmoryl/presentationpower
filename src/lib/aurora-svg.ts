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
  // FREE-FORM AURORA v2 — 2026-07 rebuild.
  // Reference: user-uploaded plain backdrops (1.png..10.png) showing deep
  // navy with large, out-of-focus accent blooms bleeding in from
  // edges/corners. No frosted-glass film. No edge vignette. The orbs ARE
  // the atmosphere; content sits free-form directly on top.
  const orbR = mode === "dark" ? "90%" : "95%";
  const midStop = mode === "dark" ? "38%" : "42%";
  const outerStop = mode === "dark" ? "78%" : "80%";
  const blurStd = mode === "dark" ? 55 : 80;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
  <defs>
    ${orbs
      .map(
        (o, i) => `
    <radialGradient id="orb-${i}" cx="50%" cy="50%" r="${orbR}">
      <stop offset="0%" stop-color="${o.color}" stop-opacity="${o.alpha}" />
      <stop offset="${midStop}" stop-color="${o.color}" stop-opacity="${o.alpha * 0.55}" />
      <stop offset="${outerStop}" stop-color="${o.color}" stop-opacity="${o.alpha * 0.15}" />
      <stop offset="100%" stop-color="${o.color}" stop-opacity="0" />
    </radialGradient>`,
      )
      .join("")}
    <filter id="aurora-blur" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="${blurStd}" edgeMode="duplicate" />
    </filter>
  </defs>
  <rect width="1280" height="720" fill="${base}" />
  <g filter="url(#aurora-blur)" opacity="${layerOpacity}">
    ${orbs
      .map(
        (o, i) => `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}" fill="url(#orb-${i})" />`,
      )
      .join("")}
  </g>
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
  // FREE-FORM AURORA v2 — deterministic hash → 3 huge accent blooms
  // anchored to edges/corners of the frame, mostly overhanging the crop
  // so only the soft-focus falloff bleeds in (matches user reference
  // backdrops 1.png..10.png). Radii are large enough to be firmly
  // out-of-focus at 1280×720.
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
  const sibling = shiftHue(brand.tokens.accent, 28, 0.08);
  const isCorporate = brand.tokens.primary.toLowerCase() === "#003fc7";
  const darkFirst = isCorporate
    ? brand.tokens.primary
    : shiftHue(brand.tokens.accent, -14, 0.04);
  const lightPrimary = mixHex(brand.tokens.accent, brand.tokens.surface, 0.35);
  const palette =
    mode === "dark"
      ? [darkFirst, brand.tokens.accent, sibling]
      : [lightPrimary, brand.tokens.accent, sibling];
  const alphaBase = mode === "dark" ? 0.82 : 0.55;
  const alphaRange = mode === "dark" ? 0.15 : 0.15;
  // Anchor palette: 8 positions clinging to the frame edges/corners so orbs
  // read as "peeking in from off-screen" rather than floating in the middle.
  // Values are in the 1280×720 export viewbox; renderer preserves them.
  const anchors = [
    { x: -80, y: -60 },    // top-left overhang
    { x: 640, y: -140 },   // top center overhang
    { x: 1360, y: -60 },   // top-right overhang
    { x: -120, y: 360 },   // left mid overhang
    { x: 1400, y: 380 },   // right mid overhang
    { x: -60, y: 780 },    // bottom-left overhang
    { x: 640, y: 860 },    // bottom center overhang
    { x: 1340, y: 780 },   // bottom-right overhang
  ];
  // Pick 3 distinct anchors deterministically.
  const chosen: number[] = [];
  while (chosen.length < 3) {
    const idx = Math.floor(rand() * anchors.length);
    if (!chosen.includes(idx)) chosen.push(idx);
  }
  return chosen.map((idx, i) => {
    const a = anchors[idx]!;
    const jitterX = (rand() - 0.5) * 160;
    const jitterY = (rand() - 0.5) * 120;
    const rx = 540 + rand() * 320; // 540..860
    const ry = 460 + rand() * 280; // 460..740
    return {
      color: palette[i] ?? brand.tokens.accent,
      x: a.x + jitterX,
      y: a.y + jitterY,
      rx,
      ry,
      alpha: alphaBase + rand() * alphaRange,
    };
  });
}

/** Canonical surface tint used behind AuroraLayer for a given mode. */
export function auroraBaseTint(brand: BrandMode, mode: "dark" | "light"): string {
  return mode === "dark" ? "#03002C" : brand.tokens.surface ?? "#FFFFFF";
}

/** Layer opacity applied to the orb <g> in both renderer and exporter.
 *  v2 rebuild: dark mode is now 0.95 (was 0.7) so accent blooms carry full
 *  chroma the way the reference backdrops do. Light stays quieter. */
export function auroraLayerOpacity(mode: "dark" | "light", intensity = 1): number {
  return intensity * (mode === "dark" ? 0.95 : 0.6);
}

/**
 * Retained for backwards compatibility with earlier "orbs peek through
 * frosted glass" treatment. The v2 free-form aurora rebuild no longer
 * paints this wash — content sits directly on the aurora — so both the
 * renderer and the exporter ignore this return value. Left in place so
 * downstream callers importing the symbol keep compiling; alpha is 0 to
 * document the visual contract.
 */
export function darkGlassWash(brand: BrandMode): { color: string; alpha: number } {
  const NEUTRAL = "#0B1330";
  const surface = brand.tokens.surface ?? NEUTRAL;
  const color = mixHex(NEUTRAL, surface, 0.35);
  return { color, alpha: 0 };
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
