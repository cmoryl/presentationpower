// -----------------------------------------------------------------------------
// TransPerfect NEXT — division agenda asset.
//
// One approved agenda master, available for every NEXT division area. The
// artwork is built on the same live gradient grounds, division lockups and
// Geist typesetting as the pillar and badge masters — only the division lockup
// and the programme copy change, never the palette or the geometry.
//
// Every field is editable per division: eyebrow, day title, date / venue line,
// the session rows (time · title · detail · track tag), a footer line and an
// optional real scannable QR code. Layout metrics live here so the live preview
// and the layered press PDF resolve from exactly the same numbers.
// -----------------------------------------------------------------------------

import { LONDON_2026_PROGRAMMES } from "./next-agenda-london-2026";
import { LONDON_STYLES } from "@/lib/next-london-signage";
import {
  CITY_BADGE_DIVISIONS,
  cityBadgeDivision,
  type CityBadgeDivision,
} from "@/lib/next-city-badge";
// The agenda board shares the house QR treatments with the pillar and signage
// editors, so a code drawn here matches a code drawn anywhere else in the kit.
import {
  PILLAR_QR_MIN_CONTRAST,
  PILLAR_QR_STYLES,
  pillarContrastRatio,
  type PillarCaptionAlign,
  type PillarQrStyleId,
} from "@/lib/next-pillar-masters";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";
import { logoInkRatio } from "@/lib/next-logo-ink";
import { qrPrintQuality, type QrModuleStyle } from "@/lib/qr-print";

/**
 * Stage areas that get their own agenda board but are not NEXT divisions, so
 * they must not appear in badge, pillar or cross-division comparisons. They
 * print under the TransPerfect NEXT lockup, which is the approved mark for a
 * whole-event area.
 */
export const AGENDA_EVENT_AREAS: CityBadgeDivision[] = [
  { ...cityBadgeDivision("transperfect"), id: "innovation-lounge", name: "Innovation Lounge" },
];

/** Ids in `AGENDA_DIVISIONS` that are event areas rather than divisions. */
export const AGENDA_EVENT_AREA_IDS: string[] = AGENDA_EVENT_AREAS.map((a) => a.id);

export const AGENDA_DIVISIONS: CityBadgeDivision[] = [
  ...CITY_BADGE_DIVISIONS,
  ...AGENDA_EVENT_AREAS,
];

export function agendaDivision(id: string | undefined): CityBadgeDivision {
  return AGENDA_EVENT_AREAS.find((a) => a.id === id) ?? cityBadgeDivision(id);
}


export const AGENDA_QR_STYLES = PILLAR_QR_STYLES;
export const AGENDA_QR_MIN_CONTRAST = PILLAR_QR_MIN_CONTRAST;
export const agendaContrastRatio = pillarContrastRatio;
export type { PillarCaptionAlign as AgendaCaptionAlign, PillarQrStyleId as AgendaQrStyleId };

export const AGENDA_SPEC = {
  bleedEdge: 5,
  rasterPpi: 150,
  colorMode: "CMYK (offset + digital)",
  exportPreset: "PDF/X-4",
} as const;

/** Printed agenda formats. Boards hang in the concourse; handouts print in-house.
 *  Screen formats resolve the same artwork at exact pixel dimensions for holding
 *  screens, room panels, lobby verticals and social frames. */
export type AgendaSizeId =
  | "a4"
  | "us-letter"
  | "a3"
  | "a2"
  | "a1"
  | "screen-16x9"
  | "screen-9x16"
  | "screen-1x1"
  | "screen-4x5"
  | "screen-ultrawide"
  | "custom";

/** Screen presets are authored in px and converted at 96 ppi CSS reference. */
export const PX_TO_MM = 25.4 / 96;

const screen = (id: AgendaSizeId, name: string, note: string, pxW: number, pxH: number) => ({
  id,
  name,
  note,
  medium: "screen" as const,
  pxW,
  pxH,
  trimW: Math.round(pxW * PX_TO_MM),
  trimH: Math.round(pxH * PX_TO_MM),
});

export const AGENDA_SIZES: {
  id: AgendaSizeId;
  name: string;
  note: string;
  trimW: number;
  trimH: number;
  medium?: "print" | "screen";
  pxW?: number;
  pxH?: number;
}[] = [
  {
    id: "a4",
    name: "A4 handout",
    note: "Desk / delegate-bag programme, digital print.",
    trimW: 210,
    trimH: 297,
    medium: "print",
  },
  {
    // US offices print on Letter stock, so an A4 file arrives scaled and the
    // measured safe margins stop being true.
    id: "us-letter",
    name: "US Letter handout",
    note: "US delegate-bag programme, 8.5 × 11 in digital print.",
    trimW: 216,
    trimH: 279,
    medium: "print",
  },
  {
    id: "a3",
    name: "A3 room card",
    note: "Breakout-room door and stage-wing card.",
    trimW: 297,
    trimH: 420,
    medium: "print",
  },
  {
    id: "a2",
    name: "A2 board",
    note: "Registration and concourse agenda board.",
    trimW: 420,
    trimH: 594,
    medium: "print",
  },
  {
    id: "a1",
    name: "A1 board",
    note: "Main entrance agenda board, reads at distance.",
    trimW: 594,
    trimH: 841,
    medium: "print",
  },
  screen(
    "screen-16x9",
    "Screen · 16:9 HD",
    "Holding screens, stage LED and room displays.",
    1920,
    1080,
  ),
  screen(
    "screen-9x16",
    "Screen · 9:16 vertical",
    "Lobby verticals, totems and story frames.",
    1080,
    1920,
  ),
  screen(
    "screen-1x1",
    "Screen · 1:1 square",
    "Social agenda tile and lift-lobby panels.",
    1080,
    1080,
  ),
  screen("screen-4x5", "Screen · 4:5 portrait", "In-feed social programme post.", 1080, 1350),
  screen(
    "screen-ultrawide",
    "Screen · 21:9 ultrawide",
    "Concourse ribbon and wide LED band.",
    2560,
    1080,
  ),
  {
    id: "custom",
    name: "Custom size",
    note: "Type the measured trim of the board.",
    trimW: 500,
    trimH: 700,
    medium: "print",
  },
];

export const AGENDA_CUSTOM_SIZE = {
  w: { min: 120, max: 1600, step: 5 },
  h: { min: 180, max: 2400, step: 5 },
};

export const AGENDA_QR_SIZE = { min: 20, max: 160, step: 2 };
/** Caption cap height in mm; 0 follows the footer size. */
export const AGENDA_QR_CAPTION_SIZE = { min: 2, max: 24, step: 0.5 };
/** Padding held between the code, its caption and the safe edges (mm). */
export const AGENDA_QR_CAPTION_PAD = { min: 0, max: 40, step: 1 };
/** Coarse / fine nudge steps for a placed code (mm). */
export const AGENDA_QR_NUDGE = { fine: 1, coarse: 5 };

/** Default resting place for the printed code. Dragging still overrides it. */
export type AgendaQrAnchor = "foot-right" | "top-right";

export const AGENDA_QR_ANCHORS: { id: AgendaQrAnchor; name: string; note: string }[] = [
  {
    id: "foot-right",
    name: "Foot right",
    note: "Code sits above the footer on the right — the issued London default.",
  },
  {
    id: "top-right",
    name: "Top right",
    note: "Code sits beside the headline; the title block narrows so copy never runs under it.",
  },
];

/** The anchor in force, defaulting to the issued foot-right position. */
export function agendaQrAnchor(config: AgendaConfig): AgendaQrAnchor {
  return config.qrAnchor === "top-right" ? "top-right" : "foot-right";
}

export type AgendaFaceId = "dark" | "light";

export const AGENDA_FACES: { id: AgendaFaceId; name: string; note: string }[] = [
  {
    id: "dark",
    name: "Dark face",
    note: "The issued gradient ground at full saturation with white copy. Default for entrances and evening programmes.",
  },
  {
    id: "light",
    name: "Light face",
    note: "The same gradient tinted back toward blue-white with Blue 800 copy. For daylight concourses and print economy.",
  },
];

export function agendaFace(id: string | undefined) {
  return AGENDA_FACES.find((f) => f.id === id) ?? AGENDA_FACES[0]!;
}

export const AGENDA_STYLE_IDS = Object.keys(LONDON_STYLES);

export function agendaStyleLabel(styleId: string): string {
  return LONDON_STYLES[styleId]?.label ?? styleId;
}

const LIGHT_TINT = 0.72;
const LIGHT_BASE = [247, 249, 252] as const;

function tint(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `#${rgb
    .map((c, i) =>
      Math.round(c + (LIGHT_BASE[i]! - c) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

/**
 * Retired August 2026: division accent grounds are no longer used. Every
 * division agenda prints on the approved enterprise ramp, so this always
 * resolves to null and the ground is identical across the programme.
 */
export function agendaDivisionAccent(_divisionId: string | undefined): string | null {
  return null;
}

/**
 * Event accent for a division agenda — the division's own NEXT accent, used for
 * the day heading bar and the time rail down the left edge of each band. This is
 * the event exception to the retired accent grounds: the ground, the copy and the
 * geometry stay enterprise on every board, and the accent only marks days and
 * times. Event areas (the Innovation Lounge) print under the master NEXT lockup,
 * so they take the master NEXT accent.
 */
/**
 * Visibility floor for the accent time rail against the band fill behind it.
 * The rail carries no information of its own, so this is a "can you see it"
 * threshold rather than the AA text ratio.
 */
export const AGENDA_RAIL_MIN_CONTRAST = 1.35;

export function agendaDivisionDayAccent(
  divisionId: string | undefined,
): { hex: string; ink: string } | null {
  const id = divisionId && AGENDA_EVENT_AREA_IDS.includes(divisionId) ? "transperfect" : divisionId;
  const div = NEXT_DIVISIONS.find((d) => d.id === id);
  if (!div?.accent) return null;
  // Copy on the accent takes whichever brand ink clears AA on it — Learn yellow
  // and Life Sci green carry Blue 800, deep accents carry white.
  const ink = agendaContrastRatio("#FFFFFF", div.accent) >= 4.5 ? "#FFFFFF" : "#03002C";
  return { hex: div.accent, ink };
}




/**
 * Gradient stops for an agenda ground. When the division carries an approved
 * accent, it replaces the terminal stop so the gradient resolves into the
 * division colour — every division agenda reads off the same master but lands
 * on its own accent. Light face tints the merged ramp toward blue-white.
 */
export function agendaStops(
  styleId: string,
  face: AgendaFaceId = "dark",
  divisionId?: string,
): string[] {
  const stops = LONDON_STYLES[styleId]?.stops ?? LONDON_STYLES["01-beam-violet-aqua"]!.stops;
  const accent = agendaDivisionAccent(divisionId);
  const merged = accent ? [...stops.slice(0, -1), accent] : [...stops];
  return face === "light" ? merged.map((s) => tint(s, LIGHT_TINT)) : merged;
}

/**
 * Ground colour at a vertical position on the board, 0 at the top edge and 1 at
 * the foot. Used by the press file, which cannot fade a fill to transparent and
 * instead fades a band's colour into the ground it sits on — the same picture the
 * preview shows, painted as one editable gradient.
 */
export function agendaGroundHexAt(
  config: { styleId: string; face?: AgendaFaceId; divisionId?: string },
  ratio: number,
): string {
  const stops = agendaStops(config.styleId, config.face ?? "dark", config.divisionId);
  const ramp = config.styleId.includes("halo") ? [...stops].reverse() : stops;
  if (ramp.length === 0) return "#FFFFFF";
  if (ramp.length === 1) return ramp[0]!;
  const t = Math.max(0, Math.min(1, ratio)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t));
  const f = t - i;
  const rgb = (hex: string) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = rgb(ramp[i]!);
  const b = rgb(ramp[i + 1]!);
  return `#${a
    .map((c, n) => Math.round(c + (b[n]! - c) * f))
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** Copy ink for a face. */
export function agendaInk(face: AgendaFaceId): string {
  return face === "light" ? "#03002C" : "#FFFFFF";
}

/** Approved ink options for the agenda headline. */
export const AGENDA_TEXT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#FFFFFF" },
  { id: "blue-800", label: "Blue 800", hex: "#03002C" },
  { id: "blue-white", label: "Blue White", hex: "#E0E8F5" },
  { id: "aqua", label: "Aqua", hex: "#A1FBF9" },
  { id: "lavender", label: "Lavender", hex: "#C2A3FF" },
  { id: "yellow", label: "Yellow", hex: "#FFEB66" },
];

// ── row treatment ────────────────────────────────────────────────────────────
//
// Two approved programme looks. "rule" is the issued ruled list. "card" is the
// NEXT programme board: every session sits on its own pale band with the time in
// a left column, alternating white and lavender, and a parallel session printed
// beside it on an aqua card marked with a location pin.

export type AgendaRowStyleId = "rule" | "card";

export const AGENDA_ROW_STYLES: { id: AgendaRowStyleId; name: string; note: string }[] = [
  {
    id: "rule",
    name: "Ruled list",
    note: "Copy on the gradient with a hairline between sessions. The issued board look.",
  },
  {
    id: "card",
    name: "Programme bands",
    note: "Each session on its own pale band, alternating white and lavender, with parallel sessions on an aqua card.",
  },
];

/**
 * Band palette for the programme look. Approved TransPerfect values only —
 * white and Lavender for the alternating bands, Aqua for a parallel session,
 * Peach for the location pin, Blue 500 for the footer band. Copy on a band is
 * always Blue 800, which is the only ink that reads on all four.
 */
export const AGENDA_BAND = {
  fillA: "#FFFFFF",
  fillB: "#EFE0FA",
  parallel: "#A1FBF9",
  ink: "#03002C",
  pin: "#FF9B70",
  footerBand: "#003FC7",
  footerInk: "#FFFFFF",
} as const;

export function agendaRowStyle(config: { rowStyle?: string }): AgendaRowStyleId {
  return config.rowStyle === "card" ? "card" : "rule";
}

// ── band treatment ───────────────────────────────────────────────────────────
//
// How solid the programme bands sit on the gradient, and what marks them. Every
// treatment is built from approved TransPerfect values, carries a Blue 500 time
// rail down the left edge of each band, and pairs a fill with the one ink that
// clears WCAG AA on it — so a treatment can never make the programme unreadable.

export type AgendaBandTreatmentId =
  | "solid"
  | "lavender"
  | "ink"
  | "aqua"
  | "mist"
  | "signal"
  | "veil"
  | "veil-ink";

