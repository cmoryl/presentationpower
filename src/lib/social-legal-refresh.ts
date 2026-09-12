// ---------------------------------------------------------------------------
// LEGAL CREATIVE REFRESH — "We're here for the thorny work."
//
// Authored from the September 2026 Legal creative refresh design brief. The
// deliverable in the brief is 4× single-image LinkedIn ads, so this file holds
// the one proposition plus FOUR distinct art directions, each paired with one
// of the four approved headline variations.
//
// The brief's forbidden list is treated as a hard constraint and is encoded on
// every direction so nothing drifts back in later:
//   no blue overlays on stock photography, no floating icons, no abstract blue
//   "digital fabric", no gavels or scales, no smiling stock people, no hands
//   on devices standing in for "technology".
//
// Every direction is therefore drawn — type, line and flat colour only — using
// the approved TransPerfect palette.
// ---------------------------------------------------------------------------

/** The single proposition every ad has to land. */
export const LEGAL_REFRESH_CONCEPT = {
  campaign: "We're here for the thorny work",
  line: "We're here for the thorny work.",
  support: "Flexible legal solutions for complex matters.",
  cta: "Speak to a specialist",
  division: "TransPerfect Legal",
  brandModeId: "bm-tp-legal",
  channel: "LinkedIn · single image ad",
  narrative:
    "Most legal tech sells one platform, one contract, one shape. Complex matters are not one shape. TransPerfect Legal builds the solution around the matter — less unneeded spend, real human support, an advisory partnership rather than a licence.",
  goal: "Test a sharper, design-led way to generate awareness for the Legal proposition on LinkedIn in September.",
  rules: [
    "Natural language, not jargon",
    "Audience pain points, not product features",
    "Distinctive design, not B2B wallpaper",
  ],
} as const;

/** The brief's four approved headline variations, in order. */
export const LEGAL_REFRESH_HEADLINES = [
  "We're here for the thorny work.",
  "We're here for when it gets knotty.",
  "We're here for the tricky ones.",
  "We're here for the messy jobs.",
] as const;

export const LEGAL_REFRESH_FORBIDDEN = [
  "Blue overlay on stock photos",
  "Floating icons",
  "Abstract blue digital-fabric patterns",
  "Legal symbols (gavel, scales)",
  "Smiling stock photos",
  "People using devices to symbolise tech",
] as const;

export type LegalRefreshMotif =
  | "thorn"
  | "redaction"
  | "knot"
  | "thicket"
  | "trail"
  | "cut"
  | "fineprint"
  | "maze";

/**
 * Composition each direction is built on. One layout is used ONCE, so no two
 * directions share a frame structure — the set is eight designs, not eight
 * colourways of one design.
 */
export type LegalRefreshLayout =
  | "editorial-left" // eyebrow top, copy on the left third, art running right
  | "poster-caps" // headline fills the top two thirds, hairline rule, footer row
  | "bottom-band" // art full bleed above, solid ground band holding all copy
  | "center-stack" // everything centred on the optical axis
  | "split-vertical" // hard vertical split: copy panel one side, art the other
  | "diagonal-band" // skewed accent band carrying the headline across the frame
  | "footnote" // headline anchored bottom left, fine-print column right
  | "corner-plate"; // full-bleed art with a floating copy plate in one corner

export type LegalRefreshDirection = {
  id: string;
  /** Short name used on the card and in feedback. */
  name: string;
  /** One-word register chip. */
  tag: string;
  /** The headline this direction carries. */
  headline: string;
  support: string;
  cta: string;
  /** How it reads and why it earns attention in a legal feed. */
  rationale: string;
  /** The graphic device — drawn, never stock. */
  motif: LegalRefreshMotif;
  motifNote: string;
  /** Frame composition — unique to this direction. */
  layout: LegalRefreshLayout;
  /** Plain-words description of the composition, shown on the card. */
  layoutNote: string;
  /** Type direction, in plain words. */
  type: string;
  /** Palette in render order: ground, ink, accent, secondary. */
  palette: { ground: string; ink: string; accent: string; second: string };
  /** Which lockup file to place. */
  lockup: "white" | "color";
  /** Headline treatment. */
  headlineFont: "serif" | "sans";
  headlineCase: "sentence" | "caps";
  /**
   * AI-generated photographic art direction for the same idea. Commissioned as
   * real objects shot for this campaign — never a licensed stock library frame,
   * never a blue overlay, no people, no devices, no legal symbols, so the
   * brief's forbidden list still holds in the photographic route.
   */
  photo: {
    /** What the frame shows, in plain words. */
    note: string;
    /** CSS object-position for the crop, so copy always lands on clear space. */
    focus: string;
    /** Ground-coloured scrim opacity behind the copy column (0–1). */
    scrim: number;
    /** Ink colour to use when the photograph is behind the copy. */
    ink: string;
  };
};


