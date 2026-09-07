// TransPerfect NEXT 2026 — NATIVE BESPOKE SCENIC TEMPLATES.
//
// The Bespoke GA pack tells us the scenic units the crew installs and the size
// of every printed face on them, but it supplies no artwork: those faces were
// only ever a line on the CSV schedule. This module makes each face with a
// published size an app-built template, exactly like the native booth walls:
//
//   • a background PLATE painted from the approved style ramp as a live
//     gradient (PDF Shading Type 2/3 in the `.ai`, `linearGradient` in the
//     `.svg`) — no raster is embedded at all;
//   • editable HEADLINE, SUBHEAD, BODY and LOGO slots, all positioned from the
//     trim box, so re-sizing a face re-lays the copy instead of stranding it;
//   • every visible mark exported as live Illustrator vector — copy is outlined
//     paths, the lockup is EPS-derived outlines, the plate is a real gradient.
//
// Faces the GA leaves unpublished (demo displays, tech desk, stage arrows,
// camera riser skirt) get NO template here: we do not invent a print size. They
// stay on the artwork schedule as "to be confirmed with Bespoke".
//
// Data and lookups only — it imports nothing from the signage graph so
// `next-london-signage.ts` can consult it while building its own panels.

// Type-only import: this module must stay free of runtime imports from the
// Bespoke data graph, so `next-london-signage.ts` can consult it without a
// circular module load. The transcribed sizes below are cross-checked against
// BESPOKE_UNITS in next-london-bespoke-native.test.ts.
import type { LondonFloorId } from "@/lib/next-london-signage";

/** An app-built template for one printed face of a scenic unit. */
export type NativeBespokeTemplate = {
  /** Scenic unit id from BESPOKE_UNITS. */
  unitId: string;
  /** Scenic unit name, for schedule rows and the editor. */
  unitName: string;
  /** Artwork face label, exactly as the GA lists it. */
  panelLabel: string;
  /** Floor and room the unit is scheduled in. */
  floor: LondonFloorId;
  room: string;
  /** Published face size in mm, transcribed from the GA. */
  wMm: number;
  hMm: number;
  /** How many of this face print. */
  qty: number;
  /** Approved style ramp painted as the background plate. */
  plateStyle: string;
  /** Default headline. Empty string = no headline. */
  headline: string;
  /** Default subhead under the headline. */
  sub: string;
  /** Default body paragraph, wrapped to the live area. */
  body: string;
  /** Short human note shown in the scenic build editor. */
  note: string;
};

