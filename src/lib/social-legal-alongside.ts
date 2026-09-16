// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — "You're not on it alone."
//
// Sixteen commissioned documentary frames. Every frame shows one expert
// committed to something hard, and a second person deliberately placed at a
// distance: watching, ready, not intervening. The relationship is subtle at
// first read and only lands on a second look, which is the whole idea.
//
// The Legal brief's forbidden list still holds on every frame: no blue overlay
// on the picture, no floating icons, no gavels or scales, no smiling stock, no
// hands on devices standing in for technology, no text baked into the artwork.
// ---------------------------------------------------------------------------

import climber from "@/assets/legal-refresh/adv-climber-belayer.jpg";
import rally from "@/assets/legal-refresh/adv-rally-codriver.jpg";
import golfer from "@/assets/legal-refresh/adv-golfer-caddie.jpg";
import tennis from "@/assets/legal-refresh/adv-tennis-doubles.jpg";
import boxer from "@/assets/legal-refresh/adv-boxer-corner.jpg";
import sailing from "@/assets/legal-refresh/adv-storm-sailing.jpg";
import cycling from "@/assets/legal-refresh/adv-cycling-pair.jpg";
import whitewater from "@/assets/legal-refresh/adv-whitewater-pair.jpg";
import pit from "@/assets/legal-refresh/adv-pit-crew.jpg";
import mountain from "@/assets/legal-refresh/adv-mountaineering-pair.jpg";
import kitchen from "@/assets/legal-refresh/adv-kitchen-service.jpg";
import backstage from "@/assets/legal-refresh/adv-backstage-crew.jpg";
import divers from "@/assets/legal-refresh/adv-dive-partners.jpg";
import lifter from "@/assets/legal-refresh/adv-lifter-spotter.jpg";
import rowing from "@/assets/legal-refresh/adv-rowing-crew.jpg";
import surf from "@/assets/legal-refresh/surf-safety-rider.jpg";

export const LEGAL_ALONGSIDE_CONCEPT = {
  campaign: "You're not on it alone",
  line: "You're not on it alone.",
  support: "Flexible legal solutions for complex matters.",
  cta: "Speak to a specialist",
  division: "TransPerfect Legal",
  brandModeId: "bm-tp-legal",
  channel: "LinkedIn · single image ad",
  narrative:
    "Every frame in this set is one expert fully committed to something hard, with a second person placed at a distance — watching, ready, not interfering. Nobody is being rescued and nobody is celebrating. That is the proposition: the matter stays yours, the support is already in position.",
  rules: [
    "The pair reads on the second look, never the first",
    "Never rescuing, never celebrating, no eye contact",
    "Documentary photography, no brands, no text in the artwork",
  ],
} as const;

/** Where the frame leaves clear space for copy. */
export type AlongsideClear = "left" | "right" | "bottom" | "top";

export type AlongsideScene = {
  id: string;
  /** Master-prompt number, kept so the set maps back to the brief. */
  no: string;
  /** Master-prompt title, e.g. "Climber + Belayer". */
  pair: string;
  /** Master-prompt theme, e.g. "Extreme Exposure". */
  theme: string;
  /** The ad headline this frame carries. */
  headline: string;
  /** Short caption shown under the frame on the board. */
  caption: string;
  /** The photographic craft note from the master prompt. */
  craft: string;
  src: string;
  /** CSS object-position for the landscape crop. */
  focus: string;
  /** CSS object-position for the square trim. */
  focusSquare: string;
  clear: AlongsideClear;
  /** Copy ink over this frame. */
  ink: "light" | "dark";
};

