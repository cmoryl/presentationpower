// TransPerfect San Juan Bowl — event record and brand kit data.
//
// The logo and its colours come from the designer's supplied FINAL_LOGO_26
// package (SVG/EPS/AI/PNG, colour and dark-background variants). Nothing here
// invents a venue, date or room: those stay "to be confirmed" until the
// organisers issue them.

import { BRAND } from "@/lib/brand-colors";
import logoColorSvg from "@/assets/san-juan-bowl/sjb-logo-color.svg.asset.json";
import logoColorPng from "@/assets/san-juan-bowl/sjb-logo-color.png.asset.json";
import logoDarkSvg from "@/assets/san-juan-bowl/sjb-logo-dark.svg.asset.json";
import logoDarkPng from "@/assets/san-juan-bowl/sjb-logo-dark.png.asset.json";

export const SJB_EVENT = {
  id: "san-juan-bowl",
  name: "TransPerfect San Juan Bowl",
  shortName: "San Juan Bowl",
  city: "San Juan, Puerto Rico",
  /** Not issued yet — pages must say so rather than guess. */
  venue: "",
  datesLabel: "",
} as const;

/**
 * Colours read from the supplied logo file, not picked by eye.
 * HEX/RGB/HSL are exact. CMYK values are standard-conversion working builds
 * for coated stock — unproofed, so vendors must proof before print. Pantone
 * references are matched by the vendor from the supplied artwork, never guessed.
 */
export const SJB_COLORS = [
  {
    id: "navy",
    name: "Bowl Navy",
    hex: "#0D0E21",
    rgb: "13 · 14 · 33",
    hsl: "237° · 43% · 9%",
    cmyk: "61 · 58 · 0 · 87",
    textOn: "White",
    role: "Badge, outlines and dark backgrounds",
  },
  {
    id: "sky",
    name: "Caribbean Sky",
    hex: "#00AAE7",
    rgb: "0 · 170 · 231",
    hsl: "196° · 100% · 45%",
    cmyk: "100 · 26 · 0 · 9",
    textOn: "Bowl Navy",
    role: "Sky, waves and accent fills",
  },
  {
    id: "gold",
    name: "Banner Gold",
    hex: "#FFD600",
    rgb: "255 · 214 · 0",
    hsl: "50° · 100% · 50%",
    cmyk: "0 · 16 · 100 · 0",
    textOn: "Bowl Navy",
    role: "Banner, sun and highlights",
  },
  {
    id: "white",
    name: "White",
    hex: "#FFFFFF",
    rgb: "255 · 255 · 255",
    hsl: "0° · 0% · 100%",
    cmyk: "0 · 0 · 0 · 0",
    textOn: "Bowl Navy",
    role: "Type and artwork on navy",
  },
] as const;

export const SJB_COLOR_NOTES = [
  "HEX, RGB and HSL values are exact, taken from the supplied artwork — use them as-is on screen and web.",
  "CMYK values are working builds for coated stock from a standard conversion. They are not proofed: always run a vendor proof before print and adjust on press if needed.",
  "Pantone (spot) references are matched by the print vendor from the supplied artwork — never substitute a guessed swatch.",
  "Body text on San Juan Bowl print is solid black (100K), same as every TransPerfect print piece.",
];

export type SjbLogoVariantId = "color" | "dark";

export const SJB_LOGOS = [
  {
    id: "color",
    label: "Full colour — for light backgrounds",
    svg: logoColorSvg.url,
    png: logoColorPng.url,
    previewBg: "#FFFFFF",
  },
  {
    id: "dark",
    label: "For dark backgrounds",
    svg: logoDarkSvg.url,
    png: logoDarkPng.url,
    previewBg: "#0D0E21",
  },
] as const;

/** What the badge is made of — for briefs and vendor conversations. */
export const SJB_LOGO_ANATOMY = [
  { part: "Diamond badge", detail: "The outer navy diamond frame that holds every element; never separated from them." },
  { part: "El Morro fortress", detail: "The San Juan landmark at the heart of the badge, flanked by palm trees." },
  { part: "Football", detail: "Centred below the fortress — the Bowl itself." },
  { part: "Yellow banner", detail: "Carries TRANSPERFECT across the middle; also the clear-space measuring unit." },
  { part: "SAN JUAN BOWL lettering", detail: "Set into the badge; part of the artwork, never retyped." },
  { part: "Waves and sun", detail: "Caribbean Sky waves with a Banner Gold sun along the base." },
] as const;

/**
 * Clear space = the height of the yellow banner on every side.
 * `unitPct` is the banner height as a share of the diagram container
 * (badge + ring), used to draw the diagram; measured from the supplied SVG.
 */
export const SJB_CLEAR_SPACE = {
  rule: "Keep clear space around the badge of at least the height of the yellow banner on every side.",
  unitPct: 12,
  /** Banner height as a share of badge height, measured from the artwork. */
  bannerPctOfBadge: 14.8,
} as const;

