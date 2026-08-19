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
  PrintNarrativeItem,
  PrintSection,
  PrintStatItem,
  PrintTableRow,
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

const asStrArr = (v: unknown): string[] =>
  asArr(v)
    .map((s) => asStr(s))
    .filter((s): s is string => Boolean(s));

/** Challenge/Approach/Impact (e-brochure) or Challenge/Solution/Result (case study). */
function narrativeItemsFrom(content: Rec): { items: PrintNarrativeItem[]; arc: boolean } {
  const fromSections = asArr(content["sections"])
    .map((s) => asRec(s))
    .filter((s): s is Rec => Boolean(s))
    .map((s) => {
      const item: PrintNarrativeItem = { heading: asStr(s["heading"]) ?? "" };
      const body = asStr(s["body"]);
      if (body) item.body = body;
      const bullets = asStrArr(s["bullets"]);
      if (bullets.length) item.bullets = bullets.slice(0, 4);
      return item;
    })
    .filter((s) => s.heading);
  if (fromSections.length >= 2) return { items: fromSections.slice(0, 3), arc: false };

  const arcLabels: Array<[string, string]> = [
    ["challenge", "The challenge"],
    ["solution", "The solution"],
    ["result", "The result"],
  ];
  const fromArc = arcLabels
    .map(([key, fallback]) => {
      const block = asRec(content[key]);
      if (!block) return undefined;
      const item: PrintNarrativeItem = { heading: asStr(block["heading"]) ?? fallback };
      const body = asStr(block["body"]);
      if (body) item.body = body;
      return item;
    })
    .filter((s): s is PrintNarrativeItem => Boolean(s));
  if (fromArc.length >= 2) return { items: fromArc, arc: true };
  return { items: [], arc: false };
}

/** The "Discover" / "Engagement snapshot" panel — body plus a bullet rail. */
function discoverItemFrom(content: Rec): PrintNarrativeItem | undefined {
  for (const key of ["discover", "engagement"]) {
    const panel = asRec(content[key]);
    if (!panel) continue;
    const bullets = asStrArr(panel["bullets"]);
    const body = asStr(panel["body"]) ?? asStr(content["summary"]);
    if (!bullets.length && !body) continue;
    const item: PrintNarrativeItem = {
      heading: asStr(panel["title"]) ?? (key === "discover" ? "Discover" : "Engagement snapshot"),
    };
    if (body) item.body = body;
    if (bullets.length) item.bullets = bullets.slice(0, 6);
    return item;
  }
  return undefined;
}

function rowsFromStrings(values: string[]): PrintTableRow[] {
  return values.map((label) => ({ label }));
}

function rowsFromStats(stats: unknown): PrintTableRow[] {
  return statsToItems(stats).map((s) => {
    const row: PrintTableRow = { label: s.label, value: `${s.value}${s.unit ?? ""}` };
    if (s.caption) row.caption = s.caption;
    return row;
  });
}

/**
 * Derive reusable section modules from a seed's own content. Only ever adds
 * modules — never rewrites the base narrative fields.
 */
