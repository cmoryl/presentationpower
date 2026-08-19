// Real-collateral examples for the print section module library.
//
// The module library used to preview each module with synthetic demo copy from
// `module.make()`. That made every card look generic and never showed what the
// module actually looks like once an uploaded print piece is normalized. This
// module indexes every curated library item, derives its editable sections, and
// exposes the real examples per variant id.
import { PRINT_LIBRARY_ITEMS, printTypeMeta, type PrintLibraryItem } from "./catalog";
import { deriveModulesFromContent } from "./editable";
import type { PrintSection } from "@/lib/print-assets.types";

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
