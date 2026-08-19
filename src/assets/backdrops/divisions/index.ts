// ──────────────────────────────────────────────────────────────────────
// Division-specific backdrop image repositories.
// Each brand mode has 6 photographic + 4 abstract atmospheric backdrops.
// bm-product and bm-cobrand fall back to bm-enterprise.
// ──────────────────────────────────────────────────────────────────────

// Enterprise — uses the curated 10-gradient corporate backdrop set as the
// canonical imagery pool. Split into 6 "photo" slots + 4 "abstract" slots so
// the existing variant-family scrim/tint rules keep working unchanged.
import entP1 from "../corporate-dark/bg-01.webp";
import entP2 from "../corporate-dark/bg-02.webp";
import entP3 from "../corporate-dark/bg-03.webp";
import entP4 from "../corporate-dark/bg-04.webp";
import entP5 from "../corporate-dark/bg-05.webp";
import entP6 from "../corporate-dark/bg-06.webp";
import entA1 from "../corporate-dark/bg-07.webp";
import entA2 from "../corporate-dark/bg-08.webp";
import entA3 from "../corporate-dark/bg-09.webp";
import entA4 from "../corporate-dark/bg-10.webp";

// Enterprise photographic set — real hyper-realistic corporate photography.
// Dark-mode tiles use the dusk/interior frames; light mode uses the high-key
// daylight frames so bright surfaces get bright imagery, not a crushed still.
import entPhoto1 from "./bm-enterprise/photo-01.jpg";
import entPhoto2 from "./bm-enterprise/photo-02.jpg";
import entPhoto3 from "./bm-enterprise/photo-03.jpg";
import entPhoto4 from "./bm-enterprise/photo-04.jpg";
import entPhoto5 from "./bm-enterprise/photo-05.jpg";
import entPhoto6 from "./bm-enterprise/photo-06.jpg";
import entLight1 from "./bm-enterprise/light-01.jpg";
import entLight2 from "./bm-enterprise/light-02.jpg";
import entLight3 from "./bm-enterprise/light-03.jpg";
import entLight4 from "./bm-enterprise/light-04.jpg";
import entLight5 from "./bm-enterprise/light-05.jpg";
import entLight6 from "./bm-enterprise/light-06.jpg";

// Subcompany (Industry Solutions)
import subP1 from "./bm-subcompany/photo-01.jpg";
import subP2 from "./bm-subcompany/photo-02.jpg";
import subP3 from "./bm-subcompany/photo-03.jpg";
import subP4 from "./bm-subcompany/photo-04.jpg";
import subP5 from "./bm-subcompany/photo-05.jpg";
import subP6 from "./bm-subcompany/photo-06.jpg";
import subA1 from "./bm-subcompany/abstract-01.jpg";
import subA2 from "./bm-subcompany/abstract-02.jpg";
import subA3 from "./bm-subcompany/abstract-03.jpg";
import subA4 from "./bm-subcompany/abstract-04.jpg";

// Division (GlobalLink)
import divP1 from "./bm-division/photo-01.jpg";
import divP2 from "./bm-division/photo-02.jpg";
import divP3 from "./bm-division/photo-03.jpg";
import divP4 from "./bm-division/photo-04.jpg";
import divP5 from "./bm-division/photo-05.jpg";
import divP6 from "./bm-division/photo-06.jpg";
import divA1 from "./bm-division/abstract-01.jpg";
import divA2 from "./bm-division/abstract-02.jpg";
import divA3 from "./bm-division/abstract-03.jpg";
import divA4 from "./bm-division/abstract-04.jpg";

// Media — uses the curated TP Media dark gradient set as the canonical
// imagery pool. 6 gradients split 4 "photo" + 2 "abstract" slots.
import medP1 from "../tp-media-dark/bg-01.webp";
import medP2 from "../tp-media-dark/bg-02.webp";
import medP3 from "../tp-media-dark/bg-03.webp";
import medP4 from "../tp-media-dark/bg-04.webp";
import medP5 from "../tp-media-dark/bg-05.webp";
import medP6 from "../tp-media-dark/bg-06.webp";
import medA1 from "../tp-media-dark/bg-01.webp";
import medA2 from "../tp-media-dark/bg-03.webp";
import medA3 from "../tp-media-dark/bg-05.webp";
import medA4 from "../tp-media-dark/bg-06.webp";

// Legal
import lgP1 from "./bm-tp-legal/photo-01.jpg";
import lgP2 from "./bm-tp-legal/photo-02.jpg";
import lgP3 from "./bm-tp-legal/photo-03.jpg";
import lgP4 from "./bm-tp-legal/photo-04.jpg";
import lgP5 from "./bm-tp-legal/photo-05.jpg";
import lgP6 from "./bm-tp-legal/photo-06.jpg";
import lgA1 from "./bm-tp-legal/abstract-01.jpg";
import lgA2 from "./bm-tp-legal/abstract-02.jpg";
import lgA3 from "./bm-tp-legal/abstract-03.jpg";
import lgA4 from "./bm-tp-legal/abstract-04.jpg";

