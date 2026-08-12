// Faithfully maps SlideBackgroundValue → PPTX-ready assets.
//
// For image kinds (upload/ai), we return the original URL plus fit/zoom/offset
// so the exporter can honor object-fit parity from SlideChrome.
//
// For color / gradient / pattern / library-preset kinds, we rasterize the
// exact CSS into a PNG data URL via an SVG <foreignObject> wrapping a <div>
// with the same `background-image`, then blit the SVG-<img> onto a canvas.
// This preserves gradients, radial highlights, inline SVG patterns, and
// mixed-layer library presets — the same values SlideChrome renders in the
// editor. Falls back to a solid color fill when rasterization is unavailable
// (older browsers, tainted canvas, blocked data URIs).

import type { SlideBackgroundValue } from "./background-library";
import { hexToRgba, resolveSlideBackground } from "./background-library";
import { rasterSize, type ExportQualityId } from "./export-quality";


export type PptxBackgroundPlan =
  | { kind: "none" }
  | { kind: "solid"; color: string } // color WITHOUT the leading #
  | {
      kind: "image";
      data: string; // data URL
      solidFallback: string;
      scrim?: {
        color: string;
        strengthTop: number; // 0..1 (percent transparency = (1-a)*100)
        strengthMiddle: number;
        strengthBottom: number;
        side?: "top" | "bottom" | "left" | "right" | "full" | "vignette";
      };
      fit?: "cover" | "contain";
      zoom?: number;
      offsetX?: number;
      offsetY?: number;
    };

// Legacy default plate size (≈120 DPI). Overridden per call by the export
// quality setting so gradients stay smooth at projection and print sizes.
const RASTER_W = 1600;
const RASTER_H = 900;


function stripHash(c: string | undefined, fallback = "FFFFFF"): string {
  if (!c) return fallback;
  const h = c.replace("#", "").trim();
  return h.length ? h : fallback;
}

