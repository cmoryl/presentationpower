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

// Stroke weight is NOT part of this scale: the app uses exactly two values,
// applied globally in styles.css — 1.75 for all chrome icons (`svg.lucide`)
// and 2.5 for emphasis icons via the `icon-strong` utility.
export const ICON_SIZES: Record<
  IconSizeToken,
  { glyphPx: number; containerPx: number; gapPx: number; radiusPx: number }
> = {
  xs: { glyphPx: 14, containerPx: 28, gapPx: 6, radiusPx: 8 },
  sm: { glyphPx: 18, containerPx: 40, gapPx: 10, radiusPx: 10 },
  md: { glyphPx: 24, containerPx: 56, gapPx: 14, radiusPx: 14 },
  lg: { glyphPx: 32, containerPx: 72, gapPx: 18, radiusPx: 18 },
  xl: { glyphPx: 44, containerPx: 96, gapPx: 22, radiusPx: 22 },
  display: { glyphPx: 72, containerPx: 144, gapPx: 28, radiusPx: 28 },
};

// ---------- Placements ----------
// Where the icon sits relative to text/content in a module.
export type IconPlacement =
  | "leading" // to the left of a line of text (rows, agendas)
  | "above" // stacked on top of a text block (feature cards, pillars)
  | "corner" // top-right of a card as metadata
  | "inline" // mid-sentence, font-sized
  | "bullet" // replaces a list bullet marker
  | "numbered-badge" // combined with an index number inside one badge
  | "watermark" // huge, faint, sits behind content
  | "standalone-hero" // centered, display-size, no adjacent text
  | "none"; // variant intentionally forbids icons

// ---------- Treatments ----------
// Visual container/style of the icon.
export type IconTreatment =
  | "glyph" // bare icon on transparent background
  | "soft-tile" // rounded-square tile, tinted bg, brand-colored glyph (current default)
  | "soft-circle"
  | "outline-tile" // bordered tile, transparent bg
  | "filled-tile" // solid brand background, inverse glyph
  | "duotone" // accent bg + primary glyph (or vice versa)
  | "on-dark"; // translucent white on dark backgrounds

// ---------- Emphasis (color role) ----------
export type IconEmphasis = "primary" | "accent" | "muted" | "inverse" | "success" | "warning";

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
  leading: { size: "md", treatment: "soft-tile", emphasis: "accent", a11yRole: "decorative" },
  above: { size: "lg", treatment: "soft-tile", emphasis: "accent", a11yRole: "decorative" },
  corner: { size: "sm", treatment: "outline-tile", emphasis: "muted", a11yRole: "decorative" },
  inline: { size: "xs", treatment: "glyph", emphasis: "primary", a11yRole: "decorative" },
  bullet: { size: "sm", treatment: "glyph", emphasis: "accent", a11yRole: "decorative" },
  "numbered-badge": {
    size: "md",
    treatment: "filled-tile",
    emphasis: "primary",
    a11yRole: "decorative",
  },
  watermark: { size: "display", treatment: "glyph", emphasis: "muted", a11yRole: "decorative" },
  "standalone-hero": {
    size: "display",
    treatment: "soft-circle",
    emphasis: "primary",
    a11yRole: "semantic",
  },
  none: { size: "md", treatment: "glyph", emphasis: "muted", a11yRole: "decorative" },
};

// ---------- Emphasis resolution against brand tokens ----------
export function resolveEmphasisColors(
  brand: BrandMode,
  treatment: IconTreatment,
  emphasis: IconEmphasis,
): { bg: string; fg: string; border?: string } {
  const primary = brand.tokens.primary;
  const accent = brand.tokens.accent;
  // Success / warning fall back to accent/primary if not on the brand.
  const roleColor =
    emphasis === "primary"
      ? primary
      : emphasis === "accent"
        ? accent
        : emphasis === "muted"
          ? "#7A7A7A"
          : emphasis === "inverse"
            ? "#FFFFFF"
            : emphasis === "success"
              ? "#1F7A4C"
              : /* warning */ "#B45309";

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
    size: spec.size ?? base.size,
    treatment: spec.treatment ?? base.treatment,
    emphasis: spec.emphasis ?? base.emphasis,
    a11yRole: spec.a11yRole ?? base.a11yRole,
  };
}

