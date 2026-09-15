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

import { LONDON_STYLES } from "@/lib/next-london-signage";
import { NEXT_DIVISIONS } from "@/lib/next-event";
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
import { logoInkRatio } from "@/lib/next-logo-ink";
import { qrPrintQuality, type QrModuleStyle } from "@/lib/qr-print";

export const AGENDA_DIVISIONS: CityBadgeDivision[] = CITY_BADGE_DIVISIONS;
export const agendaDivision = cityBadgeDivision;

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

/** Approved division accent for the NEXT event programme, or null when the
 *  division has none (City Series keeps the standard gradient). */
export function agendaDivisionAccent(divisionId: string | undefined): string | null {
  return NEXT_DIVISIONS.find((d) => d.id === divisionId)?.accent ?? null;
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
};

export function agendaBandTreatment(config: {
  bandTreatment?: string;
}): AgendaBandTreatmentId {
  return AGENDA_BAND_TREATMENTS.some((t) => t.id === config.bandTreatment)
    ? (config.bandTreatment as AgendaBandTreatmentId)
    : "solid";
}

/** Resolved band colours for a board. Never returns an unapproved value. */
export function agendaBandPalette(config: {
  bandTreatment?: string;
  bandLayout?: string;
}): AgendaBandPalette {
  const box = agendaBandLayout(config);
  const base = {
    parallel: AGENDA_BAND.parallel,
    parallelInk: AGENDA_BAND.ink,
    pin: AGENDA_BAND.pin,
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
    AGENDA_FOOTER_STYLES.find((s) => s.id === config.footerStyle)?.id ?? "band";
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
    // The pin keeps its house Peach unless the operator picks a colour.
    iconHex: iconInk ?? (icon.id === "pin" ? AGENDA_BAND.pin : null),
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
};

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
    }));
}

/** One programme day. Multi-day agendas hold an ordered list of these. */
export type AgendaDay = {
  /** Day title printed as the headline, e.g. "DAY ONE". */
  label: string;
  /** Date · venue line for that day. */
  meta: string;
  sessions: AgendaSession[];
};

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
};

/** Row helper: keeps the issued programmes readable. */
const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

/** GlobalLinkNEXT London, day one — Fleming, 3rd floor. */
const GLOBALLINK_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration, Networking & Lunch", "", { muted: true }),
  row("1:30-1:45 PM", "Welcome to GlobalLinkNEXT"),
  row(
    "1:45 PM-2:30 PM",
    "Building What's NEXT: Inside TransPerfect's GlobalLink Technology",
    "Join TransPerfect's Technology Leaders for an inside look at the innovations shaping the company's future.",
  ),
  row(
    "2:30-3:00 PM",
    "One Platform, One Voice: How Hilti Built a Global Localization Backbone",
    "Karel Rozkosny, Global Lead Marketing Technology, Hilti Group",
  ),
  row(
    "3:00-3:30 PM",
    "Mind the Gap! Why AI Translation Needs Governance",
    "Hilary Wright & Ty Trainer, AI Practice Group, TransPerfect",
  ),
  row("3:30-3:45 PM", "Coffee Break", "", { muted: true }),
  row(
    "3:45-4:10 PM",
    "Brewing AI-Powered Innovation",
    "Francesco Mandia, Global Head of Digital Innovation & Performance Marketing, illycaffé S.p.A.",
    {
      parallel: {
        title: "Adapting to a New Era of Travel Discovery",
        detail: "Ashley Jones, Client Partner, Tripadvisor",
      },
    },
  ),
  row(
    "4:15-4:40 PM",
    "Managing an AI-Forward Content Supply Chain",
    "Lindis Barry, Sr. Globalization Lead, Amazon Web Services",
    {
      parallel: {
        title: "Built to Evolve: Redesigning Fairmont.com to Unlock the Future of Digital Hospitality",
        detail:
          "Brittany Borrego, Lead Digital Experience & Performance Manager, Accor Hotels - Fairmont & Raffles",
      },
    },
  ),
  row("4:45-5:10 PM", "TBA"),
  row("5:10-5:50 PM", "Panel Discussion", "Moderated by Aaron Campbell, Senior Director, TransPerfect"),
  row("5:50-6:00 PM", "Closing Remarks Day One"),
  row("6:00-8:00 PM", "Post-Event Networking Cocktail Reception", "", { muted: true }),
];