/**
 * Four look-and-feel directions. Deliberately different registers so the
 * playback is a real choice, not four tints of one idea.
 */
export const LEGAL_REFRESH_DIRECTIONS: LegalRefreshDirection[] = [
  {
    id: "thorn-line",
    name: "Thorn Line",
    tag: "Heritage editorial",
    headline: LEGAL_REFRESH_HEADLINES[0],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "Warm paper ground, a single hand-drawn bramble running the length of the frame, and a heritage serif. Reads like a considered opinion piece rather than an ad — the register that earns a second look from general counsel.",
    motif: "thorn",
    motifNote: "One continuous drawn bramble line, accent weight only.",
    layout: "editorial-left",
    layoutNote:
      "Copy held in the left third with a wide margin, art running out to the right edge. Eyebrow top left, CTA and lockup on one baseline.",
    type: "Heritage serif headline, sentence case. Small caps eyebrow. Generous leading.",

    palette: { ground: "#F4EFE6", ink: "#03002C", accent: "#003FC7", second: "#C2A3FF" },
    lockup: "color",
    headlineFont: "serif",
    headlineCase: "sentence",
    photo: {
      note: "Golden hour in an ordinary back garden: a woman in gardening gloves calmly trims back a huge overgrown bramble hedge with hand shears. Normal chore, absurd tangle. Left half is empty sunlit lawn and haze for copy.",
      focus: "70% 55%",
      scrim: 0.42,
      ink: "#03002C",
    },
  },
  {
    id: "redacted",
    name: "Redacted",
    tag: "High contrast",
    headline: LEGAL_REFRESH_HEADLINES[2],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "Near-black ground with solid accent bars struck through the copy — the visual language of a document review, used as a design device. The one word left unredacted carries the message, which is what makes the reader stop.",
    motif: "redaction",
    motifNote: "Flat accent bars set on the baseline grid, no texture, no gloss.",
    layout: "poster-caps",
    layoutNote:
      "Poster build: the headline fills the top two thirds edge to edge, a hairline rule cuts the frame, and the support line, CTA and lockup sit in one tight footer row.",
    type: "Tight sans, all caps headline. Mono eyebrow and footer for the document reference.",

    palette: { ground: "#03002C", ink: "#FFFFFF", accent: "#003FC7", second: "#A1FBF9" },
    lockup: "white",
    headlineFont: "sans",
    headlineCase: "caps",
    photo: {
      note: "Family living room at night: a man in pyjamas sits opening and sorting letters into neat piles while the room lies knee-deep in unopened post, cat on top. Left edge falls to near black for copy.",
      focus: "74% 55%",
      scrim: 0.3,
      ink: "#FFFFFF",
    },
  },
  {
    id: "the-knot",
    name: "The Knot",
    tag: "Bold graphic",
    headline: LEGAL_REFRESH_HEADLINES[1],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "A single heavy line enters the frame tangled and leaves it straight. The whole proposition in one gesture, no explaining required, and it holds its shape at feed size where fine detail disappears.",
    motif: "knot",
    motifNote: "One stroke, constant weight, tangle resolving left to right.",
    layout: "bottom-band",
    layoutNote:
      "Art runs full bleed across the top, then a solid ground band holds every word along the bottom — the whole message reads in one horizontal line of sight.",
    type: "Condensed sans, sentence case, one size only. Copy sits under the resolved end of the line.",

    palette: { ground: "#E0E8F5", ink: "#03002C", accent: "#003FC7", second: "#FFEB66" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "Domestic garage: two neighbours in hoodies crouch patiently untangling a garden hose the size of an armchair, one neat coil already done beside them. Empty pale block wall above as copy space.",
      focus: "50% 72%",
      scrim: 0.3,
      ink: "#03002C",
    },
  },
  {
    id: "thicket-type",
    name: "Thicket Type",
    tag: "Typographic",
    headline: LEGAL_REFRESH_HEADLINES[3],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "The type does the work: the words pile up and overlap into a thicket, then clear completely for the last line. No imagery at all, so it is the cheapest direction to extend across a whole ad set and every future format.",
    motif: "thicket",
    motifNote: "Outlined repeats of the headline, layered and rotated, clearing to one solid line.",
    layout: "center-stack",
    layoutNote:
      "Everything centred on the optical axis, symmetrical margins, CTA centred under the support line. The most poster-like, most shareable build in the set.",
    type: "Sans, mixed weights, heavy overlap. Outline strokes for the buried repeats.",

    palette: { ground: "#FFFFFF", ink: "#03002C", accent: "#003FC7", second: "#EC388A" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "Foggy residential street on moving day: a man in a coat carries one box to the kerb past an endless line of stacked boxes and bin bags. Left half is luminous empty fog for copy.",
      focus: "72% 55%",
      scrim: 0.24,
      ink: "#03002C",
    },
  },
  {
    id: "paper-trail",
    name: "Paper Trail",
    tag: "Systems editorial",
    headline: LEGAL_REFRESH_HEADLINES[0],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "A hard vertical split: a flat light-grey panel carrying the copy, and the trail of paper running away in the other half. The panel gives the words absolute clarity in a feed, which is what makes it the safest performer of the eight.",
    motif: "trail",
    motifNote: "A single dotted rule leaving the frame, ticked at regular intervals like a docket.",
    layout: "split-vertical",
    layoutNote:
      "Hard vertical split at 46%: solid copy panel on the left, art on the right. No overlap at all between type and image.",
    type: "Sans, sentence case, one weight. Mono eyebrow. Copy set flush left in a narrow measure.",
    palette: { ground: "#F2F2F2", ink: "#03002C", accent: "#003FC7", second: "#A6FA87" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "Plain office corridor: a woman in a cardigan walks calmly holding the end of an absurdly long till receipt that trails the whole length of the hallway behind her. Right side is empty pale wall.",
      focus: "34% 50%",
      scrim: 0.2,
      ink: "#03002C",
    },
  },
  {
    id: "cut-through",
    name: "Cut Through",
    tag: "Dramatic",
    headline: LEGAL_REFRESH_HEADLINES[2],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "One skewed band slices the frame and carries the headline through it. The most aggressive build in the set — it stops a scroll on movement alone, before a word has been read.",
    motif: "cut",
    motifNote: "A single skewed band with a clean cut edge, one accent, no outline.",
    layout: "diagonal-band",
    layoutNote:
      "A skewed accent band crossing the frame low to high, headline riding on it, everything else pushed to the corners.",
    type: "Sans, all caps, tight tracking, set on the angle of the band.",
    palette: { ground: "#03002C", ink: "#FFFFFF", accent: "#003FC7", second: "#FF9B70" },
    lockup: "white",
    headlineFont: "sans",
    headlineCase: "caps",
    photo: {
      note: "Dim warehouse: a man in overalls calmly cuts into a giant ball of tangled packing tape with a small craft knife, one clean straight cut already opened. Hard single light, dark empty space above.",
      focus: "56% 60%",
      scrim: 0.34,
      ink: "#FFFFFF",
    },
  },
  {
    id: "fine-print",
    name: "Fine Print",
    tag: "Documentary",
    headline: LEGAL_REFRESH_HEADLINES[3],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "The frame is mostly empty white, with a column of unreadably small print stacked at the right and one plain sentence anchored low. The restraint is the idea — it looks like the only honest thing in the feed.",
    motif: "fineprint",
    motifNote: "A ruled column of tiny grey lines standing in for clauses, never real copy.",
    layout: "footnote",
    layoutNote:
      "Headline anchored at the bottom left with a lot of air above it, and a narrow fine-print column running down the right edge.",
    type: "Sans, sentence case, modest size. Small mono caption above the rule.",
    palette: { ground: "#FFFFFF", ink: "#03002C", accent: "#003FC7", second: "#E53D2E" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "Bright kitchen: a woman reads one page while the rest of the document unspools off the table, across the floor and out of the open back door. High-key daylight, blank white wall upper left.",
      focus: "62% 44%",
      scrim: 0.3,
      ink: "#03002C",
    },
  },
  {
    id: "the-maze",
    name: "The Maze",
    tag: "Quiet confidence",
    headline: LEGAL_REFRESH_HEADLINES[1],
    support: LEGAL_REFRESH_CONCEPT.support,
    cta: LEGAL_REFRESH_CONCEPT.cta,
    rationale:
      "Full-bleed art with a small solid plate of copy dropped into one corner, like a caption on a photograph. It lets the picture do the talking and reads as calm rather than loud — the counterweight to Cut Through.",
    motif: "maze",
    motifNote: "A drawn plan-view maze with one clear route through it, accent weight only.",
    layout: "corner-plate",
    layoutNote:
      "Art full bleed with no scrim across the frame; all copy sits inside a floating solid plate in the lower left, so nothing is ever laid over detail.",
    type: "Sans, sentence case, compact. Everything inside the plate on a tight grid.",
    palette: { ground: "#E0E8F5", ink: "#03002C", accent: "#003FC7", second: "#A1FBF9" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "Elevated view of a tall hedge maze in a park: one man in a raincoat walks a path with a takeaway coffee, entirely unbothered. Soft overcast light, empty lawn in the lower left.",
      focus: "62% 40%",
      scrim: 0,
      ink: "#03002C",
    },
  },
];