export const LEGAL_ALONGSIDE_SCENES: AlongsideScene[] = [
  {
    id: "climber-belayer",
    no: "01",
    pair: "Climber + Belayer",
    theme: "Extreme Exposure",
    headline: "The exposure is yours. The rope isn't.",
    caption:
      "A climber committed high on a limestone wall. Look again at the base of the frame and the belayer is already braced, watching the move.",
    craft: "35mm, f/5.6, 1/1600, ISO 320 — late raking light, real chalk and taped fingers.",
    src: climber,
    focus: "72% 45%",
    focusSquare: "72% 40%",
    clear: "left",
    ink: "light",
  },
  {
    id: "rally-codriver",
    no: "02",
    pair: "Rally Driver + Co-Driver",
    theme: "Complexity at Speed",
    headline: "Complex at speed is still readable — with the right notes.",
    caption:
      "Nobody drives a blind gravel stage on instinct. The pace notes in the right seat are what make the next corner survivable.",
    craft: "24mm, f/4, 1/500, ISO 800 — dust in every seam, hand-written notes, honest high-ISO grain.",
    src: rally,
    focus: "50% 50%",
    focusSquare: "45% 55%",
    clear: "top",
    ink: "light",
  },
  {
    id: "golfer-caddie",
    no: "03",
    pair: "Golfer + Caddie",
    theme: "The Impossible Lie",
    headline: "Some lies you can't improve. You can still play them.",
    caption:
      "A buried lie in a wet revetted bunker, in filthy weather. On the lip above, the caddie holds the line and the wind.",
    craft: "50mm, f/4, 1/1250, ISO 640 — real rain, mud-caked spikes, muted links greens.",
    src: golfer,
    focus: "35% 55%",
    focusSquare: "40% 55%",
    clear: "top",
    ink: "light",
  },
  {
    id: "tennis-doubles",
    no: "04",
    pair: "Tennis Doubles",
    theme: "Covering the Open Court",
    headline: "You go for the ball. Someone covers the open court.",
    caption:
      "One player fully committed to a low return. The partner is already moving to the space that opens the second they do.",
    craft: "135mm, f/2.8, 1/2500, ISO 400 — court dust airborne, sweat-soaked kit, no styling.",
    src: tennis,
    focus: "40% 45%",
    focusSquare: "45% 45%",
    clear: "top",
    ink: "light",
  },
  {
    id: "boxer-corner",
    no: "05",
    pair: "Boxer + Corner Coach",
    theme: "Between Rounds",
    headline: "The sixty seconds between rounds decide the next three minutes.",
    caption:
      "Nobody is stepping in to fight it for you. The corner exists to make the next round different from the last one.",
    craft: "85mm, f/2, 1/500, ISO 1600 — practical overhead light, real swelling, honest grain.",
    src: boxer,
    focus: "50% 40%",
    focusSquare: "48% 40%",
    clear: "bottom",
    ink: "light",
  },
  {
    id: "storm-sailing",
    no: "06",
    pair: "Sailing Crew",
    theme: "Calm Inside Chaos",
    headline: "Calm isn't the absence of weather.",
    caption:
      "Green water across the foredeck and one crew member buried in it. Aft, the helm holds a steady line through the same sea.",
    craft: "70mm, f/4, 1/2000, ISO 500 — frozen spray, salt-crusted kit, desaturated overcast grade.",
    src: sailing,
    focus: "70% 45%",
    focusSquare: "68% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "cycling-pair",
    no: "07",
    pair: "Road Cyclists",
    theme: "Taking the Wind",
    headline: "Somebody has to take the wind.",
    caption:
      "The front rider is paying for both of them. That is not generosity — it is how the pair arrives at all.",
    craft: "200mm, f/3.2, 1/1600, ISO 400 — compressed perspective, road grit, sunlit skin texture.",
    src: cycling,
    focus: "30% 50%",
    focusSquare: "35% 50%",
    clear: "right",
    ink: "light",
  },
  {
    id: "whitewater-pair",
    no: "08",
    pair: "Whitewater Pair",
    theme: "Committed to the Line",
    headline: "Once you're committed, the line is the plan.",
    caption:
      "Two paddlers in a grade-five drop, reading the same water half a second apart. No hesitation available.",
    craft: "300mm, f/4, 1/2000, ISO 800 — frozen droplets, scuffed helmets, cool canyon light.",
    src: whitewater,
    focus: "55% 45%",
    focusSquare: "58% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "pit-crew",
    no: "09",
    pair: "Driver + Pit Crew",
    theme: "Never Stop Moving",
    headline: "Standing still is the expensive part.",
    caption:
      "The driver's hands never leave the wheel. Everything that makes the next two hours possible happens around the car in seconds.",
    craft: "35mm, f/2.8, 1/250, ISO 1250 — practical garage light, heat shimmer, blurred crew, sharp driver.",
    src: pit,
    focus: "40% 50%",
    focusSquare: "40% 50%",
    clear: "right",
    ink: "light",
  },
  {
    id: "mountaineering-pair",
    no: "10",
    pair: "Mountaineering Pair",
    theme: "Connected Through the Whiteout",
    headline: "When you can't see the route, stay connected.",
    caption:
      "A corniced ridge in a near-whiteout. The only clear thing in the frame is the rope running back to the second climber.",
    craft: "85mm, f/2.8, 1/1000, ISO 640 — flat blizzard light, rime on every seam, delicate highlights.",
    src: mountain,
    focus: "70% 50%",
    focusSquare: "72% 50%",
    clear: "left",
    ink: "dark",
  },
  {
    id: "kitchen-service",
    no: "11",
    pair: "Chef + Sous-Chef",
    theme: "Controlled Pressure",
    headline: "Pressure isn't the problem. Uncontrolled pressure is.",
    caption:
      "Peak service, one plate at a time, with the second pair of hands working a metre away on the part that can't wait.",
    craft: "35mm, f/2, 1/400, ISO 1600 — mixed tungsten and hood light, stained whites, real burns.",
    src: kitchen,
    focus: "35% 45%",
    focusSquare: "38% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "backstage-crew",
    no: "12",
    pair: "Performer + Backstage Crew",
    theme: "Behind the Performance",
    headline: "The performance is yours. The cue isn't.",
    caption:
      "Seconds before an entrance. In the dark a metre away, the crew is holding the cue that makes the entrance work.",
    craft: "50mm, f/1.8, 1/160, ISO 2000 — chiaroscuro, cue-light glow, heavy black.",
    src: backstage,
    focus: "60% 45%",
    focusSquare: "62% 45%",
    clear: "left",
    ink: "light",
  },
  {
    id: "dive-partners",
    no: "13",
    pair: "Divers",
    theme: "Into the Unknown",
    headline: "Go into the unknown on a line, not a hunch.",
    caption:
      "One diver enters the wreck. The second holds position outside with the reel — the way back is the whole point.",
    craft: "20mm, f/5.6, 1/125, ISO 1250 — real particulate, torch scatter, cold cast with a warm pool.",
    src: divers,
    focus: "60% 50%",
    focusSquare: "62% 50%",
    clear: "left",
    ink: "light",
  },
  {
    id: "lifter-spotter",
    no: "14",
    pair: "Weightlifter + Spotter",
    theme: "Ready, Not Interfering",
    headline: "Ready. Not interfering.",
    caption:
      "Hands open, a hand's width from the bar, taking none of the weight. That is what real support looks like under load.",
    craft: "35mm, f/2.5, 1/500, ISO 1600 — chalk dust in a single overhead beam, honest skin flush.",
    src: lifter,
    focus: "45% 45%",
    focusSquare: "45% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "rowing-crew",
    no: "15",
    pair: "Rowing Crew",
    theme: "Precision Under Load",
    headline: "Precision is what survives the load.",
    caption:
      "Eight people at the catch, one shape, at the point where it hurts most. Precision is the only thing holding it together.",
    craft: "300mm, f/4, 1/1600, ISO 640 — cold dawn haze, blistered taped hands, matched blade angles.",
    src: rowing,
    focus: "30% 45%",
    focusSquare: "32% 45%",
    clear: "right",
    ink: "light",
  },
  {
    id: "surf-safety-rider",
    no: "16",
    pair: "Big-Wave Surfer + Safety Rider",
    theme: "Far Outside the Path",
    headline: "The wave is yours. You're still not out there alone.",
    caption:
      "A surfer the size of a thumbnail on an enormous face. Far outside the path, the safety rider is watching and ready.",
    craft: "400mm, f/5.6, 1/2500, ISO 500 — long-lens documentary sharpness, wind-blown spray, restrained colour.",
    src: surf,
    focus: "60% 35%",
    focusSquare: "62% 40%",
    clear: "bottom",
    ink: "light",
  },
];

