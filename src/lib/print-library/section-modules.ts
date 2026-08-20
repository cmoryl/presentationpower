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
  PrintHeroModuleVariant,
  PrintQuoteVariant,
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import {
  makePrintHeroSection,
  makePrintContactSection,
  makePrintNarrativeSection,
  makePrintTableSection,
  makePrintExpertiseSection,
  makePrintFeatureSection,
  makePrintLogoGridSection,
  makePrintQuoteSection,
  makePrintStatsSection,
} from "@/components/print/sections/PrintSectionPicker";

import {
  PRINT_MODULE_FAMILIES,
  PRINT_MODULE_FAMILY_ORDER,
  PRINT_MODULE_LABELS,
  printModuleFamilyMeta,
  printModuleFamilyRank,
  printModuleFullLabel,
  printVariantLabel,
  type PrintModuleFamily,
  type PrintModuleFamilyMeta,
} from "./module-families";

// Naming + ordering live in `module-families.ts` so the library, the editor
// picker, and the admin editor all read from one place.
export {
  PRINT_MODULE_FAMILIES,
  PRINT_MODULE_FAMILY_ORDER,
  printModuleFamilyMeta,
  printModuleFamilyRank,
  printModuleFullLabel,
  printVariantLabel,
};
export type { PrintModuleFamily, PrintModuleFamilyMeta };


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

const heroModule = (
  variantId: PrintHeroModuleVariant,
  label: string,
  description: string,
  density: PrintModuleDensity,
  tags: string[],
): PrintSectionModule => ({
  id: `pm-hero-${variantId}`,
  family: "hero",
  variantId,
  label: PRINT_MODULE_LABELS[variantId] ?? label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintHeroSection(variantId),
});

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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
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
  label: PRINT_MODULE_LABELS[variantId] ?? label,
  description,
  density,
  bestFor: ALL_KINDS,
  tags,
  make: () => makePrintContactSection(variantId),
});

const PRINT_SECTION_MODULES_RAW: PrintSectionModule[] = [
  heroModule(
    "hero-photo-band",
    "Hero · Photo Band",
    "Photo masthead bled to the page trim and flush with the top of the sheet, title over a bottom scrim, closed with an accent masthead rule — the case-study and spotlight cover.",
    "tall",
    ["hero", "cover", "photo", "scrim", "case-study"],
  ),
  heroModule(
    "hero-split-photo",
    "Hero · Split Photo",
    "Photo panel bled to one page edge beside a title + summary column in the opposite margin, flippable — the e-brochure opener.",
    "standard",
    ["hero", "split", "photo", "ebrochure"],
  ),
  heroModule(
    "hero-type-stack",
    "Hero · Type Stack",
    "Typographic opener: accent rule, oversized title, and a lead paragraph. No photography needed.",
    "standard",
    ["hero", "typographic", "no-image", "rule"],
  ),
  heroModule(
    "hero-accent-band",
    "Hero · Accent Band",
    "Solid brand-gradient band with reversed type — the loudest opener, and the MSA partnership cover.",
    "standard",
    ["hero", "band", "accent", "reversed", "msa"],
  ),
  heroModule(
    "hero-stat-lockup",
    "Hero · Stat Lockup",
    "Ruled title block with up to four proof numbers ruled off beneath it — leads with outcomes.",
    "tall",
    ["hero", "stats", "proof", "outcomes"],
  ),
  heroModule(
    "hero-client-lockup",
    "Hero · Client Lockup",
    "Client rail (name + industry/region meta) beside the engagement title — the case-study masthead.",
    "standard",
    ["hero", "client", "masthead", "case-study", "meta"],
  ),
  heroModule(
    "hero-photo-fade",
    "Hero · Photo Fade",
    "The shipped case-study / e-brochure opener: photography bleeds from the top of the sheet and feathers into the page stock, so the title and summary land in the fade seam instead of on a hard band.",
    "tall",
    ["hero", "cover", "photo", "fade", "case-study", "ebrochure"],
  ),
  heroModule(
    "hero-quote-split",
    "Hero · Quote Split",
    "The Client Spotlight opener: title, tagline and intro in the left column with the client pull-quote panelled on the right.",
    "tall",
    ["hero", "quote", "spotlight", "testimonial", "split"],
  ),
  heroModule(
    "hero-cobrand-band",
    "Hero · Co-brand Band",
    "The MSA partnership cover: navy→accent band bled to the trim, both marks locked up centre, positioning line, and headline proof numbers boxed along the base.",
    "tall",
    ["hero", "cobrand", "partner", "msa", "band", "stats"],
  ),
  heroModule(
    "hero-brief-lockup",
    "Hero · Brief Lockup",
    "The adaptor-brief header: eyebrow and brand slot on one ruled row, then an oversized title block with a lead paragraph and accent rule.",
    "standard",
    ["hero", "brief", "header", "rule", "adaptor"],
  ),
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

/**
 * Every reusable print section module, in canonical shelf order: families in
 * page-flow order (`PRINT_MODULE_FAMILY_ORDER`), variants in authored order
 * within each family. Sorting here means every consumer — library, picker,
 * admin editor — lists modules identically.
 */
export const PRINT_SECTION_MODULES: PrintSectionModule[] = PRINT_SECTION_MODULES_RAW.map(
  (m, i) => ({ m, i }),
)
  .sort((a, b) => printModuleFamilyRank(a.m.family) - printModuleFamilyRank(b.m.family) || a.i - b.i)
  .map((e) => e.m);

export function printModulesForFamily(family: PrintModuleFamily): PrintSectionModule[] {
  return PRINT_SECTION_MODULES.filter((m) => m.family === family);
}

export function printModulesForKind(kind: PrintAssetKind): PrintSectionModule[] {
  return PRINT_SECTION_MODULES.filter((m) => m.bestFor.includes(kind));
}

export function findPrintModule(id: string): PrintSectionModule | undefined {
  return PRINT_SECTION_MODULES.find((m) => m.id === id);
}

/** Free-text match across label, family label, description, family, and tags. */
export function printModuleMatches(m: PrintSectionModule, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    m.label,
    printModuleFullLabel(m.family, m.variantId),
    m.description,
    m.family,
    m.variantId,
    ...m.tags,
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export const PRINT_MODULE_COUNT = PRINT_SECTION_MODULES.length;