export const AGENDA_BAND_TREATMENTS: {
  id: AgendaBandTreatmentId;
  name: string;
  note: string;
}[] = [
  {
    id: "solid",
    name: "Solid · white & blue white",
    note: "Fully opaque white and Blue White bands with a Blue 500 time rail. The clearest read on any gradient.",
  },
  {
    id: "lavender",
    name: "Lavender · issued board",
    note: "White and Lavender bands, as first issued for the GlobalLink programme.",
  },
  {
    id: "ink",
    name: "Ink · Blue 800 & Blue 500",
    note: "Solid brand blues with white copy and an Aqua rail. Strongest presence on a light gradient.",
  },
  {
    id: "aqua",
    name: "Aqua · white & aqua",
    note: "White alternating with Aqua. Brightest of the pale looks — best on a deep blue ground.",
  },
  {
    id: "mist",
    name: "Mist · white & light gray",
    note: "White alternating with Light Gray. The quietest look, for dense programmes with long notes.",
  },
  {
    id: "signal",
    name: "Signal · white & yellow",
    note: "White alternating with brand Yellow. Use where the programme has to carry the whole board.",
  },
  {
    id: "veil",
    name: "Veil · fades to clear",
    note: "Each band starts as a half-strength white at the top and fades away to nothing at the bottom, so the ground runs straight through the programme. Check the legibility panel on a dark ground.",
  },
  {
    id: "veil-ink",
    name: "Ink veil · fades to clear",
    note: "The same fade in Blue 800 with white copy — for light grounds. Check the legibility panel before print.",
  },
];

// ── band box layout ──────────────────────────────────────────────────────────
//
// The shape of the band box itself, kept separate from its colour: how far the
// bands sit in from the safe edge, how curved their corners are, how heavy the
// time rail is and how much air sits between rows. Every renderer reads these
// numbers, so a layout choice prints the same on screen, in the press file, in
// Word and in PowerPoint.

export type AgendaBandLayoutId = "bar" | "inset" | "tile" | "pill" | "rail";

export const AGENDA_BAND_LAYOUTS: {
  id: AgendaBandLayoutId;
  name: string;
  note: string;
  /** Inset from the safe edge as a fraction of the content width. */
  inset: number;
  /** Corner radius in mm at A2. A very large value reads as a pill. */
  radius: number;
  /** Time rail width in mm at A2. 0 = no rail. */
  railW: number;
  /** Multiplier on the printed gutter between rows. */
  gapMul: number;
}[] = [
  {
    id: "bar",
    name: "Full-width bars",
    note: "Bands run the full content width with the house 2.6 mm corner and a Blue 500 time rail. The issued board.",
    inset: 0,
    radius: 2.6,
    railW: 1.8,
    gapMul: 1,
  },
  {
    id: "inset",
    name: "Inset cards",
    note: "Bands step in from the safe edge with a deeper corner and more air between rows — a calmer, more editorial page.",
    inset: 0.05,
    radius: 4.2,
    railW: 1.8,
    gapMul: 1.2,
  },
  {
    id: "tile",
    name: "Square tiles",
    note: "Square-cut edges, no rail and a tight gutter, so the programme reads as one dense block.",
    inset: 0,
    radius: 0,
    railW: 0,
    gapMul: 0.55,
  },
  {
    id: "pill",
    name: "Pill rows",
    note: "Fully rounded band ends with no rail and generous spacing. Best for short programmes on a large board.",
    inset: 0.03,
    radius: 400,
    railW: 0,
    gapMul: 1.25,
  },
  {
    id: "rail",
    name: "Heavy time rail",
    note: "A thick Blue 500 rail down the time column with an almost square band — the strongest time-first read.",
    inset: 0,
    radius: 1.2,
    railW: 4.2,
    gapMul: 1,
  },
];

export function agendaBandLayout(config: { bandLayout?: string }) {
  return (
    AGENDA_BAND_LAYOUTS.find((l) => l.id === config.bandLayout) ?? AGENDA_BAND_LAYOUTS[0]!
  );
}

/**
 * Band corner radius in the caller's own units, never more than half the box —
 * a pill layout on a short band would otherwise draw an invalid path.
 */
export function agendaBandRadius(radius: number, w: number, h: number): number {
  return Math.max(0, Math.min(radius, Math.min(w, h) / 2));
}

export type AgendaBandPalette = {
  /** Band fill for odd sessions (first, third, …). */
  fillA: string;
  /** Band fill for even sessions. */
  fillB: string;
  /** Copy on a band fill. */
  ink: string;
  /** Fill of the parallel-session card. */
  parallel: string;
  /** Copy on the parallel-session card. */
  parallelInk: string;
  /** Vertical rail down the left edge of every band. */
  rail: string;
  /** Rail width in millimetres at A2, scaled with the sheet by the caller. */
  railW: number;
  /**
   * Band fill alpha. The bands sit ON the gradient rather than hiding it, so the
   * ground reads faintly through them. Held high enough that the composited fill
   * still clears WCAG AA against the band ink on every approved ground — see
   * `agenda-band-treatments.test.ts`.
   */
  fillAlpha: number;
  /** Parallel-session card alpha. */
  parallelAlpha: number;
  /**
   * Vertical fade down the band: alpha at the top edge and at the bottom edge.
   * null = a flat fill at `fillAlpha`. A fade to 0 lets the ground run right
   * through the foot of every band, so the legibility sweep treats the lower
   * half as a warning state rather than a signed-off read.
   */
  fade: { top: number; bottom: number } | null;
  /** Corner radius in millimetres at A2, scaled with the sheet by the caller. */
  radius: number;
  pin: string;
  footerBand: string;
  footerInk: string;
  /** Fill of the day heading bar on a multi-day board. */
  dayBar: string;
  /** Copy on the day heading bar. */
  dayBarInk: string;
};

export function agendaBandTreatment(config: {
  bandTreatment?: string;
}): AgendaBandTreatmentId {
  return AGENDA_BAND_TREATMENTS.some((t) => t.id === config.bandTreatment)
    ? (config.bandTreatment as AgendaBandTreatmentId)
    : "solid";
}

function agendaBandPaletteBase(config: {
  bandTreatment?: string;
  bandLayout?: string;
}): AgendaBandPalette {

  const box = agendaBandLayout(config);
  const base = {
    parallel: AGENDA_BAND.parallel,
    parallelInk: AGENDA_BAND.ink,
    pin: AGENDA_BAND.pin,
    dayBar: AGENDA_BAND.footerBand,
    dayBarInk: "#FFFFFF",

    footerBand: AGENDA_BAND.footerBand,
    footerInk: AGENDA_BAND.footerInk,
    railW: box.railW,
    // Softly curved band edges, ~2.6 mm at A2 — the house card radius, not a pill.
    radius: box.radius,
    fade: null as { top: number; bottom: number } | null,
  };
  switch (agendaBandTreatment(config)) {
    case "lavender":
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: AGENDA_BAND.fillB,
        ink: AGENDA_BAND.ink,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.9,
        parallelAlpha: 0.9,
      };
    case "ink":
      return {
        ...base,
        fillA: "#03002C",
        fillB: "#003FC7",
        ink: "#FFFFFF",
        rail: AGENDA_BAND.parallel,
        // Dark bands carry white copy, so they hold a little more body.
        fillAlpha: 0.92,
        parallelAlpha: 0.92,
      };
    case "aqua":
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: AGENDA_BAND.parallel,
        ink: AGENDA_BAND.ink,
        // The parallel card takes Lavender here so it stays distinct from a band.
        parallel: AGENDA_BAND.fillB,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.9,
        parallelAlpha: 0.9,
      };
    case "mist":
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: "#F2F2F2",
        ink: AGENDA_BAND.ink,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.92,
        parallelAlpha: 0.92,
      };
    case "signal":
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: "#FFEB66",
        ink: AGENDA_BAND.ink,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.94,
        parallelAlpha: 0.94,
      };
    case "veil":
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: AGENDA_BAND.fillA,
        ink: AGENDA_BAND.ink,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.62,
        parallelAlpha: 0.62,
        fade: { top: 0.62, bottom: 0 },
      };
    case "veil-ink":
      return {
        ...base,
        fillA: "#03002C",
        fillB: "#03002C",
        ink: "#FFFFFF",
        rail: AGENDA_BAND.parallel,
        fillAlpha: 0.78,
        parallelAlpha: 0.78,
        fade: { top: 0.78, bottom: 0 },
      };
    default:
      return {
        ...base,
        fillA: AGENDA_BAND.fillA,
        fillB: "#E0E8F5",
        ink: AGENDA_BAND.ink,
        rail: AGENDA_BAND.footerBand,
        fillAlpha: 0.9,
        parallelAlpha: 0.9,
      };
  }
}

/**
 * Resolved band colours for a board. Never returns an unapproved value.
 *
 * On a division board the day heading bar and the left time rail take the
 * division's own NEXT accent, so a Legal programme reads as Legal at a glance
 * while the ground, the band fills and every line of copy stay enterprise. The
 * The day bar always carries the approved ink that clears AA on the accent. The
 * rail is decoration beside the time, never the only way a time is read, so it
 * needs only to be visibly distinct from the band fill it sits on; where an
 * accent would disappear into the fill the treatment's own rail stays.
 */
export function agendaBandPalette(config: {
  bandTreatment?: string;
  bandLayout?: string;
  divisionId?: string;
}): AgendaBandPalette {
  const base = agendaBandPaletteBase(config);
  const accent = agendaDivisionDayAccent(config.divisionId);
  if (!accent) return base;
  const railReads =
    agendaContrastRatio(accent.hex, base.fillA) >= AGENDA_RAIL_MIN_CONTRAST &&
    agendaContrastRatio(accent.hex, base.fillB) >= AGENDA_RAIL_MIN_CONTRAST;
  return {
    ...base,
    dayBar: accent.hex,
    dayBarInk: accent.ink,
    rail: railReads ? accent.hex : base.rail,
  };
}



// ── footer band ──────────────────────────────────────────────────────────────
//
// The foot of a programme board. The issued London board carries a Blue 500 band
// with the event URL left and the dates right; a board can now also print the
// same lines on a hairline rule or straight on the ground, in any approved
// colour, at three heights, with an optional centre line.

export type AgendaFooterStyleId = "band" | "hairline" | "clear";
export type AgendaFooterFillId = "blue" | "ink" | "aqua" | "lavender" | "white" | "gray";
export type AgendaFooterHeightId = "compact" | "standard" | "tall";

export const AGENDA_FOOTER_STYLES: { id: AgendaFooterStyleId; name: string; note: string }[] = [
  {
    id: "band",
    name: "Colour band",
    note: "A solid band across the foot of the board, as issued for London.",
  },
  {
    id: "hairline",
    name: "Hairline rule",
    note: "A fine rule above the footer lines, which print on the gradient itself.",
  },
  {
    id: "clear",
    name: "No band",
    note: "Footer lines print straight on the ground with nothing behind them.",
  },
];

export const AGENDA_FOOTER_FILLS: {
  id: AgendaFooterFillId;
  name: string;
  fill: string;
  ink: string;
}[] = [
  { id: "blue", name: "Blue 500", fill: "#003FC7", ink: "#FFFFFF" },
  { id: "ink", name: "Blue 800", fill: "#03002C", ink: "#FFFFFF" },
  { id: "aqua", name: "Aqua", fill: "#A1FBF9", ink: "#03002C" },
  { id: "lavender", name: "Lavender", fill: "#EFE0FA", ink: "#03002C" },
  { id: "white", name: "White", fill: "#FFFFFF", ink: "#03002C" },
  { id: "gray", name: "Light gray", fill: "#F2F2F2", ink: "#03002C" },
];

export const AGENDA_FOOTER_HEIGHTS: {
  id: AgendaFooterHeightId;
  name: string;
  /** Band height as a multiple of the footer cap height. */
  mul: number;
}[] = [
  { id: "compact", name: "Compact", mul: 2.6 },
  { id: "standard", name: "Standard", mul: 3.6 },
  { id: "tall", name: "Tall", mul: 5.2 },
];

export type AgendaFooterSpec = {
  style: AgendaFooterStyleId;
  fillId: AgendaFooterFillId;
  /** Band fill. Ignored when the style is hairline or clear. */
  fill: string;
  /** Copy colour on the band. On a hairline or clear foot the caller uses the
   * board ink instead, which `onGround` reports. */
  ink: string;
  /** True when the lines print on the gradient rather than on a band. */
  onGround: boolean;
  /** Band height as a multiple of the footer cap height. 0 = no band. */
  heightMul: number;
  caps: boolean;
  left: string;
  centre: string;
  right: string;
};

export function agendaFooter(config: {
  footerStyle?: string;
  footerFill?: string;
  footerHeight?: string;
  footerCaps?: boolean;
  footerLeft?: string;
  footerCentre?: string;
  footerRight?: string;
}): AgendaFooterSpec {
  const style =
    AGENDA_FOOTER_STYLES.find((s) => s.id === config.footerStyle)?.id ?? "clear";
  const fill = AGENDA_FOOTER_FILLS.find((f) => f.id === config.footerFill) ?? AGENDA_FOOTER_FILLS[0]!;
  const height =
    AGENDA_FOOTER_HEIGHTS.find((h) => h.id === config.footerHeight) ?? AGENDA_FOOTER_HEIGHTS[1]!;
  const caps = config.footerCaps !== false;
  const line = (s?: string) => {
    const v = (s ?? "").trim();
    return caps ? v.toUpperCase() : v;
  };
  return {
    style,
    fillId: fill.id,
    fill: fill.fill,
    ink: fill.ink,
    onGround: style !== "band",
    // A hairline foot still reserves a little room for the rule and its air.
    heightMul: style === "band" ? height.mul : style === "hairline" ? 2.4 : 2,
    caps,
    left: line(config.footerLeft),
    centre: line(config.footerCentre),
    right: line(config.footerRight),
  };
}

// ── Room / floor line ───────────────────────────────────────────────────────
// The header room line carries a mark and its own formatting. Every icon is a
// single filled path on its own viewBox so the preview, the press PDF and the
// deck all draw the same silhouette — no glyph, no font dependency.

export type AgendaLocationIconId =
  | "none"
  | "pin"
  | "dot"
  | "square"
  | "diamond"
  | "chevron"
  | "bar"
  | "stairs"
  | "star";

