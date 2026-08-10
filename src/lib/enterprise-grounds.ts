
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

export const ENTERPRISE_GROUNDS: Record<EnterpriseGroundId, EnterpriseGround> = {
  "veil-corners": {
    id: "veil-corners",
    label: "Veiled corners",
    description: "Pastel washes drift in from all four corners; centre band stays white.",
    contentZone: "center",
    build: (a) => [
      veil("50% 52%", 62, 56),
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
    description: "Colour occupies the left third; the right two-thirds hold copy on white.",
    contentZone: "right",
    build: (a) => [
      veil("72% 50%", 58, 84, 0.95),
      `linear-gradient(90deg, ${rgba(a, 0.18)} 0%, ${rgba(a, 0.07)} 22%, rgba(255,255,255,0) 38%)`,
      bloom("8% 26%", 42, 52, LAV, 0.34),
      bloom("2% 84%", 38, 46, P, 0.24),
      FIELD,
    ],
  },

  "thirds-right": {
    id: "thirds-right",
    label: "Right third field",
    description: "Colour occupies the right third; copy reads on the clean left two-thirds.",
    contentZone: "left",
    build: (a) => [
      veil("28% 50%", 58, 84, 0.95),
      `linear-gradient(270deg, ${rgba(a, 0.18)} 0%, ${rgba(a, 0.07)} 22%, rgba(255,255,255,0) 38%)`,
      bloom("94% 24%", 42, 52, LAV, 0.34),
      bloom("100% 82%", 38, 46, P, 0.24),
      FIELD,
    ],
  },

  "thirds-lower": {
    id: "thirds-lower",
    label: "Lower third rise",
    description: "Tint rises out of the bottom third — for upper-weighted headlines.",
    contentZone: "upper",
    build: (a) => [
      veil("50% 26%", 84, 52, 0.95),
      `linear-gradient(0deg, ${rgba(a, 0.16)} 0%, ${rgba(a, 0.06)} 20%, rgba(255,255,255,0) 42%)`,
      bloom("18% 100%", 48, 40, LAV, 0.3),
      bloom("86% 98%", 44, 36, P, 0.22),
      FIELD,
    ],
  },

  "thirds-upper": {
    id: "thirds-upper",
    label: "Upper third band",
    description: "Tint hangs across the top third above the content block.",
    contentZone: "lower",
    build: (a) => [
      veil("50% 74%", 84, 54, 0.95),
      `linear-gradient(180deg, ${rgba(a, 0.16)} 0%, ${rgba(a, 0.06)} 20%, rgba(255,255,255,0) 44%)`,
      bloom("14% 0%", 46, 38, LAV, 0.3),
      bloom("88% 2%", 42, 34, P, 0.22),
      FIELD,
    ],
  },

  "center-stage": {
    id: "center-stage",
    label: "Centre stage",
    description: "Ring vignette around a bright centre — built for hero numbers.",
    contentZone: "center",
    build: (a) => [
      veil("50% 48%", 52, 48, 0.96),
      `radial-gradient(72% 66% at 50% 50%, rgba(255,255,255,0) 46%, ${rgba(a, 0.14)} 78%, ${rgba(P, 0.16)} 100%)`,
      bloom("50% 4%", 56, 30, LAV, 0.26),
      FIELD,
    ],
  },

  "column-rail": {
    id: "column-rail",
    label: "Column rail",
    description: "A soft accent rail on the left third line, columns to its right.",
    contentZone: "right",
    build: (a) => [
      veil("66% 52%", 62, 86, 0.95),
      `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 31.8%, ${rgba(a, 0.34)} 31.8%, ${rgba(a, 0.34)} 32.4%, rgba(255,255,255,0) 32.4%)`,
      bloom("6% 12%", 40, 44, LAV, 0.28),
      bloom("4% 92%", 36, 40, P, 0.2),
      FIELD,
    ],
  },

  "diagonal-sweep": {
    id: "diagonal-sweep",
    label: "Diagonal sweep",
    description: "One continuous 22° sweep corner to corner — quiet motion under grids.",
    contentZone: "full",
    build: (a) => [
      veil("50% 50%", 66, 60, 0.93),
      `linear-gradient(112deg, ${rgba(LAV, 0.26)} 0%, ${rgba(a, 0.14)} 34%, rgba(255,255,255,0) 62%, ${rgba(P, 0.14)} 100%)`,
      FIELD,
    ],
  },

  horizon: {
    id: "horizon",
    label: "Horizon",
    description: "A single soft split on the lower third line; copy above, tint below.",
    contentZone: "upper",
    build: (a) => [
      veil("50% 30%", 88, 46, 0.95),
      `linear-gradient(180deg, rgba(255,255,255,0) 60%, ${rgba(a, 0.1)} 66.6%, ${rgba(P, 0.16)} 100%)`,
      bloom("80% 100%", 46, 36, LAV, 0.24),
      FIELD,
    ],
  },

  "grid-mesh": {
    id: "grid-mesh",
    label: "Blueprint mesh",
    description: "Hairline measurement grid plus corner wash — for dashboards and charts.",
    contentZone: "full",
    build: (a) => [
      veil("50% 52%", 60, 54, 0.9),
      `repeating-linear-gradient(0deg, ${rgba(INK, 0.045)} 0px, ${rgba(INK, 0.045)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 96px)`,
      `repeating-linear-gradient(90deg, ${rgba(INK, 0.045)} 0px, ${rgba(INK, 0.045)} 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 96px)`,
      bloom("100% 4%", 44, 40, a, 0.24),
      bloom("0% 100%", 48, 42, LAV, 0.24),
      FIELD,
    ],
  },

  quiet: {
    id: "quiet",
    label: "Quiet",
    description: "Near-white with a single accent whisper — for dense tables and logo walls.",
    contentZone: "full",
    build: (a) => [
      veil("50% 50%", 74, 68, 0.96),
      bloom("100% 0%", 40, 34, a, 0.18),
      bloom("0% 100%", 42, 34, LAV, 0.16),
      FIELD,
    ],
  },

  "media-halo-left": {
    id: "media-halo-left",
    label: "Media halo — left",
    description: "Accent bloom and plinth behind a left-hand image; copy right on white.",
    contentZone: "right",
    media: true,
    build: (a) => [
      veil("74% 50%", 54, 86, 0.96),
      // Plinth — a grounded shadow beneath the media tile so the photo lifts.
      `radial-gradient(30% 12% at 33% 88%, ${rgba(INK, 0.16)} 0%, ${rgba(INK, 0)} 78%)`,
      // Halo — sits *behind* the tile and reads as a glow around its edges.
      bloom("33% 46%", 44, 62, a, 0.4),
      bloom("6% 14%", 40, 44, LAV, 0.3),
      FIELD,
    ],
  },

  "media-halo-right": {
    id: "media-halo-right",
    label: "Media halo — right",
    description: "Accent bloom and plinth behind a right-hand image; copy left on white.",
    contentZone: "left",
    media: true,
    build: (a) => [
      veil("26% 50%", 54, 86, 0.96),
      `radial-gradient(30% 12% at 67% 88%, ${rgba(INK, 0.16)} 0%, ${rgba(INK, 0)} 78%)`,
      bloom("67% 46%", 44, 62, a, 0.4),
      bloom("96% 14%", 40, 44, LAV, 0.3),
      FIELD,
    ],
  },

  "media-shelf": {
    id: "media-shelf",
    label: "Media shelf",
    description: "Tinted shelf under a full-width image strip so the row sits on something.",
    contentZone: "lower",
    media: true,
    build: (a) => [
      veil("50% 82%", 86, 34, 0.96),
      `linear-gradient(180deg, ${rgba(a, 0.26)} 0%, ${rgba(a, 0.1)} 40%, rgba(255,255,255,0) 68%)`,
      `radial-gradient(60% 10% at 50% 64%, ${rgba(INK, 0.14)} 0%, ${rgba(INK, 0)} 80%)`,
      bloom("4% 6%", 42, 40, LAV, 0.26),
      FIELD,
    ],
  },

  "media-frame": {
    id: "media-frame",
    label: "Media frame",
    description: "Colour pressed to the outer margin so a centred image reads framed.",
    contentZone: "center",
    media: true,
    build: (a) => [
      veil("50% 50%", 46, 44, 0.97),
      `radial-gradient(80% 74% at 50% 50%, rgba(255,255,255,0) 40%, ${rgba(a, 0.2)} 76%, ${rgba(LAV, 0.26)} 100%)`,
      `radial-gradient(46% 12% at 50% 92%, ${rgba(INK, 0.14)} 0%, ${rgba(INK, 0)} 80%)`,
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
