// TransPerfect San Juan Bowl — event record and brand kit data.
//
// The logo and its colours come from the designer's supplied FINAL_LOGO_26
// package (SVG/EPS/AI/PNG, colour and dark-background variants). Nothing here
// invents a venue, date or room: those stay "to be confirmed" until the
// organisers issue them.

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

export const SJB_LOGO_RULES = [
  "Use the artwork exactly as supplied — never redraw, stretch, recolour or crop the badge.",
  "On dark backgrounds, use the dark-background variant; on light backgrounds, the full-colour variant.",
  "Keep clear space around the badge of at least the height of the yellow banner on every side.",
  "Don't place the badge over busy photography or patterns that fight the artwork.",
];

export const SJB_TYPE_NOTE =
  "Supporting type is Geist, the TransPerfect house face — Geist Bold for headlines, Geist Regular for body. The lettering inside the badge is part of the artwork and is never retyped.";
