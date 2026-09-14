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

export type PillarTemplateId = "classic" | "next-ascend";

export type PillarTemplate = {
  id: PillarTemplateId;
  name: string;
  note: string;
  /** Ground stops measured off the supplied master. Null = the chosen gradient. */
  stops: string[] | null;
  align: "center" | "left";
  /** Ascending chevron device behind the copy. */
  chevrons: boolean;
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
export function pillarChevronInk(face: PillarFaceId): { color: string; opacity: number } {
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
export function pillarChevronBands(bleedW: number, bleedH: number): PillarChevronBand[] {
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

/** Headline lines for a template: one word per line when the template stacks. */
export function pillarHeadlineLines(headline: string, stackWords: boolean): string[] {
  const text = (headline || "").trim();
  if (!text) return [];
  return stackWords ? text.split(/\s+/) : [text];
}
