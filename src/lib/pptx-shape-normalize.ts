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
import {
  SURFACE_HAIRLINE_IN,
  ambientTag,
  getGlassTreatment,
  SURFACE_NO_LINE,
  getSurfaceTreatment,
  gradientTag,
  isGlassFill,
  surfaceEligible,
} from "@/lib/export-surface";


/** PPTX widescreen stage, inches. */
const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;

/**
 * Boxes thinner than this in either axis are rules, ticks, underlines and
 * progress tracks — rounding them turns a 1-2px hairline into a lozenge.
 * Shared with the surface pass so both use the identical cut-off.
 */
const HAIRLINE_IN = SURFACE_HAIRLINE_IN;

/** Photographs smaller than this are logo marks / icon glyphs; leave them be. */
const MIN_ROUNDED_PIC_IN = 0.5;

/**
 * A fill this transparent is a wash / scrim / tint, not a card: giving it a
 * gradient, a hairline and elevation would turn a veil into a floating panel.
 */
const WASH_TRANSPARENCY = 55;

/** Shapes that are card/tile/band-class surfaces. Everything else is line art. */
const SURFACE_SHAPES = new Set(["rect", "roundRect"]);

export type ShapeExtras = {
  /** Keep square corners (opt out of the radius ladder). */
  sharp?: boolean;
  /**
   * Keep the flat solid fill, no stroke, no elevation — the escape hatch for
   * shapes that genuinely are flat on screen (seams, plates, marker dots).
   */
  flat?: boolean;
  /**
   * Force the canonical module-card GLASS surface (`getGlassTreatment`) rather
   * than the generic darkening pass — for boxes the renderer paints as glass
   * with a non-neutral flat fill (pyramid strata, stat tiles, graph frames).
   */
  glass?: boolean;
  /** Mirrors the renderer's own `emphasis` knob for stacked glass strata. */
  glassEmphasis?: number;
};

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
 * Apply the design surface (gradient fill, hairline stroke, elevation, ambient
 * wash) to a card/tile-class shape, in place. No-op for line art, washes,
 * hairlines, full-slide scrims, `flat: true` opt-outs, and any shape whose
 * caller already asked for a gradient or a shadow of its own.
 *
 * Cards the renderer paints as GLASS — either explicitly (`glass: true`) or by
 * reaching for one of the neutral surface fills (`isGlassFill`) — get the exact
 * on-screen module-card recipe instead of the generic darkening pass, so a
 * pyramid stratum, a stat tile and a graph frame all export as the same accent
 * glass panel they are on screen.
 */
function applySurface(
  type: unknown,
  o: Record<string, unknown> & Rect & ShapeExtras,
  dark: boolean,
  accent?: string,
): boolean {
  if (o.flat) return false;
  if (!SURFACE_SHAPES.has(String(type))) return false;
  const w = num(o.w);
  const h = num(o.h);
  if (!surfaceEligible(w, h)) return false;

  const fill = o.fill as { color?: string; transparency?: number; type?: string } | string | undefined;
  const fillColor = typeof fill === "string" ? fill : fill?.color;
  // No fill at all (an outline-only frame) or a caller-supplied gradient: leave it.
  if (!fillColor || (typeof fill === "object" && fill?.type === "gradient")) return false;
  const wantsGlass = o.glass === true || isGlassFill(fillColor, dark);
  if (!wantsGlass && typeof fill === "object" && num(fill?.transparency) >= WASH_TRANSPARENCY)
    return false;
  if (o.shadow !== undefined) return false;

  const t = wantsGlass
    ? getGlassTreatment({ w, h, accent, dark, emphasis: num(o.glassEmphasis) || 1 })
    : getSurfaceTreatment({ w, h, fill: fillColor, dark });
  if (!t) return false;

  if (wantsGlass) {
    // The glass panel owns its own fill: a flat mid-tone fallback plus the real
    // per-stop-alpha gradient, so the exported tile is translucent like the
    // build instead of a solid slab. Transparency is carried by the gradient.
    o.fill = { color: t.fill };
  }

  // Shipping contract (SURFACE_LINE_POLICY): a surface box exports as gradient
  // fill + NO LINE. Both the CSS-derived hairline and the module-authored
  // light-gray 0.5-1pt keylines are sub-pixel on screen but render as a hard
  // outline around every tile in PowerPoint. Only a deliberately heavy or
  // dashed stroke (a frame, a placeholder outline, a selected state) survives.
  const line = o.line as
    | { color?: string; transparency?: number; type?: string; width?: number; dashType?: string }
    | undefined;
  const strokeIsDeliberate =
    !wantsGlass &&
    !!line &&
    line.type !== "none" &&
    !!line.color &&
    num(line.transparency) < 100 &&
    (!!line.dashType || num(line.width) >= 1.5);
  if (!strokeIsDeliberate) {
    o.line = { ...SURFACE_NO_LINE };
  }


  // Gradient stops and the second (ambient) shadow have no pptxgenjs API, so
  // they ride along in the object name and are consumed by the zip pass.
  const name = typeof o.objectName === "string" ? o.objectName : "";

  // Chip / pill / stat-tile / icon-well class: the renderer paints these with no
  // elevation (see `IconWell` and the chip helpers in flagship.tsx). They still
  // get the linear gradient fill — with the stroke gone it is the only thing
  // giving the tile form — but no drop shadow and no ambient wash.
  if (t.tier === "chip" && !wantsGlass) {
    o.objectName = `${gradientTag(t.gradient)} ${name || "TP Surface chip"}`.trim();
    return false;
  }

  o.shadow = { ...t.shadow };
  o.objectName = `${gradientTag(t.gradient)}${ambientTag(t.ambient)} ${
    name || (wantsGlass ? "TP Glass card" : "TP Surface")
  }`.trim();
  // Card-tier glass is the only surface that earns a backdrop blur crop.
  return wantsGlass && t.tier === "card";
}

/**
 * Wrap a slide so every square card/tile/band drawn on it exports with the
 * design corner radius AND the design surface treatment, and every photograph
 * exports with a rounded crop.
 */
export function withDesignSurfaces(
  slide: PptxGenJS.Slide,
  opts: { dark?: boolean; accent?: string } = {},
): PptxGenJS.Slide {
  const dark = !!opts.dark;
  const accent = opts.accent;
  return new Proxy(slide, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const key = String(prop);

      if (key === "addShape") {
        return (type: unknown, opts2?: Record<string, unknown>) => {
          const o = (opts2 ?? {}) as Record<string, unknown> & Rect & ShapeExtras;
          if (type === "rect" && !o.sharp && o.rectRadius === undefined) {
            const radius = designRadiusIn(num(o.w), num(o.h));
            if (radius != null) {
              delete o.sharp;
              o.rectRadius = radius;
              applySurface("roundRect", o, dark, accent);
              delete o.flat;
              delete o.glass;
              delete o.glassEmphasis;
              return (value as (t: unknown, p: unknown) => unknown).call(target, "roundRect", o);
            }
          }
          applySurface(type, o, dark, accent);
          delete o.sharp;
          delete o.flat;
          delete o.glass;
          delete o.glassEmphasis;
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
