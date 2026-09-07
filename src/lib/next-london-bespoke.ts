// Bespoke scenic build pack — job 2281, TransPerfect NEXT 2026, QEII Centre.
//
// PROVENANCE. Every number in this file is transcribed from the Bespoke
// (Master Event Producers) GA drawing pack "BESPOKE_QEII_2026_TransPerfect_
// Conference_Brand.pdf" — project code 2281, floor plans drawn by Ben Giles at
// 1:200 on ISO full-bleed A3, unit GAs drawn by MC. Dimensions in the pack are
// millimetres and are marked DO NOT SCALE; where a unit drawing does not
// publish a figure it is left null here and the UI says so rather than
// inventing one. Floor plan revisions are the pack's own REV letters.
//
// What this module adds to the maps page: the scenic units the crew actually
// installs (demo displays, merch market, help desk, screen surrounds, monitor
// hides, camera riser, plinths, stage arrows) placed inside the venue zone they
// belong to, so they print on the floor sheets and install cards next to the
// signage pins, plus the artwork panel sizes each unit needs from us.

import {
  LONDON_FLOOR_PLANS,
  type LondonFloorPlan,
  type LondonZone,
} from "@/lib/next-london-floorplan";
import type { LondonCustomArea } from "@/lib/next-london-floormap-areas";
import type { MapAreaKind } from "@/lib/next-london-floormap-design";
import type { LondonFloorId } from "@/lib/next-london-signage";

/** The drawing pack this data was transcribed from. */
export const BESPOKE_PACK = {
  producer: "Bespoke — Master Event Producers",
  project: "2281 — TransPerfect UK QEII",
  client: "TransPerfect",
  venue: "QEII Centre, Westminster",
  jobCode: "2281",
  planScale: "1:200 @ ISO full bleed A3 (420 × 297 mm)",
  planDrawnBy: "Ben Giles",
  unitsDrawnBy: "MC",
  note: "All dimensions in millimetres unless stated otherwise. Do not scale drawings.",
} as const;

/** Floor plan sheets in the pack, with the revision letter and issue date. */
export const BESPOKE_FLOOR_DRAWINGS: {
  floor: LondonFloorId;
  title: string;
  rev: string;
  date: string;
}[] = [
  { floor: "GF", title: "Ground floor plan", rev: "C", date: "27/08/26" },
  { floor: "2F", title: "Second floor plan", rev: "C", date: "27/08/26" },
  { floor: "3F", title: "Third floor plan", rev: "C", date: "27/08/26" },
  { floor: "4F", title: "Fourth floor plan", rev: "C", date: "27/08/26" },
  { floor: "5F", title: "Fifth floor plan", rev: "C", date: "27/08/26" },
];

/** A printed face we have to supply artwork for on a scenic unit. */
export type BespokeArtworkPanel = {
  label: string;
  /** Visible face size in millimetres, or null when the GA does not publish it. */
  wMm: number | null;
  hMm: number | null;
  qty: number;
  note?: string;
};

export type BespokeUnit = {
  id: string;
  name: string;
  floor: LondonFloorId;
  /** Venue zone this unit sits inside, from next-london-floorplan.ts. */
  zoneId: string;
  room: string;
  /** Drawing revision printed on the GA, when the sheet carries one. */
  rev?: string;
  revDate?: string;
  /** Bill of parts exactly as listed on the GA. */
  components: string[];
  /** Footprint and height in millimetres; null where the GA is silent. */
  widthMm: number | null;
  depthMm: number | null;
  heightMm: number | null;
  /** Faces we print. */
  artwork: BespokeArtworkPanel[];
  /** Screen sizes carried by the unit, in inches. */
  screensIn?: number[];
  /** How the area reads on the floor sheet key. */
  kind: MapAreaKind;
  /** Where inside the zone it sits: 0–1 across, 0–1 down. */
  anchor: { x: number; y: number };
  notes?: string;
};

