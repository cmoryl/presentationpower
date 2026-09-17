// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — "We're here for the ___ ones." (bloom variation)
//
// A second look for the Legal set: the photograph is cut into a soft aperture
// and sits on a bright colour bloom, on a near-white dotted ground. The
// headline stands beside it, set in a transitional serif, with one turning word
// in the bloom's own colour and italic.
//
// Rules carried over from the Legal brief: no stock-photo clichés, no gavels,
// no CTAs in the artwork, no typed division name (the lockup carries it), and
// every claim stays inside what Legal actually does.
// ---------------------------------------------------------------------------

import bloomSoapbox from "@/assets/legal-bloom/ref-soapbox.png";
import bloomKayak from "@/assets/legal-bloom/bloom-kayak-chute.jpg";
import bloomOcean from "@/assets/legal-bloom/ref-ocean.jpg";
import bloomCliff from "@/assets/legal-bloom/ref-cliff.jpg";
import bloomIce from "@/assets/legal-bloom/bloom-ice-fall.jpg";
import bloomRally from "@/assets/legal-bloom/bloom-rally-rut.jpg";
import bloomCave from "@/assets/legal-bloom/bloom-cave-haul.jpg";
import bloomDeep from "@/assets/legal-bloom/bloom-deep-line.jpg";

/** The ground the whole set is printed on. */
export const LEGAL_BLOOM_PALETTE = {
  ground: "#FBFBFD",
  ink: "#03002C",
  quiet: "#03002C",
  blue: "#003FC7",
} as const;

/** A bloom colour: the soft glow behind the picture, and the type colour. */
export type BloomColour = {
  id: string;
  label: string;
  /** Saturated hue used for the glow. */
  glow: string;
  /** Darker relative of the glow, safe for type on the light ground. */
  type: string;
};

export const LEGAL_BLOOM_COLOURS: Record<string, BloomColour> = {
  ember: { id: "ember", label: "Ember", glow: "#FF7A1A", type: "#E2560B" },
  lavender: { id: "lavender", label: "Lavender", glow: "#C2A3FF", type: "#7C4DEF" },
  aqua: { id: "aqua", label: "Aqua", glow: "#2CC4E8", type: "#0C93B8" },
  green: { id: "green", label: "Green", glow: "#4FD483", type: "#0E9455" },
  pink: { id: "pink", label: "Pink", glow: "#EC388A", type: "#C81E6E" },
  blue: { id: "blue", label: "Brand blue", glow: "#3C6BFF", type: "#003FC7" },
};

/**
 * The cut of the picture window, taken from the Canva master: a plain rectangle
 * with ONE end turned right over and the remaining corners left almost square.
 * The turned end is where the colour bloom leans out.
 */
export type BloomAperture = "turned" | "d-right" | "d-left" | "arch";

export const LEGAL_BLOOM_APERTURES: { id: BloomAperture; label: string }[] = [
  { id: "turned", label: "One corner turned" },
  { id: "d-right", label: "Right end turned" },
  { id: "d-left", label: "Left end turned" },
  { id: "arch", label: "Top turned (arch)" },
];

/**
 * Corner radii for a picture box, as a CSS `border-radius` shorthand.
 * `px` is the box's SHORT edge — the turned end is half of it, so the end reads
 * as a true half-round; every other corner keeps the master's near-square nick.
 */
export function bloomShapeRadius(aperture: BloomAperture, px: number): string {
  const round = `${px * 0.5}px`;
  const nick = `${Math.max(2, px * 0.014)}px`;
  switch (aperture) {
    case "d-right":
      return `${nick} ${round} ${round} ${nick}`;
    case "d-left":
      return `${round} ${nick} ${nick} ${round}`;
    case "arch":
      return `${round} ${round} ${nick} ${nick}`;
    case "turned":
    default:
      return `${nick} ${px * 0.42}px ${nick} ${nick}`;
  }
}

/** Which end of the picture the bloom leans out of, for a given cut. */
export function bloomLean(aperture: BloomAperture): { x: number; y: number } {
  switch (aperture) {
    case "d-left":
      return { x: -1, y: -0.35 };
    case "arch":
      return { x: 0.15, y: -1 };
    case "d-right":
      return { x: 1, y: -0.3 };
    case "turned":
    default:
      return { x: 0.85, y: -0.75 };
  }
}

/** Which side of the frame the copy holds. */
export type BloomSide = "left" | "right";

export type BloomScene = {
  id: string;
  photo: string;
  /** Documentary caption for the board — never printed in the ad. */
  shot: string;
  /** Headline, written as three parts so the turning word can be treated. */
  lead: string;
  turn: string;
  tail: string;
  /** The one supporting line under the rule. */
  support: string;
  colour: keyof typeof LEGAL_BLOOM_COLOURS;
  aperture: BloomAperture;
  side: BloomSide;
  /** Where the interest sits, so every crop keeps it. */
  focus: string;
};