export const AGENDA_LOCATION_ICONS: {
  id: AgendaLocationIconId;
  name: string;
  /** Filled path on the viewBox below. Empty = no mark. */
  path: string;
  vw: number;
  vh: number;
  /** Nearest PowerPoint preset shape, used by the deck export. */
  shape: string;
  /**
   * PowerPoint has no preset for a stepped mark, so a mark that a single preset
   * would misrepresent lists its parts as rectangles in the icon box (0..1).
   * The deck export draws these instead of one shape.
   */
  parts?: { x: number; y: number; w: number; h: number }[];
}[] = [
  { id: "none", name: "No mark", path: "", vw: 1, vh: 1, shape: "rect" },
  {
    id: "pin",
    name: "Location pin",
    path: "M9 0C4.03 0 0 4.03 0 9c0 6.36 7.4 14.68 7.72 15.03a1.72 1.72 0 0 0 2.56 0C10.6 23.68 18 15.36 18 9c0-4.97-4.03-9-9-9Zm0 13.1A4.1 4.1 0 1 1 9 4.9a4.1 4.1 0 0 1 0 8.2Z",
    vw: 18,
    vh: 25,
    shape: "teardrop",
  },
  { id: "dot", name: "Dot", path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", vw: 24, vh: 24, shape: "ellipse" },
  {
    id: "square",
    name: "Rounded square",
    path: "M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z",
    vw: 24,
    vh: 24,
    shape: "roundRect",
  },
  { id: "diamond", name: "Diamond", path: "M12 1 23 12 12 23 1 12Z", vw: 24, vh: 24, shape: "diamond" },
  { id: "chevron", name: "Chevron", path: "M6 2 18 12 6 22Z", vw: 24, vh: 24, shape: "triangle" },
  { id: "bar", name: "Bar rule", path: "M2 9h20v6H2Z", vw: 24, vh: 24, shape: "rect" },
  {
    id: "stairs",
    name: "Floor steps",
    path: "M3 17h5v5H3Zm6-5h5v10H9Zm6-5h5v15h-5Z",
    vw: 24,
    vh: 24,
    shape: "rect",
    parts: [
      { x: 0.125, y: 0.708, w: 0.208, h: 0.208 },
      { x: 0.375, y: 0.5, w: 0.208, h: 0.417 },
      { x: 0.625, y: 0.292, w: 0.208, h: 0.625 },
    ],
  },
  {
    id: "star",
    name: "Star",
    path: "M12 1.5l3.2 6.9 7.3.9-5.4 5.1 1.4 7.5L12 18.3l-6.5 3.6 1.4-7.5L1.5 9.3l7.3-.9Z",
    vw: 24,
    vh: 24,
    shape: "star5",
  },
];

export type AgendaLocationInkId =
  | "auto"
  | "ink"
  | "white"
  | "peach"
  | "aqua"
  | "lavender"
  | "yellow";

/** Approved copy / mark colours for the room line. `auto` follows the board ink. */
export const AGENDA_LOCATION_INKS: { id: AgendaLocationInkId; name: string; hex: string | null }[] = [
  { id: "auto", name: "Board ink", hex: null },
  { id: "ink", name: "Blue 800", hex: "#03002C" },
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "peach", name: "Peach", hex: "#FF9B70" },
  { id: "aqua", name: "Aqua", hex: "#A1FBF9" },
  { id: "lavender", name: "Lavender", hex: "#C2A3FF" },
  { id: "yellow", name: "Yellow", hex: "#FFEB66" },
];

export type AgendaLocationSizeId = "compact" | "standard" | "large" | "hero";

export const AGENDA_LOCATION_SIZES: { id: AgendaLocationSizeId; name: string; mul: number }[] = [
  { id: "compact", name: "Compact", mul: 0.85 },
  { id: "standard", name: "Standard", mul: 1 },
  { id: "large", name: "Large", mul: 1.25 },
  { id: "hero", name: "Hero", mul: 1.5 },
];

export type AgendaLocationWeightId = "regular" | "medium" | "bold";
export type AgendaLocationAlignId = "right" | "left" | "centre";

export type AgendaLocationSpec = {
  icon: (typeof AGENDA_LOCATION_ICONS)[number];
  /** Mark colour, or null to follow the copy colour. */
  iconHex: string | null;
  /** Copy colour, or null to follow the board ink. */
  ink: string | null;
  sizeMul: number;
  sizeId: AgendaLocationSizeId;
  caps: boolean;
  weight: AgendaLocationWeightId;
  bold: boolean;
  align: AgendaLocationAlignId;
  /** Letter spacing as a fraction of the cap height. */
  tracking: number;
};

export function agendaLocation(config: {
  locationIcon?: string;
  locationIconInk?: string;
  locationInk?: string;
  locationSize?: string;
  locationCaps?: boolean;
  locationWeight?: string;
  locationAlign?: string;
}): AgendaLocationSpec {
  const icon =
    AGENDA_LOCATION_ICONS.find((i) => i.id === config.locationIcon) ?? AGENDA_LOCATION_ICONS[1]!;
  const iconInk =
    AGENDA_LOCATION_INKS.find((i) => i.id === config.locationIconInk)?.hex ?? null;
  const ink = AGENDA_LOCATION_INKS.find((i) => i.id === config.locationInk)?.hex ?? null;
  const size =
    AGENDA_LOCATION_SIZES.find((s) => s.id === config.locationSize) ?? AGENDA_LOCATION_SIZES[1]!;
  const weight: AgendaLocationWeightId =
    config.locationWeight === "regular" || config.locationWeight === "medium"
      ? config.locationWeight
      : "bold";
  const align: AgendaLocationAlignId =
    config.locationAlign === "left" || config.locationAlign === "centre"
      ? config.locationAlign
      : "right";
  return {
    icon,
    // The mark follows the board ink by default — white on a dark ground, Blue 800
    // on a light one. Peach sat too close to the warm end of several grounds, so it
    // is now only used when the operator picks it.
    iconHex: iconInk,
    ink,
    sizeMul: size.mul,
    sizeId: size.id,
    caps: config.locationCaps !== false,
    weight,
    bold: weight === "bold",
    align,
    tracking: weight === "regular" ? 0.01 : 0.03,
  };
}

/** The room line exactly as it prints: capitals applied, trimmed. */
export function agendaLocationText(config: { locationLine?: string; locationCaps?: boolean }): string {
  const v = (config.locationLine ?? "").trim();
  return config.locationCaps === false ? v : v.toUpperCase();
}


/**
 * Composite a band fill over the ground it sits on. Used directly by Word, which
 * cannot carry a translucent table shading, and by the legibility sweep, which
 * has to judge the copy against what actually prints.
 */
