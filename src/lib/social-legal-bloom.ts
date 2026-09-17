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
 * The picture frame, measured off page 6 of the Canva master. Every frame there
 * rounds TWO DIAGONALLY OPPOSITE corners and leaves the other two perfectly
 * square. Three radii are in use:
 *   · turn   — a circular half-round on the short edge (r = short / 2)
 *   · soft   — a quarter round (r = short / 4), the gentlest of the set
 * The diagonal runs either top-right→bottom-left or top-left→bottom-right.
 */
export type BloomAperture =
  | "turn-right"
  | "turn-left"
  | "soft-right"
  | "soft-left";

export const LEGAL_BLOOM_APERTURES: { id: BloomAperture; label: string }[] = [
  { id: "turn-right", label: "Turned ends · top-right / bottom-left" },
  { id: "turn-left", label: "Turned ends · top-left / bottom-right" },
  { id: "soft-right", label: "Soft corners · top-right / bottom-left" },
  { id: "soft-left", label: "Soft corners · top-left / bottom-right" },
];

/** Which diagonal a frame rounds. */
function bloomDiagonal(aperture: BloomAperture): "right" | "left" {
  return aperture.endsWith("left") ? "left" : "right";
}

/**
 * The frame's corner radii as a CSS `border-radius` shorthand, for a picture box
 * of `w` × `h` px. Square corners are exactly square, as in the master.
 */
export function bloomShapeRadius(aperture: BloomAperture, w: number, h: number): string {
  const short = Math.min(w, h);
  let rx: number;
  let ry: number;
  if (aperture.startsWith("turn")) {
    rx = short / 2;
    ry = short / 2;
  } else {
    rx = short / 4;
    ry = short / 4;
  }
  // TL TR BR BL / TL TR BR BL
  return bloomDiagonal(aperture) === "right"
    ? `0 ${rx}px 0 ${rx}px / 0 ${ry}px 0 ${ry}px`
    : `${rx}px 0 ${rx}px 0 / ${ry}px 0 ${ry}px 0`;
}

/** Which way the bloom leans — out through the rounded diagonal. */
export function bloomLean(aperture: BloomAperture): { x: number; y: number } {
  return bloomDiagonal(aperture) === "right" ? { x: 0.85, y: -0.75 } : { x: -0.85, y: -0.75 };
}


/** The shape of the picture box, following the photograph's own orientation. */
export type BloomFrame = "wide" | "square" | "upright";

/** Target width-to-height for each. */
export function bloomFrameAspect(frame: BloomFrame | undefined): number {
  switch (frame) {
    case "wide":
      return 1.6;
    case "upright":
      return 0.72;
    default:
      return 1;
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
  /**
   * How the photograph itself sits, so the frame runs the same way: a landscape
   * frame gets a long horizontal box, an upright one a taller box.
   */
  frame?: BloomFrame;
  /** Where the interest sits, so every crop keeps it. */
  focus: string;
};

export const LEGAL_BLOOM_CONCEPT = {
  name: "We're here for the tricky ones.",
  line: "Bloom variation · TransPerfect Legal",
  premise:
    "Eight documentary frames of people deep in something awkward. Each picture is cut to the house shape — two diagonally opposite corners turned right over, the other two perfectly square — with a solid accent keyline on the frame and a soft colour bloom leaning out through the turned diagonal. One phrase runs the set; one word turns in each ad.",
} as const;

export const LEGAL_BLOOM_SCENES: BloomScene[] = [
  {
    id: "soapbox",
    frame: "wide",
    photo: bloomSoapbox,
    shot: "Two-up gravity racer through standing water, wet descent",
    lead: "We're here for the",
    turn: "tricky",
    tail: "ones.",
    support: "Multi-jurisdiction filings, on the clock, with nothing rehearsed.",
    colour: "ember",
    aperture: "soft-right",
    side: "left",
    focus: "50% 42%",
  },
  {
    id: "kayak",
    frame: "upright",
    photo: bloomKayak,
    shot: "Tandem kayak threading a granite chute",
    lead: "We're here for the",
    turn: "thorny",
    tail: "work.",
    support: "Contract review where every clause pulls a different way.",
    colour: "lavender",
    aperture: "turn-left",
    side: "right",
    focus: "52% 48%",
  },
  {
    id: "ocean",
    frame: "wide",
    photo: bloomOcean,
    shot: "Offshore crew working the rail, second boat on the horizon",
    lead: "We're here for when it gets",
    turn: "knotty",
    tail: "",
    support: "Cross-border disclosure, translated and tracked as it moves.",
    colour: "aqua",
    aperture: "turn-right",
    side: "left",
    focus: "42% 55%",
  },
  {
    id: "cliff",
    frame: "wide",
    photo: bloomCliff,
    shot: "Portaledge under an overhang at dusk, climber on the anchor line",
    lead: "We're here for the",
    turn: "messy",
    tail: "jobs.",
    support: "Late document sets, mixed formats, one certified output.",
    colour: "green",
    aperture: "turn-left",
    side: "right",
    focus: "34% 52%",
  },
  {
    id: "ice",
    frame: "square",
    photo: bloomIce,
    shot: "Ice climber placing an axe, belayer holding below",
    lead: "We're here for the",
    turn: "brittle",
    tail: "ones.",
    support: "Sworn translation for matters that will not take a second attempt.",
    colour: "blue",
    aperture: "turn-right",
    side: "left",
    focus: "60% 40%",
  },
  {
    id: "rally",
    frame: "wide",
    photo: bloomRally,
    shot: "Rally car in deep ruts, co-driver on the notes",
    lead: "We're here when the route gets",
    turn: "rough",
    tail: "",
    support: "Regulatory submissions read line by line before they leave.",
    colour: "pink",
    aperture: "soft-left",
    side: "right",
    focus: "56% 50%",
  },
  {
    id: "cave",
    frame: "square",
    photo: bloomCave,
    shot: "Cavers threading a hauling line through a wet passage",
    lead: "We're here for the",
    turn: "tangled",
    tail: "ones.",
    support: "Discovery sets untangled, deduplicated and delivered in order.",
    colour: "green",
    aperture: "turn-left",
    side: "left",
    focus: "40% 45%",
  },
  {
    id: "deep",
    frame: "upright",
    photo: bloomDeep,
    shot: "Freediver on the line, safety diver watching from above",
    lead: "We're here for the",
    turn: "deep",
    tail: "ones.",
    support: "Long-running disputes, one team on the record the whole way down.",
    colour: "aqua",
    aperture: "turn-right",
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
