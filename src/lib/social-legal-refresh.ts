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

export type LegalRefreshMotif = "thorn" | "redaction" | "knot" | "thicket";

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
    type: "Heritage serif headline, sentence case. Small caps eyebrow. Generous leading.",
    palette: { ground: "#F4EFE6", ink: "#03002C", accent: "#003FC7", second: "#C2A3FF" },
    lockup: "color",
    headlineFont: "serif",
    headlineCase: "sentence",
    photo: {
      note: "Macro of a real bramble, backlit by low window light against warm paper tone. Thorns hard-lit, ground soft.",
      focus: "78% 50%",
      scrim: 0.72,
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
    type: "Tight sans, all caps headline. Mono eyebrow and footer for the document reference.",
    palette: { ground: "#03002C", ink: "#FFFFFF", accent: "#003FC7", second: "#A1FBF9" },
    lockup: "white",
    headlineFont: "sans",
    headlineCase: "caps",
    photo: {
      note: "A stack of paperwork seen edge-on in near darkness, one raking sliver of light on the page edges.",
      focus: "72% 50%",
      scrim: 0.62,
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
    type: "Condensed sans, sentence case, one size only. Copy sits under the resolved end of the line.",
    palette: { ground: "#E0E8F5", ink: "#03002C", accent: "#003FC7", second: "#FFEB66" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "One hemp rope, tangled into a knot then running dead straight out of frame. Studio light, pale grey sweep.",
      focus: "72% 45%",
      scrim: 0.7,
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
    type: "Sans, mixed weights, heavy overlap. Outline strokes for the buried repeats.",
    palette: { ground: "#FFFFFF", ink: "#03002C", accent: "#003FC7", second: "#EC388A" },
    lockup: "color",
    headlineFont: "sans",
    headlineCase: "sentence",
    photo: {
      note: "A dense winter thicket of briars thinning out into clean white fog — the mess clearing, shot for real.",
      focus: "80% 55%",
      scrim: 0.76,
      ink: "#03002C",
    },
  },
];

/** The two art routes each direction can be proofed in. */
export const LEGAL_REFRESH_RENDER_MODES = [
  { id: "photo", label: "Photographic" },
  { id: "drawn", label: "Drawn" },
] as const;

export type LegalRefreshRenderMode = (typeof LEGAL_REFRESH_RENDER_MODES)[number]["id"];

export function legalRefreshDirection(id: string): LegalRefreshDirection | undefined {
  return LEGAL_REFRESH_DIRECTIONS.find((d) => d.id === id);
}

/** LinkedIn single-image ad sizes the set is proofed at. */
export const LEGAL_REFRESH_SIZES = [
  { id: "linkedin-1200x628", label: "LinkedIn single image", w: 1200, h: 628 },
  { id: "square-1080", label: "Square", w: 1080, h: 1080 },
] as const;