/**
 * Construction geometry, measured from the supplied SVG (viewBox 0 0 1254
 * 1254, Adobe Illustrator 29.8.11 export). All distances are expressed in x,
 * where x = the height of the yellow banner (171.7 artwork units).
 *
 *   badge  1186.7 × 1161.7  →  6.9x × 6.8x
 *   banner 1128.6 ×  171.7  →  6.6x × 1x
 *   artboard padding 33.7 / 46.1 units → 2.7% / 3.7% of the square file
 *   badge centre x = 627.05 = exactly half of the 1254-wide artboard
 */
export const SJB_CONSTRUCTION = {
  unit: "x = the height of the yellow banner",
  grid: 12,
  badge: { w: 6.9, h: 6.8 },
  banner: { w: 6.6, h: 1 },
  clearSpace: 1,
  /** Smallest footprint the badge may occupy: badge + 1x clear space per side. */
  footprint: { w: 8.9, h: 8.8 },
  /** Empty padding inside the supplied square file, per side. */
  canvasPadPct: { x: 2.7, y: 3.7 },
  centerNote:
    "The badge is exactly centred on the vertical axis of its square artboard — always align it on centre, never optically.",
  scaleNote:
    "Every distance scales linearly with the badge. At the 25 mm print minimum, x = 3.7 mm and clear space is 3.7 mm per side.",
} as const;

/**
 * Large-format reproduction — stadium signage, field application, banners.
 * x = banner height = badge width / 6.91; clear space = 1x per side.
 */
export const SJB_LARGE_FORMAT = {
  intro:
    "The badge is built to run from a 25 mm printed card to a 20 m midfield painting. Every rule below is the same construction math from the grid, scaled up — there is no separate 'large' version of the artwork.",
  /** Scale table: badge width → x (clear space per side) → typical use. */
  scale: [
    { width: "1 m (3.3 ft)", x: "14.5 cm", use: "Concourse signage, press backdrops" },
    { width: "2 m (6.6 ft)", x: "28.9 cm", use: "Stage surrounds, entrance features" },
    { width: "5 m (16.4 ft)", x: "72.4 cm", use: "Stadium fascia, large banners" },
    { width: "10 m (32.8 ft)", x: "1.45 m", use: "Building wraps, stand coverings" },
    { width: "20 m (65.6 ft)", x: "2.89 m", use: "Field application, midfield mark" },
  ],
  production: [
    "Reproduce from the vector master (SVG/PDF) only — never upscale a PNG. The vector file scales to any size with no quality loss.",
    "Hand the vendor the vector master plus the construction sheet (PDF). The vendor converts it in their own RIP, cutter or stencil workflow — nobody redraws anything.",
    "Colour at scale is matched physically: the vendor matches spot colours to a Pantone swatch book, or prints the CMYK working builds with a contract proof. Never let a vendor match colour from a screen.",
    "At stadium viewing distances the fine detail (waves, sun rays, banner lettering) reads as texture — that is expected. The badge is designed to be recognised as a whole from 50 m and beyond.",
    "For field paint or turf application, the vendor prepares stencils from the vector master. Painted detail narrower than about 5 cm is merged at stencil stage — this is a production simplification, not a redesign.",
    "On panelled or mesh installations, seams and panel breaks fall at the artboard edge — never through the badge.",
    "Clear space scales with the badge: at 10 m wide, keep 1.45 m clear on every side.",
  ],
} as const;

/** Smallest sizes the badge may reproduce at before detail is lost. */
export const SJB_MIN_SIZES = [
  { context: "Print", minimum: "25 mm wide", note: "Below this the lettering inside the badge clogs." },
  { context: "Screen", minimum: "96 px wide", note: "Below this use the badge alone, no supporting lockup." },
  { context: "Embroidery / patch", minimum: "60 mm wide", note: "Stitching needs the extra room for the waves and sun." },
] as const;

/** Approved backgrounds and which variant sits on each. */
export const SJB_BACKGROUNDS: ReadonlyArray<{
  id: string;
  name: string;
  hex: string;
  variant: SjbLogoVariantId;
  note: string;
}> = [
  { id: "white", name: "White", hex: BRAND.white, variant: "color", note: "Default for documents and print." },
  { id: "navy", name: "Bowl Navy", hex: "#0D0E21", variant: "dark", note: "Event dark panels and merchandise." },
  { id: "ink", name: "TransPerfect Ink", hex: BRAND.ink, variant: "dark", note: "When the badge sits inside enterprise material." },
  { id: "light", name: "Light Gray", hex: BRAND.lightGray, variant: "color", note: "Neutral UI and wayfinding panels." },
];

export type SjbMisuseDemo =
  | "stretch"
  | "recolour"
  | "crop"
  | "rotate"
  | "busy"
  | "lowContrast"
  | "shadow"
  | "retype";

