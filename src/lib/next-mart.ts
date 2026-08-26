// NEXT MART — the merchandise shop inside every TransPerfect NEXT event.
// This is the signage-only production kit: the pillar signs are live editable
// files on the approved NEXT gradient grounds, and the flat signage carries the
// measured trim/bleed specs the printer works to. London 2026 is the first run;
// further stops reuse the same kit with the stop label swapped.

import { pillarDefault, type PillarConfig } from "@/lib/next-pillar-masters";
import { NEXT_EVENT } from "@/lib/next-event";

export const NEXT_MART = {
  id: "next-mart",
  name: "NEXT MART",
  line: "The merch shop on the NEXT floor",
  intro:
    "NEXT MART is the merchandise shop that runs on the event floor. This is the signage package: entrance and wayfinding pillars as live editable files, plus the flat signage specs the printer produces to. Artwork sits on the approved NEXT gradient grounds — no separate palette.",
  event: `${NEXT_EVENT.name} — ${NEXT_EVENT.city}`,
  venue: NEXT_EVENT.venue,
  dates: NEXT_EVENT.datesLabel,
  shopUrl: "https://transperfect.com/next/mart",
} as const;

export type MartPillarSign = {
  id: string;
  name: string;
  role: string;
  quantity: number;
  placement: string;
  substrate: string;
  config: PillarConfig;
};

/** Live editable pillar files for the mart. All on approved grounds. */
export const NEXT_MART_PILLARS: MartPillarSign[] = [
  {
    id: "mart-entrance",
    name: "Mart entrance pillar",
    role: "Marks the shop threshold and reads down the concourse.",
    quantity: 2,
    placement: "Flanking the mart entrance, 2.4 m apart",
    substrate: "Fabric sleeve on 3-sided tower frame",
    config: {
      ...pillarDefault("welcome", "city-series"),
      headline: "NEXT MART",
      subheadline: "OFFICIAL EVENT MERCH",
      subheadlineSize: 40,
      verticalHeadline: true,
      face: "dark",
      qrData: NEXT_MART.shopUrl,
      qrCaption: "SHOP THE FULL RANGE",
    },
  },
  {
    id: "mart-pay-here",
    name: "Pay here pillar",
    role: "Till marker — pairs with the desk fronts at the checkout end.",
    quantity: 1,
    placement: "Beside the till bank",
    substrate: "Fabric sleeve on 3-sided tower frame",
    config: {
      ...pillarDefault("registration", "city-series"),
      headline: "PAY HERE",
      subheadline: "TAP · CARD · BADGE",
      subheadlineSize: 36,
      face: "light",
    },
  },
  {
    id: "mart-wayfinding",
    name: "Mart directional pillar",
    role: "Pulls traffic off the main concourse into the shop.",
    quantity: 3,
    placement: "Concourse decision points, levels 0 and 1",
    substrate: "Fabric sleeve on 3-sided tower frame",
    config: {
      ...pillarDefault("directional", "city-series"),
      headline: "NEXT MART",
      arrow: "right",
      arrowStyle: "solid",
      face: "dark",
    },
  },
  {
    id: "mart-logo-column",
    name: "Mart logo column",
    role: "General identity column inside the shop footprint.",
    quantity: 2,
    placement: "Rear wall of the mart footprint",
    substrate: "Fabric sleeve on 3-sided tower frame",
    config: {
      ...pillarDefault("logo", "city-series"),
      logoUrl: "transperfect.com/next/mart",
      logoSocial: NEXT_EVENT.hashtag,
      face: "dark",
    },
  },
];

export type MartFlatSign = {
  id: string;
  name: string;
  role: string;
  /** Trim size in mm. */
  trimW: number;
  trimH: number;
  bleed: number;
  quantity: number;
  substrate: string;
  finishing: string;
  copy: string[];
  face: "dark" | "light";
};

