// PRINT MODULE FIT ENGINE
// ---------------------------------------------------------------------------
// Library modules (`PRINT_SECTION_MODULES`) are authored against a generous
// portrait page. Template pieces (Case Study, Spotlight, eBrochure, Adaptor
// Brief, MSA, Solution Proposal) each leave a DIFFERENT amount of flowable
// space, so dropping a library module straight into a dense template used to
// push content past the trim — the "content cutoff" failure.
//
// This module makes an insert page-aware instead of page-blind:
//
//   1. NORMALIZE — cap item counts and copy to the variant's hard limits
//      (same normalizer approved demos use, so a library block and an authored
//      block obey one rhythm).
//   2. RIGHT-SIZE — if the module's weight doesn't fit the remaining budget,
//      swap it for the heaviest variant in the SAME family that does (e.g.
//      `logo-wall-portrait` → `logo-row-portrait`), then re-normalize to that
//      variant's caps.
//   3. TRIM — if the lightest variant still doesn't fit, shave optional items
//      one at a time down to the variant minimum before giving up.
//   4. REPORT — the caller (editor insert, agent, importer) gets an honest
//      report so it can relax density / enable auto content-fit and tell the
//      user what changed, rather than silently clipping the page.
//
// Pure + deterministic: no React, no DOM. Safe to unit test and to run on
// every insert.

import {
  PRINT_CONTACT_VARIANT_LIMITS,
  PRINT_DEVICE_VARIANT_LIMITS,
  PRINT_EXPERTISE_VARIANT_LIMITS,
  PRINT_FEATURE_VARIANT_LIMITS,
  PRINT_HERO_VARIANT_WEIGHTS,
  PRINT_LOGO_VARIANT_LIMITS,
  PRINT_NARRATIVE_VARIANT_LIMITS,
  PRINT_QUOTE_VARIANT_WEIGHTS,
  PRINT_STATS_VARIANT_LIMITS,
  PRINT_TABLE_VARIANT_LIMITS,
  PRINT_TEMPLATE_BUDGETS,
  effectiveModuleBudget,
  weightForSection,
  type PrintTemplateKind,
} from "@/lib/print-capacity";
import { approveSection } from "@/lib/print-library/demo-approve";
import type { PrintAssetKind, PrintHeroMedia, PrintSection } from "@/lib/print-assets.types";

type Bag = Record<string, unknown>;

/** Variant ladders per family, heaviest → lightest (derived from the weights). */
const FAMILY_VARIANTS: Record<string, string[]> = {
  hero: Object.keys(PRINT_HERO_VARIANT_WEIGHTS),
  stats: Object.keys(PRINT_STATS_VARIANT_LIMITS),
  quote: Object.keys(PRINT_QUOTE_VARIANT_WEIGHTS),
  "logo-grid": Object.keys(PRINT_LOGO_VARIANT_LIMITS),
  expertise: Object.keys(PRINT_EXPERTISE_VARIANT_LIMITS),
  "feature-list": Object.keys(PRINT_FEATURE_VARIANT_LIMITS),
  narrative: Object.keys(PRINT_NARRATIVE_VARIANT_LIMITS),
  table: Object.keys(PRINT_TABLE_VARIANT_LIMITS),
  contact: Object.keys(PRINT_CONTACT_VARIANT_LIMITS),
  device: Object.keys(PRINT_DEVICE_VARIANT_LIMITS),
};

/** Minimum item count a variant still reads as designed. */
function minItemsFor(section: PrintSection): number {
  if (section.kind === "stats") {
    return PRINT_STATS_VARIANT_LIMITS[section.variantId]?.minItems ?? 2;
  }
  if (section.kind === "logo-grid") return 3;
  return 2;
}

function itemsOf(section: PrintSection): unknown[] | null {
  const raw = (section as unknown as Bag)["items"];
  return Array.isArray(raw) ? raw : null;
}

function capacityKind(kind: PrintAssetKind | PrintTemplateKind): PrintTemplateKind | null {
  return kind in PRINT_TEMPLATE_BUDGETS ? (kind as PrintTemplateKind) : null;
}

export type PrintPageBudget = {
  kind: PrintTemplateKind;
  budget: number;
  used: number;
  remaining: number;
};

