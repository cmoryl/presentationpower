// -----------------------------------------------------------------------------
// Glass blur crops (EXPORT SPEC: frosted glass reads as frosted glass)
//
// `export-surface.ts` emits every glass card as a native, editable shape: a
// gradient fill with per-stop alpha, a hairline ring, a drop shadow, and an
// "ambient wash" second shadow standing in for `backdrop-filter`. That is the
// right shell — but a shadow is not a blur. On screen the panel shows the
// backdrop BEHIND it, blurred; in the file it showed the raw, sharp backdrop
// through a translucent gradient, so glass read as coloured cellophane.
//
// OOXML has no `backdrop-filter`. The only faithful representation is the one
// the effect is defined as: the pixels behind the panel, blurred. So for each
// glass card we crop the already-flattened backdrop raster to the panel's exact
// rect, blur it by the CSS blur radius, and place that crop directly BEHIND the
// native shell.
//
// Editability is preserved: the crop is a plain picture at the panel's rect and
// the shell above it keeps every editable property. Moving the shell in
// PowerPoint leaves the crop behind (same as any layered composition) — which is
// why crops are only emitted for card-tier glass, never for chips and pills.
// -----------------------------------------------------------------------------

import { GLASS_CARD_TOKENS } from "./export-surface";
import { PPTX_SLIDE_H_IN, PPTX_SLIDE_W_IN } from "./pptx-text-props";

export interface GlassCropRect {
  /** Inches on the 13.333 × 7.5 slide. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BackdropSampler {
  /**
   * A blurred PNG data URL of the backdrop under `rect`, or null when the rect
   * falls outside the raster or the canvas is unavailable.
   */
  cropBlur: (rect: GlassCropRect, opts: { blurPx: number }) => string | null;
}

/** The CSS blur radius the on-screen glass card uses, in source pixels. */
export function glassBlurPx(dark: boolean): number {
  return dark ? GLASS_CARD_TOKENS.dark.backdropBlurPx : GLASS_CARD_TOKENS.light.backdropBlurPx;
}

/**
 * Crops are only worth their bytes on real panels. Below this (chips, pills,
 * badges, icon wells) the renderer paints flat on screen anyway, so a crop would
 * add weight and an extra object for no visible difference.
 */
export const GLASS_CROP_MIN_IN = 0.9;

/** Cap on crops per slide, so a dense bento cannot balloon the file. */
export const GLASS_CROP_MAX_PER_SLIDE = 14;

/**
 * Decode a full-slide backdrop raster once, then serve synchronous blurred
 * crops from it. Returns null when there is no usable raster (SSR, a decode
 * failure, or a non-image plan) — callers then keep the existing shadow-only
 * approximation.
 */
export async function createBackdropSampler(dataUrl: string): Promise<BackdropSampler | null> {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:image")) return null;

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = dataUrl;
  });
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;

  const source = document.createElement("canvas");
  source.width = img.naturalWidth;
  source.height = img.naturalHeight;
  const sctx = source.getContext("2d");
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);

  // Source pixels per slide inch.
  const ppiX = source.width / PPTX_SLIDE_W_IN;
  const ppiY = source.height / PPTX_SLIDE_H_IN;
  // The raster is authored at 2560×1440 for a 1920×1080 stage, so a CSS blur
  // radius measured on the stage has to scale into raster pixels.
  const blurScale = source.width / 1920;

  return {
    cropBlur(rect, opts) {
      if (!(rect.w > 0) || !(rect.h > 0)) return null;
      const blur = Math.max(0, opts.blurPx) * blurScale;
      // Sample a padded region so the blur kernel has real pixels to pull from
      // at the panel's edges instead of fading into transparency.
      const pad = Math.ceil(blur * 2 + 2);
      const sx = Math.round(rect.x * ppiX);
      const sy = Math.round(rect.y * ppiY);
      const sw = Math.max(1, Math.round(rect.w * ppiX));
      const sh = Math.max(1, Math.round(rect.h * ppiY));
      if (sx > source.width || sy > source.height || sx + sw < 0 || sy + sh < 0) return null;

      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      const ctx = out.getContext("2d");
      if (!ctx) return null;

      // Draw the padded region blurred, offset so the panel's own rect lands at
      // 0,0 — the padding overflows the canvas and is discarded.
      try {
        ctx.filter = blur > 0 ? `blur(${Math.round(blur * 100) / 100}px)` : "none";
      } catch {
        /* filter unsupported — an unblurred crop still beats a sharp backdrop
           read through a gradient, because it is at least clipped to the panel */
      }
      // Clamp the sampled region into the raster, then place it back at the
      // matching offset so edge panels are not shifted.
      const rx = Math.max(0, sx - pad);
      const ry = Math.max(0, sy - pad);
      const rw = Math.min(source.width - rx, sw + pad * 2 - (rx - (sx - pad)));
      const rh = Math.min(source.height - ry, sh + pad * 2 - (ry - (sy - pad)));
      if (rw <= 0 || rh <= 0) return null;
      ctx.drawImage(source, rx, ry, rw, rh, rx - sx, ry - sy, rw, rh);
      ctx.filter = "none";

      try {
        return out.toDataURL("image/png");
      } catch {
        return null;
      }
    },
  };
}