export function deriveModulesFromContent(content: Rec): PrintSection[] {
  const modules: PrintSection[] = [];

  const statItems = statsToItems(content["stats"]);
  if (statItems.length >= 2) {
    const variantId =
      statItems.length >= 4
        ? "kpi-dashboard-portrait"
        : statItems.length === 3
          ? "stat-bento-portrait"
          : "stat-callout-row-portrait";
    modules.push({
      id: rid(),
      kind: "stats",
      variantId,
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
      variantId:
        quoteText.length > 180
          ? "pull-quote-hero"
          : quoteText.length <= 110
            ? "quote-inline-compact"
            : "quote-attribution-card",
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
  const capSource = ["capabilities", "verbs", "features"].find(
    (k) => asArr(content[k]).length >= 3,
  );
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

  // Narrative spine — the seed's own Challenge/Approach/Impact or C→S→R copy.
  const narrative = narrativeItemsFrom(content);
  if (narrative.items.length >= 2) {
    modules.push({
      id: rid(),
      kind: "narrative",
      variantId: narrative.arc ? "narrative-numbered-arc" : "narrative-tri-card",
      eyebrow: narrative.arc ? "Engagement arc" : "The engagement",
      title: narrative.arc ? "Challenge, solution, result" : "Challenge · Approach · Impact",
      items: narrative.items,
    });
  }

  // Discover / engagement-snapshot panel.
  const discover = discoverItemFrom(content);
  if (discover) {
    modules.push({
      id: rid(),
      kind: "narrative",
      variantId: "narrative-discover-panel",
      eyebrow: "Discover",
      title: discover.heading,
      items: [discover],
    });
  }

  // MSA-style coverage tables and scale rail.
  const departments = asStrArr(content["departments"]);
  if (departments.length >= 4) {
    modules.push({
      id: rid(),
      kind: "table",
      variantId: "table-two-col-list",
      eyebrow: "Coverage",
      title: asStr(content["departmentsTitle"]) ?? "Departments supported",
      rows: rowsFromStrings(departments.slice(0, 16)),
    });
  }
  const solutions = asArr(content["solutions"])
    .map((s) => asRec(s))
    .filter((s): s is Rec => Boolean(s))
    .map((s) => asStr(s["label"]))
    .filter((s): s is string => Boolean(s));
  if (solutions.length >= 4 && departments.length < 4) {
    modules.push({
      id: rid(),
      kind: "table",
      variantId: "table-two-col-list",
      eyebrow: "Solutions",
      title: asStr(content["solutionsTitle"]) ?? "Discover a world of solutions",
      rows: rowsFromStrings(solutions.slice(0, 16)),
    });
  }
  const scaleRows = rowsFromStats(content["scale"]);
  if (scaleRows.length >= 2) {
    modules.push({
      id: rid(),
      kind: "table",
      variantId: "table-scale-rail",
      eyebrow: "Scale",
      title: "The reach behind the program",
      rows: scaleRows.slice(0, 4),
    });
  }

  // Closing lockup — named expert, MSA contacts panel, or CTA band.
  const expert = asRec(content["expert"]);
  const contacts = asRec(content["contacts"]);
  const cta = asRec(content["cta"]);
  if (expert && asStr(expert["name"])) {
    const section: PrintSection = {
      id: rid(),
      kind: "contact",
      variantId: "contact-expert-card",
      eyebrow: "Speak to our expert",
      name: asStr(expert["name"])!,
    };
    const role = asStr(expert["role"]);
    const email = asStr(expert["email"]);
    if (role) section.role = role;
    if (email) section.email = email;
    modules.push(section);
  } else if (contacts) {
    const section: PrintSection = {
      id: rid(),
      kind: "contact",
      variantId: "contact-global-panel",
      eyebrow: asStr(contacts["title"]) ?? "Global contacts",
      title: asStr(contacts["name"]) ?? "Talk to your account team",
    };
    const role = asStr(contacts["role"]);
    const email = asStr(contacts["email"]) ?? asStr(contacts["ctaEmail"]);
    const phone = asStr(contacts["phone"]);
    const url = asStr(content["footerUrl"]);
    if (role) section.role = role;
    if (email) section.email = email;
    if (phone) section.phone = phone;
    if (url) section.url = url;
    modules.push(section);
  } else if (cta && asStr(cta["label"])) {
    const section: PrintSection = {
      id: rid(),
      kind: "contact",
      variantId: "contact-cta-band",
      eyebrow: "Next step",
      title: asStr(cta["label"])!,
    };
    const body = asStr(cta["subhead"]);
    const ctaLabel = asStr(cta["buttonLabel"]);
    const url = asStr(cta["url"]);
    if (body) section.body = body;
    if (ctaLabel) section.ctaLabel = ctaLabel;
    if (url) section.url = url;
    modules.push(section);
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
