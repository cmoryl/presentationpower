// APPROVED-ON-LOAD NORMALIZER (print demos)
// ---------------------------------------------------------------------------
// Every curated print demo must render inside its trim on the FIRST paint —
// no manual "Fit to page" click. The demo pages used to start with the
// authored hero height and auto-fit switched off, so any piece whose modules
// out-weighed the template budget (or whose hero band was taller than the
// capacity-safe max) overflowed on initial load.
//
// This module derives both halves of an approved starting state from the same
// capacity model the studio panel uses:
//   * content — hero band clamped to the capacity-safe max height
//   * look    — density relaxed to compact when still over budget, and auto
//               content-fit ON so measured overflow is absorbed uniformly
//
// It is deliberately pure and idempotent: a piece that already fits comes back
// untouched (same object identity for content), so re-running it per render is
// free and never fights the user's later edits.

import {
  PRINT_EXPERTISE_VARIANT_LIMITS,
  PRINT_FEATURE_VARIANT_LIMITS,
  PRINT_LOGO_VARIANT_LIMITS,
  PRINT_NARRATIVE_VARIANT_LIMITS,
  PRINT_STATS_VARIANT_LIMITS,
  PRINT_TEMPLATE_BUDGETS,
  effectiveModuleBudget,
  maxHeroHeightPct,
  weightForSection,
  type PrintTemplateKind,
} from "@/lib/print-capacity";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintHeroMedia,
  PrintPageSize,
  PrintSection,
} from "@/lib/print-assets.types";

export type ApprovedDemoLook = {
  pageSize: PrintPageSize;
  density: PrintDensity;
  fit: boolean;
};

function capacityKind(kind: PrintAssetKind): PrintTemplateKind | null {
  return kind in PRINT_TEMPLATE_BUDGETS ? (kind as PrintTemplateKind) : null;
}

type Bag = Record<string, unknown>;

function readModules(bag: Bag): PrintSection[] {
  const raw = bag["modules"];
  return Array.isArray(raw) ? (raw as PrintSection[]) : [];
}

/** True when the piece's module load exceeds the hero-adjusted page budget. */
export function printDemoOverBudget(kind: PrintAssetKind, content: unknown): boolean {
  const ck = capacityKind(kind);
  if (!ck || !content || typeof content !== "object") return false;
  const bag = content as Bag;
  const hero = bag["heroMedia"] as PrintHeroMedia | undefined;
  const used = readModules(bag).reduce((n, m) => n + weightForSection(m), 0);
  const budget = effectiveModuleBudget(ck, hero, {
    hasTitle: typeof bag["title"] === "string" && !!bag["title"],
    hasSummary: typeof bag["summary"] === "string" && !!bag["summary"],
  });
  return used > budget + 0.001;
}

/** Word-safe truncation: cut on the last sentence or word boundary under max. */
function tighten(value: string, max: number): string {
  if (value.length <= max) return value;
  const slice = value.slice(0, max);
  const sentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "));
  if (sentence > max * 0.55) return slice.slice(0, sentence + 1).trim();
  const word = slice.lastIndexOf(" ");
  return `${slice.slice(0, word > max * 0.5 ? word : max - 1).trim()}…`;
}