export const BESPOKE_UNITS: BespokeUnit[] = [
  {
    id: "demo-area-displays",
    name: "Demo area displays",
    floor: "GF",
    zoneId: "gf-exhibition",
    room: "Ground floor exhibition",
    rev: "A",
    revDate: "13/08/26",
    components: ["Double sided 43\" screen surround", "Demo display tables, 2 of"],
    widthMm: null,
    depthMm: null,
    heightMm: null,
    artwork: [
      { label: "Screen surround face", wMm: null, hMm: null, qty: 2, note: "Double sided — both faces print." },
      { label: "Demo table front", wMm: null, hMm: null, qty: 2 },
    ],
    screensIn: [43, 43],
    kind: "demo",
    anchor: { x: 0.5, y: 0.35 },
    notes: "2 of 43\" screens, one per face of the surround.",
  },
  {
    id: "merch-market",
    name: "Merch market",
    floor: "GF",
    zoneId: "gf-sanctuary",
    room: "Sanctuary foyer",
    rev: "A",
    revDate: "13/08/26",
    components: ["Shelving unit, 2 of", "Merch cylinder, 1 of", "Merch bar, 1 of", "12' circular floor"],
    widthMm: 4621,
    depthMm: 1844,
    heightMm: 2251,
    artwork: [
      { label: "Merch bar front", wMm: 3780, hMm: 1153, qty: 1 },
      { label: "Merch cylinder wrap", wMm: 1200, hMm: 1171, qty: 1 },
      { label: "Shelving unit header", wMm: 1200, hMm: 323, qty: 2 },
      { label: "12' circular floor graphic", wMm: 3658, hMm: 3658, qty: 1, note: "12' Ø — supply as a circle on a square page." },
    ],
    kind: "exhibition",
    anchor: { x: 0.22, y: 0.5 },
  },
  {
    id: "tech-desk",
    name: "Tech desk",
    floor: "GF",
    zoneId: "gf-registration",
    room: "Registration",
    components: ["Scenic tech desk", "Stools"],
    widthMm: null,
    depthMm: null,
    heightMm: null,
    artwork: [{ label: "Desk front", wMm: null, hMm: null, qty: 1 }],
    kind: "support",
    anchor: { x: 0.72, y: 0.5 },
    notes: "Timber scenic reference on the GA; face sizes to be confirmed with Bespoke.",
  },
  {
    id: "help-desk",
    name: "Help desk",
    floor: "GF",
    zoneId: "gf-sanctuary",
    room: "Sanctuary foyer",
    rev: "A",
    revDate: "19/08/26",
    components: ["Help desk counter", "Totem with artwork panel"],
    widthMm: 2356,
    depthMm: 594,
    heightMm: 2038,
    artwork: [
      { label: "Counter front", wMm: 2356, hMm: 888, qty: 1 },
      { label: "Totem panel", wMm: 1532, hMm: 2038, qty: 1, note: "Pink hatch on the GA marks the artwork panel." },
      { label: "Counter return", wMm: 594, hMm: 888, qty: 2 },
    ],
    kind: "support",
    anchor: { x: 0.78, y: 0.3 },
  },
  {
    id: "plinth-500",
    name: "Plinth 500 × 500",
    floor: "GF",
    zoneId: "gf-exhibition",
    room: "Ground floor exhibition",
    revDate: "18/08/26",
    components: ["500 × 500 plinth"],
    widthMm: 500,
    depthMm: 500,
    heightMm: 1000,
    artwork: [{ label: "Plinth face", wMm: 500, hMm: 1000, qty: 4 }],
    kind: "exhibition",
    anchor: { x: 0.18, y: 0.75 },
  },
  {
    id: "plinth-600",
    name: "Plinth 600 × 600",
    floor: "GF",
    zoneId: "gf-exhibition",
    room: "Ground floor exhibition",
    revDate: "18/08/26",
    components: ["600 × 600 plinth"],
    widthMm: 600,
    depthMm: 600,
    heightMm: 1000,
    artwork: [{ label: "Plinth face", wMm: 600, hMm: 1000, qty: 4 }],
    kind: "exhibition",
    anchor: { x: 0.34, y: 0.75 },
  },
  {
    id: "churchill-stage-graphics",
    name: "Stage arrows & LED wall footer",
    floor: "GF",
    zoneId: "gf-churchill",
    room: "Churchill",
    components: ["Stage left back arrow", "Stage left front arrow", "Stage right back arrow", "Stage right front arrow", "LED wall footer"],
    widthMm: null,
    depthMm: null,
    heightMm: null,
    artwork: [
      { label: "Stage arrow", wMm: null, hMm: null, qty: 4, note: "Left and right, back and front." },
      { label: "LED wall footer", wMm: null, hMm: null, qty: 1, note: "Content plate, not print." },
    ],
    kind: "stage",
    anchor: { x: 0.5, y: 0.18 },
  },
  {
    id: "gielgud-screen-surround",
    name: "Gielgud 8' × 8' screen surround",
    floor: "2F",
    zoneId: "f2-gielgud",
    room: "Gielgud",
    components: ["8' × 8' screen surround", "86\" screen"],
    widthMm: 2438,
    depthMm: null,
    heightMm: 2438,
    artwork: [{ label: "Surround face", wMm: 2438, hMm: 2438, qty: 1, note: "Aperture cut for the 86\" screen." }],
    screensIn: [86],
    kind: "demo",
    anchor: { x: 0.5, y: 0.3 },
  },
  {
    id: "olivier-screen-surround",
    name: "Olivier 24' × 8' screen surround",
    floor: "2F",
    zoneId: "f2-olivier",
    room: "Olivier",
    revDate: "13/08/26",
    components: ["24' × 8' screen surround", "86\" screens, 2 of"],
    widthMm: 7315,
    depthMm: null,
    heightMm: 2438,
    artwork: [{ label: "Surround face", wMm: 7315, hMm: 2438, qty: 1, note: "Two apertures cut for 86\" screens — supply as tiled panels." }],
    screensIn: [86, 86],
    kind: "demo",
    anchor: { x: 0.5, y: 0.35 },
  },
  {
    id: "fleming-monitor-hide",
    name: "Fleming 65\" comfort monitor hide",
    floor: "3F",
    zoneId: "f3-fleming",
    room: "Fleming (Day 1)",
    components: ["65\" comfort monitor hide"],
    widthMm: 1519,
    depthMm: 108,
    heightMm: 900,
    artwork: [{ label: "Hide front", wMm: 1519, hMm: 900, qty: 1 }],
    screensIn: [65],
    kind: "support",
    anchor: { x: 0.5, y: 0.72 },
  },
  {
    id: "camera-riser",
    name: "Camera riser",
    floor: "3F",
    zoneId: "f3-fleming",
    room: "Fleming (Day 1)",
    components: ["Camera riser"],
    widthMm: null,
    depthMm: null,
    heightMm: null,
    artwork: [{ label: "Riser skirt", wMm: null, hMm: null, qty: 1 }],
    kind: "media",
    anchor: { x: 0.82, y: 0.82 },
  },
];

