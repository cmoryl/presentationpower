// ──────────────────────────────────────────────────────────────────────
// Division-specific backdrop image repositories.
// Each brand mode has 6 photographic + 4 abstract atmospheric backdrops.
// bm-product and bm-cobrand fall back to bm-enterprise.
// ──────────────────────────────────────────────────────────────────────

// Enterprise — uses the curated 10-gradient corporate backdrop set as the
// canonical imagery pool. Split into 6 "photo" slots + 4 "abstract" slots so
// the existing variant-family scrim/tint rules keep working unchanged.
import entP1 from "./corporate-dark/bg-01.webp" with { type: "url" };
import entP2 from "./corporate-dark/bg-02.webp" with { type: "url" };
import entP3 from "./corporate-dark/bg-03.webp" with { type: "url" };
import entP4 from "./corporate-dark/bg-04.webp" with { type: "url" };
import entP5 from "./corporate-dark/bg-05.webp" with { type: "url" };
import entP6 from "./corporate-dark/bg-06.webp" with { type: "url" };
import entA1 from "./corporate-dark/bg-07.webp" with { type: "url" };
import entA2 from "./corporate-dark/bg-08.webp" with { type: "url" };
import entA3 from "./corporate-dark/bg-09.webp" with { type: "url" };
import entA4 from "./corporate-dark/bg-10.webp" with { type: "url" };

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

// Media
import medP1 from "./bm-tp-media/photo-01.jpg";
import medP2 from "./bm-tp-media/photo-02.jpg";
import medP3 from "./bm-tp-media/photo-03.jpg";
import medP4 from "./bm-tp-media/photo-04.jpg";
import medP5 from "./bm-tp-media/photo-05.jpg";
import medP6 from "./bm-tp-media/photo-06.jpg";
import medA1 from "./bm-tp-media/abstract-01.jpg";
import medA2 from "./bm-tp-media/abstract-02.jpg";
import medA3 from "./bm-tp-media/abstract-03.jpg";
import medA4 from "./bm-tp-media/abstract-04.jpg";

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

// Gaming
import gmP1 from "./bm-tp-games/photo-01.jpg";
import gmP2 from "./bm-tp-games/photo-02.jpg";
import gmP3 from "./bm-tp-games/photo-03.jpg";
import gmP4 from "./bm-tp-games/photo-04.jpg";
import gmP5 from "./bm-tp-games/photo-05.jpg";
import gmP6 from "./bm-tp-games/photo-06.jpg";
import gmA1 from "./bm-tp-games/abstract-01.jpg";
import gmA2 from "./bm-tp-games/abstract-02.jpg";
import gmA3 from "./bm-tp-games/abstract-03.jpg";
import gmA4 from "./bm-tp-games/abstract-04.jpg";

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
};

const enterpriseSet: DivisionImageSet = {
  photos: [entP1, entP2, entP3, entP4, entP5, entP6],
  abstracts: [entA1, entA2, entA3, entA4],
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

/** Get the image set for a given brand id, falling back to enterprise. */
export function getDivisionImagery(brandId: string): DivisionImageSet {
  return DIVISION_IMAGERY[brandId] ?? enterpriseSet;
}

/** Deterministic pick from a division's combined image pool (photos + abstracts). */
export function pickDivisionImage(brandId: string, seedHash: number): string {
  const set = getDivisionImagery(brandId);
  const all = [...set.photos, ...set.abstracts];
  return all[seedHash % all.length];
}
