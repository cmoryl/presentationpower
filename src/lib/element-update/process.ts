import { SOURCE_MODULES, sourceExportIssues, records, record, string, type SourceLayout, type SourceModule, type SourceField, type ModuleData } from "./registry";

export interface BuildCheck { key: string; message: string }
/** Draft checks do not grant approval or production clearance. */
export function sourceBuildChecks(layout: SourceLayout): BuildCheck[] {
  const checks = sourceExportIssues(layout).map((message, index) => ({ key: `source-${index}`, message }));
  if (!layout.modules.some(m => m.type !== "pagebreak")) checks.push({ key: "empty", message: "Add a module before preparing a proof." });
  function inspectFields(fields: SourceField[], data: ModuleData, prefix: string, name: string) {
    for (const field of fields) {
      if (!field.k || field.opt || field.t === "head" || field.t === "image") continue;
      if (field.t === "list") {
        const items = records(data[field.k]);
        if (items.length < (field.min ?? 0)) checks.push({ key: `${prefix}-${field.k}`, message: `${name}: complete ${field.l.toLowerCase()}.` });
        items.forEach((item,i) => inspectFields(field.f ?? [], item, `${prefix}-${field.k}-${i}`, name));
      } else if (["title", "quote", "value"].includes(field.k) && !string(data[field.k]).trim()) checks.push({ key: `${prefix}-${field.k}`, message: `${name}: add ${field.l.toLowerCase()}.` });
    }
  }
  function inspectModule(module: SourceModule, prefix: string) {
    inspectFields(SOURCE_MODULES[module.type]?.fields ?? [], module.data, prefix, SOURCE_MODULES[module.type]?.name ?? module.type);
    if (module.type === "row") records(module.data.slots).forEach((slot,i) => { if (slot.type) inspectModule({ type: string(slot.type), data: record(slot.data) }, `${prefix}-slot-${i}`); });
  }
  layout.modules.forEach((module,i) => inspectModule(module, String(i)));
  return checks;
}
export function sourceMaterialChannel(format: string | undefined): "print" | "social" | "slides" {
  if (format === "slide") return "slides";
  if (!format || ["letter", "a4"].includes(format)) return "print";
  return "social";
}