import { MODULES, SUBS, ROW_LAYOUTS, REFLOW, derive, surfaceClass, iconStyleClass } from "./engine.generated.js";
import { record, string, type ModuleData, type SourceField, type SourceModule } from "./registry";
import { resolveSourceImage } from "./image-resolver";

/** Sanitize a render copy only. Never repair the saved source by inserting sample copy. */
export function sourceRenderData(fields: SourceField[], value: ModuleData, defaults: ModuleData): ModuleData {
  const out: ModuleData = { ...value };
  for (const field of fields) {
    if (!field.k) continue;
    const k = field.k, v = value[k], fallback = defaults[k];
    if (field.t === "select") out[k] = field.o?.some(option => option[0] === string(v)) ? string(v) : fallback ?? field.o?.[0]?.[0] ?? "";
    else if (field.t === "range") { const n = Number(v); out[k] = Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, Number.isFinite(n) ? n : Number(fallback ?? field.min ?? 0))); }
    else if (field.t === "list") out[k] = (Array.isArray(v) ? v : []).slice(0, field.max ?? 24).map(item => sourceRenderData(field.f ?? [], record(item), {}));
    else if (field.t === "image") out[k] = resolveSourceImage(v) ? { ...record(v) } : null;
    else if (field.t === "icon") out[k] = /^[a-z0-9-]{1,64}$/.test(string(v)) ? string(v) : "circle";
    else out[k] = string(v);
  }
  out.logoTone = "color";
  // A white plate over an image is not an approved source look.
  if (out.panel === "card") out.panel = "none";
  return out;
}

export function renderSourceModule(module: SourceModule, afterHero = false): string {
  const definition = MODULES[module.type];
  if (!definition) throw new Error(`Unknown source module: ${module.type}`);
  if (module.type === "pagebreak") return "";
  const data = sourceRenderData(definition.fields, structuredClone(module.data), definition.def());
  if (module.type === "row") {
    const cols = ROW_LAYOUTS[string(data.layout)] ?? ROW_LAYOUTS["3"];
    const slots = Array.isArray(module.data.slots) ? module.data.slots : [];
    // Source uses kind; legacy adaptations used type. Preserve those saved full-module slots too.
    const cells = cols.map((_, i) => {
      const slot = record(slots[i]), kind = string(slot.kind ?? slot.type), sub = SUBS[kind];
      if (!kind) return '<div class="slot"><div class="source-empty-slot">Empty slot</div></div>';
      const body = sub ? sub.render(sourceRenderData(sub.fields, record(slot.data), sub.def())) : renderSourceModule({ type: kind, data: record(slot.data) });
      return `<div class="slot" data-slot="${i}">${body}</div>`;
    });
    return `<section class="sec"><div class="flexrow" style="grid-template-columns:${cols.join(" ")};align-items:${data.align === "start" ? "start" : "stretch"}">${cells.join("")}</div></section>`;
  }
  return definition.render(data, { afterHero, selSlot: null });
}

export function renderSourcePage(modules: SourceModule[], format: { id: string; w: number; h: number; print?: boolean }): string {
  if (!format.print) {
    const fn = REFLOW[format.id];
    if (!fn) throw new Error(`Size not ported: ${format.id}`);
    const safe = modules.filter(m => m.type !== "pagebreak").map(m => ({ ...m, data: sourceRenderData(MODULES[m.type]?.fields ?? [], structuredClone(m.data), MODULES[m.type]?.def() ?? {}) }));
    safe.forEach(m => { if (m.type === "row") m.data.slots = (Array.isArray(m.data.slots) ? m.data.slots : []).filter(Boolean).map(s => ({ ...record(s), kind: record(s).kind ?? record(s).type })); });
    const content = derive(safe);
    if (!safe.some(m => m.type === "cta")) content.cta = { title: "", sub: "", button: "" };
    return fn(content, format);
  }
  return `<div class="gl page spx spx-rich" style="width:${format.w}px;min-height:${format.h}px">${modules.map((module, index) => `<div class="mod${surfaceClass(module.data)}${iconStyleClass(module.data)}" data-source-index="${index}" style="${module.type === "footer" ? "margin-top:auto;" : ""}">${renderSourceModule(module, modules[index - 1]?.type === "hero" && modules[index - 1]?.data.overlap !== "none")}</div>`).join("")}</div>`;
}