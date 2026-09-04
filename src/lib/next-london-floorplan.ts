// TransPerfect NEXT 2026 — London (QEII Centre) top-down floor plans.
//
// Job 2281 needs a location map per asset: the install crew is handed a pillar
// wrap or a door vinyl and has to know which floor, which zone and which face
// it goes on. The signage kit already carries the floor + room for every panel
// (next-london-signage.ts), so this module supplies the missing half — a
// schematic top-down plan per floor, and a deterministic placement for every
// panel inside it.
//
// IMPORTANT — what this geometry is and is not. These plans are SCHEMATIC
// install diagrams drawn from the venue's own room list and the floor/room
// column of the print schedule. They are not a surveyed CAD plan and no
// dimension here should be read as a measurement: zone sizes are drawn to be
// legible, not to scale-check a truss. Every marker is placed by rule (see
// placement below) so it lands in the right zone on the right face, and the
// maps page lets the location team drag any marker to its real spot; those
// corrections are what the crew signs off on.
//
// Units are metres on a plan grid with the origin top-left, y increasing
// "down" the page (screen coordinates), which keeps the SVG renderer trivial.

import {
  LONDON_FLOORS,
  LONDON_PANELS,
  type LondonFloorId,
  type LondonPanel,
} from "@/lib/next-london-signage";

/** What a zone is used for — drives its fill and whether markers sit inside it. */
export type LondonZoneKind =
  | "auditorium"
  | "room"
  | "foyer"
  | "circulation"
  | "core"
  | "hospitality"
  | "exhibition"
  | "terrace"
  | "exterior";

export type LondonZone = {
  id: string;
  label: string;
  kind: LondonZoneKind;
  /** Plan rectangle in metres, origin top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Room names from the print schedule that live in this zone. */
  rooms: string[];
  /** Optional short note printed on the asset install card. */
  note?: string;
};

export type LondonFloorPlan = {
  floor: LondonFloorId;
  label: string;
  /** Plan extent in metres. */
  w: number;
  h: number;
  /** One-line orientation aid printed on every map. */
  orientation: string;
  zones: LondonZone[];
  /** Doors / arrival points, drawn as chevrons on the plan edge. */
  entries: { label: string; x: number; y: number }[];
};

/** Marker face — which way the printed face looks, in plan terms. */
export type LondonFace = "north" | "east" | "south" | "west" | "up" | "free";

export type LondonAssetKind =
  | "pillar"
  | "door"
  | "wall"
  | "floor"
  | "lift"
  | "stair"
  | "booth"
  | "table"
  | "banner"
  | "set"
  | "step-repeat";

export type LondonMarker = {
  panelId: string;
  /** Panel display name. */
  name: string;
  floor: LondonFloorId;
  room: string;
  kind: LondonAssetKind;
  zoneId: string;
  /** Plan position in metres. */
  x: number;
  y: number;
  face: LondonFace;
  /** True when the position came from a saved correction, not the rule. */
  corrected?: boolean;
};

// ── Floor plans ────────────────────────────────────────────────────────────
// Zone blocks follow the QEII Centre's published floor/room list: the lift and
// stair core runs up the middle of the building, the auditoria sit on the long
// elevation and the foyers wrap the core.