export const LEGAL_BLOOM_CONCEPT = {
  name: "We're here for the tricky ones.",
  line: "Bloom variation · TransPerfect Legal",
  premise:
    "Eight documentary frames of people deep in something awkward, each cut into a soft aperture on a colour bloom. One phrase runs the set; one word turns in each ad.",
} as const;

export const LEGAL_BLOOM_SCENES: BloomScene[] = [
  {
    id: "soapbox",
    photo: bloomSoapbox,
    shot: "Two-up gravity racer through standing water, wet descent",
    lead: "We're here for the",
    turn: "tricky",
    tail: "ones.",
    support: "Multi-jurisdiction filings, on the clock, with nothing rehearsed.",
    colour: "ember",
    aperture: "turned",
    side: "left",
    focus: "50% 42%",
  },
  {
    id: "kayak",
    photo: bloomKayak,
    shot: "Tandem kayak threading a granite chute",
    lead: "We're here for the",
    turn: "thorny",
    tail: "work.",
    support: "Contract review where every clause pulls a different way.",
    colour: "lavender",
    aperture: "d-right",
    side: "right",
    focus: "52% 48%",
  },
  {
    id: "ocean",
    photo: bloomOcean,
    shot: "Offshore crew working the rail, second boat on the horizon",
    lead: "We're here for when it gets",
    turn: "knotty",
    tail: "",
    support: "Cross-border disclosure, translated and tracked as it moves.",
    colour: "aqua",
    aperture: "d-left",
    side: "left",
    focus: "42% 55%",
  },
  {
    id: "cliff",
    photo: bloomCliff,
    shot: "Portaledge under an overhang at dusk, climber on the anchor line",
    lead: "We're here for the",
    turn: "messy",
    tail: "jobs.",
    support: "Late document sets, mixed formats, one certified output.",
    colour: "green",
    aperture: "d-left",
    side: "right",
    focus: "34% 52%",
  },
  {
    id: "ice",
    photo: bloomIce,
    shot: "Ice climber placing an axe, belayer holding below",
    lead: "We're here for the",
    turn: "brittle",
    tail: "ones.",
    support: "Sworn translation for matters that will not take a second attempt.",
    colour: "blue",
    aperture: "turned",
    side: "left",
    focus: "60% 40%",
  },
  {
    id: "rally",
    photo: bloomRally,
    shot: "Rally car in deep ruts, co-driver on the notes",
    lead: "We're here when the route gets",
    turn: "rough",
    tail: "",
    support: "Regulatory submissions read line by line before they leave.",
    colour: "pink",
    aperture: "d-right",
    side: "right",
    focus: "56% 50%",
  },
  {
    id: "cave",
    photo: bloomCave,
    shot: "Cavers threading a hauling line through a wet passage",
    lead: "We're here for the",
    turn: "tangled",
    tail: "ones.",
    support: "Discovery sets untangled, deduplicated and delivered in order.",
    colour: "green",
    aperture: "arch",
    side: "left",
    focus: "40% 45%",
  },
  {
    id: "deep",
    photo: bloomDeep,
    shot: "Freediver on the line, safety diver watching from above",
    lead: "We're here for the",
    turn: "deep",
    tail: "ones.",
    support: "Long-running disputes, one team on the record the whole way down.",
    colour: "aqua",
    aperture: "d-left",
    side: "right",
    focus: "50% 46%",
  },
];

/** The trims the set is checked at. */
export const LEGAL_BLOOM_SIZES = [
  { id: "linkedin", label: "LinkedIn post", w: 1200, h: 1200 },
  { id: "landscape", label: "Landscape 16:9", w: 1280, h: 720 },
  { id: "portrait", label: "Portrait 4:5", w: 1080, h: 1350 },
  { id: "story", label: "Story 9:16", w: 1080, h: 1920 },
  { id: "banner", label: "LinkedIn banner", w: 1584, h: 396 },
] as const;

export type BloomSizeId = (typeof LEGAL_BLOOM_SIZES)[number]["id"];

/**
 * Optical headline sizing: a short line can stand tall, a long one has to give
 * ground. Returns a multiplier on the frame's base headline size.
 */
export function bloomOptical(chars: number): number {
  if (chars <= 22) return 1.2;
  if (chars <= 30) return 1.06;
  if (chars <= 38) return 0.94;
  if (chars <= 46) return 0.85;
  return 0.78;
}

export function bloomHeadline(scene: BloomScene): string {
  return [scene.lead, scene.turn, scene.tail].filter(Boolean).join(" ");
}

export function bloomColour(scene: BloomScene): BloomColour {
  return LEGAL_BLOOM_COLOURS[scene.colour];
}