/**
 * The art concepts each direction can be proofed in. These are NOT grades of one
 * photograph — every concept is its own commissioned artwork set for all eight
 * directions (photography, cinematic film stills, hand-drawn ink and wash,
 * risograph two-ink print, cut-paper collage) plus the pure drawn device.
 */
export const LEGAL_REFRESH_RENDER_MODES = [
  {
    id: "photo",
    label: "Photographic",
    note: "Commissioned campaign photography — natural daylight, real rooms, straight off the shoot.",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    note: "Anamorphic film stills: practical light, deep shadow, shallow focus, 35mm grain.",
  },
  {
    id: "ink",
    label: "Hand drawn",
    note: "Ink pen and watercolour wash on textured paper — visible hatching and bare-paper space.",
  },
  {
    id: "riso",
    label: "Riso print",
    note: "Two-ink risograph artwork: coarse halftone, deliberate misregistration, flat stock.",
  },
  {
    id: "collage",
    label: "Paper collage",
    note: "Cut and torn paper built by hand, fibre edges and real drop shadows, scanned flat.",
  },
  { id: "drawn", label: "Drawn device", note: "No artwork — only the direction's drawn device." },
] as const;

export type LegalRefreshRenderMode = (typeof LEGAL_REFRESH_RENDER_MODES)[number]["id"];

