// The NEXT series' next venue — floor plan shell, scenic carry-over and the
// signage kit reissued to it.
//
// PROVENANCE, read this before trusting a number here.
// London (next-london-floorplan.ts) is a real building: its rooms, floor areas
// and lift cores are the QEII Centre's own published layout, and its scenic
// units are transcribed from the Bespoke GA pack for job 2281. The next venue
// has not been contracted, so nothing equivalent exists yet. Everything in this
// module is therefore an explicitly PROVISIONAL shell: the floors, room names
// and rectangles are a working stage set proportioned from the London build
// (a plenary the size of Churchill, an exhibition floor the size of the third
// floor) so the team can lay out the show before the venue is confirmed. No
// rectangle here was surveyed and no dimension came from a venue document.
// When the venue and its plans arrive, replace PLANS below with the real roster
// exactly as London's was, and drop `provisional`.
//
// What the page built on this does: carries the whole London show over — the
// Bespoke scenic units as draggable areas placed by matching room type, and all
// 54 signage panels reissued at a scale you set, with the print risks flagged.

import { BESPOKE_UNITS, bespokeFootprintLabel, type BespokeUnit } from "@/lib/next-london-bespoke";
import {
  LONDON_FLOOR_PLANS,
  type LondonFloorPlan,
  type LondonZone,
} from "@/lib/next-london-floorplan";
import type { LondonCustomArea } from "@/lib/next-london-floormap-areas";
import { LONDON_PANELS, type LondonFloorId, type LondonPanel } from "@/lib/next-london-signage";

/** The venue this shell stands in for, until the real one is contracted. */
export const NEXT_VENUE = {
  id: "next-venue-shell",
  eventId: "next-next",
  name: "TransPerfect NEXT — next venue",
  venue: "Venue to be confirmed",
  city: "City to be confirmed",
  datesLabel: "Dates to be confirmed",
  producer: "Production partner to be appointed",
  provisional: true,
  /** Printed on every sheet drawn from this shell. */
  caveat:
    "PROVISIONAL LAYOUT — stage set only. Floors, rooms and sizes are carried over from the London build, not surveyed at this venue. Do not order print or truss from this sheet.",
} as const;

/** Floors in the shell. Ids are shared with the London set so every sheet, key,
 * export and stored correction path works unchanged. */
export const NEXT_VENUE_FLOORS: { id: LondonFloorId; label: string }[] = [
  { id: "GF", label: "Arrival level" },
  { id: "2F", label: "Conference level" },
  { id: "3F", label: "Exhibition level" },
];

const GF: LondonZone[] = [
  {
    id: "nv-gf-arrival",
    label: "Arrival & registration",
    kind: "foyer",
    x: 2,
    y: 26,
    w: 30,
    h: 12,
    rooms: ["Arrival", "Registration"],
    note: "Doors, registration desks, cloak.",
  },
  {
    id: "nv-gf-plenary",
    label: "Plenary hall",
    kind: "auditorium",
    x: 2,
    y: 2,
    w: 36,
    h: 20,
    rooms: ["Plenary"],
    note: "Sized to the London main stage room (720 m²).",
  },
  {
    id: "nv-gf-core-w",
    label: "West core",
    kind: "core",
    x: 39,
    y: 2,
    w: 5,
    h: 12,
    rooms: ["Lifts", "Stairs"],
  },
  {
    id: "nv-gf-cafe",
    label: "Coffee & catering",
    kind: "hospitality",
    x: 34,
    y: 26,
    w: 14,
    h: 12,
    rooms: ["Coffee bar"],
  },
  {
    id: "nv-gf-link",
    label: "Link concourse",
    kind: "circulation",
    x: 2,
    y: 22,
    w: 46,
    h: 4,
    rooms: ["Concourse"],
  },
];