/** Cap per-family item counts and body copy so no module clips its layout. */
function approveSection(section: PrintSection): PrintSection {
  const s = section as PrintSection & Bag;
  const capItems = (max: number) => {
    const items = s["items"];
    if (!Array.isArray(items) || items.length <= max) return null;
    return items.slice(0, max);
  };
  const capBodies = (items: unknown[], max: number) =>
    items.map((it) =>
      it && typeof it === "object" && typeof (it as Bag)["body"] === "string"
        ? { ...(it as Bag), body: tighten((it as Bag)["body"] as string, max) }
        : it,
    );

  switch (section.kind) {
    case "stats": {
      const cfg = PRINT_STATS_VARIANT_LIMITS[section.variantId];
      if (!cfg) return section;
      const items = (capItems(cfg.maxItems) ?? section.items).map((it) => ({
        ...it,
        value: tighten(it.value ?? "", cfg.valueMax),
        ...(it.label ? { label: tighten(it.label, cfg.labelMax) } : {}),
      }));
      return { ...section, items };
    }
    case "quote": {
      const max = section.variantId === "quote-inline-compact" ? 180 : 340;
      return { ...section, text: tighten(section.text ?? "", max) };
    }
    case "narrative": {
      const cfg = PRINT_NARRATIVE_VARIANT_LIMITS[section.variantId];
      if (!cfg) return section;
      const items = capBodies(capItems(cfg.maxItems) ?? section.items, cfg.bodyMax);
      return { ...section, items } as PrintSection;
    }
    case "feature-list": {
      const cfg = PRINT_FEATURE_VARIANT_LIMITS[section.variantId];
      if (!cfg) return section;
      const items = capBodies(capItems(cfg.maxItems) ?? section.items, cfg.bodyMax);
      return { ...section, items } as PrintSection;
    }
    case "expertise": {
      const cfg = PRINT_EXPERTISE_VARIANT_LIMITS[section.variantId];
      if (!cfg) return section;
      const items = capItems(cfg.maxItems);
      return items ? ({ ...section, items } as PrintSection) : section;
    }
    case "logo-grid": {
      const cfg = PRINT_LOGO_VARIANT_LIMITS[section.variantId];
      if (!cfg) return section;
      const items = capItems(cfg.maxItems);
      return items ? ({ ...section, items } as PrintSection) : section;
    }
    default:
      return section;
  }
}

/** Identity of a module for de-duplication: family + variant + heading. */
function moduleKey(section: PrintSection): string {
  // One contact block per piece — a demo never ends with two "talk to us" cards.
  if (section.kind === "contact") return "contact";
  // Narrative blocks are deduped on their item headings, so a piece never
  // tells the same challenge/solution/result story twice in two variants.
  if (section.kind === "narrative") {
    const items = (section as Bag)["items"];
    const heads = Array.isArray(items)
      ? items
          .map((it) =>
            it && typeof it === "object" ? String((it as Bag)["heading"] ?? "").toLowerCase() : "",
          )
          .join("~")
      : "";
    if (heads.replace(/~/g, "")) return `narrative|${heads}`;
  }
  const title = (section as Bag)["title"];
  return `${section.kind}|${section.variantId}|${typeof title === "string" ? title.toLowerCase().trim() : ""}`;
}

/**
 * Drop order when a piece is over budget. Higher = shed first, so the story
 * spine (narrative, features, tables, contact) survives and the supporting
 * proof furniture goes before it.
 */
const SHED_ORDER: Record<string, number> = {
  "logo-grid": 5,
  device: 4,
  quote: 3,
  expertise: 2,
  stats: 1,
  table: 0,
  // Negative = protected: the story spine and the call to action stay last.
  "feature-list": -1,
  narrative: -1,
  contact: -2,
};

/** Content-level copy ceilings that mirror print-capacity's TEXT_LIMITS. */
const CONTENT_CAPS: Record<string, number> = {
  summary: 220,
  tagline: 90,
  intro: 200,
  subtitle: 90,
  note: 460,
  timelineNote: 300,
  costNote: 240,
};