export function agendaBandComposite(fill: string, alpha: number, ground: string): string {
  const rgb = (hex: string) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const f = rgb(fill);
  const g = rgb(ground);
  const a = Math.min(1, Math.max(0, alpha));
  const mix = f.map((c, i) => Math.round(c * a + g[i]! * (1 - a)));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/**
 * Rounded-rectangle SVG path in the PDF's own coordinate space (y grows down from
 * the given origin), so a press band carries the same curved edge as the preview.
 */
export function roundedRectPath(w: number, h: number, r: number): string {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M ${rad} 0`,
    `H ${w - rad}`,
    `A ${rad} ${rad} 0 0 1 ${w} ${rad}`,
    `V ${h - rad}`,
    `A ${rad} ${rad} 0 0 1 ${w - rad} ${h}`,
    `H ${rad}`,
    `A ${rad} ${rad} 0 0 1 0 ${h - rad}`,
    `V ${rad}`,
    `A ${rad} ${rad} 0 0 1 ${rad} 0`,
    "Z",
  ].join(" ");
}

// ── content ──────────────────────────────────────────────────────────────────

/** A session running in parallel with the row it sits on, in another room. */
export type AgendaParallel = {
  /** Own start time. Empty = the card inherits the slot's time. */
  time?: string;
  title: string;
  /** Speaker line, printed between the title and the notes. */
  speaker?: string;
  /** Free notes / room line. */
  detail: string;
  /**
   * Room / floor this simultaneous session runs in, printed in small caps on
   * the card. Empty on older saved boards, which render exactly as before.
   */
  room?: string;
};


export type AgendaSession = {
  time: string;
  title: string;
  detail: string;
  /** Short track chip, e.g. MAIN STAGE. Empty = no chip. */
  track: string;
  /** Break / transition rows print in a quieter weight. */
  muted: boolean;
  /**
   * Second session sharing the same band, printed on an aqua card. Kept for the
   * saved files and callers that only ever carried one parallel track; it always
   * mirrors the first entry of `parallels`.
   */
  parallel?: AgendaParallel | null;
  /**
   * Every session running alongside this slot, each printed on its own aqua card
   * to the right of the band. Up to `AGENDA_MAX_PARALLEL`.
   */
  parallels?: AgendaParallel[];
  /** Mark the row with the location pin (session runs off the main floor). */
  pin?: boolean;
  /**
   * Day heading on an all-days-on-one-sheet board. Printed as a solid Blue 500
   * bar with white caps rather than a programme band, so a reader sees where one
   * day ends and the next begins instead of reading it as another session.
   */
  dayBreak?: boolean;
  /**
   * Small mark printed in the time column of this row, from the approved icon
   * set (`AGENDA_LOCATION_ICONS`). Optional and off by default, so every saved
   * board renders exactly as before until someone chooses a mark.
   */
  icon?: AgendaLocationIconId;
  /**
   * Room / floor for this session, printed as its own small caps line above the
   * speaker notes. Empty when the room is not known yet, so a programme can be
   * published without one and the rooms dropped in later.
   */
  room?: string;
  /**
   * Mark colour for this row, from the approved ink set. `auto` (the default)
   * follows the band ink, so an older board is unchanged.
   */
  iconInk?: AgendaLocationInkId;
  /** Mark scale for this row, from the approved size steps. Default `standard`. */
  iconSize?: AgendaLocationSizeId;

};


/**
 * The mark a row prints in its time column, or null when the row carries none.
 * Rows saved before per-row marks existed return null, so nothing changes on an
 * older board.
 */
export function agendaSessionIcon(
  session: Pick<AgendaSession, "icon"> | null | undefined,
): (typeof AGENDA_LOCATION_ICONS)[number] | null {
  const found = AGENDA_LOCATION_ICONS.find((i) => i.id === session?.icon);
  return found && found.path ? found : null;
}

/**
 * Resolved per-row mark: the glyph, its approved colour (null = follow the band
 * ink, which every renderer supplies as its own fallback) and its scale.
 * Returns null when the row carries no mark.
 */
export function agendaSessionMark(
  session: Pick<AgendaSession, "icon" | "iconInk" | "iconSize"> | null | undefined,
): {
  icon: (typeof AGENDA_LOCATION_ICONS)[number];
  /** Approved hex, or null when the row follows the board ink. */
  hex: string | null;
  mul: number;
} | null {
  const icon = agendaSessionIcon(session);
  if (!icon) return null;
  return {
    icon,
    hex: AGENDA_LOCATION_INKS.find((i) => i.id === session?.iconInk)?.hex ?? null,
    mul: AGENDA_LOCATION_SIZES.find((s) => s.id === session?.iconSize)?.mul ?? 1,
  };
}

/** Room / floor line for a row, already trimmed. Empty when none is known. */
export function agendaSessionRoom(session: Pick<AgendaSession, "room"> | null | undefined): string {
  return (session?.room ?? "").trim();
}


/**
 * Most parallel tracks one slot can print. Four cards is the point where the

 * narrowest approved board (A4) can still hold a legible session title beside
 * the main band, so the cap is a print limit, not an arbitrary one.
 */
export const AGENDA_MAX_PARALLEL = 4;

/**
 * Every parallel track on a session, in print order. Reads the multi-track
 * `parallels` list when present and falls back to the single legacy `parallel`
 * field, so a board saved before multi-track support still renders unchanged.
 */
export function agendaParallels(
  session: Pick<AgendaSession, "parallel" | "parallels"> | null | undefined,
): AgendaParallel[] {
  const list = Array.isArray(session?.parallels)
    ? session!.parallels!
    : session?.parallel
      ? [session.parallel]
      : [];
  // A track the operator has just added but not yet typed into is kept, so the
  // empty card stays on the board while they fill it; removal is explicit.
  return list
    .filter((p) => !!p)
    .slice(0, AGENDA_MAX_PARALLEL)
    .map((p) => ({
      time: p.time ?? "",
      title: p.title ?? "",
      speaker: p.speaker ?? "",
      detail: p.detail ?? "",
      room: p.room ?? "",
    }));
}

/** Room line for a simultaneous card. Empty when no room has been typed in. */
export function agendaParallelRoom(par: Pick<AgendaParallel, "room"> | null | undefined): string {
  return (par?.room ?? "").trim();
}

/**
 * Honest placeholder for a session that runs at the same time as its
 * neighbours but whose room has not been recorded yet. A reader must be able to
 * tell the cards are different rooms, so a slot never prints a nameless card:
 * it says the room is still to be confirmed rather than inventing one.
 */
export const AGENDA_ROOM_TBC = "ROOM TO BE CONFIRMED";

/**
 * Room line as it prints on a card inside a simultaneous slot. `inSlot` is
 * false for an ordinary single-track row, which publishes without a room.
 */
export function agendaParallelRoomLine(
  par: Pick<AgendaParallel, "room"> | null | undefined,
  inSlot = true,
): string {
  return agendaParallelRoom(par) || (inSlot ? AGENDA_ROOM_TBC : "");
}

/** Room line for the main band of a row, with the same slot rule. */
export function agendaSessionRoomLine(
  session: Pick<AgendaSession, "room"> | null | undefined,
  inSlot: boolean,
): string {
  return agendaSessionRoom(session) || (inSlot ? AGENDA_ROOM_TBC : "");
}

/**
 * Start / end of a time label, in minutes from midnight. Handles "3:00-3:50 PM",
 * "11:30 AM-1:30 PM", "4:15 PM" and 24h "14:00-15:00". Free text returns null,
 * so a label the board cannot read is never treated as an overlap.
 */
export function agendaTimeSpan(label: string | null | undefined): {
  start: number;
  end: number;
} | null {
  const raw = (label ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(/\s*(?:–|—|-|to)\s*/i).filter((p) => p.trim().length > 0);
  if (!parts.length) return null;
  const tail = parts[parts.length - 1] ?? "";
  const tailMeridiem = /([ap])\.?m\.?/i.exec(tail)?.[1]?.toLowerCase() ?? null;
  const read = (token: string, fallbackMeridiem: string | null): number | null => {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?m\.?)?$/i.exec(token.trim());
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2] ?? "0");
    if (!Number.isFinite(h) || h > 24 || min > 59) return null;
    const mer = (m[3] ?? fallbackMeridiem)?.toLowerCase() ?? null;
    if (mer === "p" && h < 12) h += 12;
    if (mer === "a" && h === 12) h = 0;
    return h * 60 + min;
  };
  const start = read(parts[0] ?? "", tailMeridiem);
  if (start === null) return null;
  if (parts.length === 1) return { start, end: start };
  let end = read(tail, tailMeridiem);
  if (end === null) return { start, end: start };
  // "11:30 AM-1:30 PM": the trailing meridiem belongs to the end only, so when
  // borrowing it runs the range backwards the start keeps its own half of the day.
  if (end < start) {
    const startOwn = read(parts[0] ?? "", null);
    if (startOwn !== null && startOwn <= end) return { start: startOwn, end };
    end = start;
  }
  return { start, end };
}

/**
 * True when two time labels describe sessions running at the same time. Back to
 * back (one ends exactly as the next starts) is not simultaneous.
 */
export function agendaTimesOverlap(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = agendaTimeSpan(a);
  const y = agendaTimeSpan(b);
  if (!x || !y) return false;
  // A point in time (no end) counts as simultaneous with the span it sits in.
  if (x.start === x.end) return x.start >= y.start && x.start < Math.max(y.end, y.start + 1);
  if (y.start === y.end) return y.start >= x.start && y.start < Math.max(x.end, x.start + 1);
  return x.start < y.end && y.start < x.end;
}

/**
 * Groups of row indexes that run at the same time as ordinary stacked rows.
 * Day breaks, muted rows (breaks, lunch) and untitled rows are ignored.
 */
export function agendaSimultaneousGroups(
  sessions: readonly AgendaSession[] | null | undefined,
): number[][] {
  const rows = (sessions ?? []).map((s, i) => ({ s, i }));
  const live = rows.filter(
    ({ s }) => !s.dayBreak && !s.muted && (s.title ?? "").trim().length > 0,
  );
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (const row of live) {
    if (seen.has(row.i)) continue;
    const group = live.filter(
      (other) => other.i === row.i || agendaTimesOverlap(row.s.time, other.s.time),
    );
    if (group.length < 2) continue;
    group.forEach((g) => seen.add(g.i));
    groups.push(group.map((g) => g.i));
  }
  return groups;
}

/**
 * Folds simultaneous rows into one slot: the first keeps the band, the rest
 * become side-by-side cards carrying their own room. Rows beyond the card limit
 * are left where they are rather than dropped.
 */
export function agendaMergeSimultaneous(
  sessions: readonly AgendaSession[],
  group: readonly number[],
): { sessions: AgendaSession[]; merged: number; leftInPlace: number } {
  const order = [...group].sort((a, b) => a - b);
  const keepAt = order[0];
  if (keepAt === undefined) return { sessions: [...sessions], merged: 0, leftInPlace: 0 };
  const host = sessions[keepAt];
  if (!host) return { sessions: [...sessions], merged: 0, leftInPlace: 0 };
  const existing = agendaParallels(host);
  const spare = AGENDA_MAX_PARALLEL - existing.length;
  const folding = order.slice(1, 1 + Math.max(0, spare));

  const leftInPlace = order.length - 1 - folding.length;
  const added: AgendaParallel[] = folding.map((idx) => {
    const s = sessions[idx]!;
    return {
      time: s.time ?? "",
      title: s.title ?? "",
      speaker: "",
      detail: s.detail ?? "",
      room: agendaSessionRoom(s),
    };
  });
  const next = sessions
    .map((s, i) =>
      i === keepAt ? { ...s, parallels: [...existing, ...added], parallel: null } : s,
    )
    .filter((_, i) => !folding.includes(i));
  return { sessions: next, merged: added.length, leftInPlace };
}

/**
 * Fold every simultaneous group in a programme onto one line. Rows that already
 * sit side by side are untouched, and anything past the four-card limit stays as
 * its own row rather than being dropped.
 */
export function agendaFoldSimultaneous(sessions: readonly AgendaSession[]): AgendaSession[] {
  let list: AgendaSession[] = [...sessions];
  // Each merge renumbers the rows, so re-scan after every fold.
  for (let guard = 0; guard < 200; guard += 1) {
    const group = agendaSimultaneousGroups(list)[0];
    if (!group) break;
    const merged = agendaMergeSimultaneous(list, group);
    if (!merged.merged) break;
    list = merged.sessions;
  }
  return list;
}



/** One programme day. Multi-day agendas hold an ordered list of these. */
export type AgendaDay = {
  /** Day title printed as the headline, e.g. "DAY ONE". */
  label: string;
  /** Date · venue line for that day. */
  meta: string;
  sessions: AgendaSession[];
};

// ── manual type sizing ───────────────────────────────────────────────────────
//
// The board fits its programme automatically. These settings ride on top of the
// fitted sizes as multipliers, so a size change keeps every proportion and the
// fit report still tells the truth about what will print.

export type AgendaTypeWeightId = "regular" | "medium" | "bold";

export const AGENDA_TYPE_WEIGHTS: { id: AgendaTypeWeightId; name: string; css: number }[] = [
  { id: "regular", name: "Regular", css: 400 },
  { id: "medium", name: "Medium", css: 600 },
  { id: "bold", name: "Bold", css: 700 },
];

export const AGENDA_TYPE_SCALE = { min: 0.7, max: 1.5, step: 0.05 };

export function agendaTypeScale(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(AGENDA_TYPE_SCALE.max, Math.max(AGENDA_TYPE_SCALE.min, n));
}

function typeWeight(id: unknown, fallback: AgendaTypeWeightId): AgendaTypeWeightId {
  return AGENDA_TYPE_WEIGHTS.some((w) => w.id === id) ? (id as AgendaTypeWeightId) : fallback;
}

/** CSS weight numbers for the headline, session titles and times. */
export function agendaTypeWeights(config: {
  titleWeight?: AgendaTypeWeightId;
  rowWeight?: AgendaTypeWeightId;
  timeWeight?: AgendaTypeWeightId;
}): { title: number; row: number; time: number } {
  const css = (id: AgendaTypeWeightId) =>
    AGENDA_TYPE_WEIGHTS.find((w) => w.id === id)?.css ?? 700;
  return {
    title: css(typeWeight(config.titleWeight, "bold")),
    row: css(typeWeight(config.rowWeight, "bold")),
    time: css(typeWeight(config.timeWeight, "bold")),
  };
}

/** How a multi-day programme prints: a page per day, or every day on one sheet. */
export type AgendaDayLayoutId = "pages" | "one-sheet";

export const AGENDA_DAY_LAYOUTS: { id: AgendaDayLayoutId; name: string; note: string }[] = [
  {
    id: "pages",
    name: "A page per day",
    note: "Each programme day prints on its own sheet, continuing onto further pages when a day is long.",
  },
  {
    id: "one-sheet",
    name: "All days on one sheet",
    note: "Every day on a single board, each opening with its own date band. The rows tighten to fit — the fit report flags a board that will not hold.",
  },
];

export function agendaDayLayout(config: { dayLayout?: string }): AgendaDayLayoutId {
  return config.dayLayout === "one-sheet" ? "one-sheet" : "pages";
}

export type AgendaConfig = {
  divisionId: string;
  face: AgendaFaceId;
  styleId: string;
  sizeId: AgendaSizeId;
  trimW: number;
  trimH: number;
  showLockup: boolean;
  /** Division lockup scale, 1 = the approved default width. */
  lockupScale: number;
  eyebrow: string;
  title: string;
  /** Date · venue line under the title. */
  meta: string;
  /** Headline ink. Empty = the face default. */
  titleColor: string;
  /** Programme look: ruled list or pale programme bands. */
  rowStyle: AgendaRowStyleId;
  /** How solid the programme bands sit on the gradient. */
  bandTreatment: AgendaBandTreatmentId;
  /** Shape of the band box: width, corner, rail weight and gutter. */
  bandLayout: AgendaBandLayoutId;
  /** Room / floor line printed with a pin beside the lockup. Empty = none. */
  locationLine: string;
  /** Mark printed with the room line. */
  locationIcon: AgendaLocationIconId;
  /** Mark colour. `auto` follows the copy colour (the pin keeps Peach). */
  locationIconInk: AgendaLocationInkId;
  /** Room line copy colour. `auto` follows the board ink. */
  locationInk: AgendaLocationInkId;
  /** Room line cap height. */
  locationSize: AgendaLocationSizeId;
  /** Set the room line in capitals. */
  locationCaps: boolean;
  locationWeight: AgendaLocationWeightId;
  /** Which edge the room line and the date sit on. */
  locationAlign: AgendaLocationAlignId;
  sessions: AgendaSession[];
  /** Footer line printed at the foot of the board. */
  footnote: string;
  /** Left-hand footer line on the band, e.g. the event URL. Empty = none. */
  footerLeft: string;
  /** Right-hand footer line, e.g. the event dates. Empty = none. */
  footerRight: string;
  /** Centre footer line, e.g. a stand number or hashtag. Empty = none. */
  footerCentre: string;
  /** How the foot prints: colour band, hairline rule or straight on the ground. */
  footerStyle: AgendaFooterStyleId;
  /** Band colour. Copy ink follows the fill automatically. */
  footerFill: AgendaFooterFillId;
  /** Band height. */
  footerHeight: AgendaFooterHeightId;
  /** Set the footer lines in capitals (the issued board look). */
  footerCaps: boolean;
  /** Printed QR payload. Empty = no QR. */
  qrData: string;
  qrSize: number;
  qrCaption: string;
  /** QR module shape. */
  qrStyle: PillarQrStyleId;
  /** QR ink hex. Empty = Blue 800. */
  qrForeground: string;
  /** QR plate hex. Empty = white. */
  qrBackground: string;
  /** Drop the plate so only the modules print over the gradient. */
  qrTransparent: boolean;
  /** Caption alignment under the code. */
  qrCaptionAlign: PillarCaptionAlign;
  /** Caption cap height in mm. 0 = follow the footer size. */
  qrCaptionSize: number;
  /** Padding between the code, its caption and the safe edges (mm). */
  qrCaptionPad: number;
  /** Where the code sits by default: foot of the board or beside the headline. */
  qrAnchor: AgendaQrAnchor;
  /** Placed QR position in mm from the trim top-left. null = default flow. */
  qrOffsetX: number | null;
  qrOffsetY: number | null;
  /** Event this live agenda file belongs to (free-text label). */
  eventLabel: string;
  /**
   * Multi-day programme. When present it is authoritative; day one is mirrored
   * into `title` / `meta` / `sessions` so single-page consumers keep working.
   */
  days?: AgendaDay[];
  /** Rows per printed page. 0 / undefined = fill each page automatically. */
  rowsPerPage?: number;
  /** Derived page stamp, e.g. "DAY ONE · PAGE 2 OF 3". Set by `agendaPages`. */
  pageLabel?: string;
  /** Headline / eyebrow / date-line size against the fitted default. 1 = fitted. */
  titleScale?: number;
  /** Session title, notes and track size against the fitted default. */
  rowScale?: number;
  /** Time column size against the fitted default. */
  timeScale?: number;
  /** Speaker / notes line size against the fitted default. */
  detailScale?: number;
  titleWeight?: AgendaTypeWeightId;
  rowWeight?: AgendaTypeWeightId;
  timeWeight?: AgendaTypeWeightId;
  /** How a multi-day programme prints. */
  dayLayout?: AgendaDayLayoutId;
};

/** Row helper: keeps the issued programmes readable. */
const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

type DivisionProgramme = {
  title: string;
  meta: string;
  sessions: AgendaSession[];
  /** Multi-day programme. Day one is mirrored onto the fields above. */
  days?: AgendaDay[];
  /** Look, header pin line and footer lines this division opens on. */
  rowStyle?: AgendaRowStyleId;
  bandTreatment?: AgendaBandTreatmentId;
  bandLayout?: AgendaBandLayoutId;
  eyebrow?: string;
  locationLine?: string;
  footnote?: string;
  footerLeft?: string;
  footerRight?: string;
  footerCentre?: string;
  footerStyle?: AgendaFooterStyleId;
  footerFill?: AgendaFooterFillId;
  footerHeight?: AgendaFooterHeightId;
  footerCaps?: boolean;
};

const DIVISION_PROGRAMMES: Record<string, DivisionProgramme> = {
  "city-series": {
    // Same standard layout block as the twelve division boards: no display
    // title, the date on the meta line, lavender session cards and the
    // footer URL / dates pair. The venue room line is left blank because the
    // season board is not tied to one venue — it is typed in per city.
    title: "",
    meta: "CITY SERIES · 2026 SEASON",
    rowStyle: "card",
    bandTreatment: "lavender",
    eyebrow: "",
    locationLine: "",
    footnote: "",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/CITY-SERIES",
    footerRight: "2026 SEASON",
    sessions: [
      {
        time: "08:30",
        title: "Registration & welcome coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Opening keynote — the local-language decade",
        detail: "Sofia Alvarez, Chief Executive",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "City panel: content velocity in market",
        detail: "Regional leads roundtable",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:30",
        title: "Break & expo floor",
        detail: "Partner stands open",
        track: "",
        muted: true,
      },
      {
        time: "12:00",
        title: "Workshops — AI-assisted localization",
        detail: "Rooms 1–4, choose your track",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client stories from the City Series",
        detail: "Three markets, three programmes",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing remarks & drinks reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  ...LONDON_2026_PROGRAMMES,
};

const GENERIC_PROGRAMME = DIVISION_PROGRAMMES["city-series"]!;

export function agendaProgramme(divisionId: string | undefined) {
  const div = agendaDivision(divisionId);
  return DIVISION_PROGRAMMES[div.id] ?? GENERIC_PROGRAMME;
}

/**
 * True when a board still carries its division's approved programme copy.
 *
 * Compared on printed content only: a normalized config carries optional keys
 * (`parallel`, `pin`) that the programme records omit, so a raw JSON comparison
 * reports every untouched board as edited.
 */
export function agendaProgrammeIsStock(config: {
  divisionId?: string;
  sessions: AgendaSession[];
  days?: AgendaDay[];
}): boolean {
  const programme = agendaProgramme(config.divisionId);
  const sig = (s: Partial<AgendaSession>) =>
    [
      s.time ?? "",
      s.title ?? "",
      s.detail ?? "",
      s.track ?? "",
      s.muted ? "1" : "0",
      ...agendaParallels(s).flatMap((p) => [
        p.time ?? "",
        p.title,
        p.speaker ?? "",
        p.room ?? "",
        p.detail,
      ]),

    ].join("\u0001");
  const same = (a: Partial<AgendaSession>[], b: Partial<AgendaSession>[]) =>
    a.length === b.length && a.every((s, i) => sig(s) === sig(b[i]!));
  if (config.days?.length) {
    const stockDays = programme.days ?? [];
    return (
      config.days.length === stockDays.length &&
      config.days.every((d, i) => same(d.sessions, stockDays[i]?.sessions ?? []))
    );
  }
  if (programme.days?.length) return false;
  return same(config.sessions, programme.sessions);
}

/** Housekeeping rows shared by every programme ever issued. */
const GENERIC_ROW_TITLES = new Set([
  "break",
  "lunch",
  "lunch & networking",
  "registration",
  "registration & networking",
  "doors open, coffee & networking",
  "networking",
]);


/**
 * True when a saved board was built before the division's current approved
 * programme was issued, so it cannot be an edit of it.
 *
 * Measured on shared session titles rather than a whole-config comparison: an
 * operator's edited board still keeps most of the approved rows, while a file
 * saved off an older programme shares none of them. Those older files were
 * shadowing the approved London programme on the division cards and in the
 * studio, which is what "the update is not showing" was.
 */
export function agendaProgrammeIsStale(config: {
  divisionId?: string;
  sessions?: AgendaSession[];
  days?: AgendaDay[];
}): boolean {
  const programme = agendaProgramme(config.divisionId);
  const approved = agendaSessionTitles(programme);
  if (!approved.size) return false;
  const saved = agendaSessionTitles(config);
  if (!saved.size) return false;
  for (const t of saved) if (approved.has(t)) return false;
  return true;
}

/** Printed, non-housekeeping session titles on a board or programme. */
function agendaSessionTitles(src: {
  sessions?: Partial<AgendaSession>[];
  days?: { sessions?: Partial<AgendaSession>[] }[];
}): Set<string> {
  const rows = src.days?.length ? src.days.flatMap((d) => d.sessions ?? []) : (src.sessions ?? []);
  return new Set(
    rows
      // Muted housekeeping rows are excluded: every programme ever issued
      // carries a break and a lunch, so they match across unrelated
      // programmes and would hide a stale file.
      .filter((s) => !s.muted)
      .flatMap((s) => [s.title ?? "", ...agendaParallels(s).map((p) => p.title)])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => !!t && !GENERIC_ROW_TITLES.has(t)),
  );
}

/**
 * Approved sessions this board is missing.
 *
 * A saved file only counts as a live board when it carries every session of its
 * division's approved programme. Files saved off an earlier programme — or off a
 * partial copy of the current one — were still the newest row for their
 * division, so the hub cards, the division cards and the booklet were serving
 * an incomplete programme. They stay in the saved list as versions; they are
 * never loaded automatically.
 */
export function agendaMissingApprovedSessions(config: {
  divisionId?: string;
  sessions?: AgendaSession[];
  days?: AgendaDay[];
}): string[] {
  const approved = agendaSessionTitles(agendaProgramme(config.divisionId));
  if (!approved.size) return [];
  const saved = agendaSessionTitles(config);
  return [...approved].filter((t) => !saved.has(t));
}

/** True when a saved board carries the division's whole approved programme. */
export function agendaProgrammeIsCurrent(config: {
  divisionId?: string;
  sessions?: AgendaSession[];
  days?: AgendaDay[];
}): boolean {
  return agendaMissingApprovedSessions(config).length === 0;
}

/**
 * True when a saved file is the division's live board.
 *
 * An edited board — a renamed session, a dropped row, an added line-up — is
 * still an edit of the approved programme and must keep being served: requiring
 * every approved title made any real edit vanish from the hub and the London
 * cards, and dropped the edit link back to the default master. Only a file
 * saved off an unrelated older programme (sharing none of the approved
 * sessions) is withheld.
 */
export function agendaFileIsLive(config: {
  divisionId?: string;
  sessions?: AgendaSession[];
  days?: AgendaDay[];
}): boolean {
  return !agendaProgrammeIsStale(config);
}




export function agendaDefault(divisionId = "city-series"): AgendaConfig {
  const div = agendaDivision(divisionId);
  const programme = agendaProgramme(div.id);
  return {
    divisionId: div.id,
    // House agenda ground: Bloom Corner on the dark face, so every division
    // board carries the same gradient and its white lockup.
    face: "dark",
    styleId: "05-bloom-corner",
    sizeId: "a2",
    trimW: 420,
    trimH: 594,
    showLockup: true,
    lockupScale: 1,
    eyebrow: programme.eyebrow ?? "AGENDA",
    title: programme.title,
    meta: programme.meta,
    titleColor: "",
    rowStyle: programme.rowStyle ?? "rule",
    bandTreatment: programme.bandTreatment ?? "solid",
    bandLayout: programme.bandLayout ?? "bar",
    locationLine: programme.locationLine ?? "",
    locationIcon: "pin",
    locationIconInk: "white",
    locationInk: "white",
    locationSize: "standard",
    locationCaps: true,
    locationWeight: "bold",
    locationAlign: "right",
    // Sessions running at the same time in different rooms belong on one line,
    // not stacked as if they ran back to back — fold them as the timeline asks.
    sessions: agendaFoldSimultaneous(programme.sessions.map((s) => ({ ...s }))),

    footnote: programme.footnote ?? "Programme subject to change · full agenda and speaker bios online",
    footerLeft: programme.footerLeft ?? "",
    footerRight: programme.footerRight ?? "",
    footerCentre: programme.footerCentre ?? "",
    // No colour band across the foot: the footer lines print straight on the
    // approved gradient, keeping every line of information.
    footerStyle: programme.footerStyle ?? "clear",
    footerFill: programme.footerFill ?? "blue",
    footerHeight: programme.footerHeight ?? "standard",
    footerCaps: programme.footerCaps ?? true,
    qrData: "",
    qrSize: 48,
    qrCaption: "FULL AGENDA",
    qrStyle: "block",
    qrForeground: "",
    qrBackground: "",
    qrTransparent: false,
    qrCaptionAlign: "center",
    qrCaptionSize: 0,
    qrCaptionPad: 0,
    qrAnchor: "foot-right",
    qrOffsetX: null,
    qrOffsetY: null,
    eventLabel: "",
    days: programme.days?.map((d) => ({ ...d, sessions: d.sessions.map((s) => ({ ...s })) })),
    titleScale: 1,
    rowScale: 1,
    timeScale: 1,
    detailScale: 1,
    titleWeight: "bold",
    rowWeight: "bold",
    timeWeight: "bold",
    dayLayout: (programme.days?.length ?? 0) > 1 ? "one-sheet" : "pages",
  };
}

/** Swap the division without losing copy the operator has already edited. */
export function withAgendaDivision(config: AgendaConfig, divisionId: string): AgendaConfig {
  const div = agendaDivision(divisionId);
  const fresh = agendaDefault(div.id);
  const untouched = agendaProgrammeIsStock(config);
  const metaUntouched = config.meta === agendaProgramme(config.divisionId).meta;
  // An unedited board adopts the incoming division's whole approved programme —
  // its days, row look and title/footer lines — not just the session rows, so a
  // division whose signed-off board is the banded programme arrives looking like
  // its board rather than the previous division's ruled list.
  if (untouched) {
    return {
      ...config,
      divisionId: div.id,
      sessions: fresh.sessions,
      days: fresh.days,
      rowStyle: fresh.rowStyle,
      bandTreatment: fresh.bandTreatment,
      bandLayout: fresh.bandLayout,
      eyebrow: fresh.eyebrow,
      title: fresh.title,
      locationLine: fresh.locationLine,
      footnote: fresh.footnote,
      footerLeft: fresh.footerLeft,
      footerRight: fresh.footerRight,
      footerCentre: fresh.footerCentre,
      footerStyle: fresh.footerStyle,
      footerFill: fresh.footerFill,
      footerHeight: fresh.footerHeight,
      footerCaps: fresh.footerCaps,
      meta: metaUntouched ? fresh.meta : config.meta,
    };
  }
  return {
    ...config,
    divisionId: div.id,
    sessions: config.sessions,
    meta: metaUntouched ? fresh.meta : config.meta,
  };
}

export function agendaSizePreset(id: string | undefined) {
  return AGENDA_SIZES.find((s) => s.id === id) ?? AGENDA_SIZES[2]!;
}

/** Resolved sheet geometry in mm. Screen formats carry exact pixel dimensions
 *  and no bleed — nothing is trimmed on a display. */
export function agendaGeometry(config: { sizeId?: string; trimW?: number; trimH?: number }) {
  const preset = agendaSizePreset(config.sizeId);
  const custom = preset.id === "custom";
  const isScreen = preset.medium === "screen";
  const clampTo = (v: number | undefined, fb: number, r: { min: number; max: number }) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(r.max, Math.max(r.min, n)) : fb;
  };
  const trimW = custom ? clampTo(config.trimW, preset.trimW, AGENDA_CUSTOM_SIZE.w) : preset.trimW;
  const trimH = custom ? clampTo(config.trimH, preset.trimH, AGENDA_CUSTOM_SIZE.h) : preset.trimH;
  const bleedEdge = isScreen ? 0 : AGENDA_SPEC.bleedEdge;
  const safeInset = Math.max(10, Math.min(isScreen ? 34 : 30, trimW * (isScreen ? 0.05 : 0.07)));
  return {
    trimW,
    trimH,
    bleedEdge,
    bleedW: trimW + bleedEdge * 2,
    bleedH: trimH + bleedEdge * 2,
    safeInset,
    sizeName: preset.name,
    medium: (preset.medium ?? "print") as "print" | "screen",
    isScreen,
    pxW: preset.pxW ?? Math.round(trimW / PX_TO_MM),
    pxH: preset.pxH ?? Math.round(trimH / PX_TO_MM),
    colorMode: isScreen ? "sRGB (screen)" : AGENDA_SPEC.colorMode,
    exportPreset: isScreen ? "PNG (sRGB) + vector PDF" : AGENDA_SPEC.exportPreset,
  };
}

export function agendaQrSize(config: AgendaConfig): number {
  const raw = Number(config.qrSize);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 48;
  return Math.min(AGENDA_QR_SIZE.max, Math.max(AGENDA_QR_SIZE.min, value));
}

/** QR module shape, defaulting to the most reliable square modules. */
export function agendaQrStyle(config: AgendaConfig): PillarQrStyleId {
  return AGENDA_QR_STYLES.some((s) => s.id === config.qrStyle) ? config.qrStyle : "block";
}

/** QR ink: approved Blue 800 unless another ink was picked. */
export function agendaQrForeground(config: AgendaConfig): string {
  const v = (config.qrForeground ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : "#03002C";
}

/** QR plate: white unless another colour was picked. */
export function agendaQrBackground(config: AgendaConfig): string {
  const v = (config.qrBackground ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : "#FFFFFF";
}

/** True when the plate is dropped and the code prints on the gradient. */
export function agendaQrTransparent(config: AgendaConfig): boolean {
  return config.qrTransparent === true;
}

export function agendaQrCaptionAlign(config: AgendaConfig): PillarCaptionAlign {
  return config.qrCaptionAlign === "left" || config.qrCaptionAlign === "right"
    ? config.qrCaptionAlign
    : "center";
}

/**
 * Colour the modules actually sit on: the plate, or — with the plate dropped —
 * the gradient stop that gives the worst contrast, which is what a phone
 * camera has to survive.
 */
export function agendaQrPlateColor(config: AgendaConfig): string {
  if (!agendaQrTransparent(config)) return agendaQrBackground(config);
  const stops = agendaStops(config.styleId, config.face ?? "dark", config.divisionId);
  let worst = stops[0] ?? "#003FC7";
  let ratio = Number.POSITIVE_INFINITY;
  for (const stop of stops) {
    const r = agendaContrastRatio(agendaQrForeground(config), stop);
    if (r >= ratio) continue;
    ratio = r;
    worst = stop;
  }
  return worst;
}

/** Contrast the printed code will be read at, and whether it clears the floor. */
export function agendaQrContrast(config: AgendaConfig): { ratio: number; ok: boolean } {
  const ratio = agendaContrastRatio(agendaQrForeground(config), agendaQrPlateColor(config));
  return { ratio, ok: ratio >= AGENDA_QR_MIN_CONTRAST };
}

/** Printed module size and quiet zone of the code as it will be output. */
export function agendaQrPrintQuality(config: AgendaConfig) {
  const payload = (config.qrData ?? "").trim();
  const blocks = agendaBlocks(config);
  if (!payload || !blocks.qr) return null;
  return qrPrintQuality(payload, blocks.qr.edge, agendaQrStyle(config) as QrModuleStyle);
}

/**
 * Everything that would stop a phone reading the printed code: no link, ink and
 * plate too close in value, or modules printed too small to resolve. Returned as
 * plain sentences so the editor can show them before the file is ordered.
 */
export function agendaQrBlockers(config: AgendaConfig): string[] {
  const payload = (config.qrData ?? "").trim();
  if (!payload) return [];
  const out: string[] = [];
  const contrast = agendaQrContrast(config);
  if (!contrast.ok) {
    out.push(
      `Code contrast is ${contrast.ratio.toFixed(1)}:1 — it needs ${AGENDA_QR_MIN_CONTRAST}:1 to scan. Darken the modules or keep the plate.`,
    );
  }
  const blocks = agendaBlocks(config);
  const quality = blocks.qr
    ? qrPrintQuality(payload, blocks.qr.edge, agendaQrStyle(config) as QrModuleStyle)
    : null;
  if (quality) out.push(...quality.notes);
  return out;
}

export const AGENDA_LOCKUP_SCALE = { min: 0.5, max: 1.6, step: 0.05 };

export function agendaLockupScale(config: AgendaConfig): number {
  const raw = Number(config.lockupScale);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.min(AGENDA_LOCKUP_SCALE.max, Math.max(AGENDA_LOCKUP_SCALE.min, value));
}

export function agendaTitleInk(config: AgendaConfig): string {
  const hex = (config.titleColor || "").trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : agendaInk(config.face ?? "dark");
}

/**
 * Type and row metrics in mm, derived from the sheet so an A4 handout and an A1
 * board hold the same proportions. Both the live sheet and the vector PDF read
 * these numbers, so the export always matches the preview.
 */
/** The approved lockup file for this board's face. On a dark board that is the
 *  stacked REVERSE mark — white wordmark with the division accent kept live —
 *  not the all-white one; the all-white file is only the fallback where a
 *  division has no reverse artwork. */
export function agendaLockupUrl(config: AgendaConfig): string {
  const div = agendaDivision(config.divisionId);
  return (config.face ?? "dark") === "light"
    ? div.colorUrl || div.whiteUrl
    : div.reverseUrl || div.whiteUrl || div.colorUrl;
}


/**
 * Ink the lockup prints in. This follows the lockup FILE, not the copy-contrast
 * guard: on a dark board the approved file is the white lockup, so the mark must
 * print white even when the guard darkens body copy for legibility further down
 * the sheet. Painting it with the copy ink printed every exported board's logo
 * in black on the dark gradient.
 */
export function agendaLockupInk(config: AgendaConfig): string {
  return (config.face ?? "dark") === "light" ? "#03002C" : "#FFFFFF";
}

/**
 * Ink for the board chrome that sits directly on the ground rather than inside a
 * card: the date/meta line under the location and the footer lines. These follow
 * the face (white on a dark board) so the header and foot read as one piece with
 * the lockup, instead of inheriting the body-copy contrast guard, which darkens
 * the whole sheet when a gradient's pale corner fails white somewhere.
 */
export function agendaChromeInk(config: AgendaConfig): string {
  return agendaLockupInk(config);
}


export function agendaLayout(config: AgendaConfig) {
  const geo = agendaGeometry(config);
  // A2 board is the reference sheet. Landscape and screen formats have far less
  // height per unit of width, so the scale reads off whichever edge is tighter —
  // that keeps a 16:9 holding screen legible instead of crushing the row list.
  const k = Math.min(geo.trimW / 420, geo.trimH / 594) * (geo.trimH < geo.trimW ? 1.35 : 1);
  const rows = config.sessions.length || 1;
  const contentW = geo.trimW - geo.safeInset * 2;
  // Lay out against the visible artwork, not the file box: the supplied lockups
  // carry clear space inside their viewBox, and sizing on the file box left the
  // mark hanging away from the copy edge.
  const ratio = logoInkRatio(agendaLockupUrl(config), agendaDivision(config.divisionId).ratio || 1.7);
  // Cap the lockup against the sheet height so wide formats keep room for the
  // programme. Every division board now sits on the same half-size lockup — 22%
  // of the content width, capped at 10% of the sheet height — so the header gives
  // the height back to the schedule.
  const lockupW = Math.min(contentW * 0.22, geo.trimH * 0.1 * ratio) * agendaLockupScale(config);

  const lockupH = lockupW / ratio;

  const card = agendaRowStyle(config) === "card";

  // Manual type settings ride on the fitted sizes as multipliers.
  const tS = agendaTypeScale(config.titleScale);
  const rS = agendaTypeScale(config.rowScale);
  const tmS = agendaTypeScale(config.timeScale);
  const dS = agendaTypeScale(config.detailScale);
  const eyebrowSize = 5.4 * k * tS;
  const titleSize = 22 * k * tS;
  const metaSize = (card ? 4.6 * k : 6.4 * k) * tS;
  const footSize = 4.4 * k;
  const qrEdge = Math.min(agendaQrSize(config), contentW * 0.35);
  // Programme look: the room / floor line sits beside the lockup with a pin, the
  // date line under it, and the footer prints on a Blue 500 band across the foot.
  // The room line carries its own cap height, so a Hero setting reserves the
  // header space it actually needs instead of printing into the eyebrow.
  const locSize = 8.2 * k * agendaLocation(config).sizeMul;
  const box = agendaBandLayout(config);
  const bandGap = 2.6 * k * box.gapMul;
  /** How far the band boxes step in from the safe edge. */
  const bandInset = contentW * box.inset;
  const bandW = contentW - bandInset * 2;
  const bandPadX = 4.6 * k;
  const bandPadY = 3.4 * k;
  const foot = agendaFooter(config);
  const footerBandH = card ? footSize * foot.heightMul : 0;
  const locBlockH = (config.locationLine ?? "").trim() ? locSize * 1.5 + metaSize * 1.8 : 0;
  // A left or centred room line stacks under the lockup, so the header reserves
  // both heights rather than the taller of the two.
  const locStacked = locBlockH > 0 && agendaLocation(config).align !== "right" && config.showLockup;
  const headBlock = card
    ? (locStacked
        ? lockupH + 3 * k + locBlockH
        : Math.max(config.showLockup ? lockupH : 0, locBlockH)) +
      ((config.eyebrow ?? "").trim() ? eyebrowSize * 2.4 : 0) +
      ((config.title ?? "").trim() ? titleSize * 1.16 : 0) +
      8 * k
    : (config.showLockup ? lockupH + 9 * k : 0) +
      eyebrowSize * 2.4 +
      titleSize * 1.16 +
      metaSize * 2.1;
  // The foot only reserves height for the code when the code rests there.
  const qrInFoot = config.qrData.trim() !== "" && agendaQrAnchor(config) === "foot-right";
  const footBlock =
    (qrInFoot ? qrEdge + footSize * 2.6 : 0) + (card ? footerBandH + 5 * k : footSize * 2.4);
  const listTop = geo.safeInset + headBlock;
  const listBottom = geo.trimH - (card ? 0 : geo.safeInset) - footBlock;
  const listH = Math.max(20, listBottom - listTop);
  const rowH = listH / rows;
  const timeSize = (card ? 4.6 * k : Math.min(rowH * 0.3, 7.6 * k)) * tmS;
  const titleRowSize = (card ? 5.0 * k : Math.min(rowH * 0.34, 8.4 * k)) * rS;
  const detailSize = (card ? 4.3 * k : Math.min(rowH * 0.24, 5.6 * k)) * dS;
  const trackSize = (card ? 4.3 * k : Math.max(2.6, Math.min(rowH * 0.18, 4.2 * k))) * rS;
  return {
    geo,
    k,
    card,
    contentW,
    lockupW,
    lockupH,
    eyebrowSize,
    titleSize,
    metaSize,
    locSize,
    footSize,
    footerBandH,
    bandGap,
    bandInset,
    bandW,
    bandPadX,
    bandPadY,
    qrEdge,
    listTop,
    listBottom,
    listH,
    rowH,
    timeSize,
    titleRowSize,
    detailSize,
    trackSize,
    /** CSS weight numbers for the headline, session titles and times. */
    weights: agendaTypeWeights(config),
    /** Time column width, measured from the left safe edge. */
    timeColW: contentW * (card ? 0.21 : 0.17),
    /** Track chip column width on the right. */
    trackColW: contentW * 0.2,
    /** Width of the left card when a band carries a parallel session. */
    splitLeftW: contentW * 0.455,
  };
}

/**
 * Column widths for a band that carries `count` parallel cards: the main band on
 * the left and an equal aqua card per parallel track, separated by the printed
 * band gutter. With one card the split reproduces the approved 45.5 / 54.5 board
 * exactly, so existing single-track boards are untouched.
 */
export function agendaSplitWidths(
  contentW: number,
  bandGap: number,
  count: number,
): { leftW: number; cardW: number } {
  if (count <= 0) return { leftW: contentW, cardW: 0 };
  // The main band keeps the approved 45.5% of the content width whatever the
  // track count; the cards share what is left after the printed gutters.
  const leftW = contentW * 0.455;
  const cardW = Math.max(2, (contentW - leftW - bandGap * count) / count);
  return { leftW, cardW };
}

/**
 * Type fit for one aqua parallel card. Two or more tracks share the right-hand
 * half, so a card can be a third of the width the single-track board was drawn
 * for. Left at the band sizes the copy wrapped to one or two characters a line —
 * or vanished when the padding and the pin left no column at all. The card sizes
 * are therefore fitted to the column: the title must carry ~11 characters a
 * line, the notes ~15, and the padding tightens and the pin gutter is dropped on
 * three or four tracks. Sizes never rise above the band sizes, and never fall
 * below the reading floor the boards were signed off at.
 */
/** Longest run of non-space characters in a piece of copy. */
export function agendaLongestWord(...parts: (string | undefined)[]): number {
  return parts.reduce(
    (longest, part) =>
      (part ?? "")
        .split(/\s+/)
        .reduce((m, word) => Math.max(m, word.length), longest),
    0,
  );
}

export function agendaCardType(
  L: { bandPadX: number; locSize: number; timeSize: number; titleRowSize: number; detailSize: number },
  cardW: number,
  count: number,
  /**
   * Longest unbreakable word in the card's copy. Word and the press renderers
   * break a word mid-glyph when it cannot fit the column, so the title size is
   * also held to the longest word.
   */
  longestWord = 0,
): {
  padX: number;
  /** Room kept on the right for the location pin, 0 when the card is narrow. */
  pinW: number;
  textW: number;
  timeSize: number;
  titleSize: number;
  detailSize: number;
} {
  const tight = count >= 3;
  const padX = tight ? L.bandPadX * 0.62 : L.bandPadX;
  const pinW = count >= 2 ? 0 : L.locSize * 1.4;
  const textW = Math.max(4, cardW - padX * 2 - pinW);
  const fit = (base: number, chars: number, floor: number) =>
    Math.max(Math.min(base, floor), Math.min(base, textW / (chars * 0.55)));
  const floorTitle = L.titleRowSize * 0.56;
  let titleSize = fit(L.titleRowSize, 13, floorTitle);
  if (longestWord > 0) {
    titleSize = Math.max(floorTitle, Math.min(titleSize, textW / (longestWord * 0.78)));
  }
  return {
    padX,
    pinW,
    textW,
    timeSize: fit(L.timeSize, 6, L.timeSize * 0.62),
    titleSize,
    detailSize: fit(L.detailSize, 16, L.detailSize * 0.6),
  };
}

/**
 * Lines a run of copy takes at a printed size inside a column. Cap-height mm to
 * average glyph advance is ~0.55, which matched the issued boards when the row
 * bands were measured against the approved Canva programme.
 *
 * The wrap is solved greedily, word by word, exactly as the browser and the
 * press renderer break a paragraph. Dividing the character count by the column
 * width undercounted every run with long words in it — a speaker list or a
 * seven-word session title measured a line short, so the band was built too
 * shallow and the copy printed past its frame (the bands clip, so it vanished).
 * A word wider than the column breaks mid-glyph, which both renderers also do.
 */
export function agendaTextLines(text: string, sizeMm: number, colW: number): number {
  const clean = (text ?? "").trim();
  if (!clean) return 0;
  const perLine = Math.max(8, colW / (sizeMm * 0.55));
  let total = 0;
  for (const para of clean.split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let lines = 1;
    let used = 0;
    for (const word of words) {
      const w = word.length;
      if (w > perLine) {
        if (used > 0) {
          lines += 1;
          used = 0;
        }
        const spans = Math.ceil(w / perLine);
        lines += spans - 1;
        used = w - (spans - 1) * perLine;
        continue;
      }
      const next = used === 0 ? w : used + 1 + w;
      if (next > perLine) {
        lines += 1;
        used = w;
      } else {
        used = next;
      }
    }
    total += lines;
  }
  return total;
}

/** Paragraphs a run of copy prints as; each takes its own lead on the board. */
export function agendaParagraphCount(text: string): number {
  return (text ?? "")
    .split("\n")
    .filter((line) => line.trim()).length;
}

/**
 * Smallest type multiplier a tightened band may print at. Below this the copy
 * stops being legible at board distance, so the fit report is left to flag the
 * overflow rather than shrinking the sheet into unreadability.
 */
export const AGENDA_MIN_BAND_FIT = 0.62;

/**
 * Most a band may grow past the height its own copy needs when the programme
 * underruns the sheet. Spare height past this is shared as gap between bands.
 */
export const AGENDA_MAX_BAND_STRETCH = 1.25;






// ── naming + persistence ─────────────────────────────────────────────────────

export function agendaName(config: AgendaConfig): string {
  return `${agendaDivision(config.divisionId).name} — ${config.title || "Agenda"}`;
}

export function agendaSlug(config: AgendaConfig): string {
  return (
    `${agendaDivision(config.divisionId).id}-agenda-${config.title || "day"}-${config.sizeId}-${config.face}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "next-agenda"
  );
}