/** GlobalLinkNEXT London, day two. */
const GLOBALLINK_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  row(
    "9:45-10:30 AM",
    "Beyond Intelligence",
    "Matt Hauser, Chief Experience Officer, TransPerfect\n\nArtificial intelligence has rapidly shifted from a novelty into an everyday baseline, but true competitive advantage lies in what you build on top of that technology. Discover how TransPerfect's continuous evolution can help turn new capabilities into strategic outcomes for what's NEXT.",
  ),
  row(
    "10:30-11:45 AM",
    "Unreasonable Brands: How to Build a Brand Centered on Unreasonable Hospitality",
    "Will Guidara, New York Times bestselling author of Unreasonable Hospitality and former co-owner of Eleven Madison Park, will show how making people feel valued turned a restaurant into the best in the world, and how that same thinking builds brands people stay loyal to.",
    { track: "KEYNOTE" },
  ),
  row("11:45-12:45 PM", "Lunch", "", { muted: true }),
  row(
    "12:45-1:10 PM",
    "Becoming AI-Forward— Scaling Localization & Content with Agentic AI",
    "Jonathan, Head of Customer & Product Excellence, Amazon Web Services",
  ),
  row(
    "1:15-1:40 PM",
    "Aura: Building the Marketing Operating System",
    "Mario Lenoci & Verena Bucher, TransPerfect",
  ),
  row("1:45-2:10 PM", "Turning Information into Advantage", "Mark Lawyer, Vice President, TransPerfect"),
  row(
    "2:15-2:40 PM",
    "Scaling Creative Without Losing Control: A Guide to AI in Content Production",
    "Danielle Penny, Content Manager, easyJet Holidays",
  ),
  row(
    "2:45-3:10 PM",
    "Beyond Loyalty: How Global Hotel Alliance Builds One Experience Across 50+ Brands",
    "Nicholas le Roux, EVP Marketing, Global Hotel Alliance",
  ),
  row("3:10-3:15 PM", "Closing Remarks"),
];


