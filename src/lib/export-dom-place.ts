// -----------------------------------------------------------------------------
// Emit decomposed DOM objects as native PowerPoint shapes / pictures
//
// Companion to `export-dom-decompose.ts`. Every record becomes a real,
// selectable PowerPoint object at the exact stage geometry it occupied on the
// build, carrying its own fill (solid OR editable gradient stops), stroke,
// corner radius, rotation and elevation. Nothing here is rasterized.
//
// Fills go through the existing object-name tag channel (`[gf:…]` / `[sh:…]`)
// consumed by the zip pass in `pptx-native-xml.ts`, so translucency survives as
// per-stop alpha instead of collapsing to a flat slab.
// -----------------------------------------------------------------------------

import type PptxGenJS from "pptxgenjs";

import type { DomColor, DomShape } from "./export-dom-decompose";
import { aspectFrame, getImageAspect } from "./export-image-aspect";
import { PX_PER_IN, pxToRadiusIn, rectRadiusAdj } from "./export-radius";
import { SLIDE_H_IN, SLIDE_W_IN, gradientTag, pxToPt } from "./export-surface";
import { roundPicTag } from "./pptx-shape-normalize";

/** Stage px → inches. */
function inOf(px: number): number {
  return px / PX_PER_IN;
}

function transparencyOf(c: DomColor): number {
  return Math.round((1 - Math.max(0, Math.min(1, c.alpha))) * 100);
}

/** Fully transparent objects are not worth an object in the file. */
function invisible(c: DomColor | null): boolean {
  return !c || c.alpha < 0.04;
}

export interface PlaceDomOptions {
  /** Skip objects smaller than this (inches, both axes). Defaults to hairline. */
  minSideIn?: number;
  /** Cap on emitted objects, so a pathological module cannot bloat the file. */
  maxObjects?: number;
}

/**
 * Place decomposed DOM objects onto a slide, in the paint order they were
 * measured in (parents first), which reproduces the browser's z-order.
 *
 * Returns the number of objects emitted.
 */
export function placeDomShapes(
  slide: PptxGenJS.Slide,
  shapes: DomShape[],
  opts: PlaceDomOptions = {},
): number {
  const minSide = opts.minSideIn ?? 0.012;
  const maxObjects = opts.maxObjects ?? 400;
  let placed = 0;

  for (const s of shapes) {
    if (placed >= maxObjects) break;
    const x = inOf(s.x);
    const y = inOf(s.y);
    const w = inOf(s.w);
    const h = inOf(s.h);
    if (w < minSide || h < minSide) continue;
    if (x >= SLIDE_W_IN || y >= SLIDE_H_IN) continue;

    const radiusIn = pxToRadiusIn(s.radiusPx);
    const shadow = s.shadow && s.shadow.color.alpha >= 0.04
      ? {
          type: "outer" as const,
          blur: pxToPt(s.shadow.blurPx),
          offset: pxToPt(s.shadow.offsetPx),
          angle: Math.round(s.shadow.angleDeg),
          color: s.shadow.color.hex,
          opacity: s.shadow.color.alpha,
        }
      : undefined;

    if (s.kind === "image") {
      if (!s.src) continue;
      const isData = s.src.startsWith("data:");
      // Aspect contract: PowerPoint stretches a blip to the extent we give it,
      // and pptxgenjs `sizing` cannot read intrinsic dimensions from a data URL
      // (the "scaled client logos" bug). When the DOM reported the artwork's
      // real pixel size, the aspect-correct frame is computed here so every
      // logo lands at its exact native ratio, every time.
      const ratio =
        s.natW && s.natH && s.natW > 0 && s.natH > 0
          ? s.natW / s.natH
          : getImageAspect(s.src);
      const frame = aspectFrame(ratio, s.fit, x, y, w, h);
      // A `cover` tile keeps its measured box and crops the overflow natively,
      // exactly like `object-fit: cover` on screen.
      const crop =
        frame.exact || s.fit === "contain" || s.fit === "fill"
          ? ""
          : coverCropTag(ratio, frame.w, frame.h);
      const round =
        s.radiusPx >= 1
          ? `${roundPicTag(rectRadiusAdj(radiusIn, frame.w, frame.h))} `
          : "";
      const tag = `${crop ? `${crop} ` : ""}${round}`;
      const common: Record<string, unknown> = {
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
        rotate: s.rotationDeg || undefined,
        objectName: `${tag}${s.name}`.trim(),
        sizing:
          frame.exact || s.fit === "fill" || crop
            ? undefined
            : {
                type: s.fit === "contain" ? ("contain" as const) : ("cover" as const),
                w: frame.w,
                h: frame.h,
              },
      };

      try {
        slide.addImage(
          (isData
            ? { ...common, data: s.src }
            : { ...common, path: s.src }) as unknown as PptxGenJS.ImageProps,
        );
        placed += 1;
      } catch {
        // A single unreachable asset must not abort the export.
      }
      continue;
    }


    if (invisible(s.fill) && !s.gradient && (!s.line || invisible(s.line))) continue;

    const type = s.kind === "ellipse" ? "ellipse" : s.kind === "roundRect" ? "roundRect" : "rect";
    const nameParts: string[] = [];
    if (s.gradient && s.gradient.stops.length >= 2) {
      nameParts.push(
        gradientTag({
          angleDeg: s.gradient.angleDeg,
          stops: s.gradient.stops.map((st) => ({
            color: st.color.hex,
            pos: st.pos,
            alpha: st.color.alpha,
          })),
        }),
      );
    }
    // No `[sh:…]` ambient tag here: the measured CSS shadow already ships as
    // the shape's native drop shadow (`props.shadow` below). Tagging it too made
    // the surface pass add a second effect for the same shadow, which is what
    // the Office converter refused.

    const props: Record<string, unknown> = {
      x,
      y,
      w,
      h,
      rotate: s.rotationDeg || undefined,
      // Measured CSS is the truth here: opt out of the heuristic surface pass.
      flat: true,
      fill: invisible(s.fill)
        ? { type: "none" }
        : { color: s.fill!.hex, transparency: transparencyOf(s.fill!) },
      line:
        s.line && !invisible(s.line)
          ? {
              color: s.line.hex,
              width: Math.max(0.25, pxToPt(s.line.widthPx)),
              transparency: transparencyOf(s.line),
            }
          : { type: "none" },
      objectName: `${nameParts.join("")} ${s.name}`.trim(),
    };
    if (type === "roundRect") props.rectRadius = radiusIn;
    if (shadow) props.shadow = { ...shadow };

    try {
      slide.addShape(type as PptxGenJS.ShapeType, props as unknown as PptxGenJS.ShapeProps);
      placed += 1;
    } catch {
      // Ignore a rejected shape rather than losing the whole slide.
    }
  }
  return placed;
}