export function normalizeAgendaConfig(input: unknown): AgendaConfig {
  const raw = (input ?? {}) as Partial<AgendaConfig>;
  const base = agendaDefault(typeof raw.divisionId === "string" ? raw.divisionId : undefined);
  const str = (v: unknown, fb: string) => (typeof v === "string" ? v : fb);
  const num = (v: unknown, fb: number) => (Number.isFinite(Number(v)) ? Number(v) : fb);
  const session = (input: unknown): AgendaSession => {
    const s = (input ?? {}) as Partial<AgendaSession>;
    const list = Array.isArray(s.parallels)
      ? (s.parallels as AgendaParallel[])
      : s.parallel
        ? [s.parallel as AgendaParallel]
        : [];
    const parallels = list
      .filter((p) => !!p)
      .map((p) => ({
        time: str(p?.time, ""),
        title: str(p?.title, ""),
        speaker: str(p?.speaker, ""),
        detail: str(p?.detail, ""),
        // The card's own room survives normalising. It was dropped here, so
        // every saved or reloaded board lost the second room of a simultaneous
        // slot and printed the cards with no room at all.
        room: str(p?.room, ""),
      }))
      .slice(0, AGENDA_MAX_PARALLEL);
    return {
      time: str(s.time, ""),
      title: str(s.title, ""),
      detail: str(s.detail, ""),
      track: str(s.track, ""),
      muted: Boolean(s.muted),
      parallels,
      // Kept in step with the list so a saved file stays readable by anything
      // that only knows the single-track shape.
      parallel: parallels[0] ?? null,
      pin: Boolean(s.pin),
      dayBreak: Boolean(s.dayBreak),
      icon: AGENDA_LOCATION_ICONS.some((ic) => ic.id === s.icon)
        ? (s.icon as AgendaLocationIconId)
        : "none",
      room: str(s.room, ""),
      iconInk: AGENDA_LOCATION_INKS.some((i) => i.id === s.iconInk)
        ? (s.iconInk as AgendaLocationInkId)
        : "auto",
      iconSize: AGENDA_LOCATION_SIZES.some((z) => z.id === s.iconSize)
        ? (s.iconSize as AgendaLocationSizeId)
        : "standard",


    };

  };
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.slice(0, 60).map(session)
    : base.sessions;
  return {
    ...base,
    divisionId: base.divisionId,
    face: raw.face === "light" ? "light" : "dark",
    styleId: AGENDA_STYLE_IDS.includes(String(raw.styleId)) ? String(raw.styleId) : base.styleId,
    sizeId: AGENDA_SIZES.some((s) => s.id === raw.sizeId)
      ? (raw.sizeId as AgendaSizeId)
      : base.sizeId,
    trimW: num(raw.trimW, base.trimW),
    trimH: num(raw.trimH, base.trimH),
    showLockup: raw.showLockup !== false,
    lockupScale: num(raw.lockupScale, 1),
    eyebrow: str(raw.eyebrow, base.eyebrow),
    title: str(raw.title, base.title),
    meta: str(raw.meta, base.meta),
    titleColor: str(raw.titleColor, ""),
    rowStyle: raw.rowStyle === "card" ? "card" : raw.rowStyle === "rule" ? "rule" : base.rowStyle,
    bandTreatment: AGENDA_BAND_TREATMENTS.some((t) => t.id === raw.bandTreatment)
      ? (raw.bandTreatment as AgendaBandTreatmentId)
      : base.bandTreatment,
    bandLayout: AGENDA_BAND_LAYOUTS.some((l) => l.id === raw.bandLayout)
      ? (raw.bandLayout as AgendaBandLayoutId)
      : base.bandLayout,
    locationLine: str(raw.locationLine, base.locationLine),
    locationIcon: AGENDA_LOCATION_ICONS.some((i) => i.id === raw.locationIcon)
      ? (raw.locationIcon as AgendaLocationIconId)
      : base.locationIcon,
    locationIconInk: AGENDA_LOCATION_INKS.some((i) => i.id === raw.locationIconInk)
      ? (raw.locationIconInk as AgendaLocationInkId)
      : base.locationIconInk,
    locationInk: AGENDA_LOCATION_INKS.some((i) => i.id === raw.locationInk)
      ? (raw.locationInk as AgendaLocationInkId)
      : base.locationInk,
    locationSize: AGENDA_LOCATION_SIZES.some((s) => s.id === raw.locationSize)
      ? (raw.locationSize as AgendaLocationSizeId)
      : base.locationSize,
    locationCaps: typeof raw.locationCaps === "boolean" ? raw.locationCaps : base.locationCaps,
    locationWeight:
      raw.locationWeight === "regular" || raw.locationWeight === "medium" || raw.locationWeight === "bold"
        ? (raw.locationWeight as AgendaLocationWeightId)
        : base.locationWeight,
    locationAlign:
      raw.locationAlign === "left" || raw.locationAlign === "centre" || raw.locationAlign === "right"
        ? (raw.locationAlign as AgendaLocationAlignId)
        : base.locationAlign,
    sessions: sessions.length ? sessions : base.sessions,
    footnote: str(raw.footnote, base.footnote),
    footerLeft: str(raw.footerLeft, base.footerLeft),
    footerRight: str(raw.footerRight, base.footerRight),
    footerCentre: str(raw.footerCentre, base.footerCentre),
    footerStyle: AGENDA_FOOTER_STYLES.some((f) => f.id === raw.footerStyle)
      ? (raw.footerStyle as AgendaFooterStyleId)
      : base.footerStyle,
    footerFill: AGENDA_FOOTER_FILLS.some((f) => f.id === raw.footerFill)
      ? (raw.footerFill as AgendaFooterFillId)
      : base.footerFill,
    footerHeight: AGENDA_FOOTER_HEIGHTS.some((h) => h.id === raw.footerHeight)
      ? (raw.footerHeight as AgendaFooterHeightId)
      : base.footerHeight,
    footerCaps: typeof raw.footerCaps === "boolean" ? raw.footerCaps : base.footerCaps,
    qrData: str(raw.qrData, ""),
    qrSize: num(raw.qrSize, base.qrSize),
    qrCaption: str(raw.qrCaption, base.qrCaption),
    qrStyle: AGENDA_QR_STYLES.some((s) => s.id === raw.qrStyle)
      ? (raw.qrStyle as PillarQrStyleId)
      : "block",
    qrForeground: str(raw.qrForeground, ""),
    qrBackground: str(raw.qrBackground, ""),
    qrTransparent: raw.qrTransparent === true,
    qrCaptionAlign:
      raw.qrCaptionAlign === "left" || raw.qrCaptionAlign === "right"
        ? raw.qrCaptionAlign
        : "center",
    qrCaptionSize: Math.max(0, Math.min(AGENDA_QR_CAPTION_SIZE.max, num(raw.qrCaptionSize, 0))),
    qrCaptionPad: Math.max(0, Math.min(AGENDA_QR_CAPTION_PAD.max, num(raw.qrCaptionPad, 0))),
    qrAnchor: raw.qrAnchor === "top-right" ? "top-right" : "foot-right",
    qrOffsetX: Number.isFinite(Number(raw.qrOffsetX)) ? Number(raw.qrOffsetX) : null,
    qrOffsetY: Number.isFinite(Number(raw.qrOffsetY)) ? Number(raw.qrOffsetY) : null,
    eventLabel: str(raw.eventLabel, ""),
    days:
      Array.isArray(raw.days) && raw.days.length
        ? raw.days.slice(0, 14).map((d, i) => {
            const day = (d ?? {}) as Partial<AgendaDay>;
            const rows = Array.isArray(day.sessions) ? day.sessions.slice(0, 60).map(session) : [];
            return {
              label: str(day.label, `DAY ${i + 1}`),
              meta: str(day.meta, ""),
              sessions: rows,
            };
          })
        : undefined,
    rowsPerPage: Math.max(0, Math.min(40, Math.round(num(raw.rowsPerPage, 0)))),
    titleScale: agendaTypeScale(raw.titleScale),
    rowScale: agendaTypeScale(raw.rowScale),
    timeScale: agendaTypeScale(raw.timeScale),
    detailScale: agendaTypeScale(raw.detailScale),
    titleWeight: typeWeight(raw.titleWeight, base.titleWeight ?? "bold"),
    rowWeight: typeWeight(raw.rowWeight, base.rowWeight ?? "bold"),
    timeWeight: typeWeight(raw.timeWeight, base.timeWeight ?? "bold"),
    dayLayout: raw.dayLayout === "one-sheet" ? "one-sheet" : raw.dayLayout === "pages" ? "pages" : base.dayLayout,
  };
}

