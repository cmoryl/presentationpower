// TransPerfect NEXT 2026 — London DOOR LEAF GEOMETRY.
//
// Most branded doors at the QEII Centre are double doors, and the supplied
// venue templates use two different conventions for them:
//
//  * PER LEAF — the artboard is one door leaf, and a pair is two of them side
//    by side (Albert / Victoria / Gielgud are 840 × 2000 mm artboards with two
//    pages, one per leaf; Abbey and St James are unequal pairs, a wide leading
//    leaf plus a narrow secondary leaf on its own page).
//  * SPANNING — the artboard is the whole pair, with the shut line falling
//    inside the artwork (Churchill's double doors are one 1780 × 2200 mm sheet;
//    a lift car front is one 1100 × 2085 mm sheet split by the car doors).
//
// Reading a pair as a single leaf is what made the previews wrong: a 0.42-ratio
// leaf sheet was being cover-cropped across a photographed pair, so the print
// looked stretched and the shut line landed nowhere near the artwork. Every
// row below is measured off the supplied Illustrator/PDF artboards in the venue
// pack, so previews, in-scene renders and the leaf split all agree with print.

export type DoorArtScope = "leaf" | "spanning";

export type LondonDoorSpec = {
  /** Item name substring this applies to. */
  match: string;
  /** Number of door leaves the item is applied across. */
  leaves: number;
  /** Leaf widths in mm, left to right across the opening. */
  leafW: number[];
  /** Leaf height in mm. */
  leafH: number;
  /** Whether the supplied artboard is one leaf or the whole pair. */
  scope: DoorArtScope;
  /** Supplied file the leaf geometry was measured from. */
  source: string;
  /** Measured off the supplied artboards, or inferred from the opening. */
  confidence: "measured" | "assumed";
  /** Separate artwork per leaf, when the supplied file holds a page each. */
  perLeafArt?: boolean;
  note?: string;
};

export const LONDON_DOOR_SPECS: LondonDoorSpec[] = [
  {
    match: "DOOR BRANDING ALBERT",
    leaves: 2,
    leafW: [840, 840],
    leafH: 2000,
    scope: "leaf",
    source: "2F/Albert/Albert.ai — 2 pages, 840 × 2000 mm each",
    confidence: "measured",
    perLeafArt: true,
    note: "Albert has two entrances; each entrance is a pair, lockup leaf plus room-name leaf.",
  },
  {
    match: "DOOR BRANDING VICTORIA",
    leaves: 2,
    leafW: [840, 840],
    leafH: 2000,
    scope: "leaf",
    source: "2F/Victoria/VICTORIA.ai — 2 pages, 840 × 2000 mm each",
    confidence: "measured",
    perLeafArt: true,
  },
  {
    match: "DOOR BRANDING GIELGUD",
    leaves: 2,
    leafW: [840, 840],
    leafH: 2000,
    scope: "leaf",
    source: "2F/Gielgud/GIELGUD.ai — 2 pages, 840 × 2000 mm each",
    confidence: "measured",
    perLeafArt: true,
  },
  {
    match: "DOOR BRANDING OLIVIER & BURTON",
    leaves: 2,
    leafW: [930, 930],
    leafH: 2001,
    scope: "leaf",
    source: "2F/Burton/Burton_door.ai — 2 pages, 930 × 2001 mm each",
    confidence: "measured",
    perLeafArt: true,
    note: "Olivier template still requested; sized from the supplied Burton pair.",
  },
  {
    match: "DOOR BRANDING ABBEY",
    leaves: 2,
    leafW: [920, 380],
    leafH: 2020,
    scope: "leaf",
    source: "4F/Abbey_doors.ai — 920 × 2020 mm leading leaf + 380 × 2020 mm secondary leaf",
    confidence: "measured",
    perLeafArt: true,
    note: "Unequal pair: wide leading leaf with a narrow secondary leaf.",
  },
  {
    match: "DOOR BRANDING ST JAMES",
    leaves: 2,
    leafW: [900, 420],
    leafH: 2020,
    scope: "leaf",
    source: "4F/St_James_door.ai — 900 × 2020 mm leading leaf + 420 × 2020 mm secondary leaf",
    confidence: "measured",
    perLeafArt: true,
    note: "Unequal pair, as supplied.",
  },
  {
    match: "DOOR BRANDING WESTMINSTER",
    leaves: 2,
    leafW: [900, 900],
    leafH: 2020,
    scope: "leaf",
    source: "4F/Westminster__Corridoor_1.ai — 2 pages, 900 × 2020 mm each",
    confidence: "measured",
    perLeafArt: true,
  },
  {
    match: "DOOR BRANDING WORDSWORTH",
    leaves: 1,
    leafW: [920],
    leafH: 2020,
    scope: "leaf",
    source: "4F/Wordsworth_door.ai — single 920 × 2020 mm artboard",
    confidence: "measured",
    note: "Single leaf: the supplied file holds one page only.",
  },
  {
    match: "CHURCHILL DOUBLE DOOR",
    leaves: 2,
    leafW: [890, 890],
    leafH: 2200,
    scope: "spanning",
    source: "GF/Curchill Double Doors/Churchill_Double_doors.ai — 1780 × 2200 mm pair",
    confidence: "measured",
    note: "One sheet across the pair; the shut line falls in the middle of the artwork.",
  },
  {
    match: "MAIN ENTRANCE DOOR VINYL",
    leaves: 2,
    leafW: [900, 900],
    leafH: 2100,
    scope: "leaf",
    source: "Signage list — WELCOME, applied to both leaves",
    confidence: "assumed",
    note: "Glass entrance doors: the same leaf sheet on each leaf.",
  },
  {
    match: "MOUNTBATTEN DOOR VINYL",
    leaves: 2,
    leafW: [900, 900],
    leafH: 2020,
    scope: "leaf",
    source: "Signage list — LifeSciNEXT room doors, 2 off",
    confidence: "assumed",
  },
  {
    match: "LIFT DOOR",
    leaves: 2,
    leafW: [550, 550],
    leafH: 2085,
    scope: "spanning",
    source: "GF/Lift Door Template/Lifts_Template.ai — 1100 × 2085 mm car front",
    confidence: "measured",
    note: "Car front printed as one sheet; the car doors split it down the centre.",
  },
  {
    match: "FLEMING DOOR ARTWORK",
    leaves: 2,
    leafW: [750, 750],
    leafH: 1500,
    scope: "spanning",
    source: "3F/Fleming Whittle Doors/Fleming and Whittle doors.ai — 1500 × 1500 mm",
    confidence: "assumed",
    note: "Square graphic across the pair; leaf split taken as the centre of the opening.",
  },
  {
    match: "WHITTLE DOOR ARTWORK",
    leaves: 2,
    leafW: [750, 750],
    leafH: 1500,
    scope: "spanning",
    source: "3F/Fleming Whittle Doors/Fleming and Whittle doors.ai — 1500 × 1500 mm",
    confidence: "assumed",
    note: "Square graphic across the pair; leaf split taken as the centre of the opening.",
  },
];

