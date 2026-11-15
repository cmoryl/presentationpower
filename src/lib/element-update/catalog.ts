import templates from "./templates.json";
import artwork from "./artwork.json";
import type { PrintLibraryItem } from "@/lib/print-library/catalog";
import type { PrintSection, PrintAssetKind } from "@/lib/print-assets.types";

type Bag = Record<string, unknown>;
const bag = (v: unknown): Bag => v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {};
const text = (v: unknown): string => typeof v === "string" ? v : "";
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const imageMap: Record<string, string> = artwork;
const kindMap: Record<string, PrintAssetKind> = { "deck-case-study": "case-study", "case-study": "case-study", spotlight: "spotlight", ebrochure: "ebrochure", "one-pager": "spotlight", "solution-sheet": "adaptor-brief", "adaptor-brief": "adaptor-brief", "solution-proposal": "solution-proposal", "solution-proposal-multipage": "solution-proposal", "msa-partnership": "msa-partnership" };

/** Convert only supported structures; retain the full source layout separately. */
export function importedSections(sourceId: string, modules: unknown[]): { sections: PrintSection[]; unsupported: string[] } {
  const sections: PrintSection[] = [];
  const unsupported = new Set<string>();
  modules.forEach((raw, index) => {
    const module = bag(raw); const data = bag(module.data); const type = text(module.type);
    const id = `claude-${sourceId}-${index}`;
    const heading = text(data.title); const eyebrow = text(data.eyebrow);
    const items = list(data.items).map(bag);
    if (["stats", "kpis", "quoteStats", "numbersGrid"].includes(type)) {
      const stats = items.map(item => ({ label: text(item.label) || text(item.caption), value: text(item.value), icon: text(item.icon) })).filter(item => item.value && item.label);
      if (stats.length) sections.push({ id, kind: "stats", variantId: "stat-callout-row-portrait", title: heading, eyebrow, items: stats });
      if (type === "quoteStats" && text(data.quote)) sections.push({ id: `${id}-quote`, kind: "quote", variantId: "quote-inline-compact", text: text(data.quote), author: text(data.attribution) });
    } else if (["storyRows", "storyColumns", "capabilities", "features", "stages", "pillars"].includes(type)) {
      sections.push({ id, kind: "narrative", variantId: type === "storyColumns" ? "narrative-tri-card" : "narrative-discover-panel", title: heading, eyebrow, items: items.map(item => ({ heading: text(item.heading) || text(item.title) || text(item.label) || text(item.verb), body: text(item.text) || text(item.body) || text(item.points), bullets: typeof item.bullets === "string" ? item.bullets.split("\n").filter(Boolean) : list(item.bullets).map(text) })) });
    } else if (type === "quote") {
      sections.push({ id, kind: "quote", variantId: "quote-attribution-card", text: text(data.text) || text(data.quote), author: text(data.author) || text(data.attribution) });
    } else if (type === "checklist") {
      sections.push({ id, kind: "narrative", variantId: "narrative-discover-panel", title: heading, items: [{ heading: eyebrow, bullets: text(data.items).split("\n").filter(Boolean) }] });
    } else if (type === "divider") {
      sections.push({ id, kind: "narrative", variantId: "narrative-discover-panel", items: [{ heading, body: text(data.sub) }] });
    } else if (type === "cta") {
      sections.push({ id, kind: "contact", variantId: "contact-cta-band", title: heading, body: text(data.sub), ctaLabel: text(data.button) });
    } else if (!["hero", "footer", "pagebreak"].includes(type)) unsupported.add(type);
  });
  return { sections, unsupported: [...unsupported] };
}

export const ELEMENT_UPDATE_ITEMS: PrintLibraryItem[] = templates.map(raw => {
  const source = bag(raw); const sourceId = text(source.id); const layout = bag(source.sourceLayout);
  const mapped = importedSections(sourceId, list(layout.modules));
  const kind = kindMap[text(source.kind)] ?? "ebrochure";
  const hero = text(source.heroFile) || text(bag(source.recovered).hero);
  const heroUrl = imageMap[hero];
  const sourceModules = list(layout.modules).map(bag);
  const cta = bag(sourceModules.find(m => m.type === "cta")?.data);
  const footer = bag(sourceModules.find(m => m.type === "footer")?.data);
  const stats = list(source.stats).map(bag).map(s => ({ label: text(s.label), value: text(s.value), unit: text(s.unit), caption: text(s.source) }));
  const sections = list(source.sections).map(bag).map(s => ({ heading: text(s.heading), body: text(s.body), bullets: list(s.bullets).map(text) }));
  const content: Bag = {
    title: text(source.title), client: text(source.client), productName: text(source.title), tagline: text(source.subtitle),
    summary: text(source.intro) || text(source.teaser), eyebrow: text(source.eyebrow),
    challenge: { heading: "The challenge", body: text(source.challenge) }, solution: { heading: "The solution", body: text(source.solution) }, result: { heading: "The result", body: text(source.results) },
    sections, capabilities: sections, features: sections.map(s => ({ verb: s.heading, body: s.body })), knowHow: [], stats, quote: source.quote ?? { text: "", author: "" }, expert: { name: "", role: "", email: "" },
    cta: { label: text(cta.title), subhead: text(cta.sub), buttonLabel: text(cta.button), url: text(footer.url) },
    modules: mapped.sections, footer: { links: [text(footer.url), text(footer.email)].filter(Boolean) },
    importReview: "pending", sourceLayout: layout, sourceRecord: source,
    unsupportedSourceModules: mapped.unsupported, missingArtwork: source.missingArtwork,
  };
  if (heroUrl) content.heroMedia = { imageUrl: heroUrl, focalX: 50, focalY: 40 };
  return { id: `claude-update-${sourceId}`, kind, title: text(source.title), blurb: "Imported draft · source layout and artwork review pending", divisionId: text(source.brand), collection: "Claude update · drafts", source: "curated", seedSlug: sourceId, sourceFile: text(bag(source.recovered).pdf) || "TransPerfect_ELEMENT.zip", heroUrl, stats, tags: ["claude-update", "draft", "unapproved"], content };
});

export function isImportedDraft(item: PrintLibraryItem): boolean { return item.id.startsWith("claude-update-"); }