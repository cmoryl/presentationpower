/** Browser-safe identity, provenance and impact rules shared by every catalogue surface. */
export type ModuleClass = "system" | "team" | "print" | "adaptation" | "template";
export type ModuleLifecycle = "shipped" | "draft" | "in-review" | "approved" | "changes-requested" | "retired";
export type UsageKind = "decks" | "print" | "templates" | "social" | "events";
export interface ModuleUsage { decks: number; print: number; templates: number; social: number; events: number }
export interface ModuleReference { id: string; title: string; kind: UsageKind; href: string | null }
export type CatalogueValue = string | number | boolean | null | CatalogueValue[] | { [key: string]: CatalogueValue };
export type CatalogueRow = Record<string, CatalogueValue>;
export interface ModuleCatalogueData {
  variants: CatalogueRow[]; families: CatalogueRow[]; custom: CatalogueRow[]; overrides: CatalogueRow[];
  templates: CatalogueRow[]; history: CatalogueRow[]; references: Record<string, ModuleReference[]>;
  people: Record<string, string>; errors: string[]; complete: boolean; checkedAt: string;
}
export interface ModuleManifest {
  key: string; id: string; label: string; description: string; classification: ModuleClass;
  family: string; surfaces: string[]; lifecycle: ModuleLifecycle; owner: string;
  ownerId: string | null; source: string; brandSupport: string[]; editableFields: string[];
  lockedFields: string[]; capacity: unknown; allowedContexts: string[]; exports: string[];
  dependencies: string[]; renderer: string; reviewRule: string; modifiedAt: string | null;
  modifiedBy: string | null; version: number | null; historyTable: string | null;
  historyKey: string | null; usage: ModuleUsage; references: ModuleReference[];
  usageComplete: boolean; warnings: string[]; tags: string[]; preview: string | null;
}
export const MODULE_CLASSES: Record<ModuleClass, string> = {
  system: "System presentation variant", team: "Team presentation module", print: "Print section",
  adaptation: "Cross-format adaptation", template: "Page template",
};
export const EMPTY_USAGE: ModuleUsage = { decks: 0, print: 0, templates: 0, social: 0, events: 0 };
export function usageTotal(usage: ModuleUsage): number { return Object.values(usage).reduce((n, v) => n + v, 0); }
export function moduleLifecycle(status: string, review?: string): ModuleLifecycle {
  if (status === "archived" || status === "hidden") return "retired";
  if (review === "pending") return "in-review";
  if (review === "changes_requested") return "changes-requested";
  if (status === "published" && review === "approved") return "approved";
  return "draft";
}
/** Only explicit reference fields count; prose and similar-looking names never do. */
export function moduleReferenceIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  const fields = new Set(["moduleId", "module_id", "variantId", "variant_id", "base_variant_id", "__customModuleId", "source_module_ids", "sourceModuleIds", "sourceModuleId", "pageTemplateId", "sourcePageTemplateId", "templateId"]);
  function walk(v: unknown, field = "") {
    if (typeof v === "string") { if (fields.has(field)) ids.add(v); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x, field); return; }
    if (!v || typeof v !== "object") return;
    const obj = v as Record<string, unknown>;
    if (typeof obj.kind === "string" && typeof obj.variantId === "string") ids.add(`section:${obj.kind}:${obj.variantId}`);
    for (const [k, x] of Object.entries(obj)) walk(x, k);
  }
  walk(value);
  return ids;
}
export function usageFromReferences(refs: ModuleReference[]): ModuleUsage {
  const result = { ...EMPTY_USAGE }; const seen = new Set<string>();
  for (const ref of refs) { const key = `${ref.kind}:${ref.id}`; if (seen.has(key)) continue; seen.add(key); result[ref.kind]++; }
  return result;
}
export function retirementIssue(usage: ModuleUsage, complete: boolean, acknowledged: boolean): string | null {
  if (!complete) return "Usage could not be fully checked. Refresh before retiring this module.";
  if (usageTotal(usage) > 0 && !acknowledged) return "This module is referenced by saved work. Review its impact in Master modules before retiring it.";
  return null;
}
export function restorePolicy(source: string): string {
  if (source === "custom_modules") return "Restores as a draft; a new review is required.";
  if (source === "print_page_templates") return "Restores as a private template; publishing remains an admin decision.";
  return "Restores metadata and master content, not visibility or code-owned renderers.";
}
export function manifestMatches(m: ModuleManifest, query: string): boolean {
  return `${m.id} ${m.label} ${m.description} ${m.family} ${m.tags.join(" ")} ${m.owner}`.toLowerCase().includes(query.trim().toLowerCase());
}