/** Saved live agenda file row as the UI consumes it. */
export type AgendaVersion = {
  id: string;
  name: string;
  event_label: string;
  division_id: string;
  notes: string;
  config: AgendaConfig;
  created_at: string;
  updated_at: string;
};

/**
 * Resolved block positions in mm from the TRIM top-left corner. The live sheet
 * and the layered press PDF both read these, so the export is a pixel-for-point
 * match of what the operator approved on screen.
 */
export function agendaBlocks(config: AgendaConfig) {
  const L = agendaLayout(config);
  const geo = L.geo;
  const x = geo.safeInset;
  const rowCount = Math.max(1, config.sessions.length);

  let y = geo.safeInset;
  const lockup = config.showLockup ? { x, y, w: L.lockupW, h: L.lockupH } : null;
  const locationText = (config.locationLine ?? "").trim();

  // Programme look: the room / floor line and the date sit right-aligned beside
  // the lockup, so the header reads lockup left, place and date right.
  const locSpec = agendaLocation(config);
  let location: {
    y: number;
    metaY: number;
    /** Left edge of the room / date block. */
    left: number;
    right: number;
    size: number;
    metaSize: number;
    align: AgendaLocationAlignId;
    pin: { x: number; y: number; h: number } | null;
  } | null = null;
  if (L.card) {
    const headTop = y;
    const locH = L.locSize * 1.5 + L.metaSize * 1.8;
    // A left or centred room line cannot share the top line with the lockup, so
    // it stacks under it and takes the full content width instead.
    const stacked = locationText !== "" && locSpec.align !== "right" && !!lockup;
    if (locationText) {
      const top = stacked
        ? headTop + L.lockupH + 3 * L.k
        : lockup
          ? headTop + Math.max(0, (L.lockupH - locH) * 0.62)
          : headTop;
      const pinH = L.locSize * 1.5;
      location = {
        y: top,
        metaY: top + L.locSize * 1.7,
        left: x,
        right: x + L.contentW,
        size: L.locSize,
        metaSize: L.metaSize,
        align: locSpec.align,
        pin: { x, y: top, h: pinH },
      };
    }
    y = stacked
      ? headTop + L.lockupH + 3 * L.k + locH
      : headTop + Math.max(lockup ? L.lockupH : 0, locationText ? locH : 0);
    y += 8 * L.k;
  } else if (lockup) {
    y += L.lockupH + 9 * L.k;
  }
  const eyebrowY = y;
  if (!L.card || (config.eyebrow ?? "").trim()) y += L.eyebrowSize * 2.1;
  const titleY = y;
  if (!L.card || (config.title ?? "").trim()) y += L.titleSize * 1.14;
  const metaY = L.card && location ? location.metaY : y;
  if (!L.card) y += L.metaSize * 2.2;
  let rowsTop = y;

  /** Width the eyebrow, headline and date line may occupy. */
  let headW = L.contentW;
  const bottom = geo.trimH - geo.safeInset;
  /**
   * The foot of a programme board. The rectangle is reserved whatever the footer
   * style: on a hairline or clear foot the renderers simply do not fill it, so the
   * lines land in exactly the same place in every export.
   */
  const footer = agendaFooter(config);
  const footerBand = L.card
    ? { x: 0, y: geo.trimH - L.footerBandH, w: geo.trimW, h: L.footerBandH }
    : null;
  const footY = footerBand
    ? footerBand.y + (L.footerBandH - L.footSize) * 0.5
    : bottom - L.footSize * 1.2;
  /**
   * The multi-day page stamp (DAY 1 · PAGE 2 OF 3) is right-aligned, and so is the
   * right-hand footer line (the event dates). Printing both on `footY` overlapped
   * them on every multi-day board, so the stamp takes its own baseline above the
   * footer lines whenever the right-hand line is occupied.
   */
  const stampY =
    footerBand && footer.right.trim() ? footY - L.footSize * 1.9 : footY;
  /**
   * The footnote gets its own reserved strip above the band, tall enough for the
   * location pin the programme look draws beside it. Without the reservation the
   * pin overhung the strip and printed on the last row band and the band foot.
   */
  const footnoteText = (config.footnote ?? "").trim();
  const footnoteH = footnoteText ? L.footSize * 3 : 0;
  const footnoteY = footerBand ? footerBand.y - L.footSize * 0.9 - footnoteH : footY;
  // The raised stamp line needs clearing too, or the last row band prints over it.
  const stampGap = stampY < footY ? L.footSize * 1.9 : 0;
  let listBottom =
    (footerBand
      ? footnoteText
        ? footnoteY - L.footSize * 0.9
        : footerBand.y - L.footSize * 1.6
      : footY - L.footSize * 1.8) - stampGap;

  let qr: {
    x: number;
    y: number;
    edge: number;
    capY: number;
    capSize: number;
    capAlign: PillarCaptionAlign;
    placed: boolean;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    defaultX: number;
    defaultY: number;
  } | null = null;
  if ((config.qrData ?? "").trim()) {
    const capSize =
      Number(config.qrCaptionSize) > 0
        ? Math.min(AGENDA_QR_CAPTION_SIZE.max, Number(config.qrCaptionSize))
        : L.footSize;
    const pad = Math.max(0, Math.min(AGENDA_QR_CAPTION_PAD.max, Number(config.qrCaptionPad) || 0));
    const capH = (config.qrCaption ?? "").trim() ? capSize * 2 : 0;
    const blockH = L.qrEdge + capH;
    // The code can be dragged or typed anywhere on the sheet, but never outside
    // the safe margin — a scannable code half off the trim is a reprint.
    const minX = geo.safeInset + pad;
    const maxX = Math.max(minX, geo.trimW - geo.safeInset - pad - L.qrEdge);
    const minY = geo.safeInset + pad;
    const maxY = Math.max(minY, geo.trimH - geo.safeInset - pad - blockH);
    const defaultX = geo.trimW - geo.safeInset - L.qrEdge;
    const defaultY =
      agendaQrAnchor(config) === "top-right"
        ? geo.safeInset + pad
        : footY - L.footSize * 1.8 - capH - L.qrEdge;
    const rawX = Number(config.qrOffsetX);
    const rawY = Number(config.qrOffsetY);
    const placed =
      config.qrOffsetX !== null &&
      config.qrOffsetY !== null &&
      Number.isFinite(rawX) &&
      Number.isFinite(rawY);
    const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
    let qrX = clamp(placed ? rawX : defaultX, minX, maxX);
    let qrTop = clamp(placed ? rawY : defaultY, minY, maxY);
    // The caption can print wider than the code, so the block that must stay
    // clear of the lockup is the wider of the two.
    const capWidth = (config.qrCaption ?? "").trim()
      ? Math.max(L.qrEdge, (config.qrCaption ?? "").trim().length * capSize * 0.62)
      : L.qrEdge;
    // The lockup owns the top-left of the header. A code parked or dragged there
    // printed straight through the wordmark — and a code placed on a bigger board
    // lands there after a format switch. Step it clear: to the right of the
    // lockup when the margin allows, otherwise below it.
    if (lockup) {
      const gutter = Math.max(6 * L.k, pad);
      const blockLeft = Math.min(qrX, qrX + (L.qrEdge - capWidth) * 0.5);
      const blockRight = Math.max(qrX + L.qrEdge, blockLeft + capWidth);
      const blockBottom = qrTop + blockH;
      const hits =
        blockRight > lockup.x - gutter &&
        blockLeft < lockup.x + lockup.w + gutter &&
        blockBottom > lockup.y - gutter &&
        qrTop < lockup.y + lockup.h + gutter;
      if (hits) {
        const toRight = lockup.x + lockup.w + gutter + (qrX - blockLeft);
        if (toRight <= maxX) qrX = clamp(toRight, minX, maxX);
        else qrTop = clamp(lockup.y + lockup.h + gutter, minY, maxY);
      }
    }

    qr = {
      x: qrX,
      y: qrTop,
      edge: L.qrEdge,
      capY: qrTop + L.qrEdge + capSize * 0.7,
      capSize,
      capAlign: agendaQrCaptionAlign(config),
      placed,
      minX,
      maxX,
      minY,
      maxY,
      defaultX,
      defaultY,
    };
    const qrBottom = qrTop + blockH;
    // A code resting in the header band pushes the programme down instead of
    // eating it from the bottom, and narrows the title block beside it.
    if (qrTop < rowsTop) {
      const gutter = Math.max(6 * L.k, pad);
      if (qrX > x + L.contentW * 0.4) headW = Math.max(L.contentW * 0.35, qrX - x - gutter);
      if (qrBottom + gutter > rowsTop) rowsTop = Math.min(listBottom - 20, qrBottom + gutter);
      // The room / floor line and the date are right-aligned to the content
      // edge, so a code parked in the header used to print straight over them.
      // Pull their right edge back to the code's left side whenever the two
      // share any vertical band.
      if (location) {
        const locTop = location.y - L.locSize;
        const locBottom = location.metaY + L.metaSize * 0.6;
        const overlaps = qrTop < locBottom && qrBottom > locTop;
        if (overlaps && qrX > x) {
          const capW = (config.qrCaption ?? "").trim()
            ? Math.max(L.qrEdge, (config.qrCaption ?? "").trim().length * capSize * 0.62)
            : L.qrEdge;
          // The caption can sit wider than the code itself; clear the wider of
          // the two so nothing tucks under the label either.
          const blockLeft = Math.min(qrX, qrX + (L.qrEdge - capW) * 0.5);
          const minRight = x + L.locSize * 4;
          location.right = Math.max(minRight, blockLeft - gutter);
        }
      }
    } else {
      // The programme only makes room for the code when the code sits in its way.
      const clash = qrTop < listBottom && qrBottom > rowsTop;
      if (clash) listBottom = Math.max(rowsTop + 10, qrTop - L.footSize * 1.4);
    }
  }

  const rowH = Math.max(5, (listBottom - rowsTop) / rowCount);

  type AgendaRow = {
    session: AgendaSession;
    y: number;
    h: number;
    /** Band rectangle for the programme look; null on the ruled list. */
    band: { x: number; y: number; w: number; h: number } | null;
    /** First aqua card, kept for callers that only read one parallel track. */
    parallel: { x: number; y: number; w: number; h: number } | null;
    /** One aqua card per parallel track, left to right. */
    parallels: { x: number; y: number; w: number; h: number }[];
    /**
     * Type multiplier for this band, 1 when the band holds its copy at the
     * board's sizes. A tightened board used to keep full-size type inside a
     * shortened band, and the bands clip, so the last speaker lines simply
     * vanished from the sheet and the press file. Every renderer scales its
     * sizes by this so the copy shrinks honestly instead of being cut, and the
     * fit report still flags anything below the legible floor.
     */
    fit: number;
  };


  /** Unscaled height each row's copy really wants, in mm. */
  let needs: number[] = [];
  let rows: AgendaRow[];
  if (L.card) {
    // Bands take the height their copy really needs, so a two-line title with a
    // three-line speaker note is never crushed into the same band as "Lunch".
    const bodyW = L.bandW - L.timeColW - L.bandPadX * 2;
    /**
     * A day heading prints as one nowrap line of caps in a slim bar, so it is
     * measured as that and never as a stacked band. Measured as a full band it
     * both wasted a session's worth of height and, on an underrun, swelled into
     * a giant blue plate when the spare height was shared out.
     */
    const dayBarH = L.bandPadY * 1.2 + L.titleRowSize * 1.05 * 1.35;
    const height = (session: AgendaSession) => {
      if (session.dayBreak) return dayBarH;
      const pars = agendaParallels(session);
      const split = agendaSplitWidths(L.bandW, L.bandGap, pars.length);
      const w = pars.length ? split.leftW - L.timeColW - L.bandPadX * 2 : bodyW;
      const left =
        // The track eyebrow prints above the title on both renderers and used to
        // be measured as nothing at all, so every tracked slot ran a line over.
        ((session.track ?? "").trim() ? L.trackSize * 1.5 : 0) +
        agendaTextLines(session.title, L.titleRowSize, w) * L.titleRowSize * 1.5 +
        // A room line prints as its own small caps line under the title, so it is
        // measured as one, and never squeezes the speaker notes out of the band.
        (agendaSessionRoomLine(session, pars.length > 0)
          ? agendaTextLines(agendaSessionRoomLine(session, pars.length > 0), L.detailSize, w) *
              L.detailSize *
              1.55 +
            L.detailSize * 0.5
          : 0) +
        agendaTextLines(session.detail, L.detailSize, w) * L.detailSize * 1.55 +
        // Each speaker/notes paragraph opens with its own lead on the live board,
        // so a four-name panel list costs four leads, not one.
        agendaParagraphCount(session.detail) * L.detailSize * 0.6;

      // Every parallel card is measured on its own column width; the band takes
      // the tallest of them so no track is clipped.
      const ct = agendaCardType(
        L,
        split.cardW,
        pars.length,
        pars.reduce((m, p) => Math.max(m, agendaLongestWord(p.title)), 0),
      );
      const right = pars.reduce(
        (tallest, p) =>
          Math.max(
            tallest,
            agendaTextLines(p.title, ct.titleSize, ct.textW) * ct.titleSize * 1.5 +
              // Own start time and speaker line each take a measured line box, so
              // a card carrying all four fields is never clipped. The time line
              // carries its own gap under it (1.4 line + 0.25 gap).
              ((p.time ?? "").trim() || session.time.trim() ? ct.timeSize * 1.65 : 0) +
              agendaTextLines(p.speaker ?? "", ct.detailSize, ct.textW) * ct.detailSize * 1.55 +
              ((p.speaker ?? "").trim() ? ct.detailSize * 0.5 : 0) +
              // The card's own room line is measured too, so a slot running in two
              // rooms at once never clips the second room off the board.
              (agendaParallelRoomLine(p)
                ? agendaTextLines(agendaParallelRoomLine(p), ct.detailSize, ct.textW) *
                    ct.detailSize *
                    1.55 +
                  ct.detailSize * 0.5
                : 0) +

              agendaTextLines(p.detail, ct.detailSize, ct.textW) * ct.detailSize * 1.55 +
              (p.detail.trim() ? ct.detailSize * 0.6 : 0),
          ),
        0,
      );
      return L.bandPadY * 2 + Math.max(L.titleRowSize * 1.6, left, right);
    };
    const wanted = config.sessions.map(height);
    needs = wanted;
    const gaps = L.bandGap * Math.max(0, wanted.length - 1);
    const available = Math.max(20, listBottom - rowsTop - gaps);
    // Scale to the sheet: shrink proportionally when the day overruns, and share
    // the spare height out when it underruns, keeping the copy-driven ratios.
    //
    // Short, wide formats (16:9, 21:9) have a shallow programme band, so a plain
    // proportional scale plus a per-band legible floor used to add up to more
    // than the band: the floored bands kept their height while nothing else gave
    // any back, and the last sessions printed over the footer. The heights are
    // solved by water-filling instead — bands that hit the floor are pinned at
    // it and taken out of the budget, and the rest re-share what is left. When
    // even the floor no longer fits, every band sits on the floor and the fit
    // report / page capacity reports the overflow honestly.
    const floorH = L.titleRowSize * 2.4;
    const fixedRow = config.sessions.map((s) => Boolean(s.dayBreak));
    const heights = new Array<number>(wanted.length).fill(floorH);
    let free: number[] = [];
    let budget = available;
    wanted.forEach((h, i) => {
      // Day headings hold their measured bar height in every pass: they neither
      // shrink below a legible cap line nor grow into the spare height.
      if (fixedRow[i]) {
        heights[i] = h;
        budget -= h;
      } else free.push(i);
    });
    for (let pass = 0; pass < wanted.length + 1 && free.length > 0; pass += 1) {
      const freeTotal = free.reduce((a, i) => a + wanted[i]!, 0) || 1;
      // Spare height is only ever shared out so far. A short programme used to
      // take every millimetre going, so a two-line session printed as a band
      // three times the height of its copy with a cavern under it. Past the cap
      // the air goes between the bands instead, which is where it reads.
      const scale = Math.min(AGENDA_MAX_BAND_STRETCH, Math.max(0, budget) / freeTotal);
      const pinned = free.filter((i) => wanted[i]! * scale < floorH);
      if (pinned.length === 0) {
        for (const i of free) heights[i] = wanted[i]! * scale;
        free = [];
        break;
      }
      for (const i of pinned) {
        heights[i] = floorH;
        budget -= floorH;
      }
      free = free.filter((i) => !pinned.includes(i));
      if (budget <= 0) {
        for (const i of free) heights[i] = floorH;
        free = [];
      }
    }
    for (const i of free) heights[i] = floorH;

    // Whatever the bands did not take is shared between them as extra gap, up to
    // twice the board's own gap; anything past that stays as honest slack at the
    // foot rather than stretching the programme out of its rhythm.
    const takenH = heights.reduce((a, h) => a + h, 0);
    const spare = Math.max(0, available - takenH);
    const gapExtra =
      heights.length > 1 ? Math.min(spare / (heights.length - 1), L.bandGap * 6) : 0;
    const rowGap = L.bandGap + gapExtra;

    let cursor = rowsTop;
    rows = config.sessions.map((session, i) => {
      const h = heights[i]!;
      const y = cursor;
      cursor += h + rowGap;

      const pars = agendaParallels(session);
      const split = agendaSplitWidths(L.bandW, L.bandGap, pars.length);
      const bx = x + L.bandInset;
      const band = { x: bx, y, w: pars.length ? split.leftW : L.bandW, h };
      const parallels = pars.map((_, n) => ({
        x: bx + split.leftW + L.bandGap * (n + 1) + split.cardW * n,
        y,
        w: split.cardW,
        h,
      }));
      // The copy area is the band less its fixed padding, so the multiplier only
      // measures the type against the room the type actually has.
      const pad = L.bandPadY * 2;
      const copyNeed = Math.max(0.1, needs[i]! - pad);
      const copyRoom = Math.max(0.1, h - pad);
      const fit = session.dayBreak
        ? 1
        : Math.max(AGENDA_MIN_BAND_FIT, Math.min(1, copyRoom / copyNeed));
      return {
        session,
        y,
        h: h + L.bandGap,
        band,
        parallel: parallels[0] ?? null,
        parallels,
        fit,
      };
    });
  } else {
    rows = config.sessions.map((session, i) => ({
      session,
      y: rowsTop + i * rowH,
      h: rowH,
      band: null,
      parallel: null,
      parallels: [],
      fit: 1,
    }));
  }


  const rowsBottom = rows.length ? rows[rows.length - 1]!.y + rows[rows.length - 1]!.h : rowsTop;

  return {
    layout: L,
    geo,
    x,
    contentW: L.contentW,
    headW,
    lockup,
    location,
    eyebrowY,
    titleY,
    metaY,
    rowsTop,
    rowH,
    rows,
    needs,
    rowsBottom,
    listBottom,
    footerBand,
    footer,
    footY,
    stampY,
    footnoteY,
    footnoteH,
    qr,

  };
}