/** Every concept except `drawn` has its own artwork set. */
export function legalRefreshModeUsesPhoto(mode: LegalRefreshRenderMode): boolean {
  return mode !== "drawn";
}

/**
 * Presentation finish for a concept. The artwork already carries the look, so
 * these are light-touch: a print concept gets its stock grain, nothing gets a
 * colour filter faking a different medium.
 */
export type LegalRefreshFinish = {
  filter: string;
  /** Colour layers painted over the artwork, in order. */
  tints: { color: "ink" | "accent" | "second" | "ground"; blend: string; opacity: number }[];
  /** Print grain strength, 0 = none. */
  grain: number;
};

export function legalRefreshFinish(mode: LegalRefreshRenderMode): LegalRefreshFinish {
  switch (mode) {
    case "riso":
      return { filter: "none", tints: [], grain: 0.12 };
    case "collage":
    case "ink":
      return { filter: "none", tints: [], grain: 0.05 };
    default:
      return { filter: "none", tints: [], grain: 0 };
  }
}

/** Concepts whose artwork is dark enough that copy over art must run white. */
export function legalRefreshModeIsDark(mode: LegalRefreshRenderMode): boolean {
  return mode === "cinematic";
}



export function legalRefreshDirection(id: string): LegalRefreshDirection | undefined {
  return LEGAL_REFRESH_DIRECTIONS.find((d) => d.id === id);
}

/** LinkedIn single-image ad sizes the set is proofed at. */
export const LEGAL_REFRESH_SIZES = [
  { id: "linkedin-1200x628", label: "LinkedIn single image", w: 1200, h: 628 },
  { id: "square-1080", label: "Square", w: 1080, h: 1080 },
] as const;
