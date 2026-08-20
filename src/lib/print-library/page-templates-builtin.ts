// BUILT-IN PAGE TEMPLATES
// ---------------------------------------------------------------------------
// Every curated print piece (case study, client spotlight, e-brochure, MSA
// partnership layout, blank starting point) is itself a fully editable page
// template. Previously the Page templates shelf only listed rows a user had
// captured with "Save as page template", so the originals were invisible.
// Here we derive read-only built-in templates straight from the catalog using
// the same normalizer the editable copies use, so the shelf shows the real
// section stacks and hero shells from day one.

import {
  PRINT_LIBRARY_ITEMS,
  printTypeMeta,
  type PrintLibraryItem,
} from "@/lib/print-library/catalog";
import { editableContextFor, toEditableContent } from "@/lib/print-library/editable";
import type { PrintSection } from "@/lib/print-assets.types";
import type { PrintPageTemplate, PrintPageTemplateLayout } from "@/lib/print-page-templates";

const EPOCH = "1970-01-01T00:00:00.000Z";

function shellOf(content: Record<string, unknown>): Record<string, unknown> {
  const shell: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (k === "modules" || v === undefined) continue;
    shell[k] = v;
  }
  return shell;
}

function templateFor(item: PrintLibraryItem): PrintPageTemplate | null {
  const content = toEditableContent(item);
  if (!content) return null;
  const sections = Array.isArray(content["modules"]) ? (content["modules"] as PrintSection[]) : [];
  if (sections.length === 0) return null;

  const ctx = editableContextFor(item);
  const layout: PrintPageTemplateLayout = {
    contentShell: shellOf(content),
    ...(item.divisionId ? {} : {}),
  };

  let typeLabel = item.kind as string;
  try {
    typeLabel = printTypeMeta(item.kind)?.label ?? typeLabel;
  } catch {
    /* keep raw kind */
  }

  const tags = [
    typeLabel,
    ...(item.collection ? [item.collection] : []),
    ...(item.tags ?? []).slice(0, 3),
  ];

  return {
    id: `builtin:${item.id}`,
    owner_id: "builtin",
    scope: "shared",
    builtin: true,
    title: item.title,
    description: item.blurb,
    kind: item.kind,
    division_id: item.divisionId,
    tags,
    sections,
    layout,
    thumbnail_url: item.heroUrl ?? null,
    source_asset_id: null,
    source_library_item_id: (ctx["libraryItemId"] as string | undefined) ?? item.id,
    hidden: false,
    created_at: EPOCH,
    updated_at: EPOCH,
  };
}

let cache: PrintPageTemplate[] | null = null;

/** Curated originals, ready to spin into a new editable print asset. */
export function builtinPageTemplates(): PrintPageTemplate[] {
  if (cache) return cache;
  cache = PRINT_LIBRARY_ITEMS.map(templateFor)
    .filter((t): t is PrintPageTemplate => Boolean(t))
    .sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}