/** Remaining module budget on a page, hero-adjusted, before an insert. */
export function printPageBudget(
  kind: PrintAssetKind | PrintTemplateKind,
  content: unknown,
): PrintPageBudget | null {
  const ck = capacityKind(kind);
  if (!ck || !content || typeof content !== "object") return null;
  const bag = content as Bag;
  const modules = Array.isArray(bag["modules"]) ? (bag["modules"] as PrintSection[]) : [];
  const used = modules.reduce((n, m) => n + weightForSection(m), 0);
  const budget = effectiveModuleBudget(ck, bag["heroMedia"] as PrintHeroMedia | undefined, {
    hasTitle: typeof bag["title"] === "string" && !!bag["title"],
    hasSummary: typeof bag["summary"] === "string" && !!bag["summary"],
  });
  return { kind: ck, budget, used, remaining: Math.max(0, budget - used) };
}

export type PrintModuleFitReport = {
  /** The section as it should actually be inserted. */
  section: PrintSection;
  /** Weight units the fitted section consumes. */
  weight: number;
  /** Remaining budget on the page BEFORE the insert. */
  remaining: number;
  /** Variant swapped down to fit (heavy → lighter sibling). */
  swappedFrom?: string;
  /** Items removed to fit. */
  droppedItems: number;
  /** Copy / item caps applied by the shared normalizer. */
  normalized: boolean;
  /** Still over the page budget after every relief step. */
  overBudget: boolean;
  /** One-line human summary, or null when nothing had to change. */
  note: string | null;
};

/**
 * Fit one library module into a specific print piece. Always returns a
 * section — never refuses the insert — but reports exactly what it had to do
 * so the caller can relax density / turn on auto content-fit and inform the
 * author.
 */
export function fitPrintModuleIntoPage(
  kind: PrintAssetKind | PrintTemplateKind,
  content: unknown,
  raw: PrintSection,
): PrintModuleFitReport {
  // 1 — normalize against the variant's own hard limits.
  let section = approveSection(raw);
  const normalized = section !== raw;

  const page = printPageBudget(kind, content);
  const remaining = page?.remaining ?? Number.POSITIVE_INFINITY;

  let swappedFrom: string | undefined;
  let droppedItems = 0;

  // 2 — right-size the variant inside the same family.
  if (Number.isFinite(remaining) && weightForSection(section) > remaining + 0.001) {
    const ladder = (FAMILY_VARIANTS[section.kind] ?? [])
      .map((variantId) => {
        const candidate = approveSection({ ...section, variantId } as PrintSection);
        return { candidate, weight: weightForSection(candidate) };
      })
      .sort((a, b) => b.weight - a.weight);
    const fits = ladder.find((c) => c.weight <= remaining + 0.001);
    const pick = fits ?? ladder[ladder.length - 1];
    if (pick && pick.candidate.variantId !== section.variantId) {
      swappedFrom = section.variantId;
      section = pick.candidate;
    }
  }

  // 3 — shave optional items down to the variant minimum.
  if (Number.isFinite(remaining) && weightForSection(section) > remaining + 0.001) {
    const min = minItemsFor(section);
    let items = itemsOf(section);
    while (items && items.length > min && weightForSection(section) > remaining + 0.001) {
      items = items.slice(0, items.length - 1);
      droppedItems += 1;
      section = { ...(section as unknown as Bag), items } as unknown as PrintSection;
      // Weight is variant-driven; item shaving only helps measured height, so
      // stop once we've reached the minimum rather than looping forever.
      if (items.length <= min) break;
    }
  }

  const weight = weightForSection(section);
  const overBudget = Number.isFinite(remaining) && weight > remaining + 0.001;

  const parts: string[] = [];
  if (swappedFrom) parts.push(`right-sized to ${section.variantId}`);
  if (droppedItems) parts.push(`${droppedItems} item${droppedItems > 1 ? "s" : ""} trimmed`);
  if (normalized && !swappedFrom && !droppedItems) parts.push("copy tightened to fit");
  if (overBudget) parts.push("page switched to compact spacing");

  return {
    section,
    weight,
    remaining: Number.isFinite(remaining) ? remaining : 0,
    ...(swappedFrom ? { swappedFrom } : {}),
    droppedItems,
    normalized,
    overBudget,
    note: parts.length ? parts.join(" · ") : null,
  };
}
