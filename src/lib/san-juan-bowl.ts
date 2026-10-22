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
  /** Confirmed by the event team (Oct 2026). */
  venue: "Hiram Bithorn Stadium",
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
    cmyk: "87 · 81 · 55 · 75",
    textOn: "White",
    role: "Badge, outlines and dark backgrounds",
  },
  {
    id: "sky",
    name: "Caribbean Sky",
    hex: "#00AAE7",
    rgb: "0 · 170 · 231",
    hsl: "196° · 100% · 45%",
    cmyk: "86 · 8 · 0 · 0",
    textOn: "Bowl Navy",
    role: "Sky, waves and accent fills",
  },
  {
    id: "gold",
    name: "Banner Gold",
    hex: "#FFD600",
    rgb: "255 · 214 · 0",
    hsl: "50° · 100% · 50%",
    cmyk: "0 · 14 · 100 · 0",
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
  "CMYK values are the inks set in the master EPS/AI files, so they match what the vector files print. They are not proofed: always run a vendor proof before print and adjust on press if needed.",
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
 * Clear space = x on every side, x = the full height of the ribbon element (outline included).
 * The diagram is drawn from these measured numbers (supplied SVG, viewBox 0 0 1254 1254),
 * so the dashed ring sits exactly x from the visible badge edge on all four sides.
 */
export const SJB_CLEAR_SPACE = {
  rule: "Keep clear space around the badge of at least x on every side, where x is the full height of the ribbon element, navy outline included (171.7 units, 14.47% of the logo width).",
  /** x in artwork units. */
  xUnits: 171.7,
  /** Visible badge bounds inside the 1254-unit square artboard (full-colour file). */
  art: { left: 33.7, top: 46.1, width: 1186.7, height: 1161.7, artboard: 1254 },
  /** Banner height as a share of badge height, measured from the artwork. */
  bannerPctOfBadge: 14.8,
} as const;

/**
 * Construction geometry, measured from the supplied SVG (viewBox 0 0 1254
 * 1254, Adobe Illustrator 29.8.11 export). All distances are expressed in x,
 * where x = the full height of the ribbon element, outline included (171.7 artwork units; the yellow band alone is 127.0).
 *
 *   badge  1186.7 × 1161.7  →  6.9x × 6.8x
 *   banner 1128.6 ×  171.7  →  6.6x × 1x
 *   artboard padding 33.7 / 46.1 units → 2.7% / 3.7% of the square file
 *   badge centre x = 627.00 = exactly half of the 1254-wide artboard
 */
export const SJB_CONSTRUCTION = {
  unit: "x = the full height of the ribbon element (outline included)",
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
    "Every distance scales linearly with the badge. At the 40 mm print minimum, x = 5.8 mm and clear space is 5.8 mm per side.",
} as const;

/**
 * Large-format reproduction — stadium signage, field application, banners.
 * x = banner height = badge width / 6.91; clear space = 1x per side.
 */
export const SJB_LARGE_FORMAT = {
  intro:
    "The badge is built to run from a 40 mm printed card to a 20 m midfield painting. Every rule below is the same construction math from the grid, scaled up — there is no separate 'large' version of the artwork.",
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
  { context: "Print", minimum: "40 mm wide", note: "Keeps the 7.8-unit keyline at 0.26 mm; at 25 mm it drops to 0.16 mm and the lace and letter details to 0.07 mm, below what presses hold." },
  { context: "Screen", minimum: "160 px wide", note: "Every line stays at or above 1 px. Below 160 px the detail fills in on every version, including single colour — use the small-size mark (lettering shield) instead, from 160 px down to 48 px high." },
  { context: "Embroidery / patch (full colour)", minimum: "90 mm wide", note: "Stitching needs about 1 mm per detail; at 60 mm the keyline is 0.39 mm. One-colour embroidery can go to 60 mm with a digitiser stitch-out (see Single colour)." },
] as const;

/**
 * Small-size mark: the supplied full badge (sjb-logo-color.svg) cropped to its EPS bounds —
 * artwork untouched, only the viewBox changes. Icons/avatars use the dark-background badge on navy.
 */
export const SJB_SMALL_MARK = {
  dir: "/downloads/sjb-mark",
  svg: "/downloads/sjb-mark/sjb-mark-shield.svg",
  pack: "/downloads/sjb-mark/sjb-mark-pack.zip",
  use: "The full San Juan Bowl badge, trimmed to its edges and sized for small uses: social avatars, app icons, browser tabs, merch tags, video watermarks. Fine details soften below 160 px — check legibility at the size you use.",
  rules: [
    "This is the real badge, not a redraw — never swap in lettering on its own as the logo.",
    "Use the supplied file at the size needed; never redraw, simplify or recolour it.",
    "On Bowl Navy, use the navy icon/avatar files (dark-background badge).",
    "Above 160 px (or 40 mm in print), use the full badge files with clear space.",
  ],
  geometry: [
    { label: "Source", value: "sjb-logo-color.svg, artwork unchanged" },
    { label: "Crop", value: "viewBox 33.69895 46.1505 1186.6021 1161.699 (EPS bounds)" },
    { label: "Proportion", value: "1.021437 : 1" },
    { label: "Icons", value: "Dark badge on #0D0E21, 12% margin each side" },
  ],
  files: [
    { label: "SVG", file: "sjb-mark-shield.svg" },
    { label: "PNG 1024", file: "sjb-mark-shield-1024.png" },
    { label: "PNG 512", file: "sjb-mark-shield-512.png" },
    { label: "PNG 160", file: "sjb-mark-shield-160.png" },
    { label: "PNG 64", file: "sjb-mark-shield-64.png" },
    { label: "PNG 48", file: "sjb-mark-shield-48.png" },
    { label: "Avatar 1080 (navy)", file: "sjb-mark-avatar-1080.png" },
    { label: "App icon 512", file: "sjb-mark-icon-512.png" },
    { label: "App icon 192", file: "sjb-mark-icon-192.png" },
    { label: "Apple touch 180", file: "sjb-mark-apple-touch-icon-180.png" },
    { label: "Favicon (ICO)", file: "sjb-mark-favicon.ico" },
  ],
} as const;

/**
 * Lockups (approved Oct 2026): editable SVG templates with the badge copied in untouched, x clear space
 * on every side, live Geist text and dashed placeholder groups for team and partner logos.
 */
export const SJB_LOCKUPS = {
  dir: "/downloads/sjb-lockups",
  pack: "/downloads/sjb-lockups/sjb-lockups-pack.zip",
  items: [
    {
      id: "team-matchup",
      name: "Team matchup",
      use: "Game-day graphics, tickets, scoreboard and social. Team A · badge · Team B with the venue line.",
      rules: "Team logos sit inside the 780-unit square slots (2/3 of badge height), 1.6x from the badge, never larger than the badge. Names Geist Bold, venue line Geist Regular.",
    },
    {
      id: "official-partner",
      name: "Official partner",
      use: "Sponsor kits and partner co-marketing.",
      rules: "Rule at x from the badge; OFFICIAL PARTNER label and partner logo start at 2x. The partner logo fits inside its 1100 × 480 slot and never exceeds the badge height.",
    },
    {
      id: "venue-date",
      name: "Badge + venue / date",
      use: "Save-the-dates, posters, invitations and email headers.",
      rules: "Gold rule 240 × 9 at 0.5x under the badge, then HIRAM BITHORN STADIUM (Geist Bold) and the city/date line (Geist Regular). DATE TBC stays until the organisers confirm the date.",
    },
  ],
} as const;

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
  { id: "recolour", title: "Don't recolour", detail: "No tints, gradients or new colours. One-colour use only as shown on the Single colour page: the supplied Navy, Black and White files, or an event-colour ink signed off by the designer." },
  { id: "crop", title: "Don't crop", detail: "The whole diamond stays visible, banner to waves." },
  { id: "rotate", title: "Don't rotate", detail: "The badge sits upright on its point, never tilted." },
  { id: "busy", title: "Don't use busy backgrounds", detail: "No photography or patterns that fight the artwork." },
  { id: "lowContrast", title: "Don't lose contrast", detail: "Full colour never sits on Caribbean Sky or similar mid-tones." },
  { id: "shadow", title: "Don't add effects", detail: "No drop shadows, glows, bevels or outlines on the resting logo. Motion graphics may use light and shadow for depth while the badge moves." },
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
  return { url: logoColorSvg.url, urlDark: logoDarkSvg.url, ratio: 1186.6021 / 1161.699 };
}

/** Bowl colours for kit assets (event-only palette, like NEXT's). */
export function sjbKitTokens() {
  const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)!.hex;
  return { primary: hex("navy"), accent: hex("sky"), surface: "#E6F7FD", ink: hex("navy") };
}
