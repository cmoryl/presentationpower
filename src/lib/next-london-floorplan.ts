// TransPerfect NEXT 2026 — London (QEII Centre) top-down floor plans.
//
// Job 2281 needs a location map per asset: the install crew is handed a pillar
// wrap or a door vinyl and has to know which floor, which zone and which face
// it goes on. The signage kit already carries the floor + room for every panel
// (next-london-signage.ts), so this module supplies the missing half — a
// schematic top-down plan per floor, and a deterministic placement for every
// panel inside it.
//
// PROVENANCE — where this layout comes from, and what it still is not.
// The room roster, floor labels, room adjacency and the vertical cores are the
// venue's real published layout: the QEII Centre "Floor by Floor" mini floor
// plan pack (qeiicentre.london/downloads/QEII-Mini-Floor-Plan.pdf), the Spaces
// pages for each room, and the published lift schedule
// (QEII-Centre-Lift-Dimensions.pdf) which gives Core B — Storey's Gate, lifts
// 1–3, serving L0–L5 — and Core A on the mews side, lifts 4–9. Where the venue
// publishes an area it is honoured here: Churchill 720 m², third floor 2,142 m²
// gross, Windsor 330 m² (510 m² joined to Cambridge), Mountbatten 351 m².
// What is NOT published: the venue does not release per-room length × width or
// ceiling heights (the room pages load a dimensions table client-side and it is
// not in the downloadable pack), so individual room rectangles are proportioned
// to the published areas and the real adjacency rather than surveyed. Treat
// this as an install diagram, not a CAD plan: no single rectangle here should
// be used to scale-check a truss. Every marker is placed by rule (see placement
// below) so it lands in the right zone on the right face, and the maps page lets
// the location team drag any marker to its real spot; those corrections are what
// the crew signs off on. The first floor (Pickwick, Churchill Gallery) has no
// signage in job 2281, so it carries no plan.

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
    orientation:
      "Broad Sanctuary approach at the bottom of the plan, Westminster Abbey opposite; Storey's Gate runs down the left-hand (west) side, the mews and loading bay down the right.",
    entries: [{ label: "Main entrance", x: 30, y: 33 }],
    zones: [
      {
        id: "ext-forecourt",
        label: "Broad Sanctuary forecourt",
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
        note: "Canopy banner spans the full width above the main entrance doors.",
      },
      {
        id: "ext-building",
        label: "QEII Centre — Broad Sanctuary elevation",
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
    w: 58,
    h: 40,
    orientation:
      "Main entrance bottom centre on Broad Sanctuary; Churchill fills the top-left of the floor, Core B (Storey's Gate lifts 1–3) on the left edge, Core A (mews lifts 4–9) and the loading bay on the right.",
    entries: [
      { label: "Main entrance", x: 21, y: 39 },
      { label: "Storey's Gate goods door", x: 3, y: 39 },
      { label: "Mews loading bay", x: 53, y: 5 },
    ],
    zones: [
      {
        id: "gf-churchill",
        label: "Churchill",
        kind: "auditorium",
        x: 6,
        y: 4,
        w: 30,
        h: 24,
        rooms: ["CHURCHILL"],
        note: "720 m² published floor area. Raked 1.4°, fixed stage 730 mm at centres / 650 mm at the sides. Demo columns stand in pairs down both sides of the demo area.",
      },
      {
        id: "gf-sanctuary",
        label: "Sanctuary foyer",
        kind: "foyer",
        x: 6,
        y: 30,
        w: 30,
        h: 8,
        rooms: ["FOYER", "SANCTUARY", "PILLARS", "STEP & REPEAT", "MAIN DOORS", "MAIN ENTRANCE"],
        note: "Video wall on the long side; floor vinyl sits 1.6 m clear of it. The dedicated stair to Pickwick and the Churchill Gallery leaves from this foyer.",
      },
      {
        id: "gf-exhibition",
        label: "Ground floor exhibition / booths",
        kind: "exhibition",
        x: 38,
        y: 4,
        w: 14,
        h: 12,
        rooms: ["EXHIBITION BOOTHS"],
        note: "Vendor kiosks in two rows, front walls facing the aisle.",
      },
      {
        id: "gf-brew",
        label: "NEXTBrew coffee",
        kind: "hospitality",
        x: 38,
        y: 18,
        w: 14,
        h: 6,
        rooms: ["NEXTBREW COFFEE"],
        note: "Table tops branded across the bar; low circles nearest the foyer.",
      },
      {
        id: "gf-registration",
        label: "Registration",
        kind: "circulation",
        x: 38,
        y: 26,
        w: 14,
        h: 5,
        rooms: ["REGISTRATION"],
      },
      {
        id: "gf-cloak",
        label: "Cloakroom",
        kind: "circulation",
        x: 38,
        y: 33,
        w: 8,
        h: 5,
        rooms: ["CLOAKROOM"],
      },
      {
        id: "gf-nightingale",
        label: "Nightingale",
        kind: "room",
        x: 48,
        y: 33,
        w: 8,
        h: 5,
        rooms: ["NIGHTINGALE"],
      },
      {
        id: "gf-brunel",
        label: "Brunel",
        kind: "room",
        x: 48,
        y: 26,
        w: 8,
        h: 5,
        rooms: ["BRUNEL", "FIRST AID"],
        note: "Boardroom for up to 12; the first aid room sits alongside it.",
      },
      {
        id: "gf-core-b",
        label: "Core B — Storey's Gate lifts & stairs",
        kind: "core",
        x: 1,
        y: 16,
        w: 4,
        h: 9,
        rooms: ["LIFTS", "STAIRS"],
        note: "Passenger lifts 1–3 serve L0–L5 from this core, with the Storey's Gate goods lift alongside.",
      },
      {
        id: "gf-core-a",
        label: "Core A — mews lifts & goods lift",
        kind: "core",
        x: 53,
        y: 16,
        w: 4,
        h: 9,
        rooms: [],
        note: "Passenger lifts 4–9 and the mews goods lift.",
      },
    ],
  },
  {
    floor: "2F",
    label: "Second floor",
    w: 58,
    h: 36,
    orientation:
      "Rooms named after British actors wrap the void over the Churchill Gallery; Redgrave and Gielgud along the top, Victoria and Albert on the mews (right) side.",
    entries: [{ label: "From Core B lifts", x: 5, y: 20 }],
    zones: [
      {
        id: "f2-redgrave",
        label: "Redgrave",
        kind: "room",
        x: 6,
        y: 4,
        w: 22,
        h: 10,
        rooms: ["REDGRAVE"],
        note: "Wall 2A is the long wall facing the room entrance.",
      },
      {
        id: "f2-gielgud",
        label: "Gielgud",
        kind: "room",
        x: 30,
        y: 4,
        w: 14,
        h: 10,
        rooms: ["GIELGUD", "GEILGUD"],
        note: "120 theatre — the largest of the second floor suite.",
      },
      {
        id: "f2-victoria",
        label: "Victoria",
        kind: "room",
        x: 46,
        y: 4,
        w: 9,
        h: 8,
        rooms: ["VICTORIA"],
        note: "80 theatre.",
      },
      {
        id: "f2-albert",
        label: "Albert",
        kind: "room",
        x: 46,
        y: 14,
        w: 9,
        h: 8,
        rooms: ["ALBERT"],
        note: "80 theatre.",
      },
      {
        id: "f2-beam",
        label: "Beam",
        kind: "circulation",
        x: 30,
        y: 16,
        w: 14,
        h: 5,
        rooms: ["BEAM"],
      },
      {
        id: "f2-void",
        label: "Void over Churchill Gallery",
        kind: "circulation",
        x: 18,
        y: 16,
        w: 9,
        h: 6,
        rooms: [],
        note: "Open void with the catering lift on its inner face.",
      },
      {
        id: "f2-core-b",
        label: "Core B — lifts & stairs",
        kind: "core",
        x: 1,
        y: 16,
        w: 4,
        h: 9,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f2-foyer",
        label: "Second floor foyer",
        kind: "foyer",
        x: 6,
        y: 24,
        w: 20,
        h: 8,
        rooms: [],
      },
      {
        id: "f2-olivier",
        label: "Olivier",
        kind: "room",
        x: 30,
        y: 24,
        w: 10,
        h: 8,
        rooms: ["OLIVIER", "OLIVIER & BURTON", "BURTON & OLIVIER"],
        note: "70 theatre; combines with Burton next door.",
      },
      {
        id: "f2-burton",
        label: "Burton",
        kind: "room",
        x: 42,
        y: 24,
        w: 9,
        h: 8,
        rooms: ["BURTON"],
        note: "40 theatre.",
      },
    ],
  },
  {
    floor: "3F",
    label: "Third floor",
    w: 62,
    h: 40,
    orientation:
      "The centre's largest floor (2,142 m²). Fleming and Whittle run along the top and combine into the 1,300-seat space; Britten's double-height windows face Westminster Abbey; the balcony wraps the front elevation.",
    entries: [{ label: "From Core B lifts", x: 5, y: 20 }],
    zones: [
      {
        id: "f3-balcony",
        label: "Balcony",
        kind: "circulation",
        x: 5,
        y: 3,
        w: 52,
        h: 4,
        rooms: ["BALCONY"],
        note: "Bulkhead wrap runs the whole balcony edge in one continuous piece.",
      },
      {
        id: "f3-fleming",
        label: "Fleming",
        kind: "room",
        x: 5,
        y: 9,
        w: 26,
        h: 13,
        rooms: ["FLEMING", "FLEMMING"],
        note: "Combines with Whittle for the 1,300 theatre / 1,200 reception configuration.",
      },
      {
        id: "f3-whittle",
        label: "Whittle",
        kind: "room",
        x: 33,
        y: 9,
        w: 20,
        h: 13,
        rooms: ["WHITTLE"],
        note: "Stage wings take the beam treatment; door artwork faces the balcony.",
      },
      {
        id: "f3-west-room",
        label: "West Room",
        kind: "room",
        x: 55,
        y: 9,
        w: 6,
        h: 6,
        rooms: ["WEST ROOM"],
      },
      {
        id: "f3-east-room",
        label: "East Room",
        kind: "room",
        x: 55,
        y: 16,
        w: 6,
        h: 6,
        rooms: ["EAST ROOM"],
      },
      {
        id: "f3-core-b",
        label: "Core B — lifts & stairs",
        kind: "core",
        x: 0.5,
        y: 16,
        w: 4,
        h: 9,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f3-britten",
        label: "Britten",
        kind: "room",
        x: 5,
        y: 24,
        w: 20,
        h: 12,
        rooms: ["BRITTEN"],
        note: "Double-height windows onto Westminster Abbey.",
      },
      {
        id: "f3-paolozzi",
        label: "Paolozzi foyer",
        kind: "foyer",
        x: 27,
        y: 24,
        w: 14,
        h: 12,
        rooms: ["PAOLOZZI", "PILLARS", "STEP & REPEAT"],
        note: "Cover panel hangs over the Paolozzi wall; directional pillar sits at the pinch point.",
      },
      {
        id: "f3-guild",
        label: "Guild",
        kind: "room",
        x: 43,
        y: 24,
        w: 10,
        h: 6,
        rooms: ["GUILD"],
        note: "56 theatre.",
      },
      {
        id: "f3-exhibition",
        label: "Third floor exhibition / booths",
        kind: "exhibition",
        x: 43,
        y: 31,
        w: 14,
        h: 5,
        rooms: ["EXHIBITION BOOTHS"],
      },
      {
        id: "f3-kitchen",
        label: "Kitchen",
        kind: "core",
        x: 55,
        y: 23,
        w: 6,
        h: 6,
        rooms: ["KITCHEN"],
      },
    ],
  },
  {
    floor: "4F",
    label: "Fourth floor",
    w: 58,
    h: 38,
    orientation:
      "Twelve daylit meeting rooms off one corridor. St James faces St James's Park, Abbey and Moore face Westminster Abbey, and the Courtyard is an internal light well.",
    entries: [{ label: "From Core B lifts", x: 5, y: 20 }],
    zones: [
      {
        id: "f4-westminster",
        label: "Westminster",
        kind: "room",
        x: 5,
        y: 3,
        w: 20,
        h: 11,
        rooms: ["WESTMINSTER"],
        note: "140 theatre. Wall 4E is outside the room on the corridor side; pillar wrap stands at its corner.",
      },
      {
        id: "f4-stjames",
        label: "St James",
        kind: "room",
        x: 27,
        y: 3,
        w: 18,
        h: 11,
        rooms: ["ST JAMES"],
        note: "175 theatre, windows onto St James's Park.",
      },
      {
        id: "f4-moore",
        label: "Moore",
        kind: "room",
        x: 47,
        y: 3,
        w: 8,
        h: 11,
        rooms: ["MOORE"],
        note: "110 theatre.",
      },
      {
        id: "f4-corridor",
        label: "Corridor",
        kind: "circulation",
        x: 5,
        y: 16,
        w: 50,
        h: 4,
        rooms: [],
      },
      {
        id: "f4-core-b",
        label: "Core B — lifts & stairs",
        kind: "core",
        x: 0.5,
        y: 16,
        w: 4,
        h: 9,
        rooms: ["LIFTS", "STAIRS"],
      },
      {
        id: "f4-abbey",
        label: "Abbey",
        kind: "room",
        x: 5,
        y: 22,
        w: 12,
        h: 8,
        rooms: ["ABBEY"],
        note: "110 theatre, facing Westminster Abbey.",
      },
      {
        id: "f4-rutherford",
        label: "Rutherford",
        kind: "room",
        x: 19,
        y: 22,
        w: 10,
        h: 8,
        rooms: ["RUTHERFORD"],
        note: "78 theatre.",
      },
      {
        id: "f4-wordsworth",
        label: "Wordsworth",
        kind: "room",
        x: 31,
        y: 22,
        w: 8,
        h: 8,
        rooms: ["WORDSWORTH"],
        note: "42 theatre.",
      },
      {
        id: "f4-shelley",
        label: "Shelley",
        kind: "room",
        x: 41,
        y: 22,
        w: 7,
        h: 8,
        rooms: ["SHELLEY"],
        note: "40 theatre.",
      },
      {
        id: "f4-keats",
        label: "Keats",
        kind: "room",
        x: 50,
        y: 22,
        w: 5,
        h: 4,
        rooms: ["KEATS"],
        note: "30 theatre.",
      },
      {
        id: "f4-burns",
        label: "Burns",
        kind: "room",
        x: 50,
        y: 27,
        w: 5,
        h: 4,
        rooms: ["BURNS"],
        note: "30 theatre.",
      },
      {
        id: "f4-chaucer",
        label: "Chaucer",
        kind: "room",
        x: 5,
        y: 32,
        w: 7,
        h: 4,
        rooms: ["CHAUCER"],
        note: "28 theatre.",
      },
      {
        id: "f4-wesley",
        label: "Wesley",
        kind: "room",
        x: 14,
        y: 32,
        w: 7,
        h: 4,
        rooms: ["WESLEY"],
        note: "40 theatre.",
      },
      {
        id: "f4-garden",
        label: "Garden",
        kind: "terrace",
        x: 23,
        y: 32,
        w: 10,
        h: 4,
        rooms: ["GARDEN"],
      },
      {
        id: "f4-courtyard",
        label: "Courtyard",
        kind: "terrace",
        x: 35,
        y: 32,
        w: 10,
        h: 4,
        rooms: ["COURTYARD"],
        note: "Internal light well.",
      },
    ],
  },
  {
    floor: "5F",
    label: "Fifth floor",
    w: 54,
    h: 34,
    orientation:
      "Windsor (330 m²) on the top elevation, joining Cambridge for the combined 510 m² space; stair glazing on the right-hand return.",
    entries: [{ label: "From Core B lifts", x: 4, y: 18 }],
    zones: [
      {
        id: "f5-windsor",
        label: "Windsor",
        kind: "room",
        x: 5,
        y: 3,
        w: 22,
        h: 15,
        rooms: ["WINDSOR"],
        note: "330 m², 180 theatre. Combines with Cambridge for 510 m².",
      },
      {
        id: "f5-cambridge",
        label: "Cambridge",
        kind: "room",
        x: 29,
        y: 3,
        w: 18,
        h: 10,
        rooms: ["CAMBRIDGE"],
        note: "Pillar wraps stand inside the room on the window line.",
      },
      {
        id: "f5-turing",
        label: "Turing",
        kind: "room",
        x: 29,
        y: 15,
        w: 8,
        h: 6,
        rooms: ["TURING"],
      },
      {
        id: "f5-darwin",
        label: "Darwin",
        kind: "room",
        x: 39,
        y: 15,
        w: 8,
        h: 6,
        rooms: ["DARWIN"],
      },
      {
        id: "f5-core-b",
        label: "Core B — lifts",
        kind: "core",
        x: 0.5,
        y: 14,
        w: 4,
        h: 9,
        rooms: ["LIFTS"],
      },
      {
        id: "f5-foyer",
        label: "Fifth floor foyer",
        kind: "foyer",
        x: 5,
        y: 22,
        w: 16,
        h: 9,
        rooms: [],
      },
      {
        id: "f5-hawking",
        label: "Hawking",
        kind: "room",
        x: 23,
        y: 22,
        w: 9,
        h: 9,
        rooms: ["HAWKING"],
      },
      {
        id: "f5-berners-lee",
        label: "Berners Lee",
        kind: "room",
        x: 34,
        y: 22,
        w: 6,
        h: 4,
        rooms: ["BERNERS LEE"],
        note: "Boardroom for up to eight.",
      },
      {
        id: "f5-exhibition",
        label: "Fifth floor booths",
        kind: "exhibition",
        x: 34,
        y: 27,
        w: 6,
        h: 4,
        rooms: ["EXHIBITION BOOTHS"],
      },
      {
        id: "f5-stairs",
        label: "Stairs & glazing",
        kind: "core",
        x: 42,
        y: 22,
        w: 9,
        h: 9,
        rooms: ["STAIRS"],
        note: "Three glass panels, numbered up the flight.",
      },
    ],
  },
  {
    floor: "6F",
    label: "Sixth floor",
    w: 46,
    h: 28,
    orientation:
      "Mountbatten (351 m²) fills the top floor, windows onto the Houses of Parliament, the London Eye and Westminster Abbey; foyer and lifts below it.",
    entries: [{ label: "From Core B lifts", x: 30, y: 27 }],
    zones: [
      {
        id: "f6-mountbatten",
        label: "Mountbatten",
        kind: "room",
        x: 5,
        y: 3,
        w: 26,
        h: 13.5,
        rooms: ["MOUNTBATTEN"],
        note: "351 m², 410 theatre. Set wrap on the back wall, return panel on the stage-left flat.",
      },
      {
        id: "f6-windows",
        label: "Skyline windows",
        kind: "terrace",
        x: 33,
        y: 3,
        w: 10,
        h: 13.5,
        rooms: [],
        note: "Parliament, the London Eye and the Abbey along this elevation.",
      },
      {
        id: "f6-foyer",
        label: "Sixth floor foyer",
        kind: "foyer",
        x: 5,
        y: 19,
        w: 20,
        h: 7,
        rooms: [],
      },
      {
        id: "f6-core",
        label: "Lifts & stairs",
        kind: "core",
        x: 27,
        y: 19,
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

  // A long run of assets on one edge would stack pin on pin, so runs wrap into
  // staggered rows stepping into the room — legible on print at any density.
  const perRow = Math.max(1, Math.floor((right - left) / 1.6) + 1);
  const runRow = Math.floor(index / perRow);
  const runIdx = index % perRow;
  const runCount = Math.min(perRow, total - runRow * perRow);
  // Alternate rows shift half a step so wrapped pins never sit under each other.
  const runShift = runRow % 2 === 1 ? Math.min(0.8, (right - left) / (perRow * 2)) : 0;

  if (kind === "door" || kind === "lift") {
    // Doors face the circulation side, i.e. the bottom edge of the zone block.
    return {
      x: span(runCount, runIdx, left, right) + runShift,
      y: zone.y + zone.h + runRow * 1.5,
      face: "north",
    };
  }
  if (kind === "stair") {
    return { x: zone.x + zone.w, y: span(total, index, top, bottom), face: "west" };
  }
  if (kind === "floor") {
    return { x: (zone.x + zone.w / 2), y: bottom, face: "up" };
  }
  if (kind === "wall" || kind === "banner" || kind === "set") {
    return {
      x: span(runCount, runIdx, left, right) + runShift,
      y: zone.y + 0.9 + runRow * 1.5,
      face: "south",
    };
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
