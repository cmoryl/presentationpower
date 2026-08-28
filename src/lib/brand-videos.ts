// -----------------------------------------------------------------------------
// BRAND MOTION LIBRARY — approved video assets, scoped by brand.
//
// Motion is a brand asset like a logo or a backdrop plate: each brand owns a
// small set of approved clips, and every surface that can play video (slide
// video backgrounds, module video examples, hero layers, the brand guide's
// Motion section) reads them from here rather than hard-coding a URL.
//
// Files live on the asset CDN through `*.asset.json` pointers, so the URLs are
// stable, cacheable and safe to embed in decks and exports.
// -----------------------------------------------------------------------------

// Plain URL constants (not bundler imports): this module is reachable from
// vite.config.ts's build gates, which evaluate it in plain Node where the "@/"
// alias and binary/JSON imports do not resolve.
const DATAFORCE_HERO_URL =
  "/__l5e/assets-v1/33d2ac38-f172-4289-80da-9eaab3504d71/dataforce-hero-2025.mp4";
const DATAFORCE_HERO_POSTER = "/brand-motion/dataforce-hero-2025-poster.jpg";


export type BrandVideo = {
  id: string;
  /** Brand-mode id that owns the clip, e.g. "bm-product" (DataForce). */
  brandModeId: string;
  label: string;
  description: string;
  url: string;
  /** Poster still, when one is approved. Videos without one show frame one. */
  posterUrl?: string;
  /** Where the clip is cleared for use. */
  usage: string[];
};

export const BRAND_VIDEOS: BrandVideo[] = [
  {
    id: "df-hero-2025",
    brandModeId: "bm-product",
    label: "DataForce hero motion (2025)",
    description:
      "The approved DataForce brand film loop: AI data capture and annotation motion in DataForce Green and Blue. Cleared as a full-bleed background for covers, statements and image-led modules.",
    url: DATAFORCE_HERO_URL,
    posterUrl: DATAFORCE_HERO_POSTER,
    usage: ["Cover backgrounds", "Full-bleed module backgrounds", "Quote / statement grounds"],
  },
];

/** Every approved clip for one brand mode (newest declaration order first). */
export function brandVideosFor(brandModeId: string | null | undefined): BrandVideo[] {
  if (!brandModeId) return [];
  return BRAND_VIDEOS.filter((v) => v.brandModeId === brandModeId);
}

/** The lead clip a brand uses for backgrounds, or null when it has none. */
export function primaryBrandVideo(brandModeId: string | null | undefined): BrandVideo | null {
  return brandVideosFor(brandModeId)[0] ?? null;
}

export function brandVideoById(id: string): BrandVideo | null {
  return BRAND_VIDEOS.find((v) => v.id === id) ?? null;
}

/** Convenience: the DataForce brand loop used across DataForce surfaces. */
export const DATAFORCE_HERO_VIDEO_URL = DATAFORCE_HERO_URL;

/** Poster still for the DataForce loop — the frame static surfaces paint. */
export const DATAFORCE_HERO_POSTER_URL = DATAFORCE_HERO_POSTER;
