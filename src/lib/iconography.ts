// Iconography system — placement, sizing, treatment, spacing, and accessibility
// tokens for module variants. Consumed by VariantRenderer, surfaced in /atlas,
// and referenced from taxonomy.ts (ModuleVariant.iconography).
//
// The goal: every icon on every slide can be described with a single
// IconSpec, so composition rules are explicit rather than ad-hoc.

import type { BrandMode } from "@/lib/taxonomy";

// ---------- Sizes ----------
// glyphPx = the SVG size; containerPx = the surrounding tile/circle (if any);
// gapPx = default gap between icon and its adjacent label; radiusPx = tile
// corner radius. All values are 8pt-grid aligned.

export type IconSizeToken = "xs" | "sm" | "md" | "lg" | "xl" | "display";

export const ICON_SIZES: Record<
  IconSizeToken,
  { glyphPx: number; containerPx: number; gapPx: number; radiusPx: number; strokeWidth: number }
> = {
  xs:      { glyphPx: 14, containerPx: 28,  gapPx: 6,  radiusPx: 8,  strokeWidth: 2 },
  sm:      { glyphPx: 18, containerPx: 40,  gapPx: 10, radiusPx: 10, strokeWidth: 2 },
  md:      { glyphPx: 24, containerPx: 56,  gapPx: 14, radiusPx: 14, strokeWidth: 2 },
  lg:      { glyphPx: 32, containerPx: 72,  gapPx: 18, radiusPx: 18, strokeWidth: 1.75 },
  xl:      { glyphPx: 44, containerPx: 96,  gapPx: 22, radiusPx: 22, strokeWidth: 1.5 },
  display: { glyphPx: 72, containerPx: 144, gapPx: 28, radiusPx: 28, strokeWidth: 1.25 },
};

// ---------- Placements ----------
// Where the icon sits relative to text/content in a module.
export type IconPlacement =
  | "leading"          // to the left of a line of text (rows, agendas)
  | "above"            // stacked on top of a text block (feature cards, pillars)
  | "corner"           // top-right of a card as metadata
  | "inline"           // mid-sentence, font-sized
  | "bullet"           // replaces a list bullet marker
  | "numbered-badge"   // combined with an index number inside one badge
  | "watermark"        // huge, faint, sits behind content
  | "standalone-hero"  // centered, display-size, no adjacent text
  | "none";            // variant intentionally forbids icons

// ---------- Treatments ----------
// Visual container/style of the icon.
export type IconTreatment =
  | "glyph"        // bare icon on transparent background
  | "soft-tile"    // rounded-square tile, tinted bg, brand-colored glyph (current default)
  | "soft-circle"
  | "outline-tile" // bordered tile, transparent bg
  | "filled-tile"  // solid brand background, inverse glyph
  | "duotone"      // accent bg + primary glyph (or vice versa)
  | "on-dark";     // translucent white on dark backgrounds

// ---------- Emphasis (color role) ----------
export type IconEmphasis =
  | "primary"
  | "accent"
  | "muted"
  | "inverse"
  | "success"
  | "warning";

// ---------- Accessibility role ----------
// 'decorative' → aria-hidden, no announcement.
// 'semantic'   → role=img, aria-label required (falls back to the paired label).
export type IconA11yRole = "decorative" | "semantic";

// ---------- Full spec ----------
export type IconSpec = {
  placement: IconPlacement;
  size: IconSizeToken;
  treatment: IconTreatment;
  emphasis: IconEmphasis;
  a11yRole: IconA11yRole;
};

// ---------- Defaults per placement ----------
// A variant only needs to declare `placement` — the rest resolves from these
// defaults, then any explicit overrides win.
export const PLACEMENT_DEFAULTS: Record<IconPlacement, Omit<IconSpec, "placement">> = {
  "leading":         { size: "md", treatment: "soft-tile",    emphasis: "accent",  a11yRole: "decorative" },
  "above":           { size: "lg", treatment: "soft-tile",    emphasis: "accent",  a11yRole: "decorative" },
  "corner":          { size: "sm", treatment: "outline-tile", emphasis: "muted",   a11yRole: "decorative" },
  "inline":          { size: "xs", treatment: "glyph",        emphasis: "primary", a11yRole: "decorative" },
  "bullet":          { size: "sm", treatment: "glyph",        emphasis: "accent",  a11yRole: "decorative" },
  "numbered-badge":  { size: "md", treatment: "filled-tile",  emphasis: "primary", a11yRole: "decorative" },
  "watermark":       { size: "display", treatment: "glyph",   emphasis: "muted",   a11yRole: "decorative" },
  "standalone-hero": { size: "display", treatment: "soft-circle", emphasis: "primary", a11yRole: "semantic" },
  "none":            { size: "md", treatment: "glyph",        emphasis: "muted",   a11yRole: "decorative" },
};