const F2: LondonZone[] = [
  {
    id: "nv-2f-foyer",
    label: "Conference foyer",
    kind: "foyer",
    x: 2,
    y: 2,
    w: 40,
    h: 8,
    rooms: ["Foyer"],
  },
  {
    id: "nv-2f-breakout-a",
    label: "Breakout A",
    kind: "room",
    x: 2,
    y: 12,
    w: 18,
    h: 14,
    rooms: ["Breakout A"],
  },
  {
    id: "nv-2f-breakout-b",
    label: "Breakout B",
    kind: "room",
    x: 22,
    y: 12,
    w: 18,
    h: 14,
    rooms: ["Breakout B"],
  },
  {
    id: "nv-2f-lounge",
    label: "Hospitality lounge",
    kind: "hospitality",
    x: 2,
    y: 28,
    w: 24,
    h: 10,
    rooms: ["Lounge"],
  },
  {
    id: "nv-2f-core",
    label: "Core",
    kind: "core",
    x: 42,
    y: 2,
    w: 5,
    h: 14,
    rooms: ["Lifts", "Stairs"],
  },
];

const F3: LondonZone[] = [
  {
    id: "nv-3f-hall",
    label: "Exhibition hall",
    kind: "exhibition",
    x: 2,
    y: 2,
    w: 46,
    h: 26,
    rooms: ["Exhibition"],
    note: "Sized to the London exhibition floor (2,142 m² gross).",
  },
  {
    id: "nv-3f-demo",
    label: "Demo bays",
    kind: "exhibition",
    x: 2,
    y: 30,
    w: 28,
    h: 8,
    rooms: ["Demo"],
  },
  {
    id: "nv-3f-support",
    label: "Crew & storage",
    kind: "circulation",
    x: 32,
    y: 30,
    w: 16,
    h: 8,
    rooms: ["Storage"],
  },
  {
    id: "nv-3f-core",
    label: "Core",
    kind: "core",
    x: 49,
    y: 2,
    w: 5,
    h: 14,
    rooms: ["Lifts", "Stairs"],
  },
];

const PLANS: LondonFloorPlan[] = [
  {
    floor: "GF",
    label: "Arrival level",
    w: 50,
    h: 40,
    orientation: "Provisional shell — main doors at the bottom of the sheet, plenary to the north.",
    zones: GF,
    entries: [{ label: "Main entrance", x: 12, y: 38 }],
  },
  {
    floor: "2F",
    label: "Conference level",
    w: 50,
    h: 40,
    orientation: "Provisional shell — arrive from the core on the right of the sheet.",
    zones: F2,
    entries: [{ label: "From core", x: 44, y: 9 }],
  },
  {
    floor: "3F",
    label: "Exhibition level",
    w: 56,
    h: 40,
    orientation: "Provisional shell — arrive from the core on the right of the sheet.",
    zones: F3,
    entries: [{ label: "From core", x: 51, y: 9 }],
  },
];

export const NEXT_VENUE_FLOOR_PLANS: readonly LondonFloorPlan[] = PLANS;

export function nextVenueFloorPlan(floor: LondonFloorId): LondonFloorPlan | null {
  return PLANS.find((p) => p.floor === floor) ?? null;
}

/* ------------------------------------------------------------------ scenic */

/** Zone in the shell that best matches a London zone, matched on room type. */
function matchZone(unit: BespokeUnit): { plan: LondonFloorPlan; zone: LondonZone } | null {
  const source = LONDON_FLOOR_PLANS.find((p) => p.floor === unit.floor);
  const sourceZone = source?.zones.find((z) => z.id === unit.zoneId) ?? null;
  const wantKind = sourceZone?.kind ?? "exhibition";
  // Everything lands on a shell floor that exists; the plenary/exhibition
  // floors take the overflow so nothing is silently dropped.
  const order: LondonFloorId[] = ["GF", "2F", "3F"];
  const byKind = order
    .map((f) => PLANS.find((p) => p.floor === f))
    .filter((p): p is LondonFloorPlan => !!p)
    .flatMap((plan) => plan.zones.map((zone) => ({ plan, zone })));
  return (
    byKind.find((c) => c.zone.kind === wantKind) ??
    byKind.find((c) => c.zone.kind === "exhibition") ??
    byKind[0] ??
    null
  );
}

const MIN_UNIT_M = 1.6;

/**
 * Every Bespoke scenic unit carried onto the shell as a draggable area, packed
 * left-to-right inside the matched room so nothing starts life overlapping.
 * Ids stay `area-` prefixed, so the sheets, keys and exports treat them exactly
 * like any other sectioned area.
 */