// ── multi-day + multi-page ───────────────────────────────────────────────────
//
// A live agenda file can hold several programme days, and each day can run over
// as many printed pages as it needs. `agendaPages` resolves the whole file into
// an ordered list of single-page boards — every one a plain `AgendaConfig`, so
// the live sheet, the layered press PDF and the Word export all read the same
// pages from the same geometry.

/** Smallest row band we will sign off for reading distance, in mm. */
export const AGENDA_MIN_ROW_MM = 10;

export const AGENDA_ROWS_PER_PAGE = { min: 3, max: 40 };

/** Every day in the file, always at least one. */
export function agendaDays(config: AgendaConfig): AgendaDay[] {
  const days = (config.days ?? []).filter(Boolean);
  if (days.length) return days;
  return [{ label: config.title ?? "", meta: config.meta ?? "", sessions: config.sessions ?? [] }];
}

/** Rows that hold the legible floor on one page of the chosen format. */
export function agendaCapacity(config: AgendaConfig): number {
  const probe = agendaBlocks({ ...config, sessions: config.sessions.slice(0, 1) });
  const band = Math.max(AGENDA_MIN_ROW_MM, probe.listBottom - probe.rowsTop);
  const plain = Math.max(1, Math.floor(band / AGENDA_MIN_ROW_MM));
  // Programme bands are copy-driven: a slot carrying four parallel cards with
  // their own time, speaker and notes needs far more height than a plain ruled
  // row. Page on the real measured need so no card is squeezed to the floor.
  const full = agendaBlocks(config);
  const needs = full.needs;
  if (!needs.length) return plain;
  const gap = full.layout.bandGap;
  const tallest = Math.max(...needs);
  const byNeed = Math.max(1, Math.floor((band + gap) / (tallest + gap)));
  return Math.max(1, Math.min(plain, byNeed));
}

