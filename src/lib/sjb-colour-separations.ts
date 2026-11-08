// San Juan Bowl colour separations — one layer per brand ink.
//
// Every plate is split from the supplied full-colour master
// (src/assets/san-juan-bowl/sjb-logo-color.svg, viewBox 0 0 1254 1254) by
// resolving the master's own ink classes, so each plate holds the master's
// shapes at source coordinates in source drawing order. Nothing is redrawn,
// recoloured or re-flowed. Ink codes are read from SJB_COLORS, never retyped.
import navySvg from "@/assets/san-juan-bowl/separations/sjb-separation-navy.svg.asset.json";
import navyPng from "@/assets/san-juan-bowl/separations/sjb-separation-navy-2400.png.asset.json";
import skySvg from "@/assets/san-juan-bowl/separations/sjb-separation-sky.svg.asset.json";
import skyPng from "@/assets/san-juan-bowl/separations/sjb-separation-sky-2400.png.asset.json";
import goldSvg from "@/assets/san-juan-bowl/separations/sjb-separation-gold.svg.asset.json";
import goldPng from "@/assets/san-juan-bowl/separations/sjb-separation-gold-2400.png.asset.json";
import whiteSvg from "@/assets/san-juan-bowl/separations/sjb-separation-white.svg.asset.json";
import whitePng from "@/assets/san-juan-bowl/separations/sjb-separation-white-2400.png.asset.json";
import pack from "@/assets/san-juan-bowl/separations/sjb-colour-separations-v1.0.zip.asset.json";
import { SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";

/** One ink of the badge, held as its own editable layer. */
export interface SjbSeparation {
  id: "navy" | "sky" | "gold" | "white";
  name: string;
  hex: string;
  /** Shapes carrying this ink in the supplied master. */
  shapes: number;
  /** Ground the plate is legible on: white ink needs the dark ground. */
  ground: "light" | "dark";
  role: string;
  cmyk: string;
  rgb: string;
  hexCode: string;
  svg: string;
  png: string;
}

const PLATES = [
  { id: "navy", shapes: 58, ground: "light", svg: navySvg.url, png: navyPng.url },
  { id: "sky", shapes: 144, ground: "light", svg: skySvg.url, png: skyPng.url },
  { id: "gold", shapes: 8, ground: "light", svg: goldSvg.url, png: goldPng.url },
  { id: "white", shapes: 50, ground: "dark", svg: whiteSvg.url, png: whitePng.url },
] as const;

/** Codes come from the Bowl palette so the plates and the palette can never drift. */
export const SJB_SEPARATIONS: SjbSeparation[] = PLATES.map((p) => {
  const color = SJB_COLORS.find((c) => c.id === p.id);
  if (!color) throw new Error(`Bowl palette has no ink "${p.id}"`);
  return {
    id: p.id,
    name: color.name,
    hex: color.hex,
    shapes: p.shapes,
    ground: p.ground,
    role: color.role,
    cmyk: color.cmyk,
    rgb: color.rgb,
    hexCode: color.hex,
    svg: p.svg,
    png: p.png,
  };
});

export const SJB_SEPARATION_PACK = pack.url;
export const SJB_SEPARATION_MASTER = SJB_LOGOS[0].svg;

/** Source bookkeeping, measured from the supplied master file. */
export const SJB_SEPARATION_SOURCE = {
  file: "sjb-logo-color.svg",
  viewBox: "0 0 1254 1254",
  totalShapes: 293,
  keptShapes: 260,
  unpaintedShapes: 33,
} as const;

export const SJB_SEPARATION_NOTES = [
  "These are ink separations of the badge — one layer per Bowl colour. They are not CMYK process separations: the artwork is built from four brand inks, not from cyan, magenta, yellow and black.",
  "CMYK values are the working builds set in the master vector files. They are unproofed: always run a vendor proof before print and adjust on press if needed.",
  "Pantone (spot) references are matched by the print vendor from the supplied artwork — never substitute a guessed swatch.",
  `${SJB_SEPARATION_SOURCE.unpaintedShapes} unpainted source contours (${SJB_SEPARATION_SOURCE.totalShapes - SJB_SEPARATION_SOURCE.keptShapes} of ${SJB_SEPARATION_SOURCE.totalShapes} shapes) carry no ink and are left out of the plates; they stay in the original master and are not a white underlay or a knock-out layer.`,
  "White is a real ink here, not the absence of one: it carries the clouds, the palm highlights, the stars and the lettering on the dark ground. Never drop it to save a pass.",
  "Bodies of text on Bowl print stay solid black (100K), same as every TransPerfect print piece. The separations above describe the badge only.",
] as const;