async function rasterizeCss(css: string, solid: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    // The <foreignObject> wraps an XHTML <div> whose computed background is
    // exactly what SlideChrome paints. Inline data-URI SVG patterns embedded
    // inside `css` continue to work because the outer SVG is same-origin
    // (data:) and its <img> load does not taint the canvas.
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${RASTER_W}' height='${RASTER_H}'>
      <foreignObject width='100%' height='100%'>
        <div xmlns='http://www.w3.org/1999/xhtml' style="width:${RASTER_W}px;height:${RASTER_H}px;background-color:${solid};background-image:${css.replace(/"/g, "'")};background-size:cover;background-position:center;"></div>
      </foreignObject>
    </svg>`;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded) return null;
    const canvas = document.createElement("canvas");
    canvas.width = RASTER_W;
    canvas.height = RASTER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = solid;
    ctx.fillRect(0, 0, RASTER_W, RASTER_H);
    ctx.drawImage(img, 0, 0, RASTER_W, RASTER_H);
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** Produce a PPTX-ready plan for embedding a slide's background. */
export async function planPptxBackground(raw: unknown): Promise<PptxBackgroundPlan> {
  const bg = resolveSlideBackground(raw);
  if (!bg) return { kind: "none" };

  // ── Image kinds: embed source photograph + honor scrim/tint. ─────────
  if ((bg.kind === "upload" || bg.kind === "ai") && bg.url) {
    const data = await fetchDataUrl(bg.url);
    if (!data) return { kind: "solid", color: stripHash(bg.tint ?? "#03002C") };
    const strength = clamp01(bg.scrimStrength, 0.55);
    return {
      kind: "image",
      data,
      solidFallback: stripHash(bg.tint ?? "#03002C"),
      scrim: {
        color: stripHash(bg.tint ?? "#03002C"),
        strengthTop: bg.scrim === "top" || bg.scrim === "full" ? strength : strength * 0.15,
        strengthMiddle: strength * 0.55,
        strengthBottom: bg.scrim === "bottom" || bg.scrim === "full" ? strength : strength * 0.15,
        side: bg.scrim ?? "bottom",
      },
      fit: bg.fit ?? "cover",
      zoom: bg.zoom ?? 1,
      offsetX: bg.offsetX ?? 0,
      offsetY: bg.offsetY ?? 0,
    };
  }

  // ── Solid color: native PPTX background fill (no rasterization needed).
  if (bg.kind === "color") {
    return { kind: "solid", color: stripHash(bg.color ?? bg.solid) };
  }

  // ── Everything else (library preset, gradient, pattern): rasterize CSS.
  const css = bg.css ?? "";
  const solid = bg.solid ?? bg.color ?? "#FFFFFF";
  if (css) {
    const data = await rasterizeCss(css, solid);
    if (data) {
      return {
        kind: "image",
        data,
        solidFallback: stripHash(solid),
      };
    }
  }
  return { kind: "solid", color: stripHash(solid) };
}

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function clamp01(n: number | undefined, d = 1): number {
  if (typeof n !== "number" || Number.isNaN(n)) return d;
  return Math.max(0, Math.min(1, n));
}

/**
 * Build the scrim as a stepped gradient ramp.
 *
 * PowerPoint shape fills in pptxgenjs are solid-only, so a single flat band
 * never matched the CSS `linear-gradient` scrim the app renders — exports came
 * out with a hard edge and the wrong overall density. We instead stack a set of
 * thin bands whose transparency eases from opaque at the anchored edge to fully
 * clear at the far end, which reads as a smooth gradient at projection size.
 */
const SCRIM_BANDS = 12;

function ramp(
  axis: "x" | "y",
  start: number,
  span: number,
  cross: number,
  color: string,
  alpha: number,
  reverse: boolean,
  slideW: number,
  slideH: number,
): Array<{ x: number; y: number; w: number; h: number; color: string; transparency: number }> {
  const out: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    transparency: number;
  }> = [];
  const step = span / SCRIM_BANDS;
  for (let i = 0; i < SCRIM_BANDS; i++) {
    // Ease-out curve mirrors the CSS gradient's perceptual falloff.
    const tRaw = (i + 0.5) / SCRIM_BANDS;
    const t = reverse ? 1 - tRaw : tRaw;
    const a = alpha * Math.pow(t, 1.6);
    const transparency = Math.max(0, Math.min(100, Math.round((1 - a) * 100)));
    if (transparency >= 99) continue;
    const offset = start + i * step;
    out.push(
      axis === "y"
        ? { x: 0, y: offset, w: cross, h: step + 0.01, color, transparency }
        : { x: offset, y: 0, w: step + 0.01, h: cross, color, transparency },
    );
  }
  void slideW;
  void slideH;
  return out;
}

/** Convenience: build a scrim rectangle spec (stepped gradient) from a plan. */
export function scrimRectSpec(
  plan: Extract<PptxBackgroundPlan, { kind: "image" }>,
  slideW: number,
  slideH: number,
): Array<{ x: number; y: number; w: number; h: number; color: string; transparency: number }> {
  if (!plan.scrim) return [];
  const side = plan.scrim.side ?? "bottom";
  const color = plan.scrim.color;
  const alpha = plan.scrim.strengthBottom || plan.scrim.strengthTop || 0.4;

  if (side === "full") {
    const t = Math.max(0, Math.min(100, Math.round((1 - alpha) * 100)));
    return [{ x: 0, y: 0, w: slideW, h: slideH, color, transparency: t }];
  }
  if (side === "vignette") {
    // Even wash plus a denser bottom ramp, matching the CSS vignette read.
    const base = Math.max(0, Math.min(100, Math.round((1 - alpha * 0.45) * 100)));
    return [
      { x: 0, y: 0, w: slideW, h: slideH, color, transparency: base },
      ...ramp("y", slideH * 0.45, slideH * 0.55, slideW, color, alpha, false, slideW, slideH),
    ];
  }
  if (side === "bottom")
    return ramp("y", slideH * 0.35, slideH * 0.65, slideW, color, alpha, false, slideW, slideH);
  if (side === "top")
    return ramp("y", 0, slideH * 0.65, slideW, color, alpha, true, slideW, slideH);
  if (side === "left")
    return ramp("x", 0, slideW * 0.7, slideH, color, alpha, true, slideW, slideH);
  if (side === "right")
    return ramp("x", slideW * 0.3, slideW * 0.7, slideH, color, alpha, false, slideW, slideH);
  return [];
}

/** Compute sizing overrides for a positioned image background. */
export function imageBackgroundSizing(
  plan: Extract<PptxBackgroundPlan, { kind: "image" }>,
  slideW: number,
  slideH: number,
) {
  const zoom = Math.max(0.5, Math.min(3, plan.zoom ?? 1));
  const w = slideW * zoom;
  const h = slideH * zoom;
  // offsetX/Y range roughly -100..100 in the editor — map to a fraction of
  // the excess (zoomed) canvas so the visible portion mirrors CSS
  // object-position.
  const excessX = Math.max(0, w - slideW);
  const excessY = Math.max(0, h - slideH);
  const dx = ((plan.offsetX ?? 0) / 100) * (excessX / 2);
  const dy = ((plan.offsetY ?? 0) / 100) * (excessY / 2);
  const x = -((w - slideW) / 2) + dx;
  const y = -((h - slideH) / 2) + dy;
  return { x, y, w, h, fit: plan.fit ?? ("cover" as const) };
}

// Silence unused warning for hexToRgba import (kept for future scrim gradients).
void hexToRgba;