const PLANS: LondonFloorPlan[] = [
  {
    floor: "EXT",
    label: "Exterior",
    w: 60,
    h: 34,
    orientation: "Broad Sanctuary approach at the bottom of the plan; Westminster Abbey behind it.",
    entries: [{ label: "Arrival", x: 30, y: 33 }],
    zones: [
      {
        id: "ext-forecourt",
        label: "Forecourt",
        kind: "exterior",
        x: 6,
        y: 14,
        w: 48,
        h: 14,
        rooms: ["EXTERIOR"],
        note: "Flag line runs across the forecourt, four either side of the approach.",
      },
      {
        id: "ext-canopy",
        label: "Entrance canopy",
        kind: "exterior",
        x: 18,
        y: 6,
        w: 24,
        h: 7,
        rooms: ["CANOPY"],
        note: "Canopy banner spans the full width above the doors.",
      },
      {
        id: "ext-building",
        label: "QEII Centre",
        kind: "terrace",
        x: 4,
        y: 1,
        w: 52,
        h: 4.5,
        rooms: [],
      },
    ],
  },
  {
    floor: "GF",
    label: "Ground floor",
    w: 54,
    h: 34,
    orientation: "Main doors bottom centre; Churchill auditorium along the top elevation.",
    entries: [
      { label: "Main doors", x: 27, y: 33 },
      { label: "Goods door", x: 3, y: 33 },
    ],
    zones: [
      {
        id: "gf-churchill",
        label: "Churchill",
        kind: "auditorium",
        x: 4,
        y: 2,
        w: 30,
        h: 12,
        rooms: ["CHURCHILL"],
        note: "Demo columns stand in pairs down both sides of the demo area.",
      },
      {
        id: "gf-exhibition",
        label: "Churchill exhibition / booths",
        kind: "exhibition",
        x: 35,
        y: 2,
        w: 15,
        h: 12,
        rooms: ["EXHIBITION BOOTHS"],
        note: "Vendor kiosks in two rows, front walls facing the aisle.",
      },
      {
        id: "gf-foyer",
        label: "Main foyer",
        kind: "foyer",
        x: 4,
        y: 21,
        w: 30,
        h: 10,
        rooms: ["FOYER", "PILLARS", "STEP & REPEAT", "MAIN DOORS"],
        note: "Video wall on the long side; floor vinyl sits 1.6 m clear of it.",
      },
      {
        id: "gf-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 22,
        y: 15,
        w: 9,
        h: 5,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "gf-registration",
        label: "Registration",
        kind: "circulation",
        x: 35,
        y: 21,
        w: 15,
        h: 5,
        rooms: ["REGISTRATION"],
      },
      {
        id: "gf-cloak",
        label: "Cloakroom",
        kind: "circulation",
        x: 35,
        y: 27,
        w: 15,
        h: 4,
        rooms: ["CLOAKROOM"],
      },
      {
        id: "gf-brew",
        label: "NEXTBrew coffee",
        kind: "hospitality",
        x: 4,
        y: 15,
        w: 16,
        h: 5,
        rooms: ["NEXTBREW COFFEE"],
        note: "Table tops branded across the bar; low circles nearest the foyer.",
      },
    ],
  },
  {
    floor: "2F",
    label: "Second floor",
    w: 50,
    h: 30,
    orientation: "Lift core centre; Redgrave suite along the top, meeting rooms bottom right.",
    entries: [{ label: "From lifts", x: 25, y: 17 }],
    zones: [
      {
        id: "f2-redgrave",
        label: "Redgrave",
        kind: "room",
        x: 4,
        y: 2,
        w: 24,
        h: 10,
        rooms: ["REDGRAVE"],
        note: "Wall 2A is the long wall facing the room entrance.",
      },
      {
        id: "f2-beam",
        label: "Beam",
        kind: "circulation",
        x: 30,
        y: 2,
        w: 16,
        h: 6,
        rooms: ["BEAM"],
      },
      {
        id: "f2-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 20,
        y: 13,
        w: 9,
        h: 5,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f2-foyer",
        label: "Second floor foyer",
        kind: "foyer",
        x: 4,
        y: 19,
        w: 20,
        h: 8,
        rooms: [],
      },
      {
        id: "f2-olivier",
        label: "Olivier & Burton",
        kind: "room",
        x: 26,
        y: 19,
        w: 10,
        h: 8,
        rooms: ["OLIVIER & BURTON", "BURTON & OLIVIER"],
      },
      {
        id: "f2-gielgud",
        label: "Gielgud",
        kind: "room",
        x: 38,
        y: 19,
        w: 8,
        h: 8,
        rooms: ["GIELGUD", "GEILGUD"],
      },
      {
        id: "f2-albert",
        label: "Albert",
        kind: "room",
        x: 30,
        y: 10,
        w: 8,
        h: 7,
        rooms: ["ALBERT"],
      },
      {
        id: "f2-victoria",
        label: "Victoria",
        kind: "room",
        x: 39,
        y: 10,
        w: 7,
        h: 7,
        rooms: ["VICTORIA"],
      },
    ],
  },
  {
    floor: "3F",
    label: "Third floor",
    w: 54,
    h: 32,
    orientation: "Fleming and Whittle either side of the core; balcony wraps the top elevation.",
    entries: [{ label: "From lifts", x: 27, y: 18 }],
    zones: [
      {
        id: "f3-balcony",
        label: "Balcony",
        kind: "circulation",
        x: 4,
        y: 2,
        w: 46,
        h: 4,
        rooms: ["BALCONY"],
        note: "Bulkhead wrap runs the whole balcony edge in one continuous piece.",
      },
      {
        id: "f3-fleming",
        label: "Fleming",
        kind: "room",
        x: 4,
        y: 8,
        w: 20,
        h: 10,
        rooms: ["FLEMING", "FLEMMING"],
      },
      {
        id: "f3-whittle",
        label: "Whittle",
        kind: "room",
        x: 30,
        y: 8,
        w: 20,
        h: 10,
        rooms: ["WHITTLE"],
        note: "Stage wings take the beam treatment; door artwork faces the balcony.",
      },
      {
        id: "f3-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 24.5,
        y: 12,
        w: 5,
        h: 5,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f3-britten",
        label: "Britten",
        kind: "room",
        x: 4,
        y: 21,
        w: 16,
        h: 8,
        rooms: ["BRITTEN"],
      },
      {
        id: "f3-paolozzi",
        label: "Paolozzi",
        kind: "foyer",
        x: 22,
        y: 21,
        w: 14,
        h: 8,
        rooms: ["PAOLOZZI", "PILLARS", "STEP & REPEAT"],
        note: "Cover panel hangs over the Paolozzi wall; directional pillar sits at the pinch point.",
      },
      {
        id: "f3-exhibition",
        label: "Exhibition booths",
        kind: "exhibition",
        x: 38,
        y: 21,
        w: 12,
        h: 8,
        rooms: ["EXHIBITION BOOTHS"],
      },
    ],
  },
  {
    floor: "4F",
    label: "Fourth floor",
    w: 50,
    h: 30,
    orientation: "Westminster on the long elevation; corridor runs left to right past the core.",
    entries: [{ label: "From lifts", x: 25, y: 17 }],
    zones: [
      {
        id: "f4-westminster",
        label: "Westminster",
        kind: "room",
        x: 4,
        y: 2,
        w: 26,
        h: 11,
        rooms: ["WESTMINSTER"],
        note: "Wall 4E is outside the room on the corridor side; pillar wrap stands at its corner.",
      },
      {
        id: "f4-stjames",
        label: "St James",
        kind: "room",
        x: 32,
        y: 2,
        w: 14,
        h: 11,
        rooms: ["ST JAMES"],
      },
      {
        id: "f4-corridor",
        label: "Corridor",
        kind: "circulation",
        x: 4,
        y: 14,
        w: 42,
        h: 4,
        rooms: [],
      },
      {
        id: "f4-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 21,
        y: 19,
        w: 8,
        h: 5,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f4-abbey",
        label: "Abbey",
        kind: "room",
        x: 4,
        y: 19,
        w: 14,
        h: 8,
        rooms: ["ABBEY"],
      },
      {
        id: "f4-wordsworth",
        label: "Wordsworth",
        kind: "room",
        x: 31,
        y: 19,
        w: 15,
        h: 8,
        rooms: ["WORDSWORTH"],
      },
    ],
  },
  {
    floor: "5F",
    label: "Fifth floor",
    w: 50,
    h: 30,
    orientation: "Cambridge on the top elevation; stair glazing on the right-hand return.",
    entries: [{ label: "From lifts", x: 25, y: 17 }],
    zones: [
      {
        id: "f5-cambridge",
        label: "Cambridge",
        kind: "room",
        x: 4,
        y: 2,
        w: 28,
        h: 11,
        rooms: ["CAMBRIDGE"],
        note: "Pillar wraps stand inside the room on the window line.",
      },
      {
        id: "f5-windsor",
        label: "Windsor",
        kind: "room",
        x: 34,
        y: 2,
        w: 12,
        h: 11,
        rooms: ["WINDSOR"],
      },
      {
        id: "f5-foyer",
        label: "Fifth floor foyer",
        kind: "foyer",
        x: 4,
        y: 15,
        w: 20,
        h: 9,
        rooms: [],
      },
      {
        id: "f5-core",
        label: "Lifts",
        kind: "core",
        x: 26,
        y: 15,
        w: 7,
        h: 5,
        rooms: ["LIFTS"],
      },
      {
        id: "f5-stairs",
        label: "Stairs & glazing",
        kind: "core",
        x: 35,
        y: 15,
        w: 11,
        h: 9,
        rooms: ["STAIRS"],
        note: "Three glass panels, numbered up the flight.",
      },
      {
        id: "f5-exhibition",
        label: "Exhibition booths",
        kind: "exhibition",
        x: 26,
        y: 22,
        w: 7,
        h: 5,
        rooms: ["EXHIBITION BOOTHS"],
      },
    ],
  },
  {
    floor: "6F",
    label: "Sixth floor",
    w: 44,
    h: 26,
    orientation: "Mountbatten across the top; foyer and lifts below it.",
    entries: [{ label: "From lifts", x: 22, y: 15 }],
    zones: [
      {
        id: "f6-mountbatten",
        label: "Mountbatten",
        kind: "room",
        x: 4,
        y: 2,
        w: 36,
        h: 11,
        rooms: ["MOUNTBATTEN"],
        note: "Set wrap on the back wall, return panel on the stage-left flat.",
      },
      {
        id: "f6-foyer",
        label: "Sixth floor foyer",
        kind: "foyer",
        x: 4,
        y: 16,
        w: 22,
        h: 7,
        rooms: [],
      },
      {
        id: "f6-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 28,
        y: 16,
        w: 12,
        h: 7,
        rooms: ["LIFTS", "STAIRS"],
      },
    ],
  },
];