// ---------- Emphasis resolution against brand tokens ----------
export function resolveEmphasisColors(
  brand: BrandMode,
  treatment: IconTreatment,
  emphasis: IconEmphasis
): { bg: string; fg: string; border?: string } {
  const primary = brand.tokens.primary;
  const accent = brand.tokens.accent;
  // Success / warning fall back to accent/primary if not on the brand.
  const roleColor =
    emphasis === "primary" ? primary
    : emphasis === "accent" ? accent
    : emphasis === "muted"   ? "#7A7A7A"
    : emphasis === "inverse" ? "#FFFFFF"
    : emphasis === "success" ? "#1F7A4C"
    : /* warning */            "#B45309";

  switch (treatment) {
    case "glyph":
      return { bg: "transparent", fg: roleColor };
    case "soft-tile":
    case "soft-circle":
      return { bg: `${roleColor}22`, fg: roleColor };
    case "outline-tile":
      return { bg: "transparent", fg: roleColor, border: `${roleColor}55` };
    case "filled-tile":
      return { bg: roleColor, fg: "#FFFFFF" };
    case "duotone":
      return { bg: `${accent}22`, fg: primary };
    case "on-dark":
      return { bg: "rgba(255,255,255,0.15)", fg: "#FFFFFF" };
  }
}

// ---------- Composition helper ----------
export function withDefaults(spec: Partial<IconSpec> & { placement: IconPlacement }): IconSpec {
  const base = PLACEMENT_DEFAULTS[spec.placement];
  return {
    placement: spec.placement,
    size:      spec.size      ?? base.size,
    treatment: spec.treatment ?? base.treatment,
    emphasis:  spec.emphasis  ?? base.emphasis,
    a11yRole:  spec.a11yRole  ?? base.a11yRole,
  };
}

// ---------- Catalog for the Atlas showcase ----------
export const ICON_PLACEMENTS_META: Array<{
  id: IconPlacement;
  name: string;
  description: string;
  typicalIn: string;
}> = [
  { id: "leading",         name: "Leading",          description: "Icon precedes a line of text in a row.",           typicalIn: "Agenda rows, process steps, list items" },
  { id: "above",           name: "Above",            description: "Icon stacked on top of a text block.",             typicalIn: "Feature cards, pillars, service tiles" },
  { id: "corner",          name: "Corner",           description: "Small metadata glyph in the top-right of a card.", typicalIn: "Risk cards, tag chips, status" },
  { id: "inline",          name: "Inline",           description: "Font-sized glyph inside a sentence.",              typicalIn: "Callouts, running body copy" },
  { id: "bullet",          name: "Bullet",           description: "Replaces the disc/dash bullet on a list.",         typicalIn: "Checklists, deliverables lists" },
  { id: "numbered-badge",  name: "Numbered badge",   description: "Icon paired with a step index in one badge.",      typicalIn: "Timelines, phased plans, 30/60/90" },
  { id: "watermark",       name: "Watermark",        description: "Display-size, low-opacity glyph behind content.",  typicalIn: "Divider slides, section openers" },
  { id: "standalone-hero", name: "Standalone hero",  description: "Centered display icon with no adjacent label.",    typicalIn: "Statement closes, single-idea slides" },
  { id: "none",            name: "None",             description: "Variant forbids iconography.",                     typicalIn: "Long-form quote, pure typographic slides" },
];

export const ICON_TREATMENTS_META: Array<{ id: IconTreatment; name: string; description: string }> = [
  { id: "glyph",        name: "Glyph",         description: "Bare icon, no container." },
  { id: "soft-tile",    name: "Soft tile",     description: "Rounded tile with tinted background." },
  { id: "soft-circle",  name: "Soft circle",   description: "Circular tinted background." },
  { id: "outline-tile", name: "Outline tile",  description: "Bordered tile, transparent fill." },
  { id: "filled-tile",  name: "Filled tile",   description: "Solid brand color, inverse glyph." },
  { id: "duotone",      name: "Duotone",       description: "Accent background, primary glyph." },
  { id: "on-dark",      name: "On dark",       description: "Translucent white on dark surfaces." },
];

export const ICON_EMPHASIS_META: Array<{ id: IconEmphasis; name: string }> = [
  { id: "primary", name: "Primary" },
  { id: "accent",  name: "Accent" },
  { id: "muted",   name: "Muted" },
  { id: "inverse", name: "Inverse" },
  { id: "success", name: "Success" },
  { id: "warning", name: "Warning" },
];
