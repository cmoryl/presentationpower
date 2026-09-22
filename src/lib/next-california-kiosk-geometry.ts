// TransPerfect NEXT — CALIFORNIA TV KIOSK GEOMETRY.
//
// Measured out of the supplied `TVKioskTemplate.ai` and kept in its own module
// so both the booth shell registry and the kiosk booth specs can read the same
// numbers without importing one another.
//
// The supplied file: three artboards on 3258 × 6930 pt (front) and 306 × 6930 pt
// (returns) media pages. Trim is 3240 × 6912 pt (45 × 96 in) and 288 × 6912 pt
// (4 × 96 in), centred, so bleed is 1/8 in per edge; the intermediate 1/16 in
// box the file also draws is a bleed guide, not a second trim.

const PT_TO_MM = 25.4 / 72;

/** Bleed held per edge on every kiosk sheet, in mm (1/8 in). */
export const CALIFORNIA_KIOSK_BLEED_MM = Math.round(9 * PT_TO_MM * 1000) / 1000;

/** Front face trim, in mm (45 × 96 in). */
export const CALIFORNIA_KIOSK_FRONT_TRIM = { w: 1143, h: 2438.4 } as const;

/** Return strip trim, in mm (4 × 96 in). */
export const CALIFORNIA_KIOSK_RETURN_TRIM = { w: 101.6, h: 2438.4 } as const;

/**
 * TV keep-clear aperture on the front face, in mm from the trim origin.
 * The art rectangle runs x 9 → 2765 pt and y 4319.5 → 5923.5 pt on the media
 * page, whose trim starts at (9, 9) — i.e. flush to the left trim edge,
 * 997.5 pt below the trim top, 2756 × 1604 pt.
 */
export const CALIFORNIA_KIOSK_SCREEN_MM = {
  x: 0,
  y: Math.round(997.5 * PT_TO_MM * 100) / 100,
  w: Math.round(2756 * PT_TO_MM * 100) / 100,
  h: Math.round(1604 * PT_TO_MM * 100) / 100,
} as const;

/** The same aperture as fractions of the front trim, for the shell record. */
export const CALIFORNIA_KIOSK_SCREEN_FRACTION = {
  x: 0,
  y: 997.5 / 6912,
  w: 2756 / 3240,
  h: 1604 / 6912,
} as const;
