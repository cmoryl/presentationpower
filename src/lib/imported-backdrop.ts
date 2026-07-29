// Master / layout background carry-over for imported PPTX decks.
//
// A .pptx slide inherits its backdrop from the slideLayout → slideMaster
// chain: either a real `<p:bg>` fill (image, solid, gradient) or a full-bleed
// decorative picture sitting at the bottom of the layout's shape tree.
// `ImportedFaithfulSlide` renders those 1:1, but slides that map onto a native
// module variant previously dropped them entirely — which is why re-authored
// slides came back on a plain surface instead of the deck's master artwork.
//
// This derives a `content.background` value (the same shape the Backgrounds &
// Imagery panel writes) from a stored imported slide, so mapped slides render
// on their original master backdrop and stay fully editable.

import type { SlideBackgroundValue } from "./background-library";

export type ImportedBackdrop = SlideBackgroundValue & { path?: string };

type AnyRec = Record<string, unknown>;

const HEX = /^#[0-9a-f]{6}/i;

function hex(color: unknown): string | undefined {
  if (typeof color !== "string") return undefined;
  const m = HEX.exec(color.trim());
  return m ? m[0].toUpperCase() : undefined;
}

function urlForPath(
  path: string | undefined,
  imagePaths?: string[],
  imageUrls?: string[],
): string | undefined {
  if (!path) return undefined;
  const idx = (imagePaths ?? []).indexOf(path);
  if (idx < 0) return undefined;
  return (imageUrls ?? [])[idx];
}

/** A layout shape that covers (nearly) the whole slide — the classic
 *  "background picture placed on the master" pattern. */
function isFullBleed(frame: AnyRec | undefined, size: AnyRec | undefined): boolean {
  if (!frame || !size) return false;
  const w = Number(size.w);
  const h = Number(size.h);
  if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return false;
  const fx = Number(frame.x ?? 0);
  const fy = Number(frame.y ?? 0);
  const fw = Number(frame.w ?? 0);
  const fh = Number(frame.h ?? 0);
  if (!isFinite(fw) || !isFinite(fh)) return false;
  // Rotated art (e.g. a portrait image rotated 90°) reports swapped w/h, so
  // compare against both orientations.
  const coversDirect = fw >= w * 0.94 && fh >= h * 0.94;
  const coversRotated = fh >= w * 0.94 && fw >= h * 0.94;
  const centered = Math.abs(fx) <= w * 0.06 && Math.abs(fy) <= h * 0.06;
  return (coversDirect && centered) || coversRotated;
}

/**
 * Derive the slide's inherited master/layout backdrop.
 * Returns `null` when the layout has nothing meaningful (plain white master).
 */
export function extractImportedBackdrop(
  layout: AnyRec | undefined | null,
  imagePaths?: string[],
  imageUrls?: string[],
): ImportedBackdrop | null {
  if (!layout || typeof layout !== "object") return null;
  const size = layout.size as AnyRec | undefined;
  const bg = layout.background as AnyRec | undefined;

  // 1) Explicit <p:bg> fill on the slide / layout / master.
  if (bg && typeof bg === "object") {
    if (bg.kind === "image") {
      const path = typeof bg.path === "string" ? bg.path : undefined;
      const url = urlForPath(path, imagePaths, imageUrls);
      if (url) {
        return {
          kind: "upload",
          url,
          path,
          scrim: "bottom",
          scrimStrength: 0,
          imageDim: 0,
          darkChrome: true,
          fit: "cover",
        };
      }
    }
    if (bg.kind === "gradient") {
      const stops = Array.isArray(bg.stops) ? (bg.stops as AnyRec[]) : [];
      const ordered = [...stops].sort((a, b) => Number(a.pos ?? 0) - Number(b.pos ?? 0));
      const a = hex(ordered[0]?.color);
      const b = hex(ordered[ordered.length - 1]?.color);
      if (a && b) {
        const angleRaw = Number(bg.angle);
        return {
          kind: "gradient",
          color: a,
          colorB: b,
          angle: isFinite(angleRaw) ? angleRaw : 135,
          intensity: 1,
        };
      }
      if (a) return { kind: "color", color: a, intensity: 1 };
    }
    if (bg.kind === "solid") {
      const color = hex(bg.color);
      // Plain white masters add nothing over the native surface token.
      if (color && color !== "#FFFFFF") return { kind: "color", color, intensity: 1 };
    }
  }

  // 2) Full-bleed picture inherited from the layout / master shape tree.
  const shapes = Array.isArray(layout.shapes) ? (layout.shapes as AnyRec[]) : [];
  for (const sh of shapes) {
    if (sh?.kind !== "image") continue;
    const frame = sh.frame as AnyRec | undefined;
    if (!isFullBleed(frame, size)) continue;
    const path = typeof sh.path === "string" ? sh.path : undefined;
    const url = urlForPath(path, imagePaths, imageUrls);
    if (!url) continue;
    return {
      kind: "upload",
      url,
      path,
      scrim: "bottom",
      scrimStrength: 0,
      imageDim: 0,
      darkChrome: true,
      fit: "cover",
    };
  }

  return null;
}
