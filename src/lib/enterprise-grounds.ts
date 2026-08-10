
/**
 * Enterprise White — the saved ground set.
 *
 * The first pass at the enterprise light page used a single corner-wash recipe
 * for every module, so a deck read flat and, worse, the tint landed wherever
 * the recipe felt like putting it — sometimes straight under a headline, other
 * times nowhere near the composition. This module replaces that with a curated,
 * named SET of grounds that are *composition aware*:
 *
 *  • Every ground shares the same base field, palette and veil grammar, so a
 *    deck stays cohesive and continuous from slide to slide.
 *  • Each ground declares where the content lives (rule-of-thirds zones) and
 *    pushes colour into the OPPOSITE thirds, so copy always sits on clean
 *    white and the page still shows style.
 *  • Imagery modules get "halo" grounds: the accent bloom sits *behind* the
 *    media tile with a soft plinth beneath it, so a photo reads as lifted off
 *    the page instead of pasted onto it.
 *
 * Grounds are addressed by id and mapped per module layout in GROUND_BY_LAYOUT
 * (with a family-prefix fallback), so the same layout always renders the same
 * ground in the editor, present, share, print, export and library preview.
 */

export type EnterpriseGroundId =
  | "veil-corners"
  | "thirds-left"
  | "thirds-right"
  | "thirds-lower"
  | "thirds-upper"
  | "center-stage"
  | "column-rail"
  | "diagonal-sweep"
  | "horizon"
  | "grid-mesh"
  | "quiet"
  | "media-halo-left"
  | "media-halo-right"
  | "media-shelf"
  | "media-frame";

/** Which thirds the copy occupies — colour is pushed away from these. */
export type ContentZone = "left" | "right" | "center" | "upper" | "lower" | "full";

export type EnterpriseGround = {
  id: EnterpriseGroundId;
  label: string;
  description: string;
  /** Where content sits, for documentation + authoring UI. */
  contentZone: ContentZone;
  /** True when the ground is tuned to sit under a photo/media tile. */
  media?: boolean;
  /** Layer builder — returns CSS background layers, top layer first. */
  build: (accent: string) => string[];
};

/** Palette mirrored from ENTERPRISE_WHITE. Duplicated deliberately: importing
 *  slide-skin here would create an import cycle (slide-skin delegates to this
 *  module), and these are frozen master-template values. */
const INK = "#0B163F";
const DEFAULT_ACCENT = "#5CE1E6";