// Gaming — uses the curated TP Games dark gradient set as the canonical
// imagery pool. 6 gradients split 6 "photo" + 4 "abstract" slots.
import gmP1 from "../tp-games-dark/bg-01.webp";
import gmP2 from "../tp-games-dark/bg-02.webp";
import gmP3 from "../tp-games-dark/bg-03.webp";
import gmP4 from "../tp-games-dark/bg-04.webp";
import gmP5 from "../tp-games-dark/bg-05.webp";
import gmP6 from "../tp-games-dark/bg-06.webp";
import gmA1 from "../tp-games-dark/bg-01.webp";
import gmA2 from "../tp-games-dark/bg-03.webp";
import gmA3 from "../tp-games-dark/bg-05.webp";
import gmA4 from "../tp-games-dark/bg-06.webp";

// Digital (Agencies)
import dgP1 from "./bm-tp-digital/photo-01.jpg";
import dgP2 from "./bm-tp-digital/photo-02.jpg";
import dgP3 from "./bm-tp-digital/photo-03.jpg";
import dgP4 from "./bm-tp-digital/photo-04.jpg";
import dgP5 from "./bm-tp-digital/photo-05.jpg";
import dgP6 from "./bm-tp-digital/photo-06.jpg";
import dgA1 from "./bm-tp-digital/abstract-01.jpg";
import dgA2 from "./bm-tp-digital/abstract-02.jpg";
import dgA3 from "./bm-tp-digital/abstract-03.jpg";
import dgA4 from "./bm-tp-digital/abstract-04.jpg";

export type DivisionImageSet = {
  photos: string[];
  abstracts: string[];
  /** Optional high-key frames used when the slide renders in light mode. */
  light?: string[];
};

const enterpriseSet: DivisionImageSet = {
  // Photographic frames first — the curated corporate gradients stay in the
  // abstract slots so enterprise media tiles read as real photography.
  photos: [entPhoto1, entPhoto2, entPhoto3, entPhoto4, entPhoto5, entPhoto6],
  abstracts: [entP1, entP2, entP3, entP4, entA1, entA2, entA3, entA4],
  light: [entLight1, entLight2, entLight3, entLight4, entLight5, entLight6],
};

export const DIVISION_IMAGERY: Record<string, DivisionImageSet> = {
  "bm-enterprise": enterpriseSet,
  "bm-subcompany": {
    photos: [subP1, subP2, subP3, subP4, subP5, subP6],
    abstracts: [subA1, subA2, subA3, subA4],
  },
  "bm-division": {
    photos: [divP1, divP2, divP3, divP4, divP5, divP6],
    abstracts: [divA1, divA2, divA3, divA4],
  },
  "bm-tp-media": {
    photos: [medP1, medP2, medP3, medP4, medP5, medP6],
    abstracts: [medA1, medA2, medA3, medA4],
  },
  "bm-tp-legal": {
    photos: [lgP1, lgP2, lgP3, lgP4, lgP5, lgP6],
    abstracts: [lgA1, lgA2, lgA3, lgA4],
  },
  "bm-tp-games": {
    photos: [gmP1, gmP2, gmP3, gmP4, gmP5, gmP6],
    abstracts: [gmA1, gmA2, gmA3, gmA4],
  },
  "bm-tp-digital": {
    photos: [dgP1, dgP2, dgP3, dgP4, dgP5, dgP6],
    abstracts: [dgA1, dgA2, dgA3, dgA4],
  },
  // Fallbacks — reuse enterprise set for product/co-brand modes
  "bm-product": enterpriseSet,
  "bm-cobrand": enterpriseSet,
};

/**
 * Brands whose raster imagery pool actually matches their accent palette.
 * A brand NOT in this set must never borrow another division's stills as a
 * slide backdrop — that is what produced Life Sciences green accents over an
 * enterprise-blue photograph. Those brands render the brand-derived
 * procedural aurora instead, which reskins with the tokens.
 */
export const OWN_BACKDROP_BRANDS = new Set<string>([
  "bm-enterprise",
  "bm-subcompany",
  "bm-division",
  "bm-tp-media",
  "bm-tp-legal",
  "bm-tp-games",
  "bm-tp-digital",
]);

/** True when the brand owns a palette-matched raster backdrop pool. */
export function hasOwnBackdropPool(brandId: string): boolean {
  return OWN_BACKDROP_BRANDS.has(brandId) && !!DIVISION_IMAGERY[brandId];
}

/** Get the image set for a given brand id, falling back to enterprise. */
export function getDivisionImagery(brandId: string): DivisionImageSet {
  return DIVISION_IMAGERY[brandId] ?? enterpriseSet;
}

/** Deterministic pick from a division's combined image pool (photos + abstracts). */
export function pickDivisionImage(
  brandId: string,
  seedHash: number,
  mode?: "light" | "dark",
): string {
  const set = getDivisionImagery(brandId);
  const all =
    mode === "light" && set.light?.length
      ? [...set.light, ...set.photos]
      : [...set.photos, ...set.abstracts];
  return all[seedHash % all.length];
}