export const LONDON_FLOOR_PLANS: LondonFloorPlan[] = PLANS;

export function londonFloorPlan(floor: LondonFloorId): LondonFloorPlan | null {
  return PLANS.find((p) => p.floor === floor) ?? null;
}

/** Floors that have both a plan and at least one asset. */
export function londonMappedFloors(
  panels: LondonPanel[] = LONDON_PANELS,
): { id: LondonFloorId; label: string; count: number }[] {
  return LONDON_FLOORS.filter((f) => londonFloorPlan(f.id)).map((f) => ({
    id: f.id,
    label: f.label,
    count: panels.filter((p) => p.floor === f.id).length,
  })).filter((f) => f.count > 0);
}

// ── Asset classification ───────────────────────────────────────────────────

const KIND_RULES: { kind: LondonAssetKind; test: RegExp }[] = [
  { kind: "pillar", test: /pillar|column/i },
  { kind: "step-repeat", test: /step\s*&?\s*repeat/i },
  { kind: "lift", test: /lift/i },
  { kind: "stair", test: /stair/i },
  { kind: "door", test: /door|vinyl door|entrance door/i },
  { kind: "table", test: /table|circle top/i },
  { kind: "floor", test: /floor vinyl|floor graphic/i },
  { kind: "banner", test: /flag|banner|fascia|bulkhead|canopy/i },
  { kind: "set", test: /set wrap|set return|cover|wrap/i },
  { kind: "wall", test: /wall|panel|glass|desk|cloakroom|artwork/i },
];