/** The don'ts, each with a live demo of the mistake. */
export const SJB_MISUSE: ReadonlyArray<{ id: SjbMisuseDemo; title: string; detail: string }> = [
  { id: "stretch", title: "Don't stretch or squash", detail: "The badge always keeps its supplied proportions." },
  { id: "recolour", title: "Don't recolour", detail: "No tints, no gradients, no one-colour versions beyond the supplied variants." },
  { id: "crop", title: "Don't crop", detail: "The whole diamond stays visible, banner to waves." },
  { id: "rotate", title: "Don't rotate", detail: "The badge sits upright on its point, never tilted." },
  { id: "busy", title: "Don't use busy backgrounds", detail: "No photography or patterns that fight the artwork." },
  { id: "lowContrast", title: "Don't lose contrast", detail: "Full colour never sits on Caribbean Sky or similar mid-tones." },
  { id: "shadow", title: "Don't add effects", detail: "No drop shadows, glows, bevels or outlines." },
  { id: "retype", title: "Don't retype the lettering", detail: "The words inside the badge are artwork, not live text." },
];

export const SJB_LOGO_RULES = [
  "Use the artwork exactly as supplied — never redraw, stretch, recolour or crop the badge.",
  "On dark backgrounds, use the dark-background variant; on light backgrounds, the full-colour variant.",
  SJB_CLEAR_SPACE.rule,
  "Don't place the badge over busy photography or patterns that fight the artwork.",
];

export const SJB_TYPE_NOTE =
  "Supporting type is Geist, the TransPerfect house face — Geist Bold for headlines, Geist Regular for body. The lettering inside the badge is part of the artwork and is never retyped.";

/** Supporting type scale (Geist). Sizes are starting points per surface. */
export const SJB_TYPE_SCALE = [
  { role: "Display", weight: 700, web: "56 px", print: "48 pt", signage: "Cap height ≥ 1/50 of viewing distance", leading: "100%", sample: "San Juan Bowl" },
  { role: "Headline", weight: 700, web: "32 px", print: "28 pt", signage: "Cap height ≥ 1/100 of viewing distance", leading: "110%", sample: "Game day in San Juan" },
  { role: "Subhead", weight: 600, web: "20 px", print: "16 pt", signage: "Secondary lines only", leading: "120%", sample: "Kick-off details to follow" },
  { role: "Body", weight: 400, web: "16 px", print: "10 pt", signage: "Not used on signage", leading: "140%", sample: "Supporting copy sits in Geist Regular with comfortable leading." },
  { role: "Label", weight: 600, web: "12 px", print: "7 pt", signage: "Not used on signage", leading: "120%", sample: "GATE · SECTION · ROW" },
] as const;

export const SJB_TYPE_RULES = [
  "Geist only — no script, slab or novelty faces, even for a sports or island feel.",
  "Headlines in Geist Bold, sentence case. Labels may be uppercase with open tracking.",
  "Never set type inside the badge or on its banner; the badge lettering is artwork.",
  "Keep type outside the logo's clear space (1x on every side).",
];

/** Suggested share of colour in a layout — guidance, not a measured rule. */
export const SJB_COLOR_PROPORTION = [
  { id: "navy", pct: 60 },
  { id: "white", pct: 25 },
  { id: "sky", pct: 10 },
  { id: "gold", pct: 5 },
] as const;

/** Text/background pairs to check; ratios are computed, not typed. */
export const SJB_PAIRINGS = [
  { fg: "white", bg: "navy" },
  { fg: "gold", bg: "navy" },
  { fg: "sky", bg: "navy" },
  { fg: "navy", bg: "white" },
  { fg: "navy", bg: "gold" },
  { fg: "navy", bg: "sky" },
  { fg: "sky", bg: "white" },
  { fg: "gold", bg: "white" },
] as const;

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}

/** WCAG 2.x contrast ratio between two hex colours. */
export function sjbContrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export const SJB_NAMING = [
  { label: "First mention", value: "TransPerfect San Juan Bowl" },
  { label: "After first mention", value: "San Juan Bowl" },
  { label: "Never", value: "SJB, the TP Bowl, San Juan Classic" },
];


/** The Bowl badge as a kit event lockup, when a kit is for the San Juan Bowl.
 *  The renderer only sees the copy, so the headline naming the Bowl identifies it. */
export function sjbEventLogoFor(eventName: string | null | undefined) {
  if (!eventName || !/san\s*juan\s*bowl/i.test(eventName)) return undefined;
  return { url: logoColorSvg.url, urlDark: logoDarkSvg.url, ratio: 1186.7 / 1161.7 };
}

/** Bowl colours for kit assets (event-only palette, like NEXT's). */
export function sjbKitTokens() {
  const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)!.hex;
  return { primary: hex("navy"), accent: hex("sky"), surface: "#E6F7FD", ink: hex("navy") };
}
