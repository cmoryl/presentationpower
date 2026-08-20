// Client-side application of master-admin module overrides.
//
// Overrides are stored per scope + module id (see module-overrides.functions.ts)
// and merged over the code registries at read time, so nothing in the catalogs
// has to be renumbered and every edit is reversible ("Reset to default").

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listModuleOverrides } from "@/lib/module-overrides.functions";
import type { PrintAssetKind, PrintSection } from "@/lib/print-assets.types";
import type { PrintModuleDensity, PrintSectionModule } from "@/lib/print-library/section-modules";
import type { PrintLibraryItem } from "@/lib/print-library/catalog";
import { parseLook } from "@/lib/print-library/look";
import type { ModuleVariant } from "@/lib/taxonomy";

export type ModuleOverrideScope = "print" | "deck" | "library";

export type ModuleOverrideRow = {
  id: string;
  scope: string;
  module_id: string;
  label: string | null;
  description: string | null;
  tags: string[] | null;
  density: string | null;
  best_for: string[] | null;
  hidden: boolean;
  content: unknown;
  notes: string | null;
  updated_at: string;
  /** Library scope only — master metadata + look & feel patches. */
  blurb?: string | null;
  collection?: string | null;
  hero_url?: string | null;
  look?: unknown;
};

export type ModuleOverrideMap = Map<string, ModuleOverrideRow>;

export function indexOverrides(
  rows: ModuleOverrideRow[],
  scope: ModuleOverrideScope,
): ModuleOverrideMap {
  const map: ModuleOverrideMap = new Map();
  for (const r of rows) if (r.scope === scope) map.set(r.module_id, r);
  return map;
}

const DENSITIES: PrintModuleDensity[] = ["compact", "standard", "tall"];

/** Merge one override over a print section module. */
export function applyPrintOverride(
  mod: PrintSectionModule,
  ov?: ModuleOverrideRow,
): PrintSectionModule {
  if (!ov) return mod;
  const density = DENSITIES.includes(ov.density as PrintModuleDensity)
    ? (ov.density as PrintModuleDensity)
    : mod.density;
  const content = ov.content as PrintSection | null;
  return {
    ...mod,
    label: ov.label?.trim() || mod.label,
    description: ov.description?.trim() || mod.description,
    tags: ov.tags && ov.tags.length ? ov.tags : mod.tags,
    density,
    bestFor: ov.best_for && ov.best_for.length ? (ov.best_for as PrintAssetKind[]) : mod.bestFor,
    make: content ? () => structuredClone(content) : mod.make,
  };
}

/** Apply overrides across a print module list, dropping hidden entries. */
export function applyPrintOverrides(
  modules: PrintSectionModule[],
  overrides: ModuleOverrideMap,
  opts: { includeHidden?: boolean } = {},
): PrintSectionModule[] {
  return modules
    .filter((m) => opts.includeHidden || !overrides.get(m.id)?.hidden)
    .map((m) => applyPrintOverride(m, overrides.get(m.id)));
}

/**
 * Merge one library-scope override over a curated / template print item.
 * Any field the admin left blank falls through to the shipped definition.
 */
export function applyLibraryOverride(
  item: PrintLibraryItem,
  ov?: ModuleOverrideRow,
): PrintLibraryItem {
  if (!ov) return item;
  const next: PrintLibraryItem = { ...item };
  if (ov.label?.trim()) next.title = ov.label.trim();
  if (ov.blurb?.trim()) next.blurb = ov.blurb.trim();
  if (ov.description?.trim() && !ov.blurb?.trim()) next.blurb = ov.description.trim();
  if (ov.tags && ov.tags.length) next.tags = ov.tags;
  if (ov.collection?.trim()) next.collection = ov.collection.trim();
  if (ov.hero_url?.trim()) next.heroUrl = ov.hero_url.trim();
  const look = parseLook(ov.look);
  if (look) next.look = look;
  if (ov.content && typeof ov.content === "object" && !Array.isArray(ov.content))
    next.content = ov.content as Record<string, unknown>;
  return next;
}

/** Apply library overrides across an item list, dropping hidden entries. */
export function applyLibraryOverrides(
  items: PrintLibraryItem[],
  overrides: ModuleOverrideMap,
  opts: { includeHidden?: boolean } = {},
): PrintLibraryItem[] {
  return items
    .filter((i) => opts.includeHidden || !overrides.get(i.id)?.hidden)
    .map((i) => applyLibraryOverride(i, overrides.get(i.id)));
}

/** Merge one override over a presentation module variant. */
export function applyDeckOverride(v: ModuleVariant, ov?: ModuleOverrideRow): ModuleVariant {
  if (!ov) return v;
  return {
    ...v,
    name: ov.label?.trim() || v.name,
    description: ov.description?.trim() || v.description,
  };
}

export function applyDeckOverrides(
  variants: ModuleVariant[],
  overrides: ModuleOverrideMap,
  opts: { includeHidden?: boolean } = {},
): ModuleVariant[] {
  return variants
    .filter((v) => opts.includeHidden || !overrides.get(v.id)?.hidden)
    .map((v) => applyDeckOverride(v, overrides.get(v.id)));
}

/** Fetch every override once and index it for a scope. */
export function useModuleOverrides(scope: ModuleOverrideScope) {
  const fetchAll = useServerFn(listModuleOverrides);
  const q = useQuery({
    queryKey: ["module-overrides"],
    queryFn: async () => (await fetchAll()) as unknown as ModuleOverrideRow[],
    staleTime: 30_000,
  });
  const rows = q.data ?? [];
  return {
    rows,
    overrides: indexOverrides(rows, scope),
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}
