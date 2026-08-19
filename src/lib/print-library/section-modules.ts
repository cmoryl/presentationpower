/**
 * PRINT SECTIONS MODULE LIBRARY
 * ---------------------------------------------------------------------------
 * One registry over every reusable print section module (`PrintSection`) the
 * print system can host in `content.modules[]`. This is the print counterpart
 * to the deck module catalog: each entry pairs a family + variant with editable
 * metadata (label, description, tags, which print kinds it suits, how much
 * vertical room it wants) and a factory that produces a ready-to-edit block.
 *
 * Consumers:
 *  - `/library/print/modules` — the browsable module library.
 *  - `PrintSectionPicker` — insert drawer inside the print editor.
 *  - `print-library/editable.ts` — auto-seeds modules on imported briefs.
 */

import type {
  PrintAssetKind,
  PrintContactVariant,
  PrintNarrativeVariant,
  PrintTableVariant,
  PrintExpertiseVariant,
  PrintFeatureVariant,
  PrintLogoGridVariant,
  PrintQuoteVariant,
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import {
  makePrintContactSection,
  makePrintNarrativeSection,
  makePrintTableSection,
  makePrintExpertiseSection,
  makePrintFeatureSection,
  makePrintLogoGridSection,
  makePrintQuoteSection,
  makePrintStatsSection,
} from "@/components/print/sections/PrintSectionPicker";

export type PrintModuleFamily =
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

export const PRINT_MODULE_FAMILIES: PrintModuleFamilyMeta[] = [
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

export function printModuleFamilyMeta(id: PrintModuleFamily): PrintModuleFamilyMeta {
  return PRINT_MODULE_FAMILIES.find((f) => f.id === id) ?? PRINT_MODULE_FAMILIES[0]!;
}

/** Rough vertical footprint on a portrait page — drives capacity warnings. */
export type PrintModuleDensity = "compact" | "standard" | "tall";

export type PrintSectionModule = {
  /** Stable id — `pm-<family>-<variant>`. Never renumber. */
  id: string;
  family: PrintModuleFamily;
  variantId: string;
  label: string;
  description: string;
  density: PrintModuleDensity;
  /** Print kinds this module reads well on. */
  bestFor: PrintAssetKind[];
  tags: string[];
  /** Produces a fresh, fully editable block with sensible demo copy. */
  make: () => PrintSection;
};

const ALL_KINDS: PrintAssetKind[] = [
  "case-study",
  "spotlight",
  "ebrochure",
  "msa-partnership",
  "adaptor-brief",
];

const statsModule = (
  variantId: PrintStatsVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-stats-${variantId}`,
  family: "stats",
  variantId,
  label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintStatsSection(variantId),
});

const quoteModule = (
  variantId: PrintQuoteVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-quote-${variantId}`,
  family: "quote",
  variantId,
  label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintQuoteSection(variantId),
});

const logoModule = (
  variantId: PrintLogoGridVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-logo-grid-${variantId}`,
  family: "logo-grid",
  variantId,
  label,
  description,
  density,
  bestFor: ["spotlight", "ebrochure", "msa-partnership", "adaptor-brief"],
  tags,
  make: () => makePrintLogoGridSection(variantId),
});

const expertiseModule = (
  variantId: PrintExpertiseVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-expertise-${variantId}`,
  family: "expertise",
  variantId,
  label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintExpertiseSection(variantId),
});

const featureModule = (
  variantId: PrintFeatureVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-feature-list-${variantId}`,
  family: "feature-list",
  variantId,
  label,
  description,
  density,
  bestFor: ["spotlight", "ebrochure", "adaptor-brief", "msa-partnership"],
  tags,
  make: () => makePrintFeatureSection(variantId),
});

const narrativeModule = (
  variantId: PrintNarrativeVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-narrative-${variantId}`,
  family: "narrative",
  variantId,
  label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintNarrativeSection(variantId),
});

const tableModule = (
  variantId: PrintTableVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
  bestFor: PrintAssetKind[] = ALL_KINDS,
): PrintSectionModule => ({
  id: `pm-table-${variantId}`,
  family: "table",
  variantId,
  label,
  description,
  density,
  bestFor,
  tags,
  make: () => makePrintTableSection(variantId),
});