function rgba(hex: string, alpha: number): string {
  const h = (hex || "#5CE1E6").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const P = "#0150EF";
const LAV = "#C2A3FF";

/** Shared page field — identical on every ground, which is what makes the set
 *  feel continuous rather than like fifteen unrelated backgrounds. */
const FIELD = `linear-gradient(180deg, #FFFFFF 0%, #F6F9FF 100%)`;

/** A white veil that protects a rule-of-thirds region from tint. */
function veil(at: string, w: number, h: number, strength = 0.94): string {
  return `radial-gradient(${w}% ${h}% at ${at}, rgba(255,255,255,${strength}) 0%, rgba(255,255,255,${strength * 0.6}) 58%, rgba(255,255,255,0) 100%)`;
}

/** A colour bloom. */
function bloom(at: string, w: number, h: number, hex: string, alpha: number): string {
  return `radial-gradient(${w}% ${h}% at ${at}, ${rgba(hex, alpha)} 0%, ${rgba(hex, 0)} 74%)`;
}

/* ---------------------------------------------------------------------------
 * Drafting layer — the part that stops a white page reading as "bare".
 *
 * The gradient blooms alone gave colour but no *construction*: nothing on the
 * page suggested it had been drawn. These helpers add measured, printer-grade
 * geometry at ink alphas low enough to sit under body copy (0.03–0.07) — the
 * same trick a technical monograph uses: a page can be almost white and still
 * be visibly built.
 * ------------------------------------------------------------------------- */

/** Engineering dot field. Sits under everything, reads as paper tooth. */
function dots(hex: string, alpha: number, gap = 24, r = 1.05, at = "0 0"): string {
  return `radial-gradient(${rgba(hex, alpha)} ${r}px, rgba(255,255,255,0) ${r}px) ${at} / ${gap}px ${gap}px repeat`;
}

/** Fine diagonal hatch — used to weight a margin or a shelf. */
function hatch(deg: number, hex: string, alpha: number, gap = 7): string {
  return `repeating-linear-gradient(${deg}deg, ${rgba(hex, alpha)} 0px, ${rgba(hex, alpha)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) ${gap}px)`;
}

/** Ruled baselines, letterpress register. */
function rules(hex: string, alpha: number, gap = 72, axis: 0 | 90 = 0): string {
  return `repeating-linear-gradient(${axis}deg, ${rgba(hex, alpha)} 0px, ${rgba(hex, alpha)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) ${gap}px)`;
}

/**
 * Confine a texture layer to one region of the sheet.
 *
 * This is what keeps the drafting texture *compositional* instead of wallpaper:
 * a hatch tile sized to the left third and set `no-repeat` paints hairlines
 * only inside that third, so the reading two-thirds stay untouched white.
 */
function region(layer: string, pos: string, w: string, h: string): string {
  return `${layer} ${pos} / ${w} ${h} no-repeat`;
}

/** Concentric hairline rings — a target/orbit register around a focal point. */
function rings(at: string, hex: string, alpha: number, gap = 86): string {
  return `repeating-radial-gradient(circle at ${at}, rgba(255,255,255,0) 0px, rgba(255,255,255,0) ${gap - 1}px, ${rgba(hex, alpha)} ${gap - 1}px, ${rgba(hex, alpha)} ${gap}px)`;
}


/** A single measured hairline at a fractional position (0–1) on an axis. */
function line(pos: number, hex: string, alpha: number, axis: "x" | "y" = "x"): string {
  const deg = axis === "x" ? 90 : 180;
  const p = (pos * 100).toFixed(2);
  const q = (pos * 100 + 0.14).toFixed(2);
  return `linear-gradient(${deg}deg, rgba(255,255,255,0) ${p}%, ${rgba(hex, alpha)} ${p}%, ${rgba(hex, alpha)} ${q}%, rgba(255,255,255,0) ${q}%)`;
}

/** Corner crop marks, print-registration style. Four short rules inset 4%. */
function cropMarks(hex: string, alpha: number, len = 34, inset = "3.2%"): string[] {
  const bar = (h: boolean) =>
    `linear-gradient(${h ? 90 : 180}deg, ${rgba(hex, alpha)}, ${rgba(hex, alpha)})`;
  const size = (h: boolean) => (h ? `${len}px 1px` : `1px ${len}px`);
  const spots = [
    `left ${inset} top ${inset}`,
    `right ${inset} top ${inset}`,
    `left ${inset} bottom ${inset}`,
    `right ${inset} bottom ${inset}`,
  ];
  return spots.flatMap((spot) => [
    `${bar(true)} ${spot} / ${size(true)} no-repeat`,
    `${bar(false)} ${spot} / ${size(false)} no-repeat`,
  ]);
}

/** Accent edge bar — a printed spine on one side of the sheet. */
function spine(side: "left" | "right" | "top" | "bottom", hex: string, w = 6): string {
  const horiz = side === "top" || side === "bottom";
  const grad = horiz
    ? `linear-gradient(90deg, ${rgba(hex, 0.9)}, ${rgba(hex, 0.12)})`
    : `linear-gradient(180deg, ${rgba(hex, 0.9)}, ${rgba(hex, 0.12)})`;
  const pos = { left: "left top", right: "right top", top: "left top", bottom: "left bottom" }[side];
  const size = horiz ? `100% ${w}px` : `${w}px 100%`;
  return `${grad} ${pos} / ${size} no-repeat`;
}


export const ENTERPRISE_GROUNDS: Record<EnterpriseGroundId, EnterpriseGround> = {
  "veil-corners": {
    id: "veil-corners",
    label: "Veiled corners",
    description:
      "Pastel washes drift in from four corners over a dot field; crop marks register the sheet.",
    contentZone: "center",
    build: (a) => [
      ...cropMarks(INK, 0.16),
      line(0.5, INK, 0.05, "y"),
      veil("50% 52%", 62, 56),
      dots(INK, 0.055, 26),
      bloom("4% 3%", 50, 44, LAV, 0.32),
      bloom("98% 8%", 46, 40, a, 0.3),
      bloom("6% 96%", 54, 46, P, 0.2),
      bloom("100% 94%", 44, 38, a, 0.2),
      FIELD,
    ],
  },

  "thirds-left": {
    id: "thirds-left",
    label: "Left third field",
    description:
      "Hatched, spined left third with the third-line ruled in; copy reads on clean white right.",
    contentZone: "right",
    build: (a) => [
      spine("left", a, 6),
      line(0.318, INK, 0.1),
      veil("72% 50%", 58, 84, 0.95),
      `linear-gradient(90deg, ${rgba(INK, 0.05)} 0%, rgba(255,255,255,0) 31.8%)`,
      region(hatch(58, INK, 0.07, 9), "left top", "31.8%", "100%"),
      `linear-gradient(90deg, ${rgba(a, 0.2)} 0%, ${rgba(a, 0.08)} 22%, rgba(255,255,255,0) 38%)`,
      bloom("8% 26%", 42, 52, LAV, 0.34),
      bloom("2% 84%", 38, 46, P, 0.24),
      FIELD,
    ],
  },

  "thirds-right": {
    id: "thirds-right",
    label: "Right third field",
    description: "Mirror of the left third field — hatched right margin, ruled third line.",
    contentZone: "left",
    build: (a) => [
      spine("right", a, 6),
      line(0.682, INK, 0.1),
      veil("28% 50%", 58, 84, 0.95),
      `linear-gradient(270deg, ${rgba(INK, 0.05)} 0%, rgba(255,255,255,0) 31.8%)`,
      region(hatch(-58, INK, 0.07, 9), "right top", "31.8%", "100%"),
      `linear-gradient(270deg, ${rgba(a, 0.2)} 0%, ${rgba(a, 0.08)} 22%, rgba(255,255,255,0) 38%)`,
      bloom("94% 24%", 42, 52, LAV, 0.34),
      bloom("100% 82%", 38, 46, P, 0.24),
      FIELD,
    ],
  },

  "thirds-lower": {
    id: "thirds-lower",
    label: "Lower third rise",
    description: "Tint rises out of a ruled lower third; column ticks measure the base.",
    contentZone: "upper",
    build: (a) => [
      spine("bottom", a, 5),
      line(0.666, INK, 0.09, "y"),
      veil("50% 26%", 84, 52, 0.95),
      region(rules(INK, 0.07, 84, 90), "left bottom", "100%", "33.4%"),
      `linear-gradient(0deg, ${rgba(a, 0.18)} 0%, ${rgba(a, 0.07)} 20%, rgba(255,255,255,0) 42%)`,
      bloom("18% 100%", 48, 40, LAV, 0.3),
      bloom("86% 98%", 44, 36, P, 0.22),
      FIELD,
    ],
  },

  "thirds-upper": {
    id: "thirds-upper",
    label: "Upper third band",
    description: "A ruled band hangs across the top third above the content block.",
    contentZone: "lower",
    build: (a) => [
      spine("top", a, 5),
      line(0.334, INK, 0.09, "y"),
      veil("50% 74%", 84, 54, 0.95),
      region(rules(INK, 0.06, 26), "left top", "100%", "33.4%"),
      `linear-gradient(180deg, ${rgba(a, 0.18)} 0%, ${rgba(a, 0.07)} 20%, rgba(255,255,255,0) 44%)`,
      bloom("14% 0%", 46, 38, LAV, 0.3),
      bloom("88% 2%", 42, 34, P, 0.22),
      FIELD,
    ],
  },

  "center-stage": {
    id: "center-stage",
    label: "Centre stage",
    description: "Concentric hairline rings and a ring vignette centre a hero number.",
    contentZone: "center",
    build: (a) => [
      ...cropMarks(INK, 0.14),
      veil("50% 48%", 52, 48, 0.96),
      rings("50% 50%", INK, 0.055, 92),
      dots(INK, 0.04, 30),
      `radial-gradient(72% 66% at 50% 50%, rgba(255,255,255,0) 46%, ${rgba(a, 0.16)} 78%, ${rgba(P, 0.18)} 100%)`,
      bloom("50% 4%", 56, 30, LAV, 0.26),
      FIELD,
    ],
  },

  "column-rail": {
    id: "column-rail",
    label: "Column rail",
    description: "Accent rail on the left third line with a measured column grid to its right.",
    contentZone: "right",
    build: (a) => [
      spine("left", a, 4),
      `linear-gradient(90deg, rgba(255,255,255,0) 31.8%, ${rgba(a, 0.55)} 31.8%, ${rgba(a, 0.55)} 32.3%, rgba(255,255,255,0) 32.3%)`,
      veil("66% 52%", 62, 86, 0.95),
      region(rules(INK, 0.06, 116, 90), "right top", "68%", "100%"),
      bloom("6% 12%", 40, 44, LAV, 0.28),
      bloom("4% 92%", 36, 40, P, 0.2),
      FIELD,
    ],
  },

  "diagonal-sweep": {
    id: "diagonal-sweep",
    label: "Diagonal sweep",
    description: "A 22° sweep corner to corner, cut by a hatched counter-diagonal.",
    contentZone: "full",
    build: (a) => [
      ...cropMarks(INK, 0.14),
      veil("50% 50%", 66, 60, 0.93),
      hatch(112, INK, 0.035, 16),
      `linear-gradient(112deg, ${rgba(LAV, 0.28)} 0%, ${rgba(a, 0.16)} 34%, rgba(255,255,255,0) 62%, ${rgba(P, 0.16)} 100%)`,
      `linear-gradient(112deg, rgba(255,255,255,0) 33.6%, ${rgba(INK, 0.1)} 33.6%, ${rgba(INK, 0.1)} 33.9%, rgba(255,255,255,0) 33.9%)`,
      dots(INK, 0.04, 28),
      FIELD,
    ],
  },

  horizon: {
    id: "horizon",
    label: "Horizon",
    description: "A ruled split on the lower third line with tick marks stepping the timeline.",
    contentZone: "upper",
    build: (a) => [
      line(0.666, INK, 0.14, "y"),
      veil("50% 30%", 88, 46, 0.95),
      `repeating-linear-gradient(90deg, ${rgba(INK, 0.14)} 0px, ${rgba(INK, 0.14)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 104px) left bottom 33.4% / 100% 14px no-repeat`,
      `linear-gradient(180deg, rgba(255,255,255,0) 60%, ${rgba(a, 0.12)} 66.6%, ${rgba(P, 0.18)} 100%)`,
      region(hatch(180, INK, 0.04, 14), "left bottom", "100%", "33.4%"),
      bloom("80% 100%", 46, 36, LAV, 0.24),
      FIELD,
    ],
  },

  "grid-mesh": {
    id: "grid-mesh",
    label: "Blueprint mesh",
    description: "Two-tier measurement grid — 96px majors, 24px minors — plus corner wash.",
    contentZone: "full",
    build: (a) => [
      ...cropMarks(INK, 0.18),
      veil("50% 52%", 60, 54, 0.9),
      rules(INK, 0.055, 96),
      rules(INK, 0.055, 96, 90),
      rules(INK, 0.028, 24),
      rules(INK, 0.028, 24, 90),
      bloom("100% 4%", 44, 40, a, 0.24),
      bloom("0% 100%", 48, 42, LAV, 0.24),
      FIELD,
    ],
  },

  quiet: {
    id: "quiet",
    label: "Quiet",
    description: "Near-white with a dot tooth, one accent whisper and a thin baseline rule.",
    contentZone: "full",
    build: (a) => [
      line(0.94, INK, 0.1, "y"),
      veil("50% 50%", 74, 68, 0.96),
      dots(INK, 0.05, 22),
      bloom("100% 0%", 40, 34, a, 0.2),
      bloom("0% 100%", 42, 34, LAV, 0.18),
      FIELD,
    ],
  },

  "media-halo-left": {
    id: "media-halo-left",
    label: "Media halo — left",
    description: "Halo, plinth and hatched margin behind a left image; copy right on white.",
    contentZone: "right",
    media: true,
    build: (a) => [
      spine("left", a, 5),
      line(0.62, INK, 0.08),
      veil("74% 50%", 54, 86, 0.96),
      // Plinth — a grounded shadow beneath the media tile so the photo lifts.
      `radial-gradient(26% 9% at 33% 89%, ${rgba(INK, 0.1)} 0%, ${rgba(INK, 0)} 78%)`,
      region(hatch(58, INK, 0.06, 10), "left top", "34%", "100%"),
      // Halo — sits *behind* the tile and reads as a glow around its edges.
      bloom("33% 46%", 44, 62, a, 0.42),
      bloom("6% 14%", 40, 44, LAV, 0.3),
      FIELD,
    ],
  },

  "media-halo-right": {
    id: "media-halo-right",
    label: "Media halo — right",
    description: "Halo, plinth and hatched margin behind a right image; copy left on white.",
    contentZone: "left",
    media: true,
    build: (a) => [
      spine("right", a, 5),
      line(0.38, INK, 0.08),
      veil("26% 50%", 54, 86, 0.96),
      `radial-gradient(26% 9% at 67% 89%, ${rgba(INK, 0.1)} 0%, ${rgba(INK, 0)} 78%)`,
      region(hatch(-58, INK, 0.06, 10), "right top", "34%", "100%"),
      bloom("67% 46%", 44, 62, a, 0.42),
      bloom("96% 14%", 40, 44, LAV, 0.3),
      FIELD,
    ],
  },

  "media-shelf": {
    id: "media-shelf",
    label: "Media shelf",
    description: "A ruled, tinted shelf under a full-width image strip so the row sits on something.",
    contentZone: "lower",
    media: true,
    build: (a) => [
      spine("bottom", a, 6),
      line(0.64, INK, 0.12, "y"),
      veil("50% 82%", 86, 34, 0.96),
      `repeating-linear-gradient(90deg, ${rgba(INK, 0.1)} 0px, ${rgba(INK, 0.1)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 88px) left bottom / 100% 100% repeat`,
      `linear-gradient(180deg, ${rgba(a, 0.28)} 0%, ${rgba(a, 0.11)} 40%, rgba(255,255,255,0) 68%)`,
      `radial-gradient(54% 7% at 50% 65%, ${rgba(INK, 0.09)} 0%, ${rgba(INK, 0)} 80%)`,
      bloom("4% 6%", 42, 40, LAV, 0.26),
      FIELD,
    ],
  },

  "media-frame": {
    id: "media-frame",
    label: "Media frame",
    description: "Colour and crop marks pressed to the outer margin so a centred image reads framed.",
    contentZone: "center",
    media: true,
    build: (a) => [
      ...cropMarks(INK, 0.2, 40, "2.6%"),
      veil("50% 50%", 46, 44, 0.97),
      `radial-gradient(80% 74% at 50% 50%, rgba(255,255,255,0) 40%, ${rgba(a, 0.22)} 76%, ${rgba(LAV, 0.28)} 100%)`,
      region(hatch(112, INK, 0.055, 12), "left bottom", "100%", "13%"),
      `radial-gradient(42% 8% at 50% 93%, ${rgba(INK, 0.09)} 0%, ${rgba(INK, 0)} 80%)`,
      FIELD,
    ],
  },
};


export const ENTERPRISE_GROUND_IDS = Object.keys(ENTERPRISE_GROUNDS) as EnterpriseGroundId[];

/**
 * Per-layout assignment. Chosen by where each module actually puts its content,
 * not at random — this is the "saved set" the modules draw from.
 */
export const GROUND_BY_LAYOUT: Partial<Record<string, EnterpriseGroundId>> = {
  // Covers & openings — hero type sits upper-left or centre.
  "MV-OP-COVER": "thirds-lower",
  "MV-OP-COVER-MINIMAL": "center-stage",
  "MV-OP-COVER-MEDIA": "media-halo-right",
  "MV-OP-COVER-EDITORIAL": "media-halo-right",
  "MV-OP-COVER-SPLIT": "thirds-right",
  "MV-OP-COVER-POSTER": "diagonal-sweep",
  "MV-OP-COVER-GRID": "grid-mesh",
  "MV-OP-COVER-DOSSIER": "quiet",
  "MV-OP-COVER-GRADIENT": "diagonal-sweep",
  "MV-OP-COVER-MONOGRAM": "center-stage",
  "MV-OP-COVER-STACKED": "thirds-lower",
  "MV-OP-AGENDA": "thirds-left",
  "MV-OP-AGENDA-VERTICAL": "column-rail",
  "MV-OP-DIVIDER": "diagonal-sweep",
  "MV-OP-DIVIDER-NUMBERED": "thirds-left",
  "MV-OP-INTRO-TEAM": "media-shelf",

  // Insight / editorial — one idea, generous white.
  "MV-INS-BIG-IDEA": "center-stage",
  "MV-INS-CALLOUT": "thirds-left",
  "MV-INS-SO-WHAT": "thirds-lower",
  "MV-INS-QUOTE": "thirds-right",
  "MV-INS-OPPORTUNITY-SIZE": "center-stage",
  "MV-EDITORIAL-SPREAD": "thirds-right",
  "MV-SPLIT-MANIFESTO": "thirds-right",
  "MV-DEFINITION": "quiet",
  "MV-PRINCIPLES": "column-rail",
  "MV-HORIZON": "horizon",
  "MV-COUNTDOWN": "center-stage",

  // Imagery-led — halo/plinth grounds highlight what sits over them.
  "MV-IMG-FULL-BLEED": "media-frame",
  "MV-IMG-SPLIT": "media-halo-right",
  "MV-IMG-CAPTION": "media-halo-left",
  "MV-IMG-GRID-3": "media-shelf",
  "MV-IMG-GRID-6": "media-shelf",
  "MV-IMG-PORTRAIT": "media-halo-left",
  "MV-IMG-QUOTE-BG": "media-frame",
  "MV-IMG-BEFORE-AFTER": "media-shelf",
  "MV-IMG-STAT-CALLOUT": "media-halo-right",
  "MV-IMG-STRIP": "media-shelf",
  "MV-IMG-MATRIX-4": "media-shelf",
  "MV-IMG-MATRIX-6": "media-shelf",
  "MV-ED-HERO-BLEED": "media-frame",
  "MV-ED-HERO-ORB": "center-stage",
  "MV-ED-DIVIDER-XL": "diagonal-sweep",
  "MV-ED-KICKER-POSTER": "thirds-lower",
  "MV-ED-STAT-PHOTO": "media-halo-right",
  "MV-ED-QUOTE-BLEED": "media-frame",
  "MV-QUOTE-PORTRAIT": "media-halo-left",
  "MV-QUOTE-POSTER": "thirds-lower",
  "MV-QUOTE-MULTI": "quiet",
  "MV-QUOTE-CARD": "thirds-right",
  "MV-QUOTE-METRIC": "center-stage",
  "MV-STAT-IMAGE-TYPE": "media-halo-left",
  "MV-STAT-PHOTO-TRIO": "media-shelf",
  "MV-STAT-PHOTO-BAND": "media-shelf",
  "MV-STAT-PORTRAIT-PROOF": "media-halo-left",
  "MV-TEAM-BIOS-3": "media-shelf",
  "MV-TEAM-BIOS-4": "media-shelf",
  "MV-CASE-SPREAD": "media-halo-right",
  "MV-CASE-STORY": "media-halo-left",

  // Stats & KPI.
  "MV-STAT-HERO-NUMBER": "center-stage",
  "MV-STAT-TYPE-WALL": "diagonal-sweep",
  "MV-STAT-KPI-RAIL": "column-rail",
  "MV-STAT-ORBIT": "center-stage",
  "MV-STAT-ACTUAL-TARGET": "thirds-lower",
  "MV-STAT-EDITORIAL-DASH": "thirds-right",
  "MV-STAT-MOSAIC": "diagonal-sweep",
  "MV-NUMBERS-TRIPTYCH": "thirds-upper",
  "MV-CTX-STAT-GRID": "thirds-upper",
  "MV-PROOF-STATS-2": "thirds-upper",
  "MV-PROOF-STATS-3": "thirds-upper",
  "MV-PROOF-STATS-4": "thirds-upper",
  "MV-CASE-METRICS": "thirds-upper",
  "MV-CLOSE-METRIC-PROMISE": "center-stage",

  // Data, dashboards, charts — blueprint mesh keeps plots legible.
  "MV-KPI-DASHBOARD": "grid-mesh",
  "MV-DASH-SUMMARY": "grid-mesh",
  "MV-DASH-DONUT-TRIO": "quiet",
  "MV-DASH-SALES-CHART": "grid-mesh",
  "MV-DASH-GAUGE-ROW": "thirds-upper",
  "MV-DASH-PERFORMANCE": "grid-mesh",
  "MV-DASH-REPORT-CARDS": "quiet",
  "MV-DASH-GROWTH-COLUMNS": "horizon",
  "MV-DASH-BREAKDOWN": "grid-mesh",
  "MV-DASH-REGION-STATS": "quiet",

  // Logo walls, tables, matrices — stay quiet under dense content.
  "MV-PROOF-LOGOS": "quiet",
  "MV-PROOF-LOGOS-STRIP": "media-shelf",
  "MV-PROOF-LOGOS-MARQUEE": "media-shelf",
  "MV-PROOF-LOGOS-FEATURED": "quiet",
  "MV-PROOF-LOGOS-CATEGORIZED": "quiet",
  "MV-PROOF-LOGOS-MOSAIC": "quiet",
  "MV-LOGO-WALL": "quiet",
  "MV-CLIENT-MATRIX": "quiet",
  "MV-CLIENT-COMPARE": "quiet",
  "MV-CLIENT-DETAIL-3": "media-shelf",
  "MV-DEC-COMPARE-TABLE": "quiet",
  "MV-DEC-MATRIX": "grid-mesh",
  "MV-MATRIX-2X2": "grid-mesh",
  "MV-GOV-RACI": "quiet",
  "MV-COMM-PRICING": "thirds-upper",
  "MV-COMM-INVESTMENT": "center-stage",

  // Flow, process, journey.
  "MV-PROC-TIMELINE": "horizon",
  "MV-PROC-PHASES": "horizon",
  "MV-PROC-BEFORE-AFTER": "thirds-right",
  "MV-TIMELINE-VERTICAL": "column-rail",
  "MV-ROADMAP-QUARTERS": "horizon",
  "MV-JOURNEY-MAP": "horizon",
  "MV-FUNNEL": "center-stage",
  "MV-FLYWHEEL": "center-stage",
  "MV-ICEBERG": "horizon",
  "MV-MATURITY-CURVE": "horizon",
  "MV-INFO-FUNNEL": "center-stage",
  "MV-INFO-PYRAMID": "center-stage",
  "MV-INFO-DONUT": "center-stage",
  "MV-INFO-VENN": "center-stage",
  "MV-INFO-CIRCULAR-FLOW": "center-stage",
  "MV-INFO-BAR-COMPARE": "thirds-upper",
  "MV-BENTO-5": "diagonal-sweep",

  // Close.
  "MV-CLOSE-CTA": "thirds-lower",
  "MV-CLOSE-THANKS": "center-stage",
  "MV-CLOSE-QNA": "center-stage",
  "MV-CLOSE-CONTACT": "thirds-right",
  "MV-CLOSE-STATEMENT": "diagonal-sweep",
  "MV-CLOSE-SPLIT": "thirds-right",
  "MV-CLOSE-DUAL-CTA": "thirds-lower",
  "MV-CLOSE-DECISION": "thirds-upper",
  "MV-CLOSE-CALENDAR": "quiet",
  "MV-CLOSE-CHECKLIST": "column-rail",
  "MV-CLOSE-TIMELINE": "horizon",
};

/** Family-level fallback so unmapped and future modules still land sensibly. */
const PREFIX_FALLBACK: Array<[RegExp, EnterpriseGroundId]> = [
  [/^MV-(IMG|ED|QUOTE-PORTRAIT)/, "media-halo-right"],
  [/^MV-(VIZ|GRAPH|DASH|KPI)/, "grid-mesh"],
  [/^MV-(PROOF-LOGOS|CLIENT|LOGO|GOV|DEC-COMPARE)/, "quiet"],
  [/^MV-(STAT|PROOF-STATS|CTX-STAT)/, "thirds-upper"],
  [/^MV-(PROC|ROADMAP|JOURNEY|TIMELINE)/, "horizon"],
  [/^MV-(SOL|CTX|RISK|REC)/, "thirds-left"],
  [/^MV-(LOC)/, "diagonal-sweep"],
  [/^MV-(OP-COVER|CLOSE)/, "thirds-lower"],
];

export function groundIdForLayout(layoutId: string | undefined | null): EnterpriseGroundId {
  const id = (layoutId ?? "").toUpperCase();
  const direct = GROUND_BY_LAYOUT[id];
  if (direct) return direct;
  for (const [re, g] of PREFIX_FALLBACK) if (re.test(id)) return g;
  return "veil-corners";
}

/**
 * Resolve the CSS `background` shorthand for a module in the Enterprise White
 * skin. `groundId` lets a slide override the saved assignment.
 */
export function enterpriseGroundFor(
  layoutId: string | undefined | null,
  accentHex?: string,
  groundId?: EnterpriseGroundId | null,
): string {
  const ground = ENTERPRISE_GROUNDS[groundId ?? groundIdForLayout(layoutId)];
  return ground.build(accentHex || DEFAULT_ACCENT).join(", ");
}