/** Door leaf geometry for an item, when it is a door at all. */
export function londonDoorSpec(
  panel: { name: string } | string,
): LondonDoorSpec | null {
  const name = (typeof panel === "string" ? panel : panel.name).toUpperCase();
  return LONDON_DOOR_SPECS.find((s) => name.includes(s.match)) ?? null;
}

/** True when the item is applied across more than one leaf. */
export function isDoubleDoor(spec: LondonDoorSpec | null): boolean {
  return !!spec && spec.leaves > 1;
}

export type LeafColumn = {
  /** Left edge as a fraction of the whole opening. */
  x: number;
  /** Width as a fraction of the whole opening. */
  w: number;
  /** Leaf width in mm. */
  mm: number;
  /** Index of the leaf, left to right. */
  index: number;
};

/**
 * Leaf columns across the opening, as fractions. A pair of unequal leaves
 * (Abbey, St James) keeps its true proportions, so the shut line lands where
 * it lands on site rather than at the middle.
 */
export function doorLeafColumns(spec: LondonDoorSpec): LeafColumn[] {
  const total = spec.leafW.reduce((a, b) => a + b, 0);
  let x = 0;
  return spec.leafW.map((mm, index) => {
    const w = mm / total;
    const col: LeafColumn = { x, w, mm, index };
    x += w;
    return col;
  });
}

/** Shut-line positions across the opening, as fractions. */
export function doorShutLines(spec: LondonDoorSpec): number[] {
  return doorLeafColumns(spec)
    .slice(0, -1)
    .map((c) => c.x + c.w);
}

/** The whole opening in mm, artwork included. */
export function doorOpeningSize(spec: LondonDoorSpec): { w: number; h: number } {
  return { w: spec.leafW.reduce((a, b) => a + b, 0), h: spec.leafH };
}

/** Short human line for the card and the render caption. */
export function doorLeafLabel(spec: LondonDoorSpec): string {
  if (spec.leaves === 1) return `Single leaf · ${spec.leafW[0]} × ${spec.leafH} mm`;
  const leaves = spec.leafW.join(" + ");
  const opening = doorOpeningSize(spec);
  const scope =
    spec.scope === "leaf"
      ? "artwork per leaf"
      : "one sheet across the pair";
  return `Double doors · leaves ${leaves} × ${spec.leafH} mm · opening ${opening.w} mm · ${scope}`;
}