const contactModule = (
  variantId: PrintContactVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-contact-${variantId}`,
  family: "contact",
  variantId,
  label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintContactSection(variantId),
});

/** Every reusable print section module, in shelf order. */
export const PRINT_SECTION_MODULES: PrintSectionModule[] = [
  narrativeModule(
    "narrative-tri-card",
    "Challenge · Approach · Impact",
    "The e-brochure triptych: three glass cards with an accent rule, body copy, and up to four supporting bullets each.",
    "standard",
    ["ebrochure", "triptych", "story", "challenge", "impact"],
  ),
  narrativeModule(
    "narrative-numbered-arc",
    "Numbered Engagement Arc",
    "01 / 02 / 03 challenge → solution → result spine with hairline dividers and outcome chips — the case-study narrative.",
    "tall",
    ["case-study", "arc", "challenge", "solution", "result"],
  ),
  narrativeModule(
    "narrative-discover-panel",
    "Discover Panel",
    "Positioning paragraph beside a hairline bullet rail — the 'Discover' / engagement-snapshot panel from the brochures.",
    "standard",
    ["discover", "engagement", "snapshot", "bullets"],
  ),
  statsModule(
    "kpi-dashboard-portrait",
    "KPI Dashboard",
    "Multi-column KPIs with divider hairlines and trend chips.",
    "standard",
    ["kpi", "results", "trend", "dashboard"],
  ),
  statsModule(
    "stat-callout-row-portrait",
    "Stat Callout Row",
    "Big-number pills in a glass row — best directly under the hero.",
    "compact",
    ["numbers", "hero", "row"],
  ),
  statsModule(
    "stat-bento-portrait",
    "Stat Bento",
    "Hero stat with a supporting stack for one headline outcome.",
    "tall",
    ["bento", "headline", "outcome"],
  ),
  quoteModule(
    "pull-quote-hero",
    "Pull Quote",
    "Full-width italic pull quote in glass — the loudest testimonial option.",
    "standard",
    ["testimonial", "voice", "hero"],
  ),
  quoteModule(
    "quote-attribution-card",
    "Attribution Card",
    "Quote body with a named author lockup and company line.",
    "standard",
    ["testimonial", "author", "card"],
  ),
  quoteModule(
    "quote-inline-compact",
    "Inline Quote",
    "Compact one-line quote with a side accent bar.",
    "compact",
    ["testimonial", "compact", "inline"],
  ),
  logoModule(
    "logo-grid-portrait",
    "Logo Grid",
    "Three-column portrait grid of glass logo tiles.",
    "standard",
    ["clients", "roster", "grid"],
  ),
  logoModule(
    "logo-row-portrait",
    "Logo Row",
    "Single row with divider hairlines for a short client set.",
    "compact",
    ["clients", "row", "compact"],
  ),
  logoModule(
    "logo-wall-portrait",
    "Logo Wall",
    "Dense four-column wall for large rosters.",
    "tall",
    ["clients", "wall", "dense"],
  ),
  expertiseModule(
    "expertise-icon-strip",
    "Icon Strip",
    '"We know how" horizontal icon strip of capability verbs.',
    "compact",
    ["capability", "icons", "strip"],
  ),
  expertiseModule(
    "expertise-checklist",
    "Checklist Panel",
    "Glass panel with checkmark rows for what's included.",
    "standard",
    ["scope", "included", "checklist"],
  ),
  expertiseModule(
    "expertise-credential-pills",
    "Credential Pills",
    "Compact pill row of certifications and compliance credentials.",
    "compact",
    ["iso", "compliance", "credentials"],
  ),
  featureModule(
    "feature-cards-3col",
    "Verb Cards · 3 col",
    "Six-card verb + body grid for a full capability sweep.",
    "tall",
    ["capability", "grid", "verbs"],
  ),
  featureModule(
    "feature-cards-2col",
    "Verb Cards · 2 col",
    "Four-card verb + body grid — roomier copy per card.",
    "standard",
    ["capability", "grid", "verbs"],
  ),
  featureModule(
    "feature-list-1col",
    "Feature List",
    "Stacked single-column feature list for dense narrative pages.",
    "standard",
    ["capability", "list", "stacked"],
  ),
  tableModule(
    "table-two-col-list",
    "Departments Supported",
    "Two-column hairline list of departments, teams, or content types covered by the program.",
    "standard",
    ["msa", "departments", "coverage", "list"],
  ),
  tableModule(
    "table-scale-rail",
    "Scale Rail",
    "Four big values over small labels — languages, linguists, cities, programs. The MSA scale rail.",
    "compact",
    ["msa", "scale", "reach", "rail"],
  ),
  tableModule(
    "table-spec-rows",
    "Program Spec Table",
    "Label → value rows under a shaded header strip for scope, SLA, language pairs, and certifications.",
    "standard",
    ["spec", "sla", "scope", "table"],
  ),
  contactModule(
    "contact-expert-card",
    "Subject Expert Card",
    "Initial-monogram lockup with name, role, email, and phone — the 'speak to our expert' close.",
    "compact",
    ["expert", "contact", "close"],
  ),
  contactModule(
    "contact-global-panel",
    "Global Contacts Panel",
    "Navy gradient panel with a primary contact and a per-region contact rail, straight from the MSA footer.",
    "standard",
    ["msa", "contacts", "regions", "footer"],
  ),
  contactModule(
    "contact-cta-band",
    "Closing CTA Band",
    "Accent band with headline, supporting line, and a pill button — the standard page-closing call to action.",
    "compact",
    ["cta", "close", "band", "next step"],
  ),
];

export function printModulesForFamily(family: PrintModuleFamily): PrintSectionModule[] {
  return PRINT_SECTION_MODULES.filter((m) => m.family === family);
}

export function printModulesForKind(kind: PrintAssetKind): PrintSectionModule[] {
  return PRINT_SECTION_MODULES.filter((m) => m.bestFor.includes(kind));
}

export function findPrintModule(id: string): PrintSectionModule | undefined {
  return PRINT_SECTION_MODULES.find((m) => m.id === id);
}

/** Free-text match across label, description, family, and tags. */
export function printModuleMatches(m: PrintSectionModule, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [m.label, m.description, m.family, m.variantId, ...m.tags].join(" ").toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export const PRINT_MODULE_COUNT = PRINT_SECTION_MODULES.length;
