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

/** True when the variant renders a slide-level photograph from
 *  `content.mediaSeed` / `content.mediaUrl`. */
export function variantSupportsImagery(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  return IMAGE_VARIANT_IDS.has(variantId);
}

/** Strip slide-level imagery references from a content record when the
 *  target variant does not render them. Preserves other keys and any
 *  item-level seeds. */
export function normalizeSlideMedia<T extends Record<string, unknown>>(
  variantId: string | undefined | null,
  content: T,
): T {
  if (variantSupportsImagery(variantId)) return content;
  if (!("mediaUrl" in content) && !("mediaSeed" in content)) return content;
  const { mediaUrl: _u, mediaSeed: _s, ...rest } = content as Record<string, unknown>;
  return rest as T;
}