// ---------- Catalog for the Atlas showcase ----------
export const ICON_PLACEMENTS_META: Array<{
  id: IconPlacement;
  name: string;
  description: string;
  typicalIn: string;
}> = [
  {
    id: "leading",
    name: "Leading",
    description: "Icon precedes a line of text in a row.",
    typicalIn: "Agenda rows, process steps, list items",
  },
  {
    id: "above",
    name: "Above",
    description: "Icon stacked on top of a text block.",
    typicalIn: "Feature cards, pillars, service tiles",
  },
  {
    id: "corner",
    name: "Corner",
    description: "Small metadata glyph in the top-right of a card.",
    typicalIn: "Risk cards, tag chips, status",
  },
  {
    id: "inline",
    name: "Inline",
    description: "Font-sized glyph inside a sentence.",
    typicalIn: "Callouts, running body copy",
  },
  {
    id: "bullet",
    name: "Bullet",
    description: "Replaces the disc/dash bullet on a list.",
    typicalIn: "Checklists, deliverables lists",
  },
  {
    id: "numbered-badge",
    name: "Numbered badge",
    description: "Icon paired with a step index in one badge.",
    typicalIn: "Timelines, phased plans, 30/60/90",
  },
  {
    id: "watermark",
    name: "Watermark",
    description: "Display-size, low-opacity glyph behind content.",
    typicalIn: "Divider slides, section openers",
  },
  {
    id: "standalone-hero",
    name: "Standalone hero",
    description: "Centered display icon with no adjacent label.",
    typicalIn: "Statement closes, single-idea slides",
  },
  {
    id: "none",
    name: "None",
    description: "Variant forbids iconography.",
    typicalIn: "Long-form quote, pure typographic slides",
  },
];

export const ICON_TREATMENTS_META: Array<{ id: IconTreatment; name: string; description: string }> =
  [
    { id: "glyph", name: "Glyph", description: "Bare icon, no container." },
    { id: "soft-tile", name: "Soft tile", description: "Rounded tile with tinted background." },
    { id: "soft-circle", name: "Soft circle", description: "Circular tinted background." },
    { id: "outline-tile", name: "Outline tile", description: "Bordered tile, transparent fill." },
    { id: "filled-tile", name: "Filled tile", description: "Solid brand color, inverse glyph." },
    { id: "duotone", name: "Duotone", description: "Accent background, primary glyph." },
    { id: "on-dark", name: "On dark", description: "Translucent white on dark surfaces." },
  ];

export const ICON_EMPHASIS_META: Array<{ id: IconEmphasis; name: string }> = [
  { id: "primary", name: "Primary" },
  { id: "accent", name: "Accent" },
  { id: "muted", name: "Muted" },
  { id: "inverse", name: "Inverse" },
  { id: "success", name: "Success" },
  { id: "warning", name: "Warning" },
];

// ---------- Variant → spec resolver ----------
// A variant may declare `iconography` inline in taxonomy.ts. When it doesn't,
// this resolver assigns a sensible default from the variant id pattern so
// every module still has an explicit contract without hand-editing 94 records.

import type { ModuleVariant } from "@/lib/taxonomy";

type PatternRule = {
  test: (id: string) => boolean;
  spec: Partial<IconSpec> & { placement: IconPlacement };
  rationale: string;
};

