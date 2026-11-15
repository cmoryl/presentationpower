import sourceModules from "./modules.json";
import options from "./module-options.json";
import artwork from "./artwork.json";
import { importedSections } from "./catalog";

export type ModuleData = Record<string, unknown>;
export interface SourceModule { id?: string; type: string; data: ModuleData }
export interface SourceLayout { modules: SourceModule[]; format?: string; [key: string]: unknown }
export interface SourceField { k?: string; l: string; t?: string; o?: Array<[string, string]>; f?: SourceField[]; min?: number; max?: number; step?: number; unit?: string; opt?: boolean }
export interface SourceDefinition { name: string; group: string; desc: string; fields: SourceField[]; def?: ModuleData; vk?: string }
export const SOURCE_MODULES = sourceModules as unknown as Record<string, SourceDefinition>;
export const SOURCE_FORMATS = options.formats;
export const record = (value: unknown): ModuleData => value && typeof value === "object" && !Array.isArray(value) ? value as ModuleData : {};
export const string = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : "";
export const records = (value: unknown): ModuleData[] => Array.isArray(value) ? value.map(record) : [];

// These need dedicated measured geometry; never disguise them as narrative rows.
export const UNPORTED_MODULES = new Set(["footprint", "seriesChart", "heatmap", "funnel", "bullet", "typeDesign"]);
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
  const image = record(value); const key = string(image.elib);
  const supplied = (artwork as Record<string, string>)[key];
  if (supplied) return supplied;
  const url = string(image.url ?? image.src ?? value);
  return /^(https:\/\/|\/__l5e\/assets-v1\/)/.test(url) ? url : undefined;
}
/** New blocks retain configuration but never copy example claims or people. */
export function blankSourceModule(type: string, configuration?: ModuleData): SourceModule {
  const definition = SOURCE_MODULES[type];
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
    if (type === "row") out.slots = [null, null, null];
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
  function inspect(modules: SourceModule[]) {
    for (const module of modules) {
      if (!SOURCE_MODULES[module.type] || UNPORTED_MODULES.has(module.type)) issues.add(`${SOURCE_MODULES[module.type]?.name ?? module.type}: layout not yet ported`);
      if (module.type === "dataChart" && module.data.kind !== "bar") issues.add(`${string(module.data.kind)} chart geometry not yet ported`);
      function imageCheck(value: unknown) {
        if (Array.isArray(value)) { value.forEach(imageCheck); return; }
        if (!value || typeof value !== "object") return;
        const data = record(value);
        if (data.elib && !sourceImage(data)) issues.add(`Missing artwork: ${string(data.elib)}`);
        Object.values(data).forEach(imageCheck);
      }
      imageCheck(module.data);
      if (module.type === "row") inspect(records(module.data.slots).filter(slot => slot.type).map(slot => ({ type: string(slot.type), data: record(slot.data) })));
    }
  }
  inspect(layout.modules);
  return [...issues];
}