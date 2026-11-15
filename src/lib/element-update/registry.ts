import { MODULES, SUBS, FORMATS, ROW_LAYOUTS } from "./engine.generated.js";
import { resolveSourceImage } from "./image-resolver";
import { importedSections } from "./catalog";

export type ModuleData = Record<string, unknown>;
export interface SourceModule { id?: string; type: string; data: ModuleData }
export interface SourceLayout { modules: SourceModule[]; format?: string; [key: string]: unknown }
export interface SourceField { k?: string; l: string; t?: string; o?: Array<[string, string]>; f?: SourceField[]; min?: number; max?: number; step?: number; unit?: string; opt?: boolean; when?: (data: ModuleData) => boolean }
export interface SourceDefinition { name: string; group: string; desc: string; fields: SourceField[]; def?: ModuleData; vk?: string; vk2?: string }
export const SOURCE_MODULES: Record<string, SourceDefinition> = Object.fromEntries(Object.entries(MODULES).map(([key, definition]) => [key, { ...definition, def: definition.def() }]));
export const SOURCE_SUBMODULES: Record<string, SourceDefinition> = Object.fromEntries(Object.entries(SUBS).map(([key, definition]) => [key, { ...definition, def: definition.def() }]));
export const SOURCE_FORMATS = FORMATS;
export function sourceFieldVisible(field: SourceField, data: ModuleData): boolean { return !field.when || field.when(data); }
export function sourceRowColumns(layout: unknown): string[] { return ROW_LAYOUTS[string(layout)] ?? ROW_LAYOUTS["3"]; }
export const record = (value: unknown): ModuleData => value && typeof value === "object" && !Array.isArray(value) ? value as ModuleData : {};
export const string = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : "";
export const records = (value: unknown): ModuleData[] => Array.isArray(value) ? value.map(record) : [];

// These need dedicated measured geometry; never disguise them as narrative rows.
export const UNPORTED_MODULES = new Set<string>();
export function workingLayout(content: unknown): SourceLayout | undefined {
  const c = record(content); const layout = record(c.elementLayout ?? c.sourceLayout);
  if (!Array.isArray(layout.modules)) return undefined;
  return { ...layout, modules: layout.modules.map((v, index) => { const m = record(v); return { ...m, id: string(m.id) || `source-${index}`, type: string(m.type), data: record(m.data) }; }) };
}
/** Keep source snapshots intact; the existing content adapter continues feeding cascades. */
export function sourceLayoutPatch(content: ModuleData, layout: SourceLayout): ModuleData {
  const mapped = importedSections("working", layout.modules);
  const hero = layout.modules.find(m => m.type === "hero" || m.type === "cover")?.data;
  const footer = layout.modules.find(m => m.type === "footer")?.data;
  const cta = layout.modules.find(m => m.type === "cta")?.data;
  return { ...content, elementLayout: structuredClone(layout), modules: mapped.sections, importReview: "pending",
    ...(hero ? { title: string(hero.title), tagline: string(hero.lead ?? hero.sub), summary: string(hero.lead ?? hero.sub), ...(sourceImage(hero.photo) ? { heroMedia: { ...record(content.heroMedia), imageUrl: sourceImage(hero.photo), focalX: record(hero.photo).fx ?? 50, focalY: record(hero.photo).fy ?? 50 } } : { heroMedia: undefined }) } : {}),
    ...(footer ? { footer: { links: [string(footer.url), string(footer.email)].filter(Boolean) } } : {}),
    ...(cta ? { cta: { ...record(content.cta), label: string(cta.title), subhead: string(cta.sub), buttonLabel: string(cta.button) } } : {}),
  };
}
export function sourceImage(value: unknown): string | undefined {
  return resolveSourceImage(value);
}
/** New blocks retain configuration but never copy example claims or people. */
export function blankSourceModule(type: string, configuration?: ModuleData, submodule = false): SourceModule {
  const definition = (submodule ? SOURCE_SUBMODULES : SOURCE_MODULES)[type];
  const defaults = structuredClone({ ...definition?.def, ...configuration });
  function clean(fields: SourceField[], values: ModuleData): ModuleData {
    const out: ModuleData = {};
    for (const field of fields) {
      if (!field.k) continue;
      const v = values[field.k];
      if (field.t === "select" || field.t === "range") out[field.k] = v ?? (field.t === "range" ? field.min ?? 0 : field.o?.[0]?.[0] ?? "");
      else if (field.t === "list") out[field.k] = Array.from({ length: field.min ?? 1 }, () => clean(field.f ?? [], {}));
      else if (field.t === "image") out[field.k] = null;
      else out[field.k] = "";
    }
    if (type === "row") out.slots = Array.from({ length: sourceRowColumns(out.layout).length }, () => null);
    return out;
  }
  return { id: crypto.randomUUID(), type, data: clean(definition?.fields ?? [], defaults) };
}
export function splitSourcePages(layout: SourceLayout): SourceModule[][] {
  const pages: SourceModule[][] = [[]];
  for (const module of layout.modules) {
    if (module.type === "pagebreak") { pages.push([]); continue; }
    pages[pages.length - 1]?.push(module);
  }
  return pages.filter(page => page.length > 0);
}
export function sourceExportIssues(layout: SourceLayout): string[] {
  const issues = new Set<string>();
  function inspect(modules: SourceModule[], submodules = false) {
    for (const module of modules) {
      const definitions = submodules ? SOURCE_SUBMODULES : SOURCE_MODULES;
      if (!definitions[module.type] || UNPORTED_MODULES.has(module.type)) issues.add(`${definitions[module.type]?.name ?? module.type}: layout not yet ported`);
      function imageCheck(value: unknown) {
        if (Array.isArray(value)) { value.forEach(imageCheck); return; }
        if (!value || typeof value !== "object") return;
        const data = record(value);
        if ((data.elib || data.id || data.lib) && !sourceImage(data)) issues.add(`Missing artwork: ${string(data.elib ?? data.id ?? data.lib)}`);
        Object.values(data).forEach(imageCheck);
      }
      imageCheck(module.data);
      if (module.type === "row") inspect(records(module.data.slots).filter(slot => slot.kind || slot.type).map(slot => ({ type: string(slot.kind ?? slot.type), data: record(slot.data) })), true);
    }
  }
  inspect(layout.modules);
  return [...issues];
}