const VARIANT_ICON_RULES: PatternRule[] = [
  // Covers & dividers — restrained typography, no clutter.
  {
    test: (id) => /^MV-OP-COVER/.test(id),
    spec: { placement: "none" },
    rationale: "Cover slides stay typographic",
  },
  {
    test: (id) => id === "MV-OP-DIVIDER",
    spec: { placement: "watermark", size: "display", emphasis: "muted" },
    rationale: "Divider uses a soft watermark",
  },
  {
    test: (id) => id === "MV-OP-DIVIDER-NUMBERED",
    spec: {
      placement: "standalone-hero",
      size: "display",
      treatment: "glyph",
      emphasis: "primary",
    },
    rationale: "Chapter number is the hero",
  },

  // Agendas & timelines — numbered badges dominate.
  {
    test: (id) => /^MV-OP-AGENDA/.test(id),
    spec: {
      placement: "numbered-badge",
      size: "md",
      treatment: "filled-tile",
      emphasis: "primary",
    },
    rationale: "Agenda items are indexed",
  },
  {
    test: (id) => /^MV-PROC-TIMELINE|MV-PROC-PHASES|MV-CLOSE-TIMELINE/.test(id),
    spec: {
      placement: "numbered-badge",
      size: "md",
      treatment: "filled-tile",
      emphasis: "primary",
    },
    rationale: "Phased plans are indexed",
  },
  {
    test: (id) => id === "MV-CLOSE-CALENDAR",
    spec: { placement: "leading", size: "lg", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Calendar icon anchors the date",
  },

  // Pillars & feature cards — icon above the label.
  {
    test: (id) => /^MV-SOL-PILLARS/.test(id),
    spec: { placement: "above", size: "lg", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Pillars stack icon over label",
  },
  {
    test: (id) => id === "MV-SOL-FEATURE-LIST",
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Feature rows lead with icon",
  },
  {
    test: (id) => id === "MV-SOL-ARCHITECTURE",
    spec: { placement: "above", size: "md", treatment: "outline-tile", emphasis: "primary" },
    rationale: "Architecture layers use restrained outline tiles",
  },

  // Context / challenge cards.
  {
    test: (id) => /^MV-CTX-CARDS/.test(id),
    spec: { placement: "above", size: "lg", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Context cards use above placement",
  },
  {
    test: (id) => id === "MV-CTX-CHALLENGE-STACK",
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Stacked challenges lead with icon",
  },
  {
    test: (id) => /^MV-CTX-(STAT-GRID|COST|TREND)/.test(id),
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Metric-heavy cards keep icons as corner metadata",
  },

  // Insights — big-idea slides.
  {
    test: (id) => id === "MV-INS-BIG-IDEA",
    spec: {
      placement: "standalone-hero",
      size: "display",
      treatment: "soft-circle",
      emphasis: "primary",
      a11yRole: "semantic",
    },
    rationale: "Big idea is a hero glyph",
  },
  {
    test: (id) => id === "MV-INS-CALLOUT",
    spec: { placement: "leading", size: "lg", treatment: "duotone", emphasis: "primary" },
    rationale: "Callout leads with a duotone badge",
  },
  {
    test: (id) => id === "MV-INS-SO-WHAT",
    spec: { placement: "leading", size: "lg", treatment: "filled-tile", emphasis: "primary" },
    rationale: "So-what commands attention",
  },
  {
    test: (id) => id === "MV-INS-OPPORTUNITY-SIZE",
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Number is the hero, icon is metadata",
  },
  {
    test: (id) => id === "MV-INS-QUOTE",
    spec: { placement: "none" },
    rationale: "Quotes stay typographic",
  },

  // Proof.
  {
    test: (id) => /^MV-PROOF-STATS/.test(id),
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Stats lead with the number",
  },
  {
    test: (id) => id === "MV-PROOF-LOGOS",
    spec: { placement: "none" },
    rationale: "Logo grids have no auxiliary icons",
  },
  {
    test: (id) => id === "MV-PROOF-TESTIMONIAL",
    spec: { placement: "inline", size: "sm", treatment: "glyph", emphasis: "accent" },
    rationale: "Quote mark glyph inline",
  },

  // Case studies.
  {
    test: (id) => id === "MV-CASE-METRICS",
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Metrics dominate",
  },
  {
    test: (id) => id === "MV-CASE-LOGO-GRID",
    spec: { placement: "none" },
    rationale: "Logos only",
  },
  {
    test: (id) => /^MV-CASE-/.test(id),
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Case narrative rows",
  },

  // Decision & commercials.
  {
    test: (id) => id === "MV-DEC-CHECKLIST",
    spec: { placement: "bullet", size: "sm", treatment: "glyph", emphasis: "accent" },
    rationale: "Checklist uses bullet icons",
  },
  {
    test: (id) => id === "MV-DEC-MATRIX",
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Matrix cells stay chart-first",
  },
  {
    test: (id) => id === "MV-DEC-COMPARE-TABLE",
    spec: { placement: "inline", size: "xs", treatment: "glyph", emphasis: "primary" },
    rationale: "Check/x marks inline in cells",
  },
  {
    test: (id) => /^MV-COMM-/.test(id),
    spec: { placement: "leading", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Pricing rows keep icons quiet",
  },
  {
    test: (id) => id === "MV-RISK-MITIGATION",
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "warning" },
    rationale: "Risk rows use warning emphasis",
  },

  // Team & governance.
  {
    test: (id) => /^MV-TEAM-BIOS/.test(id),
    spec: { placement: "none" },
    rationale: "Portraits do the work",
  },
  {
    test: (id) => id === "MV-GOV-RACI",
    spec: { placement: "inline", size: "xs", treatment: "glyph", emphasis: "muted" },
    rationale: "RACI marks inline in table",
  },
  {
    test: (id) => id === "MV-OP-INTRO-TEAM",
    spec: { placement: "none" },
    rationale: "Team intro is portrait-led",
  },

  // Recommendation & closes.
  {
    test: (id) => id === "MV-REC-NEXT",
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Next-step rows",
  },
  {
    test: (id) => id === "MV-CLOSE-CHECKLIST",
    spec: { placement: "bullet", size: "sm", treatment: "glyph", emphasis: "accent" },
    rationale: "Checklist bullets",
  },
  {
    test: (id) => id === "MV-CLOSE-DECISION",
    spec: { placement: "leading", size: "lg", treatment: "filled-tile", emphasis: "primary" },
    rationale: "Decision ask commands attention",
  },
  {
    test: (id) => id === "MV-CLOSE-STATEMENT",
    spec: {
      placement: "standalone-hero",
      size: "display",
      treatment: "soft-circle",
      emphasis: "primary",
      a11yRole: "semantic",
    },
    rationale: "Statement close is a hero",
  },
  {
    test: (id) => id === "MV-CLOSE-SPLIT",
    spec: { placement: "leading", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Split CTA panel",
  },
  {
    test: (id) => id === "MV-CLOSE-DUAL-CTA",
    spec: { placement: "above", size: "lg", treatment: "duotone", emphasis: "primary" },
    rationale: "Two paths, each iconized",
  },
  {
    test: (id) => id === "MV-CLOSE-METRIC-PROMISE",
    spec: {
      placement: "standalone-hero",
      size: "xl",
      treatment: "soft-circle",
      emphasis: "success",
      a11yRole: "semantic",
    },
    rationale: "Promise gets a hero",
  },
  {
    test: (id) => id === "MV-CLOSE-CTA",
    spec: { placement: "leading", size: "md", treatment: "filled-tile", emphasis: "primary" },
    rationale: "CTA row",
  },
  {
    test: (id) => id === "MV-CLOSE-CONTACT",
    spec: { placement: "leading", size: "sm", treatment: "glyph", emphasis: "muted" },
    rationale: "Contact rows use quiet glyphs",
  },
  {
    test: (id) => id === "MV-CLOSE-THANKS" || id === "MV-CLOSE-QNA",
    spec: { placement: "watermark", size: "display", emphasis: "muted" },
    rationale: "Thanks / Q&A slides use a soft watermark",
  },

  // Media families — pure imagery, no icons.
  {
    test: (id) => /^MV-IMG-/.test(id),
    spec: { placement: "none" },
    rationale: "Imagery-led modules",
  },

  // Quotes.
  {
    test: (id) => /^MV-QUOTE-/.test(id),
    spec: { placement: "inline", size: "sm", treatment: "glyph", emphasis: "accent" },
    rationale: "Quote marks inline",
  },

  // Infographics — icons anchor each node/segment.
  {
    test: (id) => id === "MV-INFO-CIRCULAR-FLOW",
    spec: { placement: "above", size: "md", treatment: "soft-circle", emphasis: "primary" },
    rationale: "Nodes carry a glyph",
  },
  {
    test: (id) => id === "MV-INFO-PYRAMID",
    spec: { placement: "leading", size: "sm", treatment: "glyph", emphasis: "accent" },
    rationale: "Pyramid tiers",
  },
  {
    test: (id) => /^MV-INFO-/.test(id),
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Chart-led infographics",
  },

  // Client / matrix content.
  {
    test: (id) => id === "MV-CLIENT-MATRIX" || id === "MV-CLIENT-COMPARE",
    spec: { placement: "corner", size: "sm", treatment: "outline-tile", emphasis: "muted" },
    rationale: "Cells are outcome-led",
  },
  {
    test: (id) => /^MV-CLIENT-/.test(id),
    spec: { placement: "above", size: "md", treatment: "soft-tile", emphasis: "accent" },
    rationale: "Client detail cards",
  },
];

// Effective iconography for a variant. Inline declaration wins; otherwise the
// pattern rule wins; otherwise a safe default.
export function iconographyForVariant(
  variant: ModuleVariant,
): IconSpec & { source: "declared" | "pattern" | "default"; rationale: string } {
  if (variant.iconography) {
    return {
      ...withDefaults(variant.iconography),
      source: "declared",
      rationale: "Declared on the variant",
    };
  }
  for (const rule of VARIANT_ICON_RULES) {
    if (rule.test(variant.id)) {
      return { ...withDefaults(rule.spec), source: "pattern", rationale: rule.rationale };
    }
  }
  return {
    ...withDefaults({ placement: "leading" }),
    source: "default",
    rationale: "Fallback: leading soft-tile accent",
  };
}

// ---------- Module-family icons ----------
// One representative Lucide glyph per module family, used as a wayfinding
// mark in /atlas cards, the library filter, and section chips.

import {
  Compass,
  AlertTriangle,
  Lightbulb,
  Workflow,
  BarChart3,
  BookOpen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ModuleFamilyIcon = {
  id: string; // MF-XX
  Icon: LucideIcon;
  emphasis: IconEmphasis; // maps to color pair
  rationale: string;
};

export const MODULE_FAMILY_ICONS: Record<string, ModuleFamilyIcon> = {
  "MF-01": {
    id: "MF-01",
    Icon: Compass,
    emphasis: "accent",
    rationale: "Opening & orientation — set the direction",
  },
  "MF-02": {
    id: "MF-02",
    Icon: AlertTriangle,
    emphasis: "warning",
    rationale: "Context & challenge — surface the problem",
  },
  "MF-03": {
    id: "MF-03",
    Icon: Lightbulb,
    emphasis: "accent",
    rationale: "Insight & opportunity — the leverage point",
  },
  "MF-04": {
    id: "MF-04",
    Icon: Workflow,
    emphasis: "primary",
    rationale: "Solution & process — how it works",
  },
  "MF-05": {
    id: "MF-05",
    Icon: BarChart3,
    emphasis: "success",
    rationale: "Proof, data & decision — substantiate",
  },
  "MF-06": {
    id: "MF-06",
    Icon: BookOpen,
    emphasis: "primary",
    rationale: "Case study — the story of a comparable win",
  },
  "MF-07": {
    id: "MF-07",
    Icon: Users,
    emphasis: "primary",
    rationale: "Team, governance & close — people and next steps",
  },
};

export function familyIcon(familyId: string): ModuleFamilyIcon {
  return (
    MODULE_FAMILY_ICONS[familyId] ?? {
      id: familyId,
      Icon: Compass,
      emphasis: "muted",
      rationale: "Fallback",
    }
  );
}