/** The physical kind of an asset, read from its schedule name and room. */
export function londonAssetKind(panel: LondonPanel): LondonAssetKind {
  if (panel.id.startsWith("ldn-b") || /booth/i.test(panel.room)) return "booth";
  const text = `${panel.name} ${panel.room}`;
  for (const rule of KIND_RULES) if (rule.test.test(text)) return rule.kind;
  return "wall";
}

export const LONDON_ASSET_KIND_LABEL: Record<LondonAssetKind, string> = {
  pillar: "Pillars & columns",
  door: "Door vinyls",
  wall: "Wall & scenic panels",
  floor: "Floor graphics",
  lift: "Lift doors & cars",
  stair: "Stair glazing",
  booth: "Vendor booths",
  table: "Table tops",
  banner: "Flags, banners & bulkheads",
  set: "Set wraps & covers",
  "step-repeat": "Step & repeat walls",
};

// ── Placement ──────────────────────────────────────────────────────────────

function normRoom(room: string): string {
  return room.toUpperCase().replace(/[^A-Z& ]/g, "").replace(/\s+/g, " ").trim();
}

/** The zone a panel belongs to: room match first, then the floor's foyer. */
export function londonZoneFor(plan: LondonFloorPlan, panel: LondonPanel): LondonZone {
  const room = normRoom(panel.room);
  const direct = plan.zones.find((z) => z.rooms.some((r) => normRoom(r) === room));
  if (direct) return direct;
  // Vendor booth rooms read "<VENDOR> BOOTH" — send them to the exhibition zone.
  if (/BOOTH/.test(room)) {
    const ex = plan.zones.find((z) => z.kind === "exhibition");
    if (ex) return ex;
  }
  const loose = plan.zones.find((z) => z.rooms.some((r) => room.includes(normRoom(r))));
  if (loose) return loose;
  return (
    plan.zones.find((z) => z.kind === "foyer") ??
    plan.zones.find((z) => z.kind === "circulation") ??
    plan.zones[0]!
  );
}

