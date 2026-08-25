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
import { PRINT_CONTENT_FIT_DEFAULTS, type PrintContentFitSettings } from "@/lib/print-content-fit";
import { HERO_HEIGHT_HARD_MIN, maxHeroHeightPct } from "@/lib/print-capacity";

/**
 * Safety factor applied to the module budget when fitting FRESH content.
 * Module weights are calibrated estimates; a page that fits them at 100%
 * can still clip real pixels (the live editor's own warning fires around
 * 15% overflow on a "within budget" seed). Fitting against 85% of the
 * budget keeps a first-run file comfortably inside the trim.
 */
const FRESH_CONTENT_BUDGET_SCALE = 0.85;
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
  opts?: { budgetScale?: number },
): PrintPageBudget | null {
  const ck = capacityKind(kind);
  if (!ck || !content || typeof content !== "object") return null;
  const bag = content as Bag;
  const modules = Array.isArray(bag["modules"]) ? (bag["modules"] as PrintSection[]) : [];
  const used = modules.reduce((n, m) => n + weightForSection(m), 0);
  const budget =
    effectiveModuleBudget(ck, bag["heroMedia"] as PrintHeroMedia | undefined, {
      hasTitle: typeof bag["title"] === "string" && !!bag["title"],
      hasSummary: typeof bag["summary"] === "string" && !!bag["summary"],
    }) * (opts?.budgetScale ?? 1);
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
  opts?: { budgetScale?: number },
): PrintModuleFitReport {
  // 1 — normalize against the variant's own hard limits.
  let section = approveSection(raw);
  const normalized = section !== raw;

  const page = printPageBudget(kind, content, opts);
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

export type QaFitResult = {
  /** The fitted content — ready to persist as a first-run, overflow-free page. */
  content: Bag;
  /** Human-readable adjustments, empty when the seed already fit. */
  notes: string[];
};

/**
 * FIRST-RUN QA FIT — a newly created print piece must open 100% laid out,
 * never overflowing. Every module seeded into fresh content is run through
 * the same fit ladder an editor insert uses (normalize → right-size variant
 * → trim items), and the page is armed with the auto content-fit ladder so
 * the live canvas keeps it inside the trim from the very first render:
 *
 *   • contentFit enabled with the standard relief settings (margin relief
 *     first, then uniform scale — floors keep it readable).
 *   • If a module STILL can't fit the page budget the piece drops to compact
 *     density so the page closes without clipping.
 *
 * Pure + deterministic; used by the print agent's create paths so a brand-new
 * live file is QA-approved the moment it exists.
 */
export function qaFitPrintContent(
  kind: PrintAssetKind | PrintTemplateKind,
  rawContent: unknown,
): QaFitResult {
  const content: Bag = { ...((rawContent as Bag | null | undefined) ?? {}) };
  const notes: string[] = [];
  const rawModules = Array.isArray(content["modules"]) ? (content["modules"] as PrintSection[]) : [];

  // Fit modules one at a time against the RUNNING page state so each insert
  // sees the budget left by the modules already placed. Fresh content fits
  // against a SCALED-DOWN budget — module weights are estimates, and a page
  // that fits them at 100% can still clip real pixels on first render.
  const fitted: PrintSection[] = [];
  let anyOver = false;
  for (const mod of rawModules) {
    const running: Bag = { ...content, modules: fitted };
    const report = fitPrintModuleIntoPage(kind, running, mod, {
      budgetScale: FRESH_CONTENT_BUDGET_SCALE,
    });
    if (report.note) notes.push(report.note);
    if (report.overBudget) anyOver = true;
    fitted.push(report.section);
  }
  content["modules"] = fitted;

  // If still over after right-sizing + trimming, drop trailing modules until
  // the scaled budget closes — a fresh file must NEVER open overflowing.
  const ck = capacityKind(kind);
  if (ck) {
    let page = printPageBudget(ck, content, { budgetScale: FRESH_CONTENT_BUDGET_SCALE });
    while (page && page.used > page.budget + 0.001 && fitted.length > 0) {
      const dropped = fitted.pop()!;
      const droppedTitle = (dropped as unknown as Bag)["title"];
      notes.push(
        `removed “${typeof droppedTitle === "string" && droppedTitle ? droppedTitle : dropped.kind}” to keep the page inside the trim`,
      );
      content["modules"] = fitted;
      page = printPageBudget(ck, content, { budgetScale: FRESH_CONTENT_BUDGET_SCALE });
      anyOver = true;
    }
  }

  // Pre-shrink an oversized hero photo so the first render doesn't rely on
  // the editor's "shrink hero" corrective — apply it up front instead.
  const hero = content["heroMedia"] as PrintHeroMedia | undefined;
  if (hero?.imageUrl && ck) {
    const usedNow = fitted.reduce((n, m) => n + weightForSection(m), 0);
    const copy = {
      hasTitle: typeof content["title"] === "string" && !!content["title"],
      hasSummary: typeof content["summary"] === "string" && !!content["summary"],
    };
    const target = maxHeroHeightPct(ck, usedNow, hero, copy);
    const currentPct = hero.heightPct ?? 46;
    const clamped = Math.max(HERO_HEIGHT_HARD_MIN, Math.min(currentPct, target));
    if (clamped < currentPct) {
      content["heroMedia"] = { ...hero, heightPct: Math.round(clamped) };
      notes.push(`hero band pre-sized to ${Math.round(clamped)}% so the page fits`);
    }
  }

  // Arm the auto-fit ladder on every fresh piece (the live editor + exports
  // read these settings; without them a page renders with fitting off).
  // Fresh files use a ZERO threshold so ANY measurable overflow — not just
  // the default 15% — triggers margin + scale relief on first render.
  const armed: PrintContentFitSettings = {
    ...PRINT_CONTENT_FIT_DEFAULTS,
    threshold: 0.02,
    minScale: 0.78,
    minPad: 0.6,
  };
  const existing = content["contentFit"] as Partial<PrintContentFitSettings> | undefined;
  content["contentFit"] = { ...armed, ...(existing ?? {}), enabled: true };
  if (!existing) notes.push("auto content-fit armed");

  if (anyOver && content["density"] !== "compact") {
    content["density"] = "compact";
    notes.push("page switched to compact spacing");
  }

  return { content, notes };
}