/** Flat signage the printer produces to measured trim. */
export const NEXT_MART_FLAT_SIGNS: MartFlatSign[] = [
  {
    id: "mart-hanging-banner",
    name: "Overhead hanging banner",
    role: "Locates the mart from anywhere on the floor.",
    trimW: 3000,
    trimH: 900,
    bleed: 20,
    quantity: 1,
    substrate: "Double-sided blockout fabric",
    finishing: "Top and bottom pole pockets, rigged to truss",
    copy: ["NEXT MART", "OFFICIAL EVENT MERCH"],
    face: "dark",
  },
  {
    id: "mart-wall-panel",
    name: "Shop wall panel",
    role: "Back wall graphic behind the merch rails.",
    trimW: 2400,
    trimH: 2400,
    bleed: 15,
    quantity: 2,
    substrate: "5 mm foam PVC panel",
    finishing: "Butt-jointed, hook-and-loop to shell scheme",
    copy: ["NEXT MART", "TransPerfect NEXT 2026", NEXT_EVENT.hashtag],
    face: "dark",
  },
  {
    id: "mart-category-panels",
    name: "Category rail panels",
    role: "Names each merch zone above the rails.",
    trimW: 800,
    trimH: 300,
    bleed: 10,
    quantity: 6,
    substrate: "3 mm foam PVC",
    finishing: "Rail-clipped, editable category line",
    copy: ["APPAREL", "HEADWEAR", "DESK", "BAGS", "LIMITED", "GIFTING"],
    face: "light",
  },
  {
    id: "mart-queue-panels",
    name: "Queue stanchion panels",
    role: "Queue management at the till bank.",
    trimW: 600,
    trimH: 400,
    bleed: 10,
    quantity: 4,
    substrate: "3 mm foam PVC in stanchion frame",
    finishing: "Slotted for post frames",
    copy: ["QUEUE HERE", "ONE LINE, ALL TILLS"],
    face: "light",
  },
  {
    id: "mart-price-strip",
    name: "Price strip signage",
    role: "Price bands per zone — no product SKUs on the printed art.",
    trimW: 400,
    trimH: 120,
    bleed: 5,
    quantity: 12,
    substrate: "400 gsm board, matt laminate",
    finishing: "Creased shelf-talker fold",
    copy: ["FROM £15", "FROM £25", "FROM £45"],
    face: "light",
  },
  {
    id: "mart-floor-decals",
    name: "Floor approach decals",
    role: "Ground wayfinding on the last 6 m of approach.",
    trimW: 900,
    trimH: 900,
    bleed: 0,
    quantity: 5,
    substrate: "Anti-slip floor vinyl, R10",
    finishing: "Kiss-cut circle, removable adhesive",
    copy: ["NEXT MART", "THIS WAY"],
    face: "dark",
  },
];

export function martTotalPanels(): number {
  return (
    NEXT_MART_PILLARS.reduce((n, p) => n + p.quantity, 0) +
    NEXT_MART_FLAT_SIGNS.reduce((n, s) => n + s.quantity, 0)
  );
}

/* ---------------------------------------------------------------------------
 * London working artwork — supplied production files (Illustrator SVG masters)
 * Each sign is a die-cut board with layered groups: 01_BLEED, 02_BOARD,
 * 04_ICON, 05_TYPE, 07_CUT-CONTOUR (magenta spot path for the cutter).
 * ------------------------------------------------------------------------- */

import artTravelRight from "@/assets/next-mart/02_TRAVEL_pack-light-travel-right.svg.asset.json";
import artTravelPro from "@/assets/next-mart/02b_TRAVEL_pack-like-a-pro.svg.asset.json";
import artTechToGo from "@/assets/next-mart/03_TECH_tech-to-go.svg.asset.json";
import artPowerUp from "@/assets/next-mart/03b_TECH_power-up-and-go.svg.asset.json";
import artHydrated from "@/assets/next-mart/04_WATER_keep-hydrated.svg.asset.json";
import artLocalLegends from "@/assets/next-mart/06_LOCAL_local-legends.svg.asset.json";
import artTravelRightOutlined from "@/assets/next-mart/02_TRAVEL_pack-light-travel-right-outlined.svg.asset.json";

/* ---------------------------------------------------------------------------
 * NEXT MART lockup — supplied master logo (colour gradient + reversed white).
 * EPS is the print master; SVG/PNG are the derived screen + proof files.
 * ------------------------------------------------------------------------- */

import martLogoEps from "@/assets/next-mart/NEXT_Mart_logo.eps.asset.json";
import martLogoSvg from "@/assets/next-mart/NEXT_Mart_logo.svg.asset.json";
import martLogoPng from "@/assets/next-mart/NEXT_Mart_logo.png.asset.json";
import martLogoWhiteEps from "@/assets/next-mart/NEXT_Mart_White_logo.eps.asset.json";
import martLogoWhiteSvg from "@/assets/next-mart/NEXT_Mart_White_logo.svg.asset.json";
import martLogoWhitePng from "@/assets/next-mart/NEXT_Mart_White_logo.png.asset.json";

