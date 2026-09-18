// -----------------------------------------------------------------------------
// NEXT pillar layout templates.
//
// A template is the *look and layout* of a pillar — ground, device, where the
// lockup sits, how the headline is set. Everything a template does is geometry
// and approved colour, so the division lockup and every line of copy stay
// switchable inside it.
//
//   classic       the issued NEXT column: centred lockup, vertical or centred
//                 headline over any approved London gradient ground.
//   next-ascend   measured from the supplied NEXT pillar master (5-page Canva
//                 set): violet → aqua ground, ascending chevron device, lockup
//                 top-left, word-stacked headline in the lower half.
//
// Geometry here is shared by the live sign, the raster proof and the vector
// press PDF, so screen and production cannot drift apart.
// -----------------------------------------------------------------------------

import {
  LIGHT_TINT,
  pillarStops,
  tintTowardLight,
  type PillarConfig,
  type PillarFaceId,
} from "./next-pillar-masters";

export type PillarTemplateId = "classic" | "next-ascend" | "next-blank" | "next-profile";

/** Which measured chevron run a template draws. */
export type PillarChevronSet = "ascend" | "profile";

export type PillarTemplate = {
  id: PillarTemplateId;
  name: string;
  note: string;
  /** Ground stops measured off the supplied master. Null = the chosen gradient. */
  stops: string[] | null;
  align: "center" | "left";
  /** Ascending chevron device behind the copy. */
  chevrons: boolean;
  /** Which measured chevron run to draw. Defaults to the ascending stack. */
  chevronSet?: PillarChevronSet;
  /** Strapline over the lockup, as the supplied division masters carry it. */
  eyebrow?: boolean;
  /** Set each word of the headline on its own line. */
  stackWords: boolean;
  /** Headline block top, as a fraction of trim height from the trim top. */
  headlineTop: number;
  /** Lockup width as a fraction of trim width at 100% lockup scale. */
  lockupWidth: number;
};

export const PILLAR_TEMPLATES: PillarTemplate[] = [
  {
    id: "classic",
    name: "Classic column",
    note: "The issued NEXT pillar: centred division lockup with a vertical or centred headline over the gradient ground you pick.",
    stops: null,
    align: "center",
    chevrons: false,
    stackWords: false,
    headlineTop: 0,
    lockupWidth: 0.58,
  },
  {
    id: "next-ascend",
    name: "NEXT ascent · chevron",
    note: "Measured from the supplied NEXT pillar master: violet-to-aqua ground with the ascending chevron device, division lockup top left and the headline stacked a word to a line in the lower half. Swap the division and the copy freely.",
    stops: ["#9A70F8", "#B4B0FB", "#8BC6EA"],
    align: "left",
    chevrons: true,
    stackWords: true,
    headlineTop: 0.46,
    lockupWidth: 0.76,
  },
  {
    id: "next-blank",
    name: "NEXT blank ground",
    note: "The supplied blank pillar: the violet-to-aqua ground with the measured chevron run and nothing else. Start here and add the lockup, strapline and copy you need.",
    stops: ["#9A70F8", "#B4B0FB", "#8BC6EA"],
    align: "center",
    chevrons: true,
    chevronSet: "profile",
    stackWords: false,
    headlineTop: 0,
    lockupWidth: 0.58,
  },
  {
    id: "next-profile",
    name: "NEXT division profile",
    note: "Measured from the supplied division pillars (DataForce, Finance): strapline across the top, division lockup under it, the chevron run through the middle and the headline stacked a word to a line in the lower half. Swap the division and every line of copy freely.",
    stops: ["#9A70F8", "#B4B0FB", "#8BC6EA"],
    align: "left",
    chevrons: true,
    chevronSet: "profile",
    eyebrow: true,
    stackWords: true,
    headlineTop: 0.5,
    lockupWidth: 0.8,
  },
];

