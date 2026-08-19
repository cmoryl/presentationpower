/**
 * Turning a curated print-library item into an editable print asset.
 *
 * Every curated seed — legal, media, games, life sciences, DataForce,
 * GlobalLink Web, MSA — goes through the same normalizer so an "Editable copy"
 * always lands in the editor with:
 *  - correct provenance (`context.sourceLibrary` derived from the item id, not
 *    hardcoded to legal/media),
 *  - a `modules[]` array seeded from the seed's own stats / quote / capability
 *    copy, so the reusable print section modules are editable from the start.
 */

import type {
  CaseStudyStat,
  PrintSection,
  PrintStatItem,
} from "@/lib/print-assets.types";
import type { PrintLibraryItem } from "@/lib/print-library/catalog";

const rid = () => `sec-${Math.random().toString(36).slice(2, 10)}`;

/** id prefix → library slug, longest prefix first. */
const SOURCE_LIBRARIES: Array<[string, string]> = [
  ["legal-ebro-", "legal-ebrochures"],
  ["legal-", "legal-case-studies"],
  ["media-", "media-case-studies"],
  ["games-", "games-case-studies"],
  ["lifesci-ebro-", "lifesci-ebrochures"],
  ["lifesci-spotlight-", "lifesci-spotlights"],
  ["lifesci-msa-", "lifesci-msa"],
  ["lifesci-", "lifesci-case-studies"],
  ["dataforce-ebro-", "dataforce-ebrochures"],
  ["dataforce-spotlight-", "dataforce-spotlights"],
  ["dataforce-", "dataforce-case-studies"],
  ["glweb-spotlight-", "glweb-spotlights"],
  ["glweb-ebro-", "glweb-ebrochures"],
  ["template-", "print-templates"],
];

export function sourceLibraryFor(itemId: string): string {
  for (const [prefix, lib] of SOURCE_LIBRARIES) {
    if (itemId.startsWith(prefix)) return lib;
  }
  return "print-library";
}

type Rec = Record<string, unknown>;

const asRec = (v: unknown): Rec | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : undefined;
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function statsToItems(stats: unknown): PrintStatItem[] {
  return asArr(stats)
    .map((s) => asRec(s))
    .filter((s): s is Rec => Boolean(s))
    .map((s) => {
      const st = s as unknown as CaseStudyStat;
      const item: PrintStatItem = { label: st.label ?? "", value: st.value ?? "" };
      if (st.unit) item.unit = st.unit;
      if (st.caption) item.caption = st.caption;
      return item;
    })
    .filter((s) => s.label && s.value);
}

/**
 * Derive reusable section modules from a seed's own content. Only ever adds
 * modules — never rewrites the base narrative fields.
 */
export function deriveModulesFromContent(content: Rec): PrintSection[] {
  const modules: PrintSection[] = [];

  const statItems = statsToItems(content["stats"]);
  if (statItems.length >= 2) {
    modules.push({
      id: rid(),
      kind: "stats",
      variantId: statItems.length >= 4 ? "kpi-dashboard-portrait" : "stat-callout-row-portrait",
      eyebrow: "Impact at a glance",
      title: "By the numbers",
      items: statItems.slice(0, 4),
    });
  }

  const quote = asRec(content["quote"]);
  const quoteText = quote ? asStr(quote["text"]) : undefined;
  if (quoteText) {
    const section: PrintSection = {
      id: rid(),
      kind: "quote",
      variantId: quoteText.length > 180 ? "pull-quote-hero" : "quote-attribution-card",
      eyebrow: "In their words",
      text: quoteText,
    };
    const author = asStr(quote?.["author"]);
    const role = asStr(quote?.["role"]);
    const company = asStr(quote?.["company"]);
    if (author) section.author = author;
    if (role) section.role = role;
    if (company) section.company = company;
    modules.push(section);
  }

  // Capability-style copy: spotlights use `capabilities`, briefs use `verbs`,
  // e-brochures use `sections` — all heading/body pairs.
  const capSource = ["capabilities", "verbs", "features"].find((k) => asArr(content[k]).length >= 3);
  if (capSource) {
    const items = asArr(content[capSource])
      .map((c) => asRec(c))
      .filter((c): c is Rec => Boolean(c))
      .map((c) => ({
        verb: asStr(c["heading"]) ?? asStr(c["verb"]) ?? asStr(c["label"]) ?? "",
        body: asStr(c["body"]) ?? "",
      }))
      .filter((c) => c.verb);
    if (items.length >= 3) {
      modules.push({
        id: rid(),
        kind: "feature-list",
        variantId: items.length >= 5 ? "feature-cards-3col" : "feature-cards-2col",
        eyebrow: "What we do",
        title: "Capabilities at a glance",
        items: items.slice(0, 6),
      });
    }
  }

  return modules;
}

/**
 * Editable content for a curated library item: a deep clone of the seed with
 * `modules[]` guaranteed present (derived when the seed doesn't ship its own).
 */
export function toEditableContent(item: PrintLibraryItem): Rec | undefined {
  if (!item.content) return undefined;
  const clone = structuredClone(item.content) as Rec;
  const existing = asArr(clone["modules"]);
  if (existing.length === 0) {
    const derived = deriveModulesFromContent(clone);
    if (derived.length) clone["modules"] = derived;
  }
  return clone;
}

/** Provenance context stored alongside the editable copy. */
export function editableContextFor(item: PrintLibraryItem): Rec {
  const ctx: Rec = { sourceLibrary: sourceLibraryFor(item.id) };
  if (item.seedSlug) ctx["sourceSlug"] = item.seedSlug;
  if (item.sourceFile) ctx["sourceFile"] = item.sourceFile;
  if (item.collection) ctx["collection"] = item.collection;
  if (item.divisionId) ctx["divisionId"] = item.divisionId;
  ctx["libraryItemId"] = item.id;
  return ctx;
}
