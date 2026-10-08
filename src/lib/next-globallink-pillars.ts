// GlobalLink NEXT pillar set for the San Francisco edition — the designer's
// Canva final (10 pages, 23.5 × 72 in, RGB, no bleed), served byte-for-byte.
// The room names are the supplied artwork copy only; they are not a room list.
import masterPdf from "@/assets/globallink-pillars-sf/gl-pillars-san-fran-26.pdf.asset.json";
import welcome from "@/assets/globallink-pillars-sf/welcome.jpg.asset.json";
import telegraph from "@/assets/globallink-pillars-sf/telegraph-hill.jpg.asset.json";
import grand from "@/assets/globallink-pillars-sf/grand-ballroom.jpg.asset.json";
import sutter from "@/assets/globallink-pillars-sf/sutter.jpg.asset.json";
import union from "@/assets/globallink-pillars-sf/union-square.jpg.asset.json";
import yerba from "@/assets/globallink-pillars-sf/yerba-buena.jpg.asset.json";
import directional from "@/assets/globallink-pillars-sf/directional.jpg.asset.json";
import discovery from "@/assets/globallink-pillars-sf/discovery-rooms.jpg.asset.json";
import nextMart from "@/assets/globallink-pillars-sf/next-mart.jpg.asset.json";
import g2 from "@/assets/globallink-pillars-sf/g2-review.jpg.asset.json";
import type { NextRegistryRow } from "@/lib/next-event";

export const GLOBALLINK_PILLARS_CANVA = "https://www.canva.com/design/DAHXbUkuBjk";
export const GLOBALLINK_PILLARS_MASTER_URL = masterPdf.url;

/** Page order of the supplied PDF. */
export const GLOBALLINK_PILLARS = [
  { slug: "welcome", name: "Welcome", jpg: welcome },
  { slug: "telegraph-hill", name: "Telegraph Hill", jpg: telegraph },
  { slug: "grand-ballroom", name: "Grand Ballroom", jpg: grand },
  { slug: "sutter", name: "Sutter", jpg: sutter },
  { slug: "union-square", name: "Union Square", jpg: union },
  { slug: "yerba-buena", name: "Yerba Buena", jpg: yerba },
  { slug: "directional", name: "Directional", jpg: directional },
  { slug: "discovery-rooms", name: "Discovery Rooms", jpg: discovery },
  { slug: "next-mart", name: "NEXT Mart", jpg: nextMart },
  { slug: "g2-review", name: "G2 Review", jpg: g2 },
] as const;

export function globallinkPillarRows(): NextRegistryRow[] {
  return GLOBALLINK_PILLARS.map((p, i) => ({
    divisionId: "globallink",
    group: "pillar-signage",
    code: `P${i + 5}`,
    format: `${p.name} Pillar`,
    size: "23.5×72 in · supplied Canva master",
    exampleUrl: p.jpg.url,
    downloadUrl: masterPdf.url,
    secondaryUrl: GLOBALLINK_PILLARS_CANVA,
    secondaryLabel: "Canva",
    liveSignId: `globallink-pillar-${p.slug}`,
  }));
}