export const NATIVE_BESPOKE_TEMPLATES: NativeBespokeTemplate[] = [
  // ── Merch market, Sanctuary foyer (GF) ──────────────────────────────────
  {
    unitId: "merch-market",
    unitName: "Merch market",
    panelLabel: "Merch bar front",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 3780,
    hMm: 1153,
    qty: 1,
    plateStyle: "03-wash-diagonal",
    headline: "MERCH MART",
    sub: "TAKE SOMETHING HOME",
    body: "Limited NEXT 2026 pieces, while they last. Ask the team about sizes and shipping.",
    note: "Long horizontal run — keep the headline on one line.",
  },
  {
    unitId: "merch-market",
    unitName: "Merch market",
    panelLabel: "Merch cylinder wrap",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 1200,
    hMm: 1171,
    qty: 1,
    plateStyle: "07-prism-sweep",
    headline: "NEXT 2026",
    sub: "MERCH MART",
    body: "",
    note: "Wrap: the seam falls at the right edge, so keep copy off the last 40 mm.",
  },
  {
    unitId: "merch-market",
    unitName: "Merch market",
    panelLabel: "Shelving unit header",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 1200,
    hMm: 323,
    qty: 2,
    plateStyle: "10-veil",
    headline: "MERCH MART",
    sub: "",
    body: "",
    note: "Shallow header strip — headline only, no body.",
  },
  {
    unitId: "merch-market",
    unitName: "Merch market",
    panelLabel: "12' circular floor graphic",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 3658,
    hMm: 3658,
    qty: 1,
    plateStyle: "12-repeat-wash",
    headline: "TRANSPERFECT NEXT",
    sub: "LONDON 2026",
    body: "",
    note: "Supplied as a circle on a square page — keep copy inside the middle third.",
  },

  // ── Help desk, Sanctuary foyer (GF) ─────────────────────────────────────
  {
    unitId: "help-desk",
    unitName: "Help desk",
    panelLabel: "Counter front",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 2356,
    hMm: 888,
    qty: 1,
    plateStyle: "04-horizon",
    headline: "HELP DESK",
    sub: "ANYTHING YOU NEED",
    body: "Rooms, sessions, accessibility and lost property — the team here can sort it.",
    note: "Counter front reads at standing distance; body copy stays short.",
  },
  {
    unitId: "help-desk",
    unitName: "Help desk",
    panelLabel: "Totem panel",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 1532,
    hMm: 2038,
    qty: 1,
    plateStyle: "08-chevron-sweep",
    headline: "HELP DESK",
    sub: "ASK US ANYTHING",
    body: "Session times, room changes, accessibility support and lost property.",
    note: "The GA's pink hatch is the artwork panel — this template fills it exactly.",
  },
  {
    unitId: "help-desk",
    unitName: "Help desk",
    panelLabel: "Counter return",
    floor: "GF",
    room: "Sanctuary foyer",
    wMm: 594,
    hMm: 888,
    qty: 2,
    plateStyle: "10-veil",
    headline: "",
    sub: "",
    body: "",
    note: "Narrow return — lockup only, both returns print the same file.",
  },

  // ── Plinths, ground floor exhibition ────────────────────────────────────
  {
    unitId: "plinth-500",
    unitName: "Plinth 500",
    panelLabel: "Plinth face",
    floor: "GF",
    room: "Ground floor exhibition",
    wMm: 500,
    hMm: 1000,
    qty: 4,
    plateStyle: "09-dawn",
    headline: "BEYOND INTELLIGENCE",
    sub: "NEXT 2026",
    body: "",
    note: "Four faces print the same file; copy runs down the tall face.",
  },
  {
    unitId: "plinth-600",
    unitName: "Plinth 600",
    panelLabel: "Plinth face",
    floor: "GF",
    room: "Ground floor exhibition",
    wMm: 600,
    hMm: 1000,
    qty: 4,
    plateStyle: "09-dawn",
    headline: "BEYOND INTELLIGENCE",
    sub: "NEXT 2026",
    body: "",
    note: "Four faces print the same file; copy runs down the tall face.",
  },

  // ── Screen surrounds ────────────────────────────────────────────────────
  {
    unitId: "gielgud-screen-surround",
    unitName: "Gielgud 8' × 8' screen surround",
    panelLabel: "Surround face",
    floor: "2F",
    room: "Gielgud",
    wMm: 2438,
    hMm: 2438,
    qty: 1,
    plateStyle: "05-bloom-corner",
    headline: "GLOBALLINK",
    sub: "SEE IT WORKING",
    body: "Live demonstrations run through the day — pull up a stool and ask the hard questions.",
    note: "Aperture is cut for the 86\" screen: keep copy clear of the centre.",
  },
  {
    unitId: "olivier-screen-surround",
    unitName: "Olivier 24' × 8' screen surround",
    panelLabel: "Surround face",
    floor: "2F",
    room: "Olivier",
    wMm: 7315,
    hMm: 2438,
    qty: 1,
    plateStyle: "01-beam-violet-aqua",
    headline: "BEYOND INTELLIGENCE",
    sub: "LANGUAGE, TECHNOLOGY, SCALE",
    body: "Two screens, one story: how governed content reaches every market on the same day.",
    note: "Two 86\" apertures — supplied as tiled panels, copy sits outside both.",
  },

  // ── Comfort monitor hide, Fleming (3F) ──────────────────────────────────
  {
    unitId: "fleming-monitor-hide",
    unitName: "Fleming 65\" comfort monitor hide",
    panelLabel: "Hide front",
    floor: "3F",
    room: "Fleming (Day 1)",
    wMm: 1519,
    hMm: 900,
    qty: 1,
    plateStyle: "10-veil",
    headline: "TRANSPERFECT NEXT",
    sub: "",
    body: "",
    note: "Front-of-house hide — quiet ground, lockup and one line only.",
  },
];

const KEY = (unitId: string, panelLabel: string) => `${unitId}::${panelLabel}`;

const BY_KEY = new Map(
  NATIVE_BESPOKE_TEMPLATES.map((t) => [KEY(t.unitId, t.panelLabel), t]),
);

/** The template for one face of a unit, or null when the GA size is unpublished. */
export function nativeBespokeTemplate(
  unitId: string,
  panelLabel: string,
): NativeBespokeTemplate | null {
  return BY_KEY.get(KEY(unitId, panelLabel)) ?? null;
}

/**
 * Every scenic face we build as a native template, in GA order. A face is only
 * listed when the GA publishes both dimensions, so nothing here is a guessed
 * print size.
 */
export function nativeBespokeFaces(): NativeBespokeTemplate[] {
  return NATIVE_BESPOKE_TEMPLATES;
}

/** True when this face of this unit is an app-built, editable template. */
export function isNativeBespokeFace(unitId: string, panelLabel: string): boolean {
  return BY_KEY.has(KEY(unitId, panelLabel));
}