export type MartLogo = {
  id: string;
  name: string;
  usage: string;
  face: "dark" | "light";
  previewUrl: string;
  epsUrl: string;
  svgUrl: string;
  pngUrl: string;
};

export const NEXT_MART_LOGOS: MartLogo[] = [
  {
    id: "mart-logo-colour",
    name: "NEXT MART — gradient lockup",
    usage:
      "Primary mark. Use on white or Blue White grounds for print signage, price strips and till fronts. Never recolour the gradient.",
    face: "light",
    previewUrl: martLogoSvg.url,
    epsUrl: martLogoEps.url,
    svgUrl: martLogoSvg.url,
    pngUrl: martLogoPng.url,
  },
  {
    id: "mart-logo-white",
    name: "NEXT MART — reversed white",
    usage:
      "Reversed mark for dark grounds: entrance pillars, hanging banners and wall panels on Blue 800 or the approved NEXT gradient.",
    face: "dark",
    previewUrl: martLogoWhiteSvg.url,
    epsUrl: martLogoWhiteEps.url,
    svgUrl: martLogoWhiteSvg.url,
    pngUrl: martLogoWhitePng.url,
  },
];

export type MartArtwork = {
  id: string;
  code: string;
  category: string;
  headline: string;
  url: string;
  filename: string;
  /**
   * Screen preview file. Where a master still carries live text, this points at
   * an outlined copy so the browser renders exactly what the printer gets.
   */
  previewUrl: string;
  face: "dark" | "light";
  /** Die shape of the board, plain language for the printer. */
  die: string;
  trimW: number;
  trimH: number;
  bleed: number;
  quantity: number;
  substrate: string;
  finishing: string;
};

/** Supplied board dimensions: artwork is 1620 × 972 units at 1 unit = 0.5 mm. */
export const MART_ART_TRIM_W = 810;
export const MART_ART_TRIM_H = 486;

export const NEXT_MART_ARTWORK: MartArtwork[] = [
  {
    id: "mart-art-02",
    code: "02",
    category: "Travel",
    headline: "Pack light, travel right",
    url: artTravelRight.url,
    filename: artTravelRight.original_filename,
    previewUrl: artTravelRightOutlined.url,
    face: "light",
    die: "Rounded panel with notched corner and punched hang hole",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path, hang hole reinforced",
  },
  {
    id: "mart-art-02b",
    code: "02b",
    category: "Travel",
    headline: "Pack like a pro",
    url: artTravelPro.url,
    filename: artTravelPro.original_filename,
    previewUrl: artTravelPro.url,
    face: "light",
    die: "Rounded panel with notched corner and punched hang hole",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path, hang hole reinforced",
  },
  {
    id: "mart-art-03",
    code: "03",
    category: "Tech",
    headline: "Tech to go",
    url: artTechToGo.url,
    filename: artTechToGo.original_filename,
    previewUrl: artTechToGo.url,
    face: "dark",
    die: "Chamfered hex board with pinched waist",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path",
  },
  {
    id: "mart-art-03b",
    code: "03b",
    category: "Tech",
    headline: "Power up and go",
    url: artPowerUp.url,
    filename: artPowerUp.original_filename,
    previewUrl: artPowerUp.url,
    face: "dark",
    die: "Chamfered hex board with pinched waist",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path",
  },
  {
    id: "mart-art-04",
    code: "04",
    category: "Water",
    headline: "Keep hydrated",
    url: artHydrated.url,
    filename: artHydrated.original_filename,
    previewUrl: artHydrated.url,
    face: "dark",
    die: "Rounded top with scalloped wave base",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path",
  },
  {
    id: "mart-art-06",
    code: "06",
    category: "Local",
    headline: "Local legends",
    url: artLocalLegends.url,
    filename: artLocalLegends.original_filename,
    previewUrl: artLocalLegends.url,
    face: "light",
    die: "Dome top with rounded base corners",
    trimW: MART_ART_TRIM_W,
    trimH: MART_ART_TRIM_H,
    bleed: 6,
    quantity: 2,
    substrate: "5 mm Foamex, matte laminate",
    finishing: "Cut to CutContour path",
  },
];

export function martArtworkPanels(): number {
  return NEXT_MART_ARTWORK.reduce((n, a) => n + a.quantity, 0);
}