export function nextVenueScenicAreas(
  units: readonly BespokeUnit[] = BESPOKE_UNITS,
): LondonCustomArea[] {
  const out: LondonCustomArea[] = [];
  /** Next free x per zone, so packing is deterministic. */
  const cursor = new Map<string, { x: number; y: number; rowH: number }>();
  for (const unit of units) {
    const match = matchZone(unit);
    if (!match) continue;
    const { zone } = match;
    const w = Math.min(
      Math.max(MIN_UNIT_M, unit.widthMm ? unit.widthMm / 1000 : MIN_UNIT_M * 1.5),
      zone.w,
    );
    const h = Math.min(
      Math.max(MIN_UNIT_M, unit.depthMm ? unit.depthMm / 1000 : MIN_UNIT_M),
      zone.h,
    );
    const c = cursor.get(zone.id) ?? { x: 0, y: 0, rowH: 0 };
    if (c.x + w > zone.w) {
      c.x = 0;
      c.y += c.rowH + 0.4;
      c.rowH = 0;
    }
    // A zone can genuinely run out of room; keep the unit inside it rather than
    // letting it hang off the plan, and let the crew drag it out.
    const y = Math.min(c.y, Math.max(0, zone.h - h));
    out.push({
      id: `area-bespoke-${unit.id}`,
      floor: match.plan.floor,
      label: unit.name,
      kind: unit.kind,
      x: round1(zone.x + c.x),
      y: round1(zone.y + y),
      w: round1(w),
      h: round1(h),
      note: unit.widthMm
        ? `${bespokeFootprintLabel(unit)} · carried from London, position provisional`
        : "Bespoke GA — footprint to be confirmed",
    });
    c.x += w + 0.4;
    c.rowH = Math.max(c.rowH, h);
    cursor.set(zone.id, c);
  }
  return out;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/* ----------------------------------------------------------------- signage */

/** Widest a single printed piece can go before it has to be tiled, in mm. */
export const MAX_SINGLE_PIECE_MM = 3000;

export type ReissuedPanel = {
  panel: LondonPanel;
  scale: number;
  trimW: number;
  trimH: number;
  bleedW: number;
  bleedH: number;
  /** Effective resolution of the packaged raster at the new size. */
  ppi: number;
  /** Print consequences of the new size, in plain words. Empty when clean. */
  flags: string[];
};

/**
 * The London kit reissued at `scale`. Scaling is uniform, so artwork never
 * crops — the real risks are resolution falling away as a panel grows and a
 * piece outgrowing the press, and both are reported rather than absorbed.
 */
export function reissuePanel(panel: LondonPanel, scale: number): ReissuedPanel {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const ppi = Math.round((panel.rasterPpi / s) * 10) / 10;
  const trimW = Math.round(panel.trimW * s);
  const trimH = Math.round(panel.trimH * s);
  const flags: string[] = [];
  if (ppi < 36)
    flags.push(`${ppi} ppi at this size — below the 36 ppi floor, artwork must be re-rendered`);
  else if (ppi < panel.rasterPpi) flags.push(`${ppi} ppi at this size (was ${panel.rasterPpi})`);
  if (Math.max(trimW, trimH) > MAX_SINGLE_PIECE_MM)
    flags.push(`${Math.max(trimW, trimH)} mm long — tiled panels, seam positions to confirm`);
  return {
    panel,
    scale: s,
    trimW,
    trimH,
    bleedW: Math.round(panel.bleedW * s),
    bleedH: Math.round(panel.bleedH * s),
    ppi,
    flags,
  };
}

/** The whole kit reissued, in the panel order the schedule prints in. */
export function nextVenueSignageSchedule(
  scale: number,
  panels: readonly LondonPanel[] = LONDON_PANELS,
): ReissuedPanel[] {
  return panels.map((p) => reissuePanel(p, scale));
}

/** Schedule as CSV, so a new production partner can quote without the app. */
export function nextVenueSignageCsv(rows: readonly ReissuedPanel[]): string {
  const out = [
    ["panel", "room", "kind", "london_trim_mm", "new_trim_mm", "new_bleed_mm", "ppi", "flags"],
  ];
  for (const r of rows) {
    out.push([
      r.panel.name,
      r.panel.room,
      r.panel.ground,
      `${r.panel.trimW}x${r.panel.trimH}`,
      `${r.trimW}x${r.trimH}`,
      `${r.bleedW}x${r.bleedH}`,
      String(r.ppi),
      r.flags.join("; "),
    ]);
  }
  return out
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
