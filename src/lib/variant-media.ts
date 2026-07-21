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
  "MV-OP-COVER-DOSSIER",
  "MV-OP-COVER-STACKED",
  // Image-forward family
  "MV-IMG-FULL-BLEED",
  "MV-IMG-SPLIT",
  "MV-IMG-CAPTION",
  "MV-IMG-PORTRAIT",
  "MV-IMG-QUOTE-BG",
  "MV-IMG-STAT-CALLOUT",
  // Portrait quote uses a subject photo
  "MV-QUOTE-PORTRAIT",
  // CTA close card renders a supporting photo
  "MV-CLOSE-CTA",
]);

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
  if (!variantSupportsImagery(variantId) && ("mediaUrl" in next || "mediaSeed" in next || "mediaPath" in next)) {
    const { mediaUrl: _u, mediaSeed: _s, mediaPath: _mp, ...rest } = next;
    next = rest;
  }
  if (
    !variantSupportsVideo(variantId) &&
    ("videoUrl" in next || "videoPosterUrl" in next || "videoPath" in next || "videoPosterPath" in next)
  ) {
    const { videoUrl: _v, videoPosterUrl: _p, videoPath: _vp, videoPosterPath: _pp, ...rest } = next;
    next = rest;
  }
  return next as T;
}
