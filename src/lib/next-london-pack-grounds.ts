// -----------------------------------------------------------------------------
// NEXT 2026 London — GROUND COLOUR, MEASURED FROM THE SUPPLIED LIVE FILES.
//
// The 18 September 2026 delivery (job 2281) is DeviceCMYK throughout: every
// ground in it is a live CMYK mesh gradient, not an RGB build the RIP separates
// later. This module is the single record of those measured ink builds, so the
// signage the app generates sits on the same ground as the files the location
// team supplied — and a CMYK master carries the delivered build verbatim rather
// than a conversion of a screen colour.
//
// HOW THESE NUMBERS WERE OBTAINED (provenance matters — do not "tidy" them):
//   1. Each supplied `.ai` was expanded with qpdf and its ShadingType 4 mesh
//      vertices decoded (flag, coordinates, then four 8-bit ink components
//      through the shading's /Decode array).
//   2. Vertices were projected onto the gradient's principal axis and averaged
//      in bands, giving the ramp in ramp order.
//   3. The screen hex beside each build is the SAME ink rendered through the
//      proof pipeline used for the pack proofs, so previews match the proofs.
//      It is NOT a naive inversion and must not be replaced with one.
//
// The screen hexes are registered as approved builds in `next-london-cmyk.ts`,
// which is what keeps the round trip exact: ground hex -> approved build ->
// the measured ink, with no conversion step in between.
// -----------------------------------------------------------------------------

export type PackGroundStop = {
  /** Measured ink build, in percent, exactly as decoded from the supplied file. */
  cmyk: { c: number; m: number; y: number; k: number };
  /** The same ink through the proof pipeline — what the screen shows. */
  hex: string;
};

export type PackGround = {
  id: string;
  label: string;
  /** What this ground is for, in the delivery's own terms. */
  note: string;
  /** Files the ramp was measured from. */
  sources: string[];
  /** Ramp order as drawn in the supplied artwork. */
  stops: PackGroundStop[];
};

const s = (c: number, m: number, y: number, k: number, hex: string): PackGroundStop => ({
  cmyk: { c, m, y, k },
  hex,
});

/**
 * The grounds actually used across the 18 September delivery. Three ramps cover
 * every finished file in it; everything else in the pack is a flat brand ink,
 * white knockout, or placed photography.
 */
export const LONDON_PACK_GROUNDS: PackGround[] = [
  {
    id: "pk-aqua-violet",
    label: "Pack · aqua → violet",
    note: "The house scenic ground of the delivery — exterior flags, lift walls and doors, Paolozzi and Mountbatten set wraps, Wall 4E, pillar wraps, metal logo wall, Churchill double doors. Carries a measured black shade through the middle of the run, which is what keeps the mid-tones from going chalky on vinyl.",
    sources: [
      "Exterior/Exterior Flags/QEII Flag 1–3.ai",
      "GF/Lift Walls Template/Lifts_Template.ai",
      "3F/PAOLOZZI/@50%_PAOLOZZI-COVER-4500x6500mm.ai",
      "6F/Mountbatten 6A/Mountbatten 6a.ai",
      "4F/Wall 4E 2590x2110.ai",
    ],
    stops: [
      s(29, 1, 0, 2, "#B2E1F5"),
      s(40, 0, 0, 8, "#8ECEE7"),
      s(57, 10, 0, 12, "#64AAD3"),
      s(70, 46, 0, 7, "#5373B9"),
      s(77, 81, 0, 1, "#5342A2"),
      s(79, 95, 0, 0, "#542E96"),
    ],
  },
  {
    id: "pk-orchid-blue",
    label: "Pack · orchid → blue",
    note: "Front-of-house desk ground: registration desk fronts and sides, cloakroom, catering table, help desks. Runs orchid into brand blue with no black at all, so long low panels stay clean under downlighting.",
    sources: [
      "GF/Registration Desks/REGISTRATION-DESK-VINYL-4155mmx950mm.ai",
      "GF/Registration Desks/REGISTRATION-DESK-SIDE_Left/Right-VINYL-900mmx950mm.ai",
      "3F/Catering Table/catering_table_front_cover.ai",
    ],
    stops: [
      s(26, 49, 0, 0, "#BC7DC5"),
      s(31, 48, 0, 0, "#B17FC6"),
      s(48, 46, 0, 0, "#8A7FC7"),
      s(71, 39, 5, 0, "#5586C5"),
      s(94, 35, 10, 0, "#1E84C1"),
    ],
  },
  {
    id: "pk-cyan-pink",
    label: "Pack · cyan → pink",
    note: "Glass and screen-surround ground from the Churchill booth vinyls: a saturated cyan field turning through to pink. Widest hue travel in the delivery — used where a panel is seen against daylight.",
    sources: ["GF/Curchill Booths/Churchill_Glass Vinyl 1–9.ai"],
    stops: [
      s(100, 26, 12, 0, "#0C8CC6"),
      s(90, 31, 6, 0, "#268BCA"),
      s(65, 30, 4, 0, "#6097D0"),
      s(40, 39, 1, 0, "#9C8FCD"),
      s(0, 55, 0, 0, "#F573C0"),
    ],
  },
];

/** Deep brand ends used as a head stop on the darker treatments. */
export const LONDON_PACK_DEEP = {
  navy: s(100, 100, 40, 60, "#14142D"),
  blue: s(100, 83, 0, 6, "#244299"),
} as const;

const BY_ID = new Map(LONDON_PACK_GROUNDS.map((g) => [g.id, g] as const));

export function londonPackGround(id: string): PackGround | null {
  return BY_ID.get(id) ?? null;
}

/** Screen hexes of a pack ground, in ramp order. */
export function londonPackGroundHexes(id: string): string[] {
  return (BY_ID.get(id)?.stops ?? []).map((stop) => stop.hex);
}

/**
 * Every measured build in the delivery, keyed by its screen hex. Consumed by
 * `next-london-cmyk.ts` so a CMYK master prints the supplied ink verbatim.
 */
export const LONDON_PACK_BUILDS: Record<string, { c: number; m: number; y: number; k: number }> =
  Object.fromEntries(
    [...LONDON_PACK_GROUNDS.flatMap((g) => g.stops), LONDON_PACK_DEEP.navy, LONDON_PACK_DEEP.blue].map(
      (stop) => [
        stop.hex.toLowerCase(),
        {
          c: stop.cmyk.c / 100,
          m: stop.cmyk.m / 100,
          y: stop.cmyk.y / 100,
          k: stop.cmyk.k / 100,
        },
      ],
    ),
  );

/** Human note for the print sheet and the studio. */
export const LONDON_PACK_GROUND_NOTE =
  "Grounds are the ink builds measured out of the 18 September live Illustrator files, so generated signage matches the delivered artwork on press. CMYK masters carry those builds verbatim — no conversion.";
