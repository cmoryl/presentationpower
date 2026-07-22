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
  const layerOpacity = mode === "dark" ? 1 : 0.72;
  const vignette =
    mode === "dark"
      ? `radial-gradient(80% 60% at 50% 60%, transparent 30%, ${base} 130%)`
      : `radial-gradient(85% 68% at 50% 55%, transparent 0%, transparent 55%, ${base} 125%)`;
  // We can't use CSS gradients inside a static SVG for the vignette, so
  // emulate it with a radial gradient stop set.
  const vignetteAlpha = mode === "dark" ? 0.6 : 0.5;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
  <defs>
    ${orbs
      .map(
        (o, i) => `
    <radialGradient id="orb-${i}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${o.color}" stop-opacity="${o.alpha}" />
      <stop offset="55%" stop-color="${o.color}" stop-opacity="${o.alpha * 0.45}" />
      <stop offset="100%" stop-color="${o.color}" stop-opacity="0" />
    </radialGradient>`,
      )
      .join("")}
    <filter id="aurora-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
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
  <rect width="1280" height="720" fill="url(#vignette)" />
</svg>`;
  // Use encodeURIComponent to keep the payload safe for data URLs.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function auroraOrbs(
  seed: string,
  brand: BrandMode,
  mode: "dark" | "light" = "dark",
) {
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
  const alphaBase = 0.55;
  const alphaRange = mode === "dark" ? 0.35 : 0.28;
  return Array.from({ length: 3 }).map((_, i) => ({
    color: palette[i] ?? brand.tokens.accent,
    x: 180 + rand() * 900,
    y: 90 + rand() * 540,
    rx: (mode === "dark" ? 380 : 460) + rand() * (mode === "dark" ? 260 : 320),
    ry: (mode === "dark" ? 320 : 400) + rand() * (mode === "dark" ? 220 : 280),
    alpha: alphaBase + rand() * alphaRange,
  }));
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