/**
 * Rule placement inside a zone.
 *
 * Wall-hung and door assets sit on a zone edge so the marker reads as "on this
 * face"; free-standing assets (pillars, booths, tables, step & repeats) sit on
 * an interior grid. Both are deterministic in schedule order, so the same panel
 * always lands in the same spot and a corrected marker stays comparable.
 */
function rulePlacement(
  zone: LondonZone,
  kind: LondonAssetKind,
  index: number,
  total: number,
): { x: number; y: number; face: LondonFace } {
  const inset = 0.9;
  const span = (n: number, i: number, from: number, to: number) =>
    n <= 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1);

  const left = zone.x + inset;
  const right = zone.x + zone.w - inset;
  const top = zone.y + inset;
  const bottom = zone.y + zone.h - inset;

  if (kind === "door" || kind === "lift") {
    // Doors face the circulation side, i.e. the bottom edge of the zone block.
    return { x: span(total, index, left, right), y: zone.y + zone.h, face: "north" };
  }
  if (kind === "stair") {
    return { x: zone.x + zone.w, y: span(total, index, top, bottom), face: "west" };
  }
  if (kind === "floor") {
    return { x: (zone.x + zone.w / 2), y: bottom, face: "up" };
  }
  if (kind === "wall" || kind === "banner" || kind === "set") {
    return { x: span(total, index, left, right), y: zone.y, face: "south" };
  }

  // Free-standing: interior grid, filled in rows across the zone.
  const cols = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(total * (zone.w / Math.max(1, zone.h))))));
  const rows = Math.max(1, Math.ceil(total / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: span(cols, col, zone.x + zone.w * 0.18, zone.x + zone.w * 0.82),
    y: span(rows, row, zone.y + zone.h * 0.28, zone.y + zone.h * 0.78),
    face: "free",
  };
}