// ── Derived helpers ────────────────────────────────────────────────────────

const MM_PER_IN = 25.4;

/** Millimetres as inches, to one decimal. */
export function mmToIn(mm: number): number {
  return Math.round((mm / MM_PER_IN) * 10) / 10;
}

/** "2356 × 888 mm (92.8 × 35.0 in)", or the honest unknown. */
export function bespokeSizeLabel(wMm: number | null, hMm: number | null): string {
  if (wMm == null || hMm == null) return "Size to be confirmed with Bespoke";
  return `${wMm} × ${hMm} mm (${mmToIn(wMm)} × ${mmToIn(hMm)} in)`;
}

/** Footprint label for a unit, or the honest unknown. */
export function bespokeFootprintLabel(unit: BespokeUnit): string {
  if (unit.widthMm == null) return "Footprint to be confirmed with Bespoke";
  const depth = unit.depthMm == null ? "—" : `${unit.depthMm}`;
  const height = unit.heightMm == null ? "—" : `${unit.heightMm}`;
  return `${unit.widthMm} × ${depth} mm footprint, ${height} mm high`;
}

/** Units scheduled on one floor, in drawing order. */
export function bespokeUnitsOnFloor(floor: LondonFloorId): BespokeUnit[] {
  return BESPOKE_UNITS.filter((u) => u.floor === floor);
}

