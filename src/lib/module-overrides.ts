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
import type { ModuleVariant } from "@/lib/taxonomy";

export type ModuleOverrideScope = "print" | "deck";

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