/** Saved corrections: panel id → plan position. */
export type LondonMarkerOverrides = Record<string, { x: number; y: number; face?: LondonFace }>;

/**
 * Every marker on a floor, in schedule order. Placement is by rule and then by
 * saved correction, so an un-corrected kit still produces a usable map.
 */
export function londonFloorMarkers(
  floor: LondonFloorId,
  panels: LondonPanel[] = LONDON_PANELS,
  overrides: LondonMarkerOverrides = {},
): LondonMarker[] {
  const plan = londonFloorPlan(floor);
  if (!plan) return [];
  const onFloor = panels.filter((p) => p.floor === floor);

  // Group by zone + kind so each rule run knows its own total.
  const buckets = new Map<string, LondonPanel[]>();
  for (const panel of onFloor) {
    const zone = londonZoneFor(plan, panel);
    const key = `${zone.id}|${londonAssetKind(panel)}`;
    const list = buckets.get(key);
    if (list) list.push(panel);
    else buckets.set(key, [panel]);
  }

  const markers: LondonMarker[] = [];
  for (const [key, list] of buckets) {
    const zone = plan.zones.find((z) => z.id === key.split("|")[0])!;
    const kind = key.split("|")[1] as LondonAssetKind;
    list.forEach((panel, i) => {
      const placed = rulePlacement(zone, kind, i, list.length);
      const fix = overrides[panel.id];
      markers.push({
        panelId: panel.id,
        name: panel.name,
        floor,
        room: panel.room,
        kind,
        zoneId: zone.id,
        x: clamp(fix?.x ?? placed.x, 0, plan.w),
        y: clamp(fix?.y ?? placed.y, 0, plan.h),
        face: fix?.face ?? placed.face,
        corrected: Boolean(fix),
      });
    });
  }
  // Stable order: schedule order, so map and list agree.
  const order = new Map(onFloor.map((p, i) => [p.id, i]));
  return markers.sort((a, b) => (order.get(a.panelId) ?? 0) - (order.get(b.panelId) ?? 0));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** The marker for one panel, or null when its floor has no plan. */
export function londonMarkerFor(
  panel: LondonPanel,
  panels: LondonPanel[] = LONDON_PANELS,
  overrides: LondonMarkerOverrides = {},
): LondonMarker | null {
  return londonFloorMarkers(panel.floor, panels, overrides).find((m) => m.panelId === panel.id) ?? null;
}

export const LONDON_FACE_LABEL: Record<LondonFace, string> = {
  north: "Faces into the circulation (plan north)",
  east: "Faces east on the plan",
  south: "Faces into the room (plan south)",
  west: "Faces west on the plan",
  up: "Floor-mounted, reads upward",
  free: "Free-standing — readable from all sides",
};

/** Install-sheet CSV: one row per asset with its floor, zone and plan position. */
export function londonMapCsv(
  panels: LondonPanel[] = LONDON_PANELS,
  overrides: LondonMarkerOverrides = {},
): string {
  const rows: string[][] = [
    ["Floor", "Zone", "Room", "Asset", "Kind", "Plan X m", "Plan Y m", "Face", "Position source"],
  ];
  for (const floor of LONDON_FLOOR_PLANS) {
    for (const m of londonFloorMarkers(floor.floor, panels, overrides)) {
      const zone = floor.zones.find((z) => z.id === m.zoneId);
      rows.push([
        floor.label,
        zone?.label ?? m.zoneId,
        m.room,
        m.name,
        LONDON_ASSET_KIND_LABEL[m.kind],
        m.x.toFixed(2),
        m.y.toFixed(2),
        LONDON_FACE_LABEL[m.face],
        m.corrected ? "Confirmed on site" : "Schematic (rule)",
      ]);
    }
  }
  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