/** Tighten top-level copy plus the nested case-study blocks and pull quote. */
function approveContentCopy(bag: Bag): Bag | null {
  let next: Bag | null = null;
  const set = (key: string, value: unknown) => {
    next = { ...(next ?? bag), [key]: value };
  };

  for (const [key, max] of Object.entries(CONTENT_CAPS)) {
    const value = bag[key];
    if (typeof value === "string" && value.length > max) set(key, tighten(value, max));
  }

  for (const key of ["challenge", "solution", "result"]) {
    const block = bag[key];
    if (block && typeof block === "object") {
      const body = (block as Bag)["body"];
      if (typeof body === "string" && body.length > 520) {
        set(key, { ...(block as Bag), body: tighten(body, 520) });
      }
    }
  }

  const quote = bag["quote"];
  if (quote && typeof quote === "object") {
    const text = (quote as Bag)["text"];
    if (typeof text === "string" && text.length > 340) {
      set("quote", { ...(quote as Bag), text: tighten(text, 340) });
    }
  }

  return next;
}

/**
 * Bring authored demo content to an approved starting state:
 *  1. drop duplicate modules (same family + variant + heading),
 *  2. cap item counts and body copy to each variant's hard limits,
 *  3. shed supporting modules (logos, quotes, stats) until the module load
 *     fits the page budget — the narrative spine is kept,
 *  4. clamp the hero band to the capacity-safe maximum.
 * Returns the SAME object when nothing needs changing.
 */
export function approvePrintDemoContent<T>(kind: PrintAssetKind, content: T): T {
  const ck = capacityKind(kind);
  if (!ck || !content || typeof content !== "object") return content;
  const bag = content as unknown as Bag;
  const copy = {
    hasTitle: typeof bag["title"] === "string" && !!bag["title"],
    hasSummary: typeof bag["summary"] === "string" && !!bag["summary"],
  };
  const hero = bag["heroMedia"] as PrintHeroMedia | undefined;

  // 1 + 2 — dedupe, then tighten every surviving module.
  const seen = new Set<string>();
  let modules = readModules(bag)
    .filter((m) => {
      const key = moduleKey(m);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(approveSection);

  // 3 — shed the least essential module until the load fits the budget.
  // Trade hero height for content first: the band shrinks to a slim 22% band
  // before any module is dropped, so approved demos keep their story.
  const heroForBudget = hero
    ? { ...hero, heightPct: Math.min(Math.round(hero.heightPct ?? 46), 22) }
    : hero;
  const budget = effectiveModuleBudget(ck, heroForBudget, copy);
  const load = (list: PrintSection[]) => list.reduce((n, m) => n + weightForSection(m), 0);
  while (modules.length > 1 && load(modules) > budget + 0.001) {
    let drop = modules.length - 1;
    let rank = -1;
    modules.forEach((m, i) => {
      const r = SHED_ORDER[m.kind] ?? 0;
      // `>=` so ties shed the LAST module of that rank, keeping the opening story.
      if (r >= rank) {
        rank = r;
        drop = i;
      }
    });
    modules = modules.filter((_, i) => i !== drop);
  }

  let next: Bag | null = approveContentCopy(bag);
  const original = readModules(bag);
  const changed =
    modules.length !== original.length || modules.some((m, i) => m !== original[i]);
  if (changed) next = { ...(next ?? bag), modules };

  // 4 — hero band clamp against the final module load.
  if (hero?.imageUrl) {
    const max = maxHeroHeightPct(ck, load(modules), hero, copy);
    const current = Math.round(hero.heightPct ?? 46);
    if (current > max) {
      next = { ...(next ?? bag), heroMedia: { ...hero, heightPct: max } };
    }
  }

  return (next ?? content) as T;
}



/**
 * Starting look for a demo page: the pinned trim, auto content-fit always on,
 * and density relaxed to compact when the piece is still over budget after the
 * hero clamp.
 */
export function approvePrintDemoLook(
  kind: PrintAssetKind,
  content: unknown,
  pinned: { pageSize?: PrintPageSize; density?: PrintDensity } = {},
): ApprovedDemoLook {
  const approved = approvePrintDemoContent(kind, content);
  const over = printDemoOverBudget(kind, approved);
  return {
    pageSize: pinned.pageSize ?? "Letter",
    density: over ? "compact" : (pinned.density ?? "standard"),
    fit: true,
  };
}
