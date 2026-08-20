// Real-collateral examples for the print section module library.
//
// The module library used to preview each module with synthetic demo copy from
// `module.make()`. That made every card look generic and never showed what the
// module actually looks like once an uploaded print piece is normalized. This
// module indexes every curated library item, derives its editable sections, and
// exposes the real examples per variant id.
import { PRINT_LIBRARY_ITEMS, printTypeMeta, type PrintLibraryItem } from "./catalog";
import { deriveModulesFromContent } from "./editable";
import type {
  PrintHeroModuleVariant,
  PrintHeroSection,
  PrintSection,
} from "@/lib/print-assets.types";

export type PrintModuleExample = {
  section: PrintSection;
  itemId: string;
  itemTitle: string;
  itemKindLabel: string;
  divisionId?: string;
  collection?: string;
};

type Rec = Record<string, unknown>;

function sectionsForItem(item: PrintLibraryItem): PrintSection[] {
  if (!item.content) return [];
  const content = item.content as Rec;
  const shipped = Array.isArray(content["modules"]) ? (content["modules"] as PrintSection[]) : [];
  if (shipped.length) return shipped;
  try {
    return deriveModulesFromContent(structuredClone(content) as Rec);
  } catch {
    return [];
  }
}

/**
 * Hero modules aren't stored in `content.modules[]` — every curated piece keeps
 * its opener in the layout masthead. Reconstruct a real hero section per item
 * from that masthead (eyebrow, client/product kicker, title, summary, hero
 * photography, industry/region meta, headline stats) so the hero family previews
 * with genuine collateral too.
 */
function heroSectionForItem(
  item: PrintLibraryItem,
  variantId: PrintHeroModuleVariant,
): PrintHeroSection | null {
  const c = (item.content ?? {}) as Rec;
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : undefined);
  const title = str("title") ?? str("productName") ?? item.title;
  if (!title) return null;
  const needsPhoto = variantId === "hero-photo-band" || variantId === "hero-split-photo";
  if (needsPhoto && !item.heroUrl) return null;
  const stats = (item.stats ?? []).slice(0, 3).map((st) => ({
    label: st.label,
    value: st.value,
    ...(st.unit ? { unit: st.unit } : {}),
  }));
  if (variantId === "hero-stat-lockup" && stats.length < 2) return null;
  const meta = [
    ...(str("industry") ? [{ label: "Industry", value: str("industry")! }] : []),
    ...(str("audience") ? [{ label: "Audience", value: str("audience")! }] : []),
    ...(item.collection ? [{ label: "Collection", value: item.collection }] : []),
  ].slice(0, 3);
  return {
    id: `hero-example-${item.id}-${variantId}`,
    kind: "hero",
    variantId,
    ...(str("eyebrow") ? { eyebrow: str("eyebrow")! } : { eyebrow: printTypeMeta(item.kind).label }),
    ...(str("client") ? { kicker: str("client")! } : {}),
    title,
    ...(str("summary") ?? item.blurb ? { summary: str("summary") ?? item.blurb } : {}),
    ...(item.heroUrl ? { imageUrl: item.heroUrl } : {}),
    ...(item.focal ? { focalX: item.focal.x, focalY: item.focal.y } : {}),
    ...(meta.length ? { meta } : {}),
    ...(variantId === "hero-stat-lockup" ? { stats } : {}),
  };
}

const HERO_VARIANT_IDS: PrintHeroModuleVariant[] = [
  "hero-photo-band",
  "hero-split-photo",
  "hero-type-stack",
  "hero-accent-band",
  "hero-stat-lockup",
  "hero-client-lockup",
];

let cache: Map<string, PrintModuleExample[]> | null = null;

/** variantId → real examples pulled from curated/uploaded print collateral. */
export function printModuleExampleIndex(): Map<string, PrintModuleExample[]> {
  if (cache) return cache;
  const index = new Map<string, PrintModuleExample[]>();
  for (const item of PRINT_LIBRARY_ITEMS) {
    for (const section of sectionsForItem(item)) {
      const variantId = section.variantId;
      if (!variantId) continue;
      const list = index.get(variantId) ?? [];
      // Keep a handful per variant — enough to cycle through in the UI.
      if (list.length >= 6) continue;
      list.push({
        section,
        itemId: item.id,
        itemTitle: item.title,
        itemKindLabel: printTypeMeta(item.kind).label,
        ...(item.divisionId ? { divisionId: item.divisionId } : {}),
        ...(item.collection ? { collection: item.collection } : {}),
      });
      index.set(variantId, list);
    }
  }
  for (const variantId of HERO_VARIANT_IDS) {
    const list = index.get(variantId) ?? [];
    for (const item of PRINT_LIBRARY_ITEMS) {
      if (list.length >= 6) break;
      if (item.source !== "curated") continue;
      const section = heroSectionForItem(item, variantId);
      if (!section) continue;
      list.push({
        section,
        itemId: item.id,
        itemTitle: item.title,
        itemKindLabel: printTypeMeta(item.kind).label,
        ...(item.divisionId ? { divisionId: item.divisionId } : {}),
        ...(item.collection ? { collection: item.collection } : {}),
      });
    }
    if (list.length) index.set(variantId, list);
  }
  cache = index;
  return index;
}

export function examplesForVariant(variantId: string): PrintModuleExample[] {
  return printModuleExampleIndex().get(variantId) ?? [];
}

/** How many module variants currently have at least one real example. */
export function printModuleExampleCoverage(): { variants: number; examples: number } {
  const index = printModuleExampleIndex();
  let examples = 0;
  for (const list of index.values()) examples += list.length;
  return { variants: index.size, examples };
}

/** Does any curated/uploaded print piece actually ship this module variant? */
export function hasRealExamples(variantId: string): boolean {
  return (printModuleExampleIndex().get(variantId) ?? []).length > 0;
}
