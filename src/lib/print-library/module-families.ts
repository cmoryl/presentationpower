/**
 * PRINT MODULE FAMILIES — canonical naming + ordering
 * ---------------------------------------------------------------------------
 * Single source of truth for print section family ids, labels, and the order
 * they appear in EVERY surface: the module library (`/library/print/modules`),
 * the hero gallery, the editor's insert drawer (`PrintSectionPicker`), and the
 * admin module editor.
 *
 * This file is a leaf (no imports) so both the registry and the picker can
 * depend on it without an import cycle.
 */

export type PrintModuleFamily =
  | "hero"
  | "narrative"
  | "stats"
  | "quote"
  | "logo-grid"
  | "expertise"
  | "feature-list"
  | "table"
  | "contact";

export type PrintModuleFamilyMeta = {
  id: PrintModuleFamily;
  label: string;
  tagline: string;
  desc: string;
};

/** Canonical shelf order — page-flow order: open → tell → prove → close. */
export const PRINT_MODULE_FAMILIES: PrintModuleFamilyMeta[] = [
  {
    id: "hero",
    label: "Heroes",
    tagline: "How the page opens",
    desc: "The ten opening lockups the curated collateral uses — full-bleed photo bands, split photo heroes, typographic stacks, accent bands, stat lockups, and the case-study client rail.",
  },
  {
    id: "narrative",
    label: "Narrative",
    tagline: "The story spine",
    desc: "Challenge / Approach / Impact triptychs, numbered engagement arcs, and Discover panels lifted from the curated e-brochures and case studies.",
  },
  {
    id: "stats",
    label: "Stats",
    tagline: "Proof in numbers",
    desc: "KPI rows, callout pills, and bento stacks for measurable outcomes.",
  },
  {
    id: "quote",
    label: "Quotes",
    tagline: "Voice of the client",
    desc: "Pull quotes and attribution lockups for testimonial proof.",
  },
  {
    id: "logo-grid",
    label: "Client logos",
    tagline: "Trusted by",
    desc: "Logo grids, rows, and walls for client rosters and partner sets.",
  },
  {
    id: "expertise",
    label: "Expertise",
    tagline: "Capability + credentials",
    desc: "Icon strips, checklists, and credential pills for what's included.",
  },
  {
    id: "feature-list",
    label: "Features",
    tagline: "What we do",
    desc: "Verb cards and feature lists for service and product capability.",
  },
  {
    id: "table",
    label: "Tables & rails",
    tagline: "Coverage and specs",
    desc: "Departments-supported lists, scale rails, and label→value spec tables from the MSA partnership pages.",
  },
  {
    id: "contact",
    label: "Contact & CTA",
    tagline: "How the page closes",
    desc: "Subject-expert cards, global contact panels, and closing CTA bands — the three endings every curated piece uses.",
  },
];

export const PRINT_MODULE_FAMILY_ORDER: PrintModuleFamily[] = PRINT_MODULE_FAMILIES.map(
  (f) => f.id,
);

export function printModuleFamilyMeta(id: PrintModuleFamily): PrintModuleFamilyMeta {
  return PRINT_MODULE_FAMILIES.find((f) => f.id === id) ?? PRINT_MODULE_FAMILIES[0]!;
}

/** Rank used to sort modules into canonical family order. */
export function printModuleFamilyRank(id: PrintModuleFamily): number {
  const i = PRINT_MODULE_FAMILY_ORDER.indexOf(id);
  return i < 0 ? PRINT_MODULE_FAMILY_ORDER.length : i;
}

/**
 * Canonical variant label per module id (`pm-<family>-<variant>`).
 * Labels are bare variant names — surfaces prefix the family themselves — so
 * "Photo Band" reads the same in the library, the picker, and the inspector.
 */
export const PRINT_MODULE_LABELS: Record<string, string> = {
  // Heroes
  "hero-photo-band": "Photo Band",
  "hero-split-photo": "Split Photo",
  "hero-type-stack": "Type Stack",
  "hero-accent-band": "Accent Band",
  "hero-stat-lockup": "Stat Lockup",
  "hero-client-lockup": "Client Lockup",
  "hero-photo-fade": "Photo Fade",
  "hero-quote-split": "Quote Split",
  "hero-cobrand-band": "Co-brand Band",
  "hero-brief-lockup": "Brief Lockup",
  "hero-element-masthead": "ELEMENT Masthead",
  "hero-element-band": "ELEMENT Rail Band",
  // Narrative
  "narrative-tri-card": "Challenge · Approach · Impact",
  "narrative-numbered-arc": "Numbered Engagement Arc",
  "narrative-discover-panel": "Discover Panel",
  // Stats
  "kpi-dashboard-portrait": "KPI Dashboard",
  "stat-callout-row-portrait": "Stat Callout Row",
  "stat-bento-portrait": "Stat Bento",
  // Quotes
  "pull-quote-hero": "Pull Quote",
  "quote-attribution-card": "Attribution Card",
  "quote-inline-compact": "Inline Quote",
  // Client logos
  "logo-grid-portrait": "Logo Grid",
  "logo-row-portrait": "Logo Row",
  "logo-wall-portrait": "Logo Wall",
  // Expertise
  "expertise-icon-strip": "Icon Strip",
  "expertise-checklist": "Checklist Panel",
  "expertise-credential-pills": "Credential Pills",
  // Features
  "feature-cards-3col": "Verb Cards · 3 col",
  "feature-cards-2col": "Verb Cards · 2 col",
  "feature-list-1col": "Feature List",
  // Tables & rails
  "table-two-col-list": "Departments Supported",
  "table-scale-rail": "Scale Rail",
  "table-spec-rows": "Program Spec Table",
  // Contact & CTA
  "contact-expert-card": "Subject Expert Card",
  "contact-global-panel": "Global Contacts Panel",
  "contact-cta-band": "Closing CTA Band",
};

/** Canonical label for a variant id, falling back to a title-cased id. */
export function printVariantLabel(variantId: string): string {
  return (
    PRINT_MODULE_LABELS[variantId] ??
    variantId
      .replace(/^(hero|stat|quote|logo|expertise|feature|narrative|table|contact)-/, "")
      .replace(/-portrait$/, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/** "Heroes · Photo Band" — used wherever a module is shown outside its family group. */
export function printModuleFullLabel(family: PrintModuleFamily, variantId: string): string {
  return `${printModuleFamilyMeta(family).label} · ${printVariantLabel(variantId)}`;
}