/** Rows placed on each page: the operator's setting, or an automatic fill. */
export function agendaRowsPerPage(config: AgendaConfig): number {
  const manual = Math.round(Number(config.rowsPerPage) || 0);
  if (manual >= AGENDA_ROWS_PER_PAGE.min) {
    return Math.min(AGENDA_ROWS_PER_PAGE.max, manual);
  }
  return agendaCapacity(config);
}

export type AgendaPage = {
  /** A single-page board, ready for the sheet or the export. */
  config: AgendaConfig;
  dayIndex: number;
  dayCount: number;
  dayLabel: string;
  /** Page number inside its day, 0-based. */
  pageInDay: number;
  pagesInDay: number;
  /** Page number across the whole file, 0-based. */
  index: number;
  total: number;
  label: string;
};

/** Resolve a live agenda file into its printed pages. */
export function agendaPages(config: AgendaConfig): AgendaPage[] {
  const days = agendaDays(config);
  const perPage = agendaRowsPerPage(config);
  const multiDay = days.length > 1;

  // Every day on one board: each day opens with its own date band and the rows
  // that follow belong to it. The rows tighten to the sheet; the fit report is
  // what says honestly whether the board will hold them.
  if (multiDay && agendaDayLayout(config) === "one-sheet") {
    const rows: AgendaSession[] = [];
    days.forEach((day) => {
      const head = (day.label || "").trim() || (day.meta || "").trim();
      if (head) {
        rows.push({
          time: "",
          title: head,
          detail: (day.label || "").trim() ? (day.meta || "").trim() : "",
          track: "",
          muted: true,
          dayBreak: true,

        });
      }
      rows.push(...(day.sessions ?? []));
    });
    const first = days[0]!;
    const merged: AgendaConfig = {
      ...config,
      days: undefined,
      rowsPerPage: 0,
      title: (config.title ?? "").trim() || (first.label ?? ""),
      meta: config.meta ?? first.meta ?? "",
      sessions: rows,
      pageLabel: "",
    };
    // One sheet only when the board can actually hold every day at a legible
    // row height. A smaller format falls back to a page per day rather than
    // printing a programme squeezed past its floor.
    // Honest gate: measure what this merged programme actually needs — each
    // band at its own copy height plus the gaps — against the band the board
    // gives. One sheet engages only when it truly holds; otherwise the board
    // falls back to a page per day rather than printing past the safe edge.
    // Honest gate: the rows compress to their legible floor, so one sheet
    // engages when every band still clears that floor inside the board's list
    // area at the height its copy needs. Anything tighter falls back to a page
    // per day rather than printing a programme past the safe edge.
    const probe = agendaBlocks(merged);
    const last = probe.rows[probe.rows.length - 1];
    const bottom = last ? last.y + (last.band?.h ?? last.h) : probe.rowsTop;
    // The bands are always solved to fill the list area exactly, so the bottom
    // edge alone always "passed" and a two-day programme landed on one sheet
    // with every band half the height its copy needed. Gate on the bands: one
    // sheet engages only when each one still holds its own copy at close to the
    // board's sizes.
    const holdsCopy = probe.rows.every((r) => r.fit >= 0.97);
    if (bottom <= probe.listBottom + 0.5 && holdsCopy) {

    return [
      {
        config: merged,
        dayIndex: 0,
        dayCount: days.length,
        dayLabel: days.map((d) => (d.label || d.meta || "").trim()).filter(Boolean).join(" · "),
        pageInDay: 0,
        pagesInDay: 1,
        index: 0,
        total: 1,
        label: `All ${days.length} days · one sheet`,
      },
    ];
    }
  }

  const chunks: {
    dayIndex: number;
    day: AgendaDay;
    rows: AgendaSession[];
    pageInDay: number;
    pagesInDay: number;
  }[] = [];
  days.forEach((day, dayIndex) => {
    const rows = day.sessions ?? [];
    const pagesInDay = Math.max(1, Math.ceil(rows.length / perPage));
    for (let p = 0; p < pagesInDay; p += 1) {
      chunks.push({
        dayIndex,
        day,
        rows: rows.slice(p * perPage, (p + 1) * perPage),
        pageInDay: p,
        pagesInDay,
      });
    }
  });

  const total = chunks.length;
  return chunks.map((chunk, index) => {
    const continued = chunk.pageInDay > 0;
    const dayLabel = chunk.day.label || `Day ${chunk.dayIndex + 1}`;
    const stamp =
      total === 1
        ? ""
        : [
            multiDay ? dayLabel.toUpperCase() : "",
            chunk.pagesInDay > 1 ? `PAGE ${chunk.pageInDay + 1} OF ${chunk.pagesInDay}` : "",
            !multiDay && chunk.pagesInDay === 1 ? `PAGE ${index + 1} OF ${total}` : "",
          ]
            .filter(Boolean)
            .join(" · ");
    return {
      config: {
        ...config,
        days: undefined,
        rowsPerPage: 0,
        // A day with no printed label (the GlobalLink programme boards carry the
        // date line only) must stay unlabelled, so the fallback is stamp-only.
        title: continued
          ? `${(chunk.day.label ?? "").trim() || dayLabel} (CONT.)`
          : (chunk.day.label ?? ""),
        meta: chunk.day.meta ?? "",
        sessions: chunk.rows,
        pageLabel: stamp,
      },
      dayIndex: chunk.dayIndex,
      dayCount: days.length,
      dayLabel,
      pageInDay: chunk.pageInDay,
      pagesInDay: chunk.pagesInDay,
      index,
      total,
      label: `${dayLabel}${chunk.pagesInDay > 1 ? ` · page ${chunk.pageInDay + 1}/${chunk.pagesInDay}` : ""}`,
    };
  });
}

/**
 * Write a patch into one day of the file, keeping day one mirrored onto the
 * top-level fields so single-day files and older consumers stay valid.
 */
export function writeAgendaDay(
  config: AgendaConfig,
  index: number,
  patch: Partial<AgendaDay>,
): AgendaConfig {
  const days = agendaDays(config).map((d, i) => (i === index ? { ...d, ...patch } : d));
  const first = days[0]!;
  return {
    ...config,
    days: days.length > 1 ? days : undefined,
    title: first.label,
    meta: first.meta,
    sessions: first.sessions,
  };
}

/** Add a programme day, seeded from the day it follows. */
export function addAgendaDay(config: AgendaConfig): AgendaConfig {
  const days = agendaDays(config);
  const last = days[days.length - 1]!;
  const next: AgendaDay = {
    label: `DAY ${["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN"][days.length] ?? days.length + 1}`,
    meta: last.meta,
    sessions: [{ time: "09:00", title: "New session", detail: "", track: "", muted: false }],
  };
  const all = [...days, next];
  return {
    ...config,
    days: all,
    title: all[0]!.label,
    meta: all[0]!.meta,
    sessions: all[0]!.sessions,
  };
}

/** Remove a programme day. The file always keeps at least one. */
export function removeAgendaDay(config: AgendaConfig, index: number): AgendaConfig {
  const days = agendaDays(config).filter((_, i) => i !== index);
  if (!days.length) return config;
  const first = days[0]!;
  return {
    ...config,
    days: days.length > 1 ? days : undefined,
    title: first.label,
    meta: first.meta,
    sessions: first.sessions,
  };
}

/** Filename fragment for one page of a multi-page file. */
export function agendaPageSlug(page: AgendaPage): string {
  const base = agendaSlug(page.config);
  return page.total > 1 ? `${base}-p${String(page.index + 1).padStart(2, "0")}` : base;
}
