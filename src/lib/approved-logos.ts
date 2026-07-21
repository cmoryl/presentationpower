// Approved logo set — TransPerfect + all 7 divisions, in both color and
// white variants. Used as filler / preview logos for logo-wall style
// module variants so that library previews always render with real
// approved marks instead of empty tiles.
//
// The chosen variant follows the current slide mode:
//   dark  → white lockup (or color when no white variant exists)
//   light → color lockup

export type ApprovedLogo = {
  id: string;
  name: string;
  /** Classic horizontal color mark (light backgrounds). */
  color: string;
  /** Classic horizontal white mark (dark backgrounds). Falls back to color. */
  white: string;
};

export const APPROVED_LOGOS: ApprovedLogo[] = [
  {
    id: "tp",
    name: "TransPerfect",
    color: "/brand-logos/tp-classic-color.svg",
    white: "/brand-logos/tp-classic-white.svg",
  },
  {
    id: "globallink",
    name: "GlobalLink",
    // No white classic variant — the color mark works on both surfaces.
    color: "/brand-logos/globallink-color.png",
    white: "/brand-logos/globallink-color.png",
  },
  {
    id: "lifesci",
    name: "Life Sciences",
    color: "/brand-logos/lifesci-classic-color.svg",
    white: "/brand-logos/lifesci-classic-white.svg",
  },
  {
    id: "legal",
    name: "Legal Solutions",
    color: "/brand-logos/legal-classic-color.png",
    white: "/brand-logos/legal-classic-white.svg",
  },
  {
    id: "media",
    name: "TransPerfect Media",
    color: "/brand-logos/media-classic-color.svg",
    white: "/brand-logos/media-classic-white.svg",
  },
  {
    id: "digital",
    name: "TransPerfect Digital",
    color: "/brand-logos/digital-classic-color.png",
    white: "/brand-logos/digital-classic-white.png",
  },
  {
    id: "dataforce",
    name: "DataForce",
    color: "/brand-logos/dataforce-classic-color.png",
    white: "/brand-logos/dataforce-classic-white.png",
  },
  {
    id: "games",
    name: "TransPerfect Gaming",
    color: "/brand-logos/games-classic-color.svg",
    white: "/brand-logos/games-classic-white.svg",
  },
];

export type ApprovedLogoItem = { name: string; logoUrl: string };

/**
 * Return `count` approved-logo items suitable for filler in logo-wall
 * variants. `mode` picks white marks for dark slides, color marks for
 * light. `excludeId` skips a specific brand (useful when the deck itself
 * is branded to that division and you don't want it in the wall).
 */
export function getApprovedLogoItems(
  mode: "light" | "dark",
  count = 8,
  excludeId?: string,
): ApprovedLogoItem[] {
  const pool = excludeId
    ? APPROVED_LOGOS.filter((l) => l.id !== excludeId)
    : APPROVED_LOGOS;
  const out: ApprovedLogoItem[] = [];
  for (let i = 0; i < count; i++) {
    const l = pool[i % pool.length];
    out.push({ name: l.name, logoUrl: mode === "dark" ? l.white : l.color });
  }
  return out;
}

/** Resolve the correct variant for a single approved logo by id. */
export function approvedLogoUrl(id: string, mode: "light" | "dark"): string | null {
  const l = APPROVED_LOGOS.find((x) => x.id === id);
  if (!l) return null;
  return mode === "dark" ? l.white : l.color;
}
