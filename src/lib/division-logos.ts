// Division / sub-brand logos.
// Two variants per division:
//   - NEXT (2026 rebrand)   → /public/brand-logos/{slug}-{variant}.png
//   - Classic (pre-rebrand) → /public/brand-logos/{slug}-classic-{variant}.(png|svg)
//
// Auto-wiring: whenever a classic file for a division is registered in
// CLASSIC_MANIFEST below, getDivisionLogos() returns those paths instead of
// the NEXT set. To activate classic sub-brand logos, drop the PNG(s) into
// /public/brand-logos/ and add the slug to CLASSIC_MANIFEST — the deck
// BrandLockup and brand-guide pages pick them up automatically.

export type DivisionLogoSet = {
  color?: string;       // horizontal, color on light
  white?: string;       // horizontal, white/color on dark
  stackedColor?: string;
  stackedWhite?: string;
};

const B = "/brand-logos";

// ---- NEXT (2026) set ---------------------------------------------------
const NEXT: Record<string, DivisionLogoSet> = {
  tp: {
    color: `${B}/tp-color.png`,
    white: `${B}/tp-white.png`,
    stackedColor: `${B}/tp-stacked-color.png`,
    stackedWhite: `${B}/tp-stacked-white.png`,
  },
  globallink: {
    color: `${B}/globallink-color.png`,
    stackedColor: `${B}/globallink-stacked-color.png`,
  },
  games: {
    color: `${B}/games-color.png`,
    white: `${B}/games-white.png`,
    stackedColor: `${B}/games-stacked-color.png`,
  },
  legal: {
    color: `${B}/legal-color.png`,
    white: `${B}/legal-white.png`,
    stackedColor: `${B}/legal-stacked-color.png`,
  },
  lifesci: {
    color: `${B}/lifesci-color.png`,
    white: `${B}/lifesci-white.png`,
    stackedColor: `${B}/lifesci-stacked-color.png`,
  },
  media: {
    color: `${B}/media-color.png`,
    white: `${B}/media-white.png`,
    stackedColor: `${B}/media-stacked-color.png`,
  },
  digital: {
    color: `${B}/digital-color.png`,
    stackedColor: `${B}/digital-stacked-color.png`,
  },
  finance: {
    color: `${B}/finance-color.png`,
    stackedColor: `${B}/finance-stacked-color.png`,
  },
  experience: {
    color: `${B}/experience-color.png`,
    stackedColor: `${B}/experience-stacked-color.png`,
  },
  learn: {
    color: `${B}/learn-color.png`,
    stackedColor: `${B}/learn-stacked-color.png`,
  },
  dataforce: {
    color: `${B}/dataforce-color.png`,
    white: `${B}/dataforce-white.png`,
    stackedColor: `${B}/dataforce-stacked-color.png`,
  },
};

// ---- Classic manifest --------------------------------------------------
// Each key is a division slug; values list which classic files are present
// on disk under /public/brand-logos/. Files follow the convention
//   {slug}-classic-color.(png|svg)
//   {slug}-classic-white.(png|svg)
//   {slug}-classic-stacked-color.(png|svg)
//   {slug}-classic-stacked-white.(png|svg)
// Only files listed here are wired; anything else falls back to NEXT.
type ClassicPresence = {
  color?: "png" | "svg";
  white?: "png" | "svg";
  stackedColor?: "png" | "svg";
  stackedWhite?: "png" | "svg";
};

const CLASSIC_MANIFEST: Record<string, ClassicPresence> = {
  tp: { color: "svg", white: "svg", stackedColor: "svg", stackedWhite: "svg" },
  // Sub-brand classic files: uncomment / add once dropped into /public/brand-logos/.
  // globallink: { color: "png", white: "png", stackedColor: "png" },
  // legal:      { color: "png", white: "png", stackedColor: "png" },
  // lifesci:    { color: "png", white: "png", stackedColor: "png" },
  // media:      { color: "png", white: "png", stackedColor: "png" },
  // games:      { color: "png", white: "png", stackedColor: "png" },
  // digital:    { color: "png", stackedColor: "png" },
  // finance:    { color: "png", stackedColor: "png" },
  // experience: { color: "png", stackedColor: "png" },
  // learn:      { color: "png", stackedColor: "png" },
  // dataforce:  { color: "png", white: "png", stackedColor: "png" },
};

function classicSetFor(slug: string): DivisionLogoSet | undefined {
  const present = CLASSIC_MANIFEST[slug];
  if (!present) return undefined;
  const p = (variant: string, ext?: "png" | "svg") =>
    ext ? `${B}/${slug}-classic-${variant}.${ext}` : undefined;
  return {
    color: p("color", present.color),
    white: p("white", present.white),
    stackedColor: p("stacked-color", present.stackedColor),
    stackedWhite: p("stacked-white", present.stackedWhite),
  };
}

/**
 * Merge classic over NEXT per field, so a division with only a classic
 * horizontal color file still uses NEXT for stacked/white variants until
 * their classic counterparts land on disk.
 */
function resolvedSetFor(slug: string): DivisionLogoSet | undefined {
  const next = NEXT[slug];
  const classic = classicSetFor(slug);
  if (!next && !classic) return undefined;
  return {
    color: classic?.color ?? next?.color,
    white: classic?.white ?? next?.white,
    stackedColor: classic?.stackedColor ?? next?.stackedColor,
    stackedWhite: classic?.stackedWhite ?? next?.stackedWhite,
  };
}

// ---- Public map: BRAND_MODES ids + BrandGuide slugs → division slug -----
const KEY_TO_SLUG: Record<string, string> = {
  // BRAND_MODES ids
  master: "tp",
  "bm-master": "tp",
  "bm-enterprise": "tp",
  "bm-division": "globallink",
  "bm-subcompany": "tp",
  "bm-tp-legal": "legal",
  "bm-tp-media": "media",
  "bm-tp-games": "games",
  "bm-tp-digital": "digital",
  "bm-product": "tp",
  "bm-cobrand": "tp",

  // BrandGuide slugs
  "transperfect-master": "tp",
  transperfect: "tp",
  globallink: "globallink",
  "transperfect-life-sciences": "lifesci",
  "transperfect-legal": "legal",
  "transperfect-media": "media",
  "transperfect-gaming": "games",
  "transperfect-digital": "digital",
  "transperfect-finance": "finance",
  "transperfect-experience": "experience",
  "transperfect-learn": "learn",
  "transperfect-cobrand": "tp",
  dataforce: "dataforce",

  // Convenience aliases
  legal: "legal",
  lifesci: "lifesci",
  "life-sciences": "lifesci",
  media: "media",
  games: "games",
  digital: "digital",
  finance: "finance",
  experience: "experience",
  learn: "learn",
};

export const DIVISION_LOGOS: Record<string, DivisionLogoSet> = Object.fromEntries(
  Object.entries(KEY_TO_SLUG)
    .map(([key, slug]) => [key, resolvedSetFor(slug)] as const)
    .filter((entry): entry is [string, DivisionLogoSet] => !!entry[1]),
);

export function getDivisionLogos(key?: string | null): DivisionLogoSet | undefined {
  if (!key) return undefined;
  const slug = KEY_TO_SLUG[key.toLowerCase()];
  return slug ? resolvedSetFor(slug) : undefined;
}

/** True when a division has any classic files wired in. Useful for badges. */
export function hasClassicLogos(key?: string | null): boolean {
  if (!key) return false;
  const slug = KEY_TO_SLUG[key.toLowerCase()];
  return !!slug && !!CLASSIC_MANIFEST[slug];
}
