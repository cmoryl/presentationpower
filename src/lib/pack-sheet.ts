// -----------------------------------------------------------------------------
// PACK SHEET — the single description of how a look's page is painted.
//
// A style pack paints its page in discrete planes (field → ground → scaffold →
// motif → grain → readability scrim). Until now three separate places
// implemented that stack:
//
//   • SlideChrome           (the real slide, on screen)
//   • pack-background-raster (the PPTX/PDF plate)
//   • preview tiles/swatches (Template Studio — painted ONLY the raw ground
//                             layers, undamped and unmasked)
//
// That third one is why the Backgrounds tab and the Preview tab of Template
// Studio disagreed: the tuner tiles showed the pack's ground at full strength
// with no field, mask, scaffold or scrim, so a look whose real slides read as
// a near-white page appeared as a saturated gradient in the editor.
//
// `packSheetPlanes` is now the one description. Any surface that wants to show
// "the page of this look, for this section" renders these planes in order.
// -----------------------------------------------------------------------------

import type { CSSProperties } from "react";
import {
  GRAIN_PLATE,
  backgroundCodeForPackId,
  minimalPackLayers,
  packCompositionFor,
  packField,
  packGroundMask,
  packGroundPaint,
  packLayoutLayers,
  type PackComposition,
  type StylePack,
} from "./style-packs";
import { packGroundDamp, packReadability } from "./pack-readability";
import { packSignature } from "./style-pack-motifs";
import { groundIsReplaced } from "./template-background";

export type SheetPlane = { key: string; style: CSSProperties };

/** True when a background layer stack tiles (those never carry the motif). */
function isTiled(background: string): boolean {
  return (
    /repeating-(linear|radial)-gradient/.test(background) ||
    (/\brepeat\b/.test(background) && !/no-repeat/.test(background))
  );
}

export function packSheetPlanes(
  pack: StylePack,
  seed: string,
  opts: {
    /** Page composition; derived from the seed when omitted. */
    comp?: PackComposition;
    /** Ground layers to paint instead of the pack's own (tuner previews). */
    layers?: string[];
    /** Force the replaced-artwork rule (no damp/mask/scaffold/motif/grain). */
    replaced?: boolean;
  } = {},
): SheetPlane[] {
  const comp = opts.comp ?? packCompositionFor(seed, seed);
  const surface = packField(pack);
  const replaced =
    opts.replaced ?? groundIsReplaced(backgroundCodeForPackId(String(pack.id ?? "")), seed);
  const ground = opts.layers ?? packGroundPaint(pack, seed);
  const planes: SheetPlane[] = [];

  // 1 — flat field: guarantees the page colour is exact.
  planes.push({ key: "field", style: { backgroundColor: surface } });

  // 2 — ground: damped and cleared away from the reading core, unless the
  //     artwork was replaced, in which case the picture IS the page.
  const mask = replaced ? undefined : packGroundMask(comp);
  planes.push({
    key: "ground",
    style: {
      background: ground.join(", "),
      opacity: replaced ? 1 : packGroundDamp(pack, seed),
      maskImage: mask,
      WebkitMaskImage: mask,
    } as CSSProperties,
  });

  if (replaced) return planes;

  // 3 — scaffold: crisp page structure for this composition.
  const scaffold = minimalPackLayers(packLayoutLayers(pack, comp, seed));
  if (scaffold.length) {
    planes.push({ key: "scaffold", style: { background: scaffold.join(", ") } });
  }

  // 4 — one zoned signature motif (tiling signatures never paint on screen).
  const sig = packSignature(pack);
  if (sig && !isTiled(sig.background)) {
    planes.push({
      key: "motif",
      style: {
        background: sig.background,
        opacity: sig.opacity,
        mixBlendMode: sig.blend as CSSProperties["mixBlendMode"],
        clipPath: sig.clip,
        maskImage: sig.mask,
        WebkitMaskImage: sig.mask,
      } as CSSProperties,
    });
  }

  // 5 — grain.
  if (pack.grain > 0) {
    planes.push({
      key: "grain",
      style: {
        backgroundImage: GRAIN_PLATE,
        backgroundSize: "160px 160px",
        opacity: pack.grain,
        mixBlendMode: pack.mode === "dark" ? "overlay" : "multiply",
      },
    });
  }

  // 6 — readability scrim.
  const { scrimAlpha } = packReadability(pack);
  if (scrimAlpha > 0) {
    planes.push({ key: "scrim", style: { backgroundColor: surface, opacity: scrimAlpha } });
  }

  return planes;
}
