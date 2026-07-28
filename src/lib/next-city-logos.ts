// TransPerfect NEXT · City Series official logo suite.
//
// Three lockups (Stacked, SSv1 side-by-side tall, SSv2 single-line) each in
// three colourways: full colour (for light grounds), all-white and
// "DBlue white" (white wordmark with the dark-blue chevron for mid grounds).
// Sourced from the supplied brand pack and served through Lovable assets.

import stackedColor from "@/assets/next-city/stacked-color.svg.asset.json";
import stackedWhite from "@/assets/next-city/stacked-white.svg.asset.json";
import stackedDblue from "@/assets/next-city/stacked-dblue-white.svg.asset.json";
import ssv1Color from "@/assets/next-city/ssv1-color.svg.asset.json";
import ssv1White from "@/assets/next-city/ssv1-white.svg.asset.json";
import ssv1Dblue from "@/assets/next-city/ssv1-dblue-white.svg.asset.json";
import ssv2Color from "@/assets/next-city/ssv2-color.svg.asset.json";
import ssv2White from "@/assets/next-city/ssv2-white.svg.asset.json";
import ssv2Dblue from "@/assets/next-city/ssv2-dblue-white.svg.asset.json";

export type NextLogoLockup = "stacked" | "ssv1" | "ssv2";
export type NextLogoColorway = "color" | "white" | "dblue-white";

type Entry = { url: string; ratio: number };

const SUITE: Record<NextLogoLockup, Record<NextLogoColorway, Entry>> = {
  stacked: {
    color: { url: stackedColor.url, ratio: 360 / 214.7 },
    white: { url: stackedWhite.url, ratio: 360 / 214.7 },
    "dblue-white": { url: stackedDblue.url, ratio: 360 / 214.7 },
  },
  ssv1: {
    color: { url: ssv1Color.url, ratio: 465.4 / 140.2 },
    white: { url: ssv1White.url, ratio: 465.4 / 140.2 },
    "dblue-white": { url: ssv1Dblue.url, ratio: 465.4 / 140.2 },
  },
  ssv2: {
    color: { url: ssv2Color.url, ratio: 459.5 / 90.5 },
    white: { url: ssv2White.url, ratio: 459.5 / 90.5 },
    "dblue-white": { url: ssv2Dblue.url, ratio: 459.5 / 90.5 },
  },
};

/** NEXT City Series palette pulled from the logo artwork. */
export const NEXT_CITY_TOKENS = {
  navy: "#1B2A6B",
  deep: "#0E1533",
  blue: "#1E90FF",
  cyan: "#4FC3F7",
  ink: "#03002C",
} as const;

export function nextCityLogo(
  lockup: NextLogoLockup,
  colorway: NextLogoColorway = "color",
): Entry {
  return SUITE[lockup][colorway];
}

/** Pick the lockup that fits a frame's aspect: wide frames get the single
 *  line, tall/square frames get the stacked mark. */
export function nextCityLogoForFrame(
  width: number,
  height: number,
  colorway: NextLogoColorway = "color",
): Entry {
  const ar = width / height;
  if (ar >= 1.9) return nextCityLogo("ssv2", colorway);
  if (ar >= 1.15) return nextCityLogo("ssv1", colorway);
  return nextCityLogo("stacked", colorway);
}

export const NEXT_CITY_LOGO_SUITE = [
  { id: "stacked", label: "Stacked", note: "Primary — square and portrait frames." },
  { id: "ssv1", label: "Side-by-side v1", note: "Two-line horizontal — landscape frames." },
  { id: "ssv2", label: "Side-by-side v2", note: "Single line — banners and wide crops." },
] as const;

export { SUITE as NEXT_CITY_LOGO_FILES };