export function pillarTemplate(id: string | undefined): PillarTemplate {
  return PILLAR_TEMPLATES.find((t) => t.id === id) ?? PILLAR_TEMPLATES[0]!;
}

/** Ground stops for a pillar: the template's measured ground, else the gradient. */
export function pillarGroundStops(config: PillarConfig): string[] {
  const tpl = pillarTemplate(config.templateId);
  const face: PillarFaceId = config.face ?? "dark";
  if (!tpl.stops) return pillarStops(config.styleId, face);
  return face === "light" ? tpl.stops.map((s) => tintTowardLight(s, LIGHT_TINT)) : tpl.stops;
}

/** Ink + opacity of the chevron device on a face. */
export function pillarChevronInk(
  face: PillarFaceId,
  set: PillarChevronSet = "ascend",
): { color: string; opacity: number } {
  // The supplied division masters hold the run back to a whisper on both faces,
  // so the headline stays the loudest thing on the column.
  if (set === "profile") return { color: "#FFFFFF", opacity: face === "light" ? 0.3 : 0.16 };
  return face === "light"
    ? { color: "#FFFFFF", opacity: 0.62 }
    : { color: "#FFFFFF", opacity: 0.1 };
}

export type PillarChevronBand = {
  /** Polygon points in mm on the bleed sheet, y measured down from the top. */
  points: [number, number][];
};

/**
 * Ascending chevron bands, measured off the supplied master: apex on the column
 * centre, bands rising left and right, stacked from just under the lockup down
 * past the foot so the run never shows a seam.
 */
export function pillarChevronBands(
  bleedW: number,
  bleedH: number,
  set: PillarChevronSet = "ascend",
): PillarChevronBand[] {
  if (set === "profile") return pillarProfileBands(bleedW, bleedH);
  const apexX = bleedW * 0.5;
  const rise = bleedW * 0.42;
  const thickness = bleedW * 0.3;
  const spacing = bleedW * 0.5;
  const bands: PillarChevronBand[] = [];
  for (let apexY = bleedH * 0.3; apexY < bleedH * 1.15; apexY += spacing) {
    const a = apexY;
    const b = apexY + thickness;
    bands.push({
      points: [
        [0, a + rise],
        [apexX, a],
        [bleedW, a + rise],
        [bleedW, b + rise],
        [apexX, b],
        [0, b + rise],
      ],
    });
  }
  return bands;
}

/**
 * The chevron run measured off the supplied division pillars: two wide bands
 * across the middle of the column, then a narrower stack held to the left of the
 * column under them, which is what carries the eye down to the headline.
 * Fractions are of the bleed sheet, so every pillar size keeps the proportion.
 */
function pillarProfileBands(bleedW: number, bleedH: number): PillarChevronBand[] {
  const bands: PillarChevronBand[] = [];
  const band = (apexY: number, thickness: number, left: number, right: number) => {
    const apexX = (left + right) / 2;
    const rise = (right - left) * 0.42;
    const a = apexY;
    const b = apexY + thickness;
    bands.push({
      points: [
        [left, a + rise],
        [apexX, a],
        [right, a + rise],
        [right, b + rise],
        [apexX, b],
        [left, b + rise],
      ],
    });
  };

  // Two wide bands through the middle of the column.
  band(bleedH * 0.345, bleedW * 0.2, 0, bleedW);
  band(bleedH * 0.425, bleedW * 0.2, 0, bleedW);

  // The narrow stack, held to the left two thirds under them.
  const narrowRight = bleedW * 0.66;
  const thin = bleedW * 0.085;
  const step = bleedW * 0.155;
  for (let i = 0; i < 8; i += 1) band(bleedH * 0.62 + step * i, thin, 0, narrowRight);
  return bands;
}

/** Headline lines for a template: one word per line when the template stacks. */
export function pillarHeadlineLines(headline: string, stackWords: boolean): string[] {
  const text = (headline || "").trim();
  if (!text) return [];
  return stackWords ? text.split(/\s+/) : [text];
}
