// Serializes the AuroraLayer visual as a standalone SVG data URL so PPTX/PDF
// exports can embed the exact same brand-accented atmospheric backdrop that
// the on-screen AuroraLayer paints. Mirrors the math in
// src/components/slide/flagship.tsx (auroraOrbs + mixHex + shiftHue) but
// depends on nothing React so it can run in export code paths.

import type { BrandMode } from "@/lib/taxonomy";

/** Native landscape aurora frame in the shared 1280×720 viewbox. */
export const AURORA_NATIVE_ASPECT = { w: 1280, h: 720 } as const;

export function auroraSvgDataUrl(
  seed: string,
  brand: BrandMode,
  mode: "dark" | "light" = "dark",
  baseTint?: string,
  aspect?: { w: number; h: number },
): string {
  const base = baseTint ?? (mode === "dark" ? "#03002C" : (brand.tokens.surface ?? "#FFFFFF"));
  const orbs = auroraOrbs(seed, brand, mode, aspect);
  const layerOpacity = auroraLayerOpacity(mode);
  const orbR = mode === "dark" ? "90%" : "95%";
  const midStop = mode === "dark" ? "38%" : "42%";
  const outerStop = mode === "dark" ? "78%" : "80%";
  const blurStd = mode === "dark" ? 55 : 125;
  const vw = aspect?.w ?? AURORA_NATIVE_ASPECT.w;
  const vh = aspect?.h ?? AURORA_NATIVE_ASPECT.h;
  // Preserve pixel dimensions for the native 1280×720 landscape frame (byte
  // identical to previous exports). Non-default aspects scale proportionally
  // to keep the longer side at ~1920px.
  let outW = 1920;
  let outH = 1080;
  if (aspect && (aspect.w !== AURORA_NATIVE_ASPECT.w || aspect.h !== AURORA_NATIVE_ASPECT.h)) {
    const longer = 1920;
    if (vw >= vh) {
      outW = longer;
      outH = Math.round((longer * vh) / vw);
    } else {
      outH = longer;
      outW = Math.round((longer * vw) / vh);
    }
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid slice">
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
  <rect width="${vw}" height="${vh}" fill="${base}" />
  <g filter="url(#aurora-blur)" opacity="${layerOpacity}">
    ${orbs
      .map(
        (o, i) =>
          `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.rx}" ry="${o.ry}" fill="url(#orb-${i})" />`,
      )
      .join("")}
  </g>
</svg>`;

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
  aspect?: { w: number; h: number },
): AuroraOrbSpec[] {
  // FREE-FORM AURORA v2 — deterministic hash → 3 huge accent blooms
  // anchored to edges/corners of the frame, mostly overhanging the crop
  // so only the soft-focus falloff bleeds in.
  //
  // Aspect re-projection: anchors + jitter + orb radii are authored in the
  // native 1280×720 landscape space. When a caller passes a non-default
  // `aspect`, we scale coords by (sx=w/1280, sy=h/720) so a portrait or
  // square frame gets a proportional edge-overhang layout instead of a
  // cropped slice of a landscape composition. When `aspect` is omitted or
  // matches the native landscape frame, sx=sy=1 → every returned number is
  // byte-identical to the pre-aspect implementation.
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
  const darkFirst = isCorporate ? brand.tokens.primary : shiftHue(brand.tokens.accent, -14, 0.04);
  const lightPrimary = mixHex(brand.tokens.accent, brand.tokens.surface, 0.78);
  const lightAccent = mixHex(brand.tokens.accent, brand.tokens.surface, 0.62);
  const lightSibling = mixHex(sibling, brand.tokens.surface, 0.68);
  const palette =
    mode === "dark"
      ? [darkFirst, brand.tokens.accent, sibling]
      : [lightPrimary, lightAccent, lightSibling];
  // Light mode toned down further so aurora orbs never
  // overpower logos, text, or module chrome on white slides.
  const alphaBase = mode === "dark" ? 0.82 : 0.18;
  const alphaRange = mode === "dark" ? 0.15 : 0.04;

  const useAspect =
    aspect && (aspect.w !== AURORA_NATIVE_ASPECT.w || aspect.h !== AURORA_NATIVE_ASPECT.h);
  const sx = useAspect ? aspect!.w / AURORA_NATIVE_ASPECT.w : 1;
  const sy = useAspect ? aspect!.h / AURORA_NATIVE_ASPECT.h : 1;

  // Anchor coordinates in the native 1280×720 space. Light mode pushes the
  // orb centers much further off-frame (top-corner biased) so only the
  // soft-focus falloff bleeds in and the solid bloom core stays outside
  // the crop — keeps white slides quiet under logos + content.
  const nativeAnchorsDark = [
    { x: -80, y: -60 }, // top-left overhang
    { x: 640, y: -140 }, // top center overhang
    { x: 1360, y: -60 }, // top-right overhang
    { x: -120, y: 360 }, // left mid overhang
    { x: 1400, y: 380 }, // right mid overhang
    { x: -60, y: 780 }, // bottom-left overhang
    { x: 640, y: 860 }, // bottom center overhang
    { x: 1340, y: 780 }, // bottom-right overhang
  ];
  const nativeAnchorsLight = [
    { x: -360, y: -320 }, // top-left, deep overhang
    { x: 640, y: -520 }, // top center, pushed high above frame
    { x: 1640, y: -320 }, // top-right, deep overhang
    { x: -480, y: 280 }, // left mid, further out
    { x: 1760, y: 300 }, // right mid, further out
    { x: -360, y: 1040 }, // bottom-left, deep overhang
    { x: 640, y: 1220 }, // bottom center, pushed low
    { x: 1620, y: 1040 }, // bottom-right, deep overhang
  ];
  const nativeAnchors = mode === "light" ? nativeAnchorsLight : nativeAnchorsDark;
  const anchors = useAspect
    ? nativeAnchors.map((a) => ({ x: a.x * sx, y: a.y * sy }))
    : nativeAnchors;
  const chosen: number[] = [];
  while (chosen.length < 3) {
    const idx = Math.floor(rand() * anchors.length);
    if (!chosen.includes(idx)) chosen.push(idx);
  }
  return chosen.map((idx, i) => {
    const a = anchors[idx]!;
    const jitterX = (rand() - 0.5) * 160 * sx;
    const jitterY = (rand() - 0.5) * 120 * sy;
    const rx = (540 + rand() * 320) * sx; // native 540..860
    const ry = (460 + rand() * 280) * sy; // native 460..740
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
  return mode === "dark" ? "#03002C" : (brand.tokens.surface ?? "#FFFFFF");
}

/** Layer opacity applied to the orb <g> in both renderer and exporter.
 *  v2 rebuild: dark mode is now 0.95 (was 0.7) so accent blooms carry full
 *  chroma the way the reference backdrops do. Light stays quieter. */
export function auroraLayerOpacity(mode: "dark" | "light", intensity = 1): number {
  // Light-mode aurora reduced further so accent blooms sit
  // quietly behind content and never fight the logo or copy on white slides.
  return intensity * (mode === "dark" ? 0.95 : 0.18);
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
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
