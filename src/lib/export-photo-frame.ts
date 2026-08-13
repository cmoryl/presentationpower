// -----------------------------------------------------------------------------
// Inset photo frames for PPTX export
// -----------------------------------------------------------------------------
// The exporter historically knew exactly one way to place a photograph: a
// FULL-BLEED underlay behind everything, emitted only when the slide had no
// image-typed background of its own. Two consequences, both reported as
// "imagery is missing from the export":
//
//  1. Every module whose on-screen renderer shows an INSET media tile (split
//     halves, framed caption, photo trio) exported with no picture at all as
//     soon as a division ground / aurora plate claimed the background — the
//     photo silently lost the coin toss against `bgIsImage`.
//  2. When it did fire, the tile became a full-bleed wash, which is not the
//     design.
//
// This table gives those modules real geometry, in inches on the 13.333 × 7.5
// stage, mirroring the tile boxes in VariantRenderer. Anything not listed keeps
// the previous full-bleed underlay behaviour, so this is additive.
//
// Frames are shared by the deck path and the single-slide path because both go
// through `exportDeckToPptx`.
// -----------------------------------------------------------------------------

export interface PhotoFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SLIDE_W = 13.333;
const MARGIN = 0.6;
const CONTENT_W = SLIDE_W - MARGIN * 2;

/** Two equal columns with the renderer's gap-14 gutter. */
const SPLIT_GUTTER = 0.55;
const SPLIT_W = (CONTENT_W - SPLIT_GUTTER) / 2;

/** Three equal tiles with a tighter gutter, as in the photo trio. */
const TRIO_GUTTER = 0.24;
const TRIO_W = (CONTENT_W - TRIO_GUTTER * 2) / 3;

const FRAMES: Record<string, PhotoFrame[]> = {
  "MV-IMG-SPLIT": [{ x: MARGIN, y: 1.2, w: SPLIT_W, h: 4.95 }],
  "MV-IMG-CAPTION": [{ x: (SLIDE_W - 6.93) / 2, y: 2.25, w: 6.93, h: 3.5 }],
  "MV-STAT-PHOTO-TRIO": [
    { x: MARGIN, y: 2.15, w: TRIO_W, h: 3.2 },
    { x: MARGIN + TRIO_W + TRIO_GUTTER, y: 2.15, w: TRIO_W, h: 3.2 },
    { x: MARGIN + (TRIO_W + TRIO_GUTTER) * 2, y: 2.15, w: TRIO_W, h: 3.2 },
  ],
};

/**
 * Inset photo boxes for a variant, or `null` when the module's photograph is
 * genuinely a full-bleed ground (covers, hero bleeds, editorial washes).
 *
 * Modules with several tiles get several frames; the exporter resolves one
 * photograph per slide, so the same picture fills each box as a discrete,
 * separately selectable `<p:pic>` rather than being dropped.
 */
export function photoFramesForVariant(variantId: string): PhotoFrame[] | null {
  return FRAMES[variantId] ?? null;
}