/** The floor plan sheet revision in the Bespoke pack, when the floor has one. */
export function bespokeFloorDrawing(floor: LondonFloorId) {
  return BESPOKE_FLOOR_DRAWINGS.find((d) => d.floor === floor) ?? null;
}

function zoneFor(plan: LondonFloorPlan, zoneId: string): LondonZone | null {
  return plan.zones.find((z) => z.id === zoneId) ?? null;
}

/** Smallest square a scenic unit reads as on a 1:200-ish schematic, in metres. */
const MIN_UNIT_M = 1.6;

/**
 * A scenic unit as a plan area, sized from its real footprint where the GA
 * publishes one and anchored inside its venue zone. Ids are prefixed `area-`
 * so every existing drawing, key and export path treats them like any other
 * sectioned area.
 */
export function bespokeUnitAsArea(unit: BespokeUnit): LondonCustomArea | null {
  const plan = LONDON_FLOOR_PLANS.find((p) => p.floor === unit.floor);
  if (!plan) return null;
  const zone = zoneFor(plan, unit.zoneId);
  if (!zone) return null;
  const w = Math.max(MIN_UNIT_M, unit.widthMm ? unit.widthMm / 1000 : MIN_UNIT_M * 1.5);
  const h = Math.max(MIN_UNIT_M, unit.depthMm ? unit.depthMm / 1000 : MIN_UNIT_M);
  const fitW = Math.min(w, zone.w);
  const fitH = Math.min(h, zone.h);
  const x = zone.x + (zone.w - fitW) * unit.anchor.x;
  const y = zone.y + (zone.h - fitH) * unit.anchor.y;
  const note = unit.widthMm
    ? bespokeFootprintLabel(unit)
    : "Bespoke GA — footprint to be confirmed";
  return {
    id: `area-bespoke-${unit.id}`,
    floor: unit.floor,
    label: unit.name,
    kind: unit.kind,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    w: Math.round(fitW * 10) / 10,
    h: Math.round(fitH * 10) / 10,
    note,
  };
}

/** Every scenic unit as a plan area, ready to merge with the team's own areas. */
export function bespokeAreas(): LondonCustomArea[] {
  return BESPOKE_UNITS.map((u) => bespokeUnitAsArea(u)).filter(
    (a): a is LondonCustomArea => a !== null,
  );
}

/** True when an area id was generated from the Bespoke pack rather than drawn. */
export function isBespokeAreaId(id: string): boolean {
  return id.startsWith("area-bespoke-");
}

/** The unit behind a generated area id, if any. */
export function bespokeUnitForAreaId(id: string): BespokeUnit | null {
  if (!isBespokeAreaId(id)) return null;
  const unitId = id.slice("area-bespoke-".length);
  return BESPOKE_UNITS.find((u) => u.id === unitId) ?? null;
}

/** Artwork schedule as CSV, so the print partner gets the panel list plainly. */
export function bespokeArtworkCsv(units: readonly BespokeUnit[] = BESPOKE_UNITS): string {
  const rows = [["floor", "unit", "room", "rev", "panel", "qty", "width_mm", "height_mm", "note"]];
  for (const u of units) {
    for (const p of u.artwork) {
      rows.push([
        u.floor,
        u.name,
        u.room,
        u.rev ?? "",
        p.label,
        String(p.qty),
        p.wMm == null ? "TBC" : String(p.wMm),
        p.hMm == null ? "TBC" : String(p.hMm),
        p.note ?? "",
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