/** Layout templates the board can switch between. */
export const LEGAL_ALONGSIDE_TEMPLATES = [
  {
    id: "editorial",
    label: "Editorial column",
    note: "Art to the far edge, copy held in a measured column on the clear side with a hairline masthead and the master number set against it.",
  },
  {
    id: "inset",
    label: "Museum inset",
    note: "The photograph floats inside a deep ground margin — nothing sits on the picture, the frame does the work.",
  },
  {
    id: "spine",
    label: "Rotated spine",
    note: "A narrow ground spine carries the division and number turned on its side; the headline sits on the art inside a soft wedge.",
  },
  {
    id: "ledger",
    label: "Ledger grid",
    note: "Art above, a three-column ledger below divided by hairlines: theme, headline, action.",
  },
  {
    id: "stack",
    label: "Offset plate",
    note: "Inset art with a ground plate stepped off the lower corner, accent hairline along its top edge.",
  },
  {
    id: "poster",
    label: "Poster masthead",
    note: "Caps headline in a ground masthead, the photograph opening beneath it as a window, tight footer strip.",
  },
  {
    id: "window",
    label: "Centred window",
    note: "The frame cropped to a window on wide margins, copy set beneath on a strict baseline.",
  },
  {
    id: "field",
    label: "Colour field step",
    note: "A ground field with an accent bar, the art stepped away from it so field and picture never fight.",
  },
  {
    id: "centre",
    label: "Centre axis",
    note: "Everything on the optical axis between two accent rules over a deep scrim.",
  },
] as const;


export type AlongsideTemplateId = (typeof LEGAL_ALONGSIDE_TEMPLATES)[number]["id"];

export const LEGAL_ALONGSIDE_SIZES = [
  { id: "linkedin", label: "LinkedIn", w: 1200, h: 628 },
  { id: "square", label: "Square", w: 1080, h: 1080 },
  { id: "story", label: "Story", w: 1080, h: 1350 },
] as const;

export type AlongsideSizeId = (typeof LEGAL_ALONGSIDE_SIZES)[number]["id"];

/** Palette used by every frame — enterprise tokens only. */
export const LEGAL_ALONGSIDE_PALETTE = {
  ground: "#03002C",
  ink: "#FFFFFF",
  accent: "#003FC7",
  light: "#EEF1F7",
} as const;

/** Opposite side helper, used to place a copy panel on the clear side. */
export function alongsideCopySide(clear: AlongsideClear): AlongsideClear {
  return clear;
}
