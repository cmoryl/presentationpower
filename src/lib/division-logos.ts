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

export const DIVISION_LOGOS: Record<string, DivisionLogoSet> = {
  master: {
    color: `${B}/tp-color.png`,
    white: `${B}/tp-white.png`,
    stackedColor: `${B}/tp-stacked-color.png`,
    stackedWhite: `${B}/tp-stacked-white.png`,
  },
  transperfect: {
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
  "life-sciences": {
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

export function getDivisionLogos(key?: string | null): DivisionLogoSet | undefined {
  if (!key) return undefined;
  return DIVISION_LOGOS[key.toLowerCase()];
}
