// -----------------------------------------------------------------------------
// Design-surface normalisation for PPTX exports
// -----------------------------------------------------------------------------
// The on-screen renderer never paints a hard-cornered card: every tile, band,
// chip and photo plate is a rounded surface (22 / 18 / 12 px on the 1920×1080
// stage, see surface-tokens.ts). The exporter, however, grew ~160 hand-written
// `addShape("rect", …)` calls, so PowerPoint received square boxes and the
// export read as "basic shapes" next to the build.
//
// Rather than edit every call site (and re-break it on the next renderer), the
// slide object handed to the module renderers is wrapped in a facade that:
//
//   · promotes `rect` → `roundRect` with the design radius for that box size,
//     skipping the things that genuinely ARE square on screen: full-slide
//     scrims and hairline rules / accent ticks;
//   · tags photographic images so the OOXML post-processor can give the picture
//     a native rounded-rectangle crop (pptxgenjs can only emit `rect` or a
//     circle, and PowerPoint crops the bitmap to the shape geometry).
//
// Opting out is explicit and local: pass `sharp: true` on a shape, or
// `rounded: false` on an image.
// -----------------------------------------------------------------------------

import type PptxGenJS from "pptxgenjs";
import { EXPORT_RADIUS_IN, pillRadiusIn, rectRadiusAdj } from "@/lib/export-radius";

/** PPTX widescreen stage, inches. */
const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;

/**
 * Boxes thinner than this in either axis are rules, ticks, underlines and
 * progress tracks — rounding them turns a 1-2px hairline into a lozenge.
 */
const HAIRLINE_IN = 0.14;

/** Photographs smaller than this are logo marks / icon glyphs; leave them be. */
const MIN_ROUNDED_PIC_IN = 0.5;

export type ShapeExtras = { sharp?: boolean };
export type ImageExtras = { rounded?: boolean };

/** `[r:<adj>]` — consumed by {@link withRoundedPictures} in the zip pass. */
export const ROUND_PIC_TAG_RE = /\[r:(\d+)\]\s*/;

export function roundPicTag(adj: number): string {
  return `[r:${Math.max(0, Math.round(adj))}]`;
}

export function stripRoundPicTag(name: string): string {
  return name.replace(ROUND_PIC_TAG_RE, "").trim();
}

/**
 * The design radius (inches) for a box of this size, or null when the box must
 * stay square. Mirrors the on-screen token ladder: photo plates and cards use
 * the 22px media radius, bands 18px, chips/pills 12px, and anything shorter
 * than twice the chip radius becomes a true pill.
 */
export function designRadiusIn(w: number, h: number): number | null {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const min = Math.min(w, h);
  // Full-slide scrims / washes: PowerPoint would show the slide colour in the
  // four corners of an otherwise edge-to-edge overlay.
  if (w >= SLIDE_W_IN - 0.02 && h >= SLIDE_H_IN - 0.02) return null;
  if (min < HAIRLINE_IN) return null;
  const token =
    min >= 1.5 ? EXPORT_RADIUS_IN.media : min >= 0.55 ? EXPORT_RADIUS_IN.band : EXPORT_RADIUS_IN.chip;
  return Math.min(token, pillRadiusIn(min));
}

type Rect = { x?: unknown; y?: unknown; w?: unknown; h?: unknown };

function num(v: unknown): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v ?? "")) || 0;
}

/**
 * Wrap a slide so every square card/tile/band drawn on it exports with the
 * design corner radius, and every photograph exports with a rounded crop.
 */
export function withDesignSurfaces(slide: PptxGenJS.Slide): PptxGenJS.Slide {
  return new Proxy(slide, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const key = String(prop);

      if (key === "addShape") {
        return (type: unknown, opts?: Record<string, unknown>) => {
          const o = (opts ?? {}) as Record<string, unknown> & Rect & ShapeExtras;
          if (type === "rect" && !o.sharp && o.rectRadius === undefined) {
            const radius = designRadiusIn(num(o.w), num(o.h));
            if (radius != null) {
              delete o.sharp;
              o.rectRadius = radius;
              return (value as (t: unknown, p: unknown) => unknown).call(target, "roundRect", o);
            }
          }
          delete o.sharp;
          return (value as (t: unknown, p: unknown) => unknown).call(target, type, o);
        };
      }

      if (key === "addImage") {
        return (opts?: Record<string, unknown>) => {
          const o = (opts ?? {}) as Record<string, unknown> & Rect & ImageExtras;
          const rounded = o.rounded;
          delete o.rounded;
          const w = num(o.w);
          const h = num(o.h);
          const data = typeof o.data === "string" ? o.data : "";
          const name = typeof o.objectName === "string" ? o.objectName : "";
          const isVector = data.startsWith("data:image/svg");
          const isFullBleed = w >= SLIDE_W_IN - 0.02 && h >= SLIDE_H_IN - 0.02;
          const isLogoOrIcon = /logo|icon|lockup|wordmark|plate/i.test(name);
          const eligible =
            rounded === true ||
            (rounded !== false &&
              !isVector &&
              !isFullBleed &&
              !isLogoOrIcon &&
              Math.min(w, h) >= MIN_ROUNDED_PIC_IN);
          if (eligible) {
            const radius = designRadiusIn(w, h);
            if (radius != null) {
              const adj = Math.min(rectRadiusAdj(radius, w, h), 50000);
              o.objectName = `${roundPicTag(adj)} ${name || "TP Photo"}`.trim();
            }
          }
          return (value as (p: unknown) => unknown).call(target, o);
        };
      }

      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(target, args);
    },
  }) as PptxGenJS.Slide;
}

/**
 * Give every `[r:<adj>]`-tagged picture a native rounded-rectangle geometry so
 * PowerPoint crops the bitmap exactly like the CSS `border-radius` on screen,
 * then strip the tag from the visible object name.
 */
export function withRoundedPictures(xml: string): string {
  if (!/\[r:\d+\]/.test(xml)) return xml;
  return xml.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (pic) => {
    const m = pic.match(/name="([^"]*\[r:(\d+)\][^"]*)"/);
    if (!m) return pic;
    const adj = Number(m[2]);
    let out = pic.replace(
      /<a:prstGeom prst="rect"\s*>\s*<a:avLst\s*\/>\s*<\/a:prstGeom>/,
      `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`,
    );
    if (out === pic) {
      out = pic.replace(
        /<a:prstGeom prst="rect"\s*\/>/,
        `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`,
      );
    }
    return out.replace(/name="([^"]*)"/, (_all, name: string) => `name="${stripRoundPicTag(name)}"`);
  });
}
