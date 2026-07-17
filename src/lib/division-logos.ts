// Division / sub-brand logos migrated from BrandHUB (NEXT 2026 set).
// Files live under /public/brand-logos/. Keys map to BRAND_MODES ids and
// BrandGuide slugs where they overlap.

export type DivisionLogoSet = {
  color?: string;       // horizontal, color on light
  white?: string;       // horizontal, white/color on dark
  stackedColor?: string;
  stackedWhite?: string;
};

const B = "/brand-logos";

// Master TransPerfect uses the classic (non-NEXT) wordmark from BrandHUB.
const TP = {
  color: `${B}/tp-classic-color.svg`,
  white: `${B}/tp-classic-white.svg`,
  stackedColor: `${B}/tp-classic-color.svg`,
  stackedWhite: `${B}/tp-classic-white.svg`,
} satisfies DivisionLogoSet;

const GLOBALLINK = {
  color: `${B}/globallink-color.png`,
  stackedColor: `${B}/globallink-stacked-color.png`,
} satisfies DivisionLogoSet;

const GAMES = {
  color: `${B}/games-color.png`,
  white: `${B}/games-white.png`,
  stackedColor: `${B}/games-stacked-color.png`,
} satisfies DivisionLogoSet;

const LEGAL = {
  color: `${B}/legal-color.png`,
  white: `${B}/legal-white.png`,
  stackedColor: `${B}/legal-stacked-color.png`,
} satisfies DivisionLogoSet;

const LIFESCI = {
  color: `${B}/lifesci-color.png`,
  white: `${B}/lifesci-white.png`,
  stackedColor: `${B}/lifesci-stacked-color.png`,
} satisfies DivisionLogoSet;

const MEDIA = {
  color: `${B}/media-color.png`,
  white: `${B}/media-white.png`,
  stackedColor: `${B}/media-stacked-color.png`,
} satisfies DivisionLogoSet;

const DIGITAL = {
  color: `${B}/digital-color.png`,
  stackedColor: `${B}/digital-stacked-color.png`,
} satisfies DivisionLogoSet;

const FINANCE = {
  color: `${B}/finance-color.png`,
  stackedColor: `${B}/finance-stacked-color.png`,
} satisfies DivisionLogoSet;

const EXPERIENCE = {
  color: `${B}/experience-color.png`,
  stackedColor: `${B}/experience-stacked-color.png`,
} satisfies DivisionLogoSet;

const LEARN = {
  color: `${B}/learn-color.png`,
  stackedColor: `${B}/learn-stacked-color.png`,
} satisfies DivisionLogoSet;

const DATAFORCE = {
  color: `${B}/dataforce-color.png`,
  white: `${B}/dataforce-white.png`,
  stackedColor: `${B}/dataforce-stacked-color.png`,
} satisfies DivisionLogoSet;

export const DIVISION_LOGOS: Record<string, DivisionLogoSet> = {
  // BRAND_MODES ids
  master: TP,
  "bm-master": TP,
  "bm-division": GLOBALLINK,
  "bm-subcompany": TP, // sub-company mode reuses master lockup by default
  "bm-tp-legal": LEGAL,
  "bm-tp-media": MEDIA,
  "bm-tp-games": GAMES,
  "bm-tp-digital": DIGITAL,
  "bm-product": TP,
  "bm-cobrand": TP,

  // BrandGuide slugs
  "transperfect-master": TP,
  transperfect: TP,
  globallink: GLOBALLINK,
  "transperfect-life-sciences": LIFESCI,
  "transperfect-legal": LEGAL,
  "transperfect-media": MEDIA,
  "transperfect-gaming": GAMES,
  "transperfect-digital": DIGITAL,
  "transperfect-finance": FINANCE,
  "transperfect-experience": EXPERIENCE,
  "transperfect-learn": LEARN,
  "transperfect-ip": TP,
  "transperfect-health": LIFESCI,
  "transperfect-cobrand": TP,
  dataforce: DATAFORCE,

  // Convenience aliases
  legal: LEGAL,
  lifesci: LIFESCI,
  "life-sciences": LIFESCI,
  media: MEDIA,
  games: GAMES,
  digital: DIGITAL,
  finance: FINANCE,
  experience: EXPERIENCE,
  learn: LEARN,
};

export function getDivisionLogos(key?: string | null): DivisionLogoSet | undefined {
  if (!key) return undefined;
  return DIVISION_LOGOS[key.toLowerCase()];
}
