// -----------------------------------------------------------------------------
// Bake a media tile's treatment INTO the exported picture pixels.
// -----------------------------------------------------------------------------
// Every photographic tile in the library (`MediaTile`) paints its picture and
// then stacks the house treatment on top of it: a brand duotone (soft-light), a
// directional legibility scrim, a top vignette and a fine grain (screen blend).
//
// Two of those layers use a blend mode, which OOXML cannot express, so they stay
// on the flat plate — and because they follow the picture in document order, the
// plain scrim and vignette between them are pruned as "paint behind plated
// content" and stay on the plate too. The picture is then re-emitted as a native
// <p:pic> ON TOP of the plate, which hides every one of those layers: the
// exported photograph came back raw and bright while the editor showed it graded
// and darkened (reported on the device-screen modules, but true of any tile
// whose treatment lands under its own picture).
//
// The fix keeps the photograph a real, replaceable picture object and bakes the
// treatment into its own pixels: rasterize the tile itself (picture + grade +
// scrims + grain, exactly as the browser paints it) and use that as the picture
// data. Copy is excluded from the raster because it ships as native text.
// -----------------------------------------------------------------------------

import type { DomShape } from "./export-dom-decompose";

/** Only bake when the picture really is the tile — not a small inset thumbnail. */
const COVER_RATIO = 0.97;
/** Raster density relative to the tile's on-stage size. */
const SCALE = 2;

function hasDirectText(el: Element): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0) return true;
  }
  return false;
}

/** Layers that only exist as a blend/filter treatment over the picture. */
function hasTreatmentLayers(tile: HTMLElement): boolean {
  for (const el of Array.from(tile.querySelectorAll<HTMLElement>("div[aria-hidden]"))) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const paints =
      (cs.backgroundImage && cs.backgroundImage !== "none") ||
      (cs.backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor));
    if (paints) return true;
  }
  return false;
}

/**
 * Replace the source of every media-tile picture with a raster of the tile as
 * the browser paints it. Mutates the shapes in place; failures leave the shape
 * untouched (a raw photograph is still better than no photograph).
 */
export async function bakeMediaTileTreatments(shapes: DomShape[]): Promise<number> {
  const targets = shapes.filter((s) => s.kind === "image" && s.node instanceof HTMLElement);
  if (targets.length === 0) return 0;

  let baked = 0;
  const { toPng } = await import("html-to-image");

  for (const shape of targets) {
    const el = shape.node as HTMLElement;
    const tile = el.closest<HTMLElement>('[data-media-tile="true"]');
    if (!tile) continue;
    if (!hasTreatmentLayers(tile)) continue;

    const tr = tile.getBoundingClientRect();
    const ir = el.getBoundingClientRect();
    if (tr.width <= 0 || tr.height <= 0) continue;
    if (ir.width < tr.width * COVER_RATIO || ir.height < tr.height * COVER_RATIO) continue;

    try {
      const data = await toPng(tile, {
        pixelRatio: Math.max(1, (shape.w * SCALE) / tr.width),
        cacheBust: true,
        skipFonts: true,
        // Copy ships as native, editable PowerPoint text — never as pixels.
        filter: (node) => !(node instanceof HTMLElement) || !hasDirectText(node),
      });
      if (!data.startsWith("data:image/")) continue;
      shape.src = data;
      // The grade is now IN the pixels; leaving the filter on would double it.
      shape.cssFilter = null;
      baked += 1;
    } catch {
      /* keep the untreated picture rather than losing the photograph */
    }
  }
  return baked;
}
