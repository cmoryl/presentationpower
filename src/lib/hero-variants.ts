// Automatic light/dark hero variants.
//
// A single uploaded photo has to survive two very different pages: light pages
// set dark ink on white, dark pages set light ink on near-black. Rather than
// asking the user to hand-tune each one, we sample the image once and derive a
// per-mode treatment (accent wash strength, scrim, blend mode, auto-scrim
// threshold) that keeps hero copy legible in both.

import type { PrintHeroMedia, PrintHeroVariant } from "./print-assets.types";

export type HeroImageStats = {
  /** Mean Rec.709 luma of the whole frame, 0..1. */
  luminance: number;
  /** Mean luma of the lower half, where hero copy usually sits, 0..1. */
  copyZoneLuminance: number;
  /** Spread of luma across the frame, 0..1 — high means busy/contrasty. */
  contrast: number;
};

/** Sample an image in the browser. Resolves null on CORS-tainted canvases. */
export function analyzeHeroImage(url: string): Promise<HeroImageStats | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const w = 48;
        const h = 48;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        let sumSq = 0;
        let lowerSum = 0;
        let lowerCount = 0;
        let count = 0;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const i = (y * w + x) * 4;
            const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
            sum += l;
            sumSq += l * l;
            count += 1;
            if (y >= h / 2) {
              lowerSum += l;
              lowerCount += 1;
            }
          }
        }
        const mean = count ? sum / count : 0.5;
        const variance = count ? Math.max(0, sumSq / count - mean * mean) : 0;
        resolve({
          luminance: clamp01(mean),
          copyZoneLuminance: clamp01(lowerCount ? lowerSum / lowerCount : mean),
          contrast: clamp01(Math.sqrt(variance) * 2),
        });
      } catch {
        // Tainted canvas — caller falls back to neutral defaults.
        resolve(null);
      }
    };
    img.src = url;
  });
}

/**
 * Turn image stats into a matched pair of hero treatments.
 *
 * Dark pages carry light ink, so bright photos are the risk: push the accent
 * multiply wash and scrim up as the image gets brighter. Light pages carry dark
 * ink, so dark photos are the risk: lift the wash with a soft-light blend as
 * the image gets darker. Busy frames get a little extra on both sides.
 */
export function deriveHeroVariants(stats: HeroImageStats | null): {
  light: PrintHeroVariant;
  dark: PrintHeroVariant;
} {
  const lum = stats?.copyZoneLuminance ?? stats?.luminance ?? 0.5;
  const busy = stats?.contrast ?? 0.35;
  const busyBoost = clamp01(busy - 0.35) * 0.18;

  // Bright image → dark page needs more veil. 0.5 luma is the neutral point.
  const darkRisk = clamp01((lum - 0.42) / 0.58);
  // Dark image → light page needs more veil.
  const lightRisk = clamp01((0.58 - lum) / 0.58);

  return {
    light: {
      overlayOpacity: round2(clamp(0.3 + lightRisk * 0.3 + busyBoost, 0.22, 0.68)),
      washStrength: round2(clamp(0.85 + lightRisk * 0.15, 0.8, 1)),
      scrimOpacity: round2(clamp(0.45 + lightRisk * 0.35 + busyBoost, 0.4, 0.92)),
      autoScrimThreshold: round2(clamp(0.5 - lightRisk * 0.12, 0.32, 0.58)),
      blendMode: lum < 0.35 ? "screen" : "soft-light",
      scrim: "bottom",
    },
    dark: {
      overlayOpacity: round2(clamp(0.48 + darkRisk * 0.3 + busyBoost, 0.4, 0.85)),
      washStrength: round2(clamp(0.9 + darkRisk * 0.1, 0.85, 1)),
      scrimOpacity: round2(clamp(0.55 + darkRisk * 0.35 + busyBoost, 0.5, 0.95)),
      autoScrimThreshold: round2(clamp(0.62 - darkRisk * 0.14, 0.42, 0.7)),
      blendMode: "multiply",
      scrim: "bottom",
    },
  };
}

/** Analyse + attach both variants to a hero media object. */
export async function withAutoHeroVariants(media: PrintHeroMedia): Promise<PrintHeroMedia> {
  const stats = await analyzeHeroImage(media.imageUrl);
  return { ...media, variants: deriveHeroVariants(stats) };
}

function clamp01(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(1, n));
}
function clamp(n: number, lo: number, hi: number): number {
  return Number.isNaN(n) ? lo : Math.max(lo, Math.min(hi, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
