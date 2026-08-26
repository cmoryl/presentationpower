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
