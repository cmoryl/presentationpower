// Central source of truth for which module variants render slide-level
// imagery (i.e. read `content.mediaSeed` / `content.mediaUrl`). Non-image
// variants must not carry these fields, otherwise the PPTX exporter or a
// future renderer swap could surface a photograph on a layout that has no
// slot for it — a common cause of orphaned imagery diagnostics after
// PPTX import.
//
// Item-level imagery (e.g. bento cells, image grids) uses `it.seed` /
// `it.mediaSeed` on individual items and is unaffected by this list.

const IMAGE_VARIANT_IDS = new Set<string>([
  // Covers with a full-bleed hero photo
  "MV-OP-COVER-MEDIA",
  "MV-OP-COVER-EDITORIAL",
  "MV-OP-COVER-SPLIT",
  "MV-OP-COVER-STACKED",
  "MV-OP-COVER-GRADIENT",
  // Image-forward family
  "MV-IMG-FULL-BLEED",
  "MV-IMG-SPLIT",
  "MV-IMG-CAPTION",
  "MV-IMG-PORTRAIT",
  "MV-IMG-QUOTE-BG",
  "MV-IMG-STAT-CALLOUT",
  // Device showcases — the screenshot inside the laptop / monitor
  "MV-SHOW-LAPTOP",
  "MV-SHOW-MONITOR",
  // Portrait quote uses a subject photo
  "MV-QUOTE-PORTRAIT",
  // CTA close card renders a supporting photo
  "MV-CLOSE-CTA",
  // Editorial heroes / photo statements — all read `content.mediaUrl`
  "MV-ED-HERO-BLEED",
  "MV-ED-STAT-PHOTO",
  "MV-ED-QUOTE-BLEED",
]);

/**
 * Variants whose imagery lives on repeating items (`items[].mediaUrl`) rather
 * than a single slide-level photo, with the number of tiles the layout renders.
 * Importers use this to spread every imported picture into real slots instead
 * of dropping all but the first.
 */
const ITEM_IMAGE_CAPACITY: Record<string, number> = {
  "MV-IMG-GRID-3": 3,
  "MV-IMG-GRID-6": 6,
  "MV-IMG-STRIP": 5,
  "MV-IMG-MATRIX-4": 4,
  "MV-IMG-MATRIX-6": 6,
};

/** Number of `items[].mediaUrl` tiles the variant renders (0 when none). */
export function variantItemImageCapacity(variantId: string | undefined | null): number {
  if (!variantId) return 0;
  return ITEM_IMAGE_CAPACITY[variantId] ?? 0;
}

/** True when the variant renders imagery in any slot (slide-level or per item). */
export function variantRendersAnyImagery(variantId: string | undefined | null): boolean {
  return variantSupportsImagery(variantId) || variantItemImageCapacity(variantId) > 0;
}

/** Variants that render a full-bleed / media-forward slot large enough to
 *  make a background video meaningful. Subset of imagery-supporting
 *  variants — a stat callout or split caption is fine for a still, but a
 *  quote card doesn't need motion. */
const VIDEO_VARIANT_IDS = new Set<string>([
  "MV-OP-COVER-MEDIA",
  "MV-OP-COVER-EDITORIAL",
  "MV-OP-COVER-SPLIT",
  "MV-IMG-FULL-BLEED",
  "MV-IMG-SPLIT",
  "MV-IMG-CAPTION",
  "MV-IMG-PORTRAIT",
  "MV-IMG-QUOTE-BG",
  // Screen recordings play inside the device screen
  "MV-SHOW-LAPTOP",
  "MV-SHOW-MONITOR",
]);

/** True when the variant renders a slide-level photograph from
 *  `content.mediaSeed` / `content.mediaUrl`. */
export function variantSupportsImagery(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  return IMAGE_VARIANT_IDS.has(variantId);
}

/** True when the variant renders a slide-level video from
 *  `content.videoUrl` (with optional `content.videoPosterUrl`). */
export function variantSupportsVideo(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  return VIDEO_VARIANT_IDS.has(variantId);
}

/** Strip slide-level imagery references from a content record when the
 *  target variant does not render them. Preserves other keys and any
 *  item-level seeds. Also strips video fields when the target variant
 *  cannot render video. */
export function normalizeSlideMedia<T extends Record<string, unknown>>(
  variantId: string | undefined | null,
  content: T,
): T {
  let next = content as Record<string, unknown>;
  if (
    !variantSupportsImagery(variantId) &&
    ("mediaUrl" in next || "mediaSeed" in next || "mediaPath" in next)
  ) {
    const { mediaUrl: _u, mediaSeed: _s, mediaPath: _mp, ...rest } = next;
    next = rest;
  }
  if (
    !variantSupportsVideo(variantId) &&
    ("videoUrl" in next ||
      "videoPosterUrl" in next ||
      "videoPath" in next ||
      "videoPosterPath" in next)
  ) {
    const {
      videoUrl: _v,
      videoPosterUrl: _p,
      videoPath: _vp,
      videoPosterPath: _pp,
      ...rest
    } = next;
    next = rest;
  }
  return next as T;
}