/**
 * Division-specific default programmes. Every NEXT area opens on its own
 * agenda copy, so an operator starts from a real programme for that track
 * rather than a blank grid.
 */
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
    title: "DAY ONE",
    meta: "City Series · 2026 season",
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
  // GlobalLinkNEXT London — the issued two-day programme, as approved.
  globallink: {
    title: "",
    meta: "THURSDAY, SEPTEMBER 24, 2026",
    rowStyle: "card",
    eyebrow: "",
    locationLine: "FLEMING 3RD FLOOR",
    footnote: "These sessions will take place in Abbey (4th Floor)",
    footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/GLOBALLINK",
    footerRight: "24 & 25 SEPTEMBER, 2026",
    sessions: GLOBALLINK_DAY_ONE,
    days: [
      { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: GLOBALLINK_DAY_ONE },
      { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: GLOBALLINK_DAY_TWO },
    ],
  },
  finance: {
    title: "DAY ONE",
    meta: "Finance NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & breakfast briefing",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — regulated content at speed",
        detail: "Global banking & markets panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Disclosure, KID & prospectus workflows",
        detail: "Compliance-first localization",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Model governance & audit trails",
        detail: "Where AI is allowed, and where it is not",
        track: "LAB",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client story: 27 markets, one review cycle",
        detail: "Tier-1 asset manager",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  games: {
    title: "DAY ONE",
    meta: "Games NEXT · agenda",
    sessions: [
      {
        time: "09:00",
        title: "Doors & arcade open",
        detail: "Play the localized builds",
        track: "",
        muted: true,
      },
      {
        time: "10:00",
        title: "Keynote — shipping worldwide day one",
        detail: "Studio leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:00",
        title: "Voice, VO & lip-sync pipelines",
        detail: "From script lock to gold master",
        track: "STUDIO",
        muted: false,
      },
      { time: "12:00", title: "Break & arcade", detail: "", track: "", muted: true },
      {
        time: "12:30",
        title: "LQA at scale",
        detail: "Test plans, device farms, live ops",
        track: "LAB",
        muted: false,
      },
      { time: "13:30", title: "Lunch", detail: "Atrium", track: "", muted: true },
      {
        time: "14:30",
        title: "Live-ops content sprints",
        detail: "Weekly drops in 14 languages",
        track: "WORKSHOP",
        muted: false,
      },
      {
        time: "17:00",
        title: "Player-community showcase & drinks",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  legal: {
    title: "DAY ONE",
    meta: "Legal NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & CLE check-in",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — eDiscovery without borders",
        detail: "Litigation technology panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Multilingual review workflows",
        detail: "Trial Interactive walkthrough",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Privilege, redaction & data residency",
        detail: "Cross-border practicalities",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: arbitration in three languages",
        detail: "Counsel and project leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  "life-sci": {
    title: "DAY ONE",
    meta: "Life Sci NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — trials that read in every market",
        detail: "Clinical operations leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "eCOA, ICF & patient-facing content",
        detail: "Linguistic validation in practice",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Regulatory submissions at pace",
        detail: "EMA, FDA and beyond",
        track: "LAB",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: 42-country study start-up",
        detail: "Sponsor and CRO view",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  experience: {
    title: "DAY ONE",
    meta: "Experience NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & experience walk-through",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — one brand, every market",
        detail: "Global CX leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Journey localization clinic",
        detail: "Web, app and support in-market",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Personalisation without fragmentation",
        detail: "Governance for CX teams",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Client story: retail rollout in 19 markets",
        detail: "CX and content leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  learn: {
    title: "DAY ONE",
    meta: "Learn NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & course lab open",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — training the global workforce",
        detail: "Learning leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "eLearning localization clinic",
        detail: "SCORM, video and assessment",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Voice, captions & accessibility",
        detail: "WCAG in every language",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: onboarding in 23 languages",
        detail: "Global enablement team",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  media: {
    title: "DAY ONE",
    meta: "Media NEXT · agenda",
    sessions: [
      {
        time: "09:00",
        title: "Doors & screening room open",
        detail: "Localized reels on rotation",
        track: "",
        muted: true,
      },
      {
        time: "10:00",
        title: "Keynote — global release, one calendar",
        detail: "Studio distribution panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "11:00",
        title: "Dubbing, subtitling & audio description",
        detail: "Pipelines end to end",
        track: "STUDIO",
        muted: false,
      },
      { time: "12:00", title: "Break & screening", detail: "", track: "", muted: true },
      {
        time: "12:30",
        title: "Synthetic voice, human oversight",
        detail: "Where the line sits",
        track: "LAB",
        muted: false,
      },
      { time: "13:30", title: "Lunch", detail: "Atrium", track: "", muted: true },
      {
        time: "14:30",
        title: "Metadata & discoverability",
        detail: "Getting found in every store",
        track: "WORKSHOP",
        muted: false,
      },
      {
        time: "17:00",
        title: "Premiere showcase & drinks",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  digital: {
    title: "DAY ONE",
    meta: "Digital NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & coffee",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — search, social and AI answers",
        detail: "Digital marketing leadership",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Multilingual SEO & LLM visibility clinic",
        detail: "Bring a domain, leave with a plan",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Paid media in 30 markets",
        detail: "Creative, copy and compliance",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: organic growth across EMEA",
        detail: "Brand and agency leads",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
  dataforce: {
    title: "DAY ONE",
    meta: "Dataforce NEXT · agenda",
    sessions: [
      {
        time: "08:30",
        title: "Registration & data lab open",
        detail: "Concourse, Level 2",
        track: "",
        muted: true,
      },
      {
        time: "09:30",
        title: "Keynote — training data people can trust",
        detail: "AI data leadership panel",
        track: "MAIN STAGE",
        muted: false,
      },
      {
        time: "10:30",
        title: "Collection design for 100+ locales",
        detail: "Speech, text and image",
        track: "LAB",
        muted: false,
      },
      { time: "11:30", title: "Break", detail: "", track: "", muted: true },
      {
        time: "12:00",
        title: "Annotation quality & human review",
        detail: "Guidelines that hold up",
        track: "WORKSHOP",
        muted: false,
      },
      { time: "13:00", title: "Lunch & networking", detail: "Atrium", track: "", muted: true },
      {
        time: "14:00",
        title: "Case study: evaluation at model scale",
        detail: "Frontier-lab programme",
        track: "STUDIO",
        muted: false,
      },
      {
        time: "16:00",
        title: "Closing panel & reception",
        detail: "Terrace",
        track: "MAIN STAGE",
        muted: false,
      },
    ],
  },
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

export function agendaDefault(divisionId = "city-series"): AgendaConfig {
  const div = agendaDivision(divisionId);
  const programme = agendaProgramme(div.id);
  return {
    divisionId: div.id,
    face: "dark",
    styleId: "01-beam-violet-aqua",
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
    sessions: programme.sessions.map((s) => ({ ...s })),
    footnote: programme.footnote ?? "Programme subject to change · full agenda and speaker bios online",
    footerLeft: programme.footerLeft ?? "",
    footerRight: programme.footerRight ?? "",
    footerCentre: programme.footerCentre ?? "",
    footerStyle: programme.footerStyle ?? "band",
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
/** The approved lockup file for this board's face. */
export function agendaLockupUrl(config: AgendaConfig): string {
  const div = agendaDivision(config.divisionId);
  return (config.face ?? "dark") === "light"
    ? div.colorUrl || div.whiteUrl
    : div.whiteUrl || div.colorUrl;
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
  // programme; portrait boards stay on the established 44% content width.
  const lockupW = Math.min(contentW * 0.44, geo.trimH * 0.2 * ratio) * agendaLockupScale(config);
  const lockupH = lockupW / ratio;

  const card = agendaRowStyle(config) === "card";

  const eyebrowSize = 5.4 * k;
  const titleSize = 22 * k;
  const metaSize = card ? 4.6 * k : 6.4 * k;
  const footSize = 4.4 * k;
  const qrEdge = Math.min(agendaQrSize(config), contentW * 0.35);
  // Programme look: the room / floor line sits beside the lockup with a pin, the
  // date line under it, and the footer prints on a Blue 500 band across the foot.
  const locSize = 8.2 * k;
  const box = agendaBandLayout(config);
  const bandGap = 2.6 * k * box.gapMul;
  /** How far the band boxes step in from the safe edge. */
  const bandInset = contentW * box.inset;
  const bandW = contentW - bandInset * 2;
  const bandPadX = 4.6 * k;
  const bandPadY = 3.4 * k;
  const foot = agendaFooter(config);
  const footerBandH = card ? footSize * foot.heightMul : 0;
  const headBlock = card
    ? Math.max(
        config.showLockup ? lockupH : 0,
        (config.locationLine ?? "").trim() ? locSize * 1.5 + metaSize * 1.8 : 0,
      ) +
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
  const timeSize = card ? 4.6 * k : Math.min(rowH * 0.3, 7.6 * k);
  const titleRowSize = card ? 5.0 * k : Math.min(rowH * 0.34, 8.4 * k);
  const detailSize = card ? 4.3 * k : Math.min(rowH * 0.24, 5.6 * k);
  const trackSize = card ? 4.3 * k : Math.max(2.6, Math.min(rowH * 0.18, 4.2 * k));
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
 */
export function agendaTextLines(text: string, sizeMm: number, colW: number): number {
  const clean = (text ?? "").trim();
  if (!clean) return 0;
  const perLine = Math.max(8, Math.floor(colW / (sizeMm * 0.55)));
  return clean
    .split("\n")
    .reduce((sum, para) => sum + Math.max(1, Math.ceil(para.trim().length / perLine)), 0);
}

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
  let location: {
    y: number;
    metaY: number;
    right: number;
    size: number;
    metaSize: number;
    pin: { x: number; y: number; h: number } | null;
  } | null = null;
  if (L.card) {
    const headTop = y;
    if (locationText) {
      const locH = L.locSize * 1.5 + L.metaSize * 1.8;
      const top = lockup ? headTop + Math.max(0, (L.lockupH - locH) * 0.62) : headTop;
      const pinH = L.locSize * 1.5;
      location = {
        y: top,
        metaY: top + L.locSize * 1.7,
        right: x + L.contentW,
        size: L.locSize,
        metaSize: L.metaSize,
        pin: { x, y: top, h: pinH },
      };
    }
    y = headTop + Math.max(lockup ? L.lockupH : 0, locationText ? L.locSize * 1.5 + L.metaSize * 1.8 : 0);
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
  let listBottom = footerBand ? footerBand.y - L.footSize * 3.4 : footY - L.footSize * 1.8;
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
  };

  /** Unscaled height each row's copy really wants, in mm. */
  let needs: number[] = [];
  let rows: AgendaRow[];
  if (L.card) {
    // Bands take the height their copy really needs, so a two-line title with a
    // three-line speaker note is never crushed into the same band as "Lunch".
    const bodyW = L.bandW - L.timeColW - L.bandPadX * 2;
    const height = (session: AgendaSession) => {
      const pars = agendaParallels(session);
      const split = agendaSplitWidths(L.bandW, L.bandGap, pars.length);
      const w = pars.length ? split.leftW - L.timeColW - L.bandPadX * 2 : bodyW;
      const left =
        agendaTextLines(session.title, L.titleRowSize, w) * L.titleRowSize * 1.5 +
        agendaTextLines(session.detail, L.detailSize, w) * L.detailSize * 1.55 +
        (session.detail.trim() ? L.detailSize * 0.8 : 0);
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
              // a card carrying all four fields is never clipped.
              ((p.time ?? "").trim() || session.time.trim() ? ct.timeSize * 1.5 : 0) +
              agendaTextLines(p.speaker ?? "", ct.detailSize, ct.textW) * ct.detailSize * 1.55 +
              agendaTextLines(p.detail, ct.detailSize, ct.textW) * ct.detailSize * 1.55 +
              ct.detailSize * 0.8,
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
    const heights = new Array<number>(wanted.length).fill(floorH);
    let free = wanted.map((_, i) => i);
    let budget = available;
    for (let pass = 0; pass < wanted.length + 1 && free.length > 0; pass += 1) {
      const freeTotal = free.reduce((a, i) => a + wanted[i]!, 0) || 1;
      const scale = budget / freeTotal;
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
    let cursor = rowsTop;
    rows = config.sessions.map((session, i) => {
      const h = heights[i]!;
      const y = cursor;
      cursor += h + L.bandGap;
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
      return {
        session,
        y,
        h: h + L.bandGap,
        band,
        parallel: parallels[0] ?? null,
        parallels,
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
