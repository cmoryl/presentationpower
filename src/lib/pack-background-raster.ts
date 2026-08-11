// -----------------------------------------------------------------------------
// Style-pack background rasterizer
//
// PPTX has no concept of the alternate-look sheet: a pack paints its page in
// four CSS planes (field, ground, scaffold, motif) plus grain and a readability
// scrim, all of which are gradients/masks/blend modes with no PowerPoint
// equivalent. Exporting a pack module through the vector path therefore dropped
// the whole look and landed on the default enterprise sheet.
//
// Fix: rebuild those exact planes offscreen at 1920×1080, rasterize once to a
// PNG, and hand that to the PPTX exporter as the slide background image. Text
// and figures still export as editable vectors on top, so the export keeps the
// look AND stays editable.
// -----------------------------------------------------------------------------

import {
  GRAIN_PLATE,
  minimalPackLayers,
  packCompositionFor,
  packField,
  packGroundMask,
  packLayoutLayers,
  type StylePack,
} from "./style-packs";
import { packGroundDamp } from "./pack-readability";
import { packReadability } from "./pack-readability";
import { packSignature } from "./style-pack-motifs";

const W = 1920;
const H = 1080;

function plane(style: Partial<CSSStyleDeclaration>): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "absolute";
  el.style.inset = "0";
  Object.assign(el.style, style);
  return el;
}

/**
 * Renders the pack sheet for one module (variant + layout) to a PNG data URL.
 * Returns null when rasterization is unavailable (SSR) or fails — callers fall
 * back to a flat pack-surface fill so the export is still on-palette.
 */
export async function rasterizePackBackground(
  pack: StylePack,
  variantId: string,
  layoutId: string,
): Promise<{ data: string | null; surface: string }> {
  const surface = packField(pack);
  if (typeof document === "undefined") return { data: null, surface };

  const comp = packCompositionFor(variantId, layoutId);
  const seed = layoutId ?? variantId;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${W}px`;
  host.style.height = `${H}px`;
  host.style.overflow = "hidden";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  // 1 — field
  host.appendChild(plane({ backgroundColor: surface }));
  // 2 — ground (damped + centre-cleared, exactly as SlideChrome paints it)
  const mask = packGroundMask(comp);
  host.appendChild(
    plane({
      background: minimalPackLayers(pack.ground(seed)).join(", "),
      opacity: String(packGroundDamp(pack, seed)),
      maskImage: mask,
      webkitMaskImage: mask,
    } as Partial<CSSStyleDeclaration>),
  );
  // 3 — scaffold
  host.appendChild(
    plane({ background: minimalPackLayers(packLayoutLayers(pack, comp, seed)).join(", ") }),
  );
  // 4 — signature motif (non-tiling only, matching the on-screen rule)
  const sig = packSignature(pack);
  if (sig) {
    const tiled =
      /repeating-(linear|radial)-gradient/.test(sig.background) ||
      (/\brepeat\b/.test(sig.background) && !/no-repeat/.test(sig.background));
    if (!tiled) {
      host.appendChild(
        plane({
          background: sig.background,
          opacity: String(sig.opacity),
          mixBlendMode: sig.blend,
          clipPath: sig.clip,
          maskImage: sig.mask,
          webkitMaskImage: sig.mask,
        } as Partial<CSSStyleDeclaration>),
      );
    }
  }
  // grain
  if (pack.grain > 0) {
    host.appendChild(
      plane({
        backgroundImage: GRAIN_PLATE,
        backgroundSize: "160px 160px",
        opacity: String(pack.grain),
        mixBlendMode: pack.mode === "dark" ? "overlay" : "multiply",
      }),
    );
  }
  // 5 — readability scrim
  const { scrimAlpha } = packReadability(pack);
  if (scrimAlpha > 0) {
    host.appendChild(plane({ backgroundColor: surface, opacity: String(scrimAlpha) }));
  }

  document.body.appendChild(host);
  try {
    const { toPng } = await import("html-to-image");
    const data = await toPng(host, {
      width: W,
      height: H,
      pixelRatio: 1,
      backgroundColor: surface,
      cacheBust: true,
    });
    return { data: data || null, surface };
  } catch (err) {
    console.error("[pack-export] background rasterization failed", err);
    return { data: null, surface };
  } finally {
    host.remove();
  }
}
