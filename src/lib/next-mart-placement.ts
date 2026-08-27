// Modular placement of the supplied NEXT MART artwork onto the editable
// masters.
//
// The same six die-cut masters stay standalone production files. This module
// lets any of them be *placed* onto a live master — pillar or flat panel —
// where the gradient ground, lockup, headline and QR all remain editable and
// export through the certified layered vector pipeline.

import {
  MART_ART_TRIM_H,
  MART_ART_TRIM_W,
  NEXT_MART,
  NEXT_MART_ARTWORK,
  NEXT_MART_FLAT_SIGNS,
  type MartArtwork,
  type MartFlatSign,
} from "@/lib/next-mart";
import { pillarArtworkBox, pillarDefault, type PillarConfig } from "@/lib/next-pillar-masters";

/** Supplied artwork by id. */
export function martArtwork(id: string): MartArtwork | null {
  return NEXT_MART_ARTWORK.find((a) => a.id === id) ?? null;
}

/** Artwork aspect ratio (width / height) on the supplied board. */
export function martArtRatio(art: MartArtwork | null): number {
  const w = art?.trimW || MART_ART_TRIM_W;
  const h = art?.trimH || MART_ART_TRIM_H;
  return h > 0 ? w / h : MART_ART_TRIM_W / MART_ART_TRIM_H;
}

export type MartPlacement = {
  art: MartArtwork;
  /** mm from the trim top-left of the host master. */
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Resolve the placed artwork box for a live master config. */
export function martPlacement(config: PillarConfig): MartPlacement | null {
  const art = martArtwork(config.artworkId ?? "");
  if (!art) return null;
  const box = pillarArtworkBox(config, martArtRatio(art));
  return { art, ...box };
}

/** Flat panels that carry placed category artwork by default. */
const FLAT_ART_DEFAULTS: Record<string, string> = {
  "mart-wall-panel": "mart-art-02",
  "mart-category-panels": "mart-art-03",
  "mart-queue-panels": "mart-art-04",
  "mart-hanging-banner": "mart-art-06",
};

/** Default artwork master for a flat sign, if it takes one. */
export function martFlatArtworkId(sign: MartFlatSign): string {
  return FLAT_ART_DEFAULTS[sign.id] ?? "";
}

/**
 * A flat panel expressed as an editable master config on its own measured
 * footprint. Reusing the pillar engine keeps one vector export path for every
 * mart surface instead of a second, drifting renderer.
 */
export function martFlatConfig(sign: MartFlatSign, artworkId?: string): PillarConfig {
  const headline = (sign.copy[0] ?? "NEXT MART").toUpperCase();
  const sub = sign.copy[1] ?? "";
  return {
    ...pillarDefault(sign.id === "mart-floor-decals" ? "directional" : "welcome", "city-series"),
    face: sign.face,
    headline,
    subheadline: sub,
    // Landscape and square panels read across, never up the panel.
    verticalHeadline: false,
    headlineSize: Math.max(40, Math.min(220, Math.round(sign.trimH * 0.16))),
    lockupScale: sign.trimW > sign.trimH * 1.6 ? 0.7 : 1,
    sizeId: "custom",
    trimW: sign.trimW,
    trimH: sign.trimH,
    artworkId: artworkId ?? martFlatArtworkId(sign),
    artworkWidth: 0.62,
    artworkOffsetY: null,
    eventLabel: NEXT_MART.event,
  };
}

/** Every flat sign as an editable master, in production order. */
export function martFlatMasters(): { sign: MartFlatSign; config: PillarConfig }[] {
  return NEXT_MART_FLAT_SIGNS.map((sign) => ({ sign, config: martFlatConfig(sign) }));
}
