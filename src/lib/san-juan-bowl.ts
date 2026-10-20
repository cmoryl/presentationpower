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

/** Colours read from the supplied logo file, not picked by eye. */
export const SJB_COLORS = [
  { id: "navy", name: "Bowl Navy", hex: "#0D0E21", role: "Badge, outlines and dark backgrounds" },
  { id: "sky", name: "Caribbean Sky", hex: "#00AAE7", role: "Sky, waves and accent fills" },
  { id: "gold", name: "Banner Gold", hex: "#FFD600", role: "Banner, sun and highlights" },
  { id: "white", name: "White", hex: "#FFFFFF", role: "Type and artwork on navy" },
] as const;

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
 * `unitPct` is the banner height as a share of badge height, used to draw
 * the diagram; measured from the supplied SVG.
 */
export const SJB_CLEAR_SPACE = {
  rule: "Keep clear space around the badge of at least the height of the yellow banner on every side.",
  unitPct: 12,
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
