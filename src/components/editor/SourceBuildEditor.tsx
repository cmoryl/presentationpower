import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, Layers, Plus, Save, Trash2, ZoomIn, ZoomOut, Undo2, Redo2, ClipboardCheck, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { sourceBuildChecks } from "@/lib/element-update/process";
import { Button } from "@/design-system/element";
import { SOURCE_FORMATS, SOURCE_MODULES, UNPORTED_MODULES, blankSourceModule, record, records, sourceExportIssues, splitSourcePages, string, type SourceLayout, type SourceModule } from "@/lib/element-update/registry";
import { SourceModuleFields } from "./SourceModuleFields";
import { SourceModulePreview } from "./SourceModulePreview";
import "./source-build.css";

export interface SourceBuildEditorProps { layout: SourceLayout; onChange: (layout: SourceLayout) => void; onSave: () => Promise<void>; onRename?: (title: string) => void; saving: boolean; dirty: boolean; title: string; className?: string }
export const SourceBuildEditor = forwardRef<HTMLDivElement, SourceBuildEditorProps>(function SourceBuildEditor({ layout, onChange, onSave, onRename, saving, dirty, title, className = "" }, ref) {
  const [selected, setSelected] = useState(0); const [addType, setAddType] = useState("storyColumns"); const [zoom, setZoom] = useState(70); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"compose" | "checks" | "proofs">("compose");
  const [history, setHistory] = useState<{ undo: SourceLayout[]; redo: SourceLayout[] }>({ undo: [], redo: [] });
  const checks = sourceBuildChecks(layout);
  function change(next: SourceLayout) { setHistory(h => ({ undo: [...h.undo, structuredClone(layout)].slice(-50), redo: [] })); onChange(next); }
  function undo() { const previous = history.undo.at(-1); if (!previous) return; setHistory({ undo: history.undo.slice(0,-1), redo: [structuredClone(layout), ...history.redo] }); onChange(previous); }
  function redo() { const next = history.redo[0]; if (!next) return; setHistory({ undo: [...history.undo, structuredClone(layout)], redo: history.redo.slice(1) }); onChange(next); }
  const previewRef = useRef<HTMLDivElement>(null); const [availableWidth, setAvailableWidth] = useState(500);
  useEffect(() => { const el = previewRef.current; if (!el) return; const observer = new ResizeObserver(() => setAvailableWidth(Math.max(160, el.clientWidth - 32))); observer.observe(el); return () => observer.disconnect(); }, []);
  const module = layout.modules[selected]; const definition = module ? SOURCE_MODULES[module.type] : undefined;
  const format = SOURCE_FORMATS.find(f => f.id === (layout.format ?? "letter")) ?? SOURCE_FORMATS[0];
  const issues = sourceExportIssues(layout); const pages = splitSourcePages(layout);
  const effectiveZoom = format ? Math.min(zoom / 100, availableWidth / format.w) : zoom / 100;
  function replace(next: SourceModule[]) { change({ ...layout, modules: next }); }
  function patch(data: Record<string, unknown>) { replace(layout.modules.map((m, i) => i === selected ? { ...m, data } : m)); }
  function move(delta: number) { const target = selected + delta; if (target < 0 || target >= layout.modules.length) return; const next = [...layout.modules]; const item = next[selected]; if (!item) return; next.splice(selected, 1); next.splice(target, 0, item); replace(next); setSelected(target); }
  async function saveNow() { setError(null); try { await onSave(); } catch(e) { setError(e instanceof Error ? e.message : "Save failed; changes remain unsaved."); } }
  async function download(kind: "pdf" | "pptx") {
    setError(null); const nodes = Array.from(pagesRef.current?.querySelectorAll<HTMLElement>("[data-print-page]") ?? []);
    if (!format || !nodes.length || checks.length) return;
    setBusy(true);
    try {
      for (const node of nodes) {
        if (node.scrollHeight > node.clientHeight + 2) throw new Error("Content exceeds the page. Add a page break or use a larger size before downloading.");
        for (const img of Array.from(node.querySelectorAll("img"))) if (!img.complete || img.naturalWidth === 0) throw new Error("An image is unavailable. Restore or remove it before downloading.");
      }
      await onSave();
      const filename = `${title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 100)}-${format.id}-proof`;
      const custom = { widthIn: format.w / 96, heightIn: format.h / 96 };
      if (kind === "pdf") { const { exportPrintAssetAsPdf } = await import("@/lib/print-asset-export"); await exportPrintAssetAsPdf(nodes, { pageSize: "Custom", custom, format: "digital", vectorText: false, quality: "300dpi", bleedIn: 0, cropMarks: false, filename: `${filename}.pdf` }); }
      else { const { exportPrintPagesAsPptx } = await import("@/lib/print-pptx-export"); await exportPrintPagesAsPptx(nodes, { pageSize: "Custom", custom, fidelity: "flat", title, filename: `${filename}.pptx` }); }
    } catch(e) { setError(e instanceof Error ? e.message : "Download failed."); } finally { setBusy(false); }
  }
  const extraFields = module ? Object.keys(module.data).filter(key => !definition?.fields.some(f => f.k === key) && !["slots", "logoTone"].includes(key)).map(key => ({ k: key, l: key.replace(/([A-Z])/g, " $1"), t: typeof module.data[key] === "object" ? "json" : "textarea" })) : [];
  return <div ref={ref} className={`space-y-4 text-foreground ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">Material name<input aria-label="Material name" className="min-w-0 flex-1 rounded-sm border border-input bg-background px-3 py-2 text-sm" value={title} maxLength={200} onChange={e => onRename?.(e.target.value)} /></label>
      <Link to="/files" className="text-sm text-muted-foreground">My work</Link>
    </div>
    <div role="tablist" aria-label="Material build stages" className="flex flex-wrap gap-2 border-b border-border pb-3">
      <Button role="tab" aria-selected={step === "compose"} variant={step === "compose" ? "default" : "outline"} size="sm" onClick={() => setStep("compose")}><Pencil size={14} />Compose</Button>
      <Button role="tab" aria-selected={step === "checks"} variant={step === "checks" ? "default" : "outline"} size="sm" onClick={() => setStep("checks")}><ClipboardCheck size={14} />Checks{checks.length > 0 ? ` · ${checks.length}` : ""}</Button>
      <Button role="tab" aria-selected={step === "proofs"} variant={step === "proofs" ? "default" : "outline"} size="sm" onClick={() => setStep("proofs")}><Download size={14} />Proofs</Button>
      <span className="flex-1" /><Button size="icon" variant="ghost" title="Undo" aria-label="Undo" disabled={!history.undo.length} onClick={undo}><Undo2 size={16} /></Button><Button size="icon" variant="ghost" title="Redo" aria-label="Redo" disabled={!history.redo.length} onClick={redo}><Redo2 size={16} /></Button>
    </div>
    <header className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm font-medium">Size<select aria-label="Artwork size" className="max-w-64 rounded-sm border border-input bg-background p-2 text-sm" value={format?.id} onChange={e => change({ ...layout, format: e.target.value })}>{SOURCE_FORMATS.map(f => <option key={f.id} value={f.id}>{f.n} · {f.w} × {f.h}</option>)}</select></label><span className="text-xs text-muted-foreground">Review pending</span></div>
      <div className="flex flex-wrap items-center gap-2"><span role="status" className="text-xs text-muted-foreground">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span><Button size="sm" onClick={() => void saveNow()} disabled={saving || busy || !title.trim()}><Save size={15} />Save</Button><Button size="sm" variant="outline" disabled={busy || saving || checks.length > 0 || !title.trim()} onClick={() => void download("pdf")}><Download size={15} />PDF proof</Button><Button size="sm" variant="outline" disabled={busy || saving || checks.length > 0 || !title.trim()} onClick={() => void download("pptx")}><Download size={15} />PowerPoint proof</Button></div>
    </header>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {step === "checks" && <section aria-label="Material checks" className="border-y border-border py-5"><h2 className="mb-3 text-lg font-semibold">Material checks</h2>{checks.length ? <ul className="list-disc space-y-2 pl-5 text-sm">{checks.map(c => <li key={c.key}>{c.message}</li>)}</ul> : <p className="text-sm text-muted-foreground">Source checks passed. Page fit and image availability are checked again before download.</p>}<p className="mt-4 text-xs text-muted-foreground">These checks do not grant brand approval or print clearance.</p></section>}
    {step === "proofs" && <section aria-label="Proof delivery" className="border-y border-border py-5"><h2 className="mb-3 text-lg font-semibold">Proof delivery</h2><p className="text-sm text-muted-foreground">Digital PDF and flattened PowerPoint proofs. Production masters and editable native decks remain separate.</p>{checks.length > 0 && <p className="mt-3 text-sm text-destructive">Resolve {checks.length} checks before downloading.</p>}</section>}
    {issues.length > 0 && <details className="border-l-2 border-border pl-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Download blocked · {issues.length} unresolved artwork/layout checks</summary><ul className="mt-2 list-disc space-y-1 pl-5">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></details>}
    <div className="grid items-start gap-5 xl:grid-cols-[210px_minmax(0,1fr)_310px]">
      <aside className="space-y-3 xl:sticky xl:top-[calc(var(--app-header-h,0px)+12px)]"><h2 className="flex items-center gap-2 text-sm font-semibold"><Layers size={16} />Modules</h2><ol className="max-h-72 space-y-1 overflow-y-auto xl:max-h-[65vh]">{layout.modules.map((m,i) => <li key={m.id ?? i}><Button variant={i === selected ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs" onClick={() => setSelected(i)}><span className="w-5 shrink-0 font-mono text-muted-foreground">{i+1}</span>{SOURCE_MODULES[m.type]?.name ?? m.type}</Button></li>)}</ol><label className="block text-xs font-medium">Add module<select aria-label="New module" className="mt-2 w-full rounded-sm border border-input bg-background p-2 text-sm" value={addType} onChange={e => setAddType(e.target.value)}>{Object.entries(SOURCE_MODULES).map(([type,d]) => <option key={type} value={type}>{d.name}{UNPORTED_MODULES.has(type) ? " · layout pending" : ""}</option>)}</select></label><Button size="sm" variant="outline" className="w-full" onClick={() => { const next = [...layout.modules]; const at = layout.modules.length ? selected + 1 : 0; next.splice(at, 0, blankSourceModule(addType)); replace(next); setSelected(at); }}><Plus size={15} />Add module</Button></aside>
      <main className="min-w-0"><div className="mb-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">{pages.length} {pages.length === 1 ? "page" : "pages"}</span><div className="flex items-center gap-1"><Button size="icon" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(v => Math.max(20, v-10))}><ZoomOut size={16} /></Button><span className="w-10 text-center text-xs">{Math.round(effectiveZoom * 100)}%</span><Button size="icon" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(v => Math.min(100, v+10))}><ZoomIn size={16} /></Button></div></div><div ref={previewRef} className="max-w-full overflow-auto border border-border bg-muted p-4"><div ref={pagesRef} className="space-y-5" style={{ zoom: effectiveZoom }}>{format && pages.map((page, pageIndex) => <div key={pageIndex} data-print-page className="source-sheet relative overflow-hidden shadow-sm" style={{ width: format.w, height: format.h }}>
        {page.map(m => <div key={m.id} onClick={() => setSelected(layout.modules.indexOf(m))}><SourceModulePreview module={m} /></div>)}
      </div>)}</div></div></main>
      <aside className="min-w-0 border-t border-border pt-4 xl:sticky xl:top-[calc(var(--app-header-h,0px)+12px)] xl:max-h-[80vh] xl:overflow-y-auto xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
        {module && <><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{definition?.name ?? module.type}</h2><div className="flex gap-1"><Button size="icon" variant="ghost" title="Move up" aria-label="Move module up" disabled={selected === 0} onClick={() => move(-1)}><ArrowUp size={14} /></Button><Button size="icon" variant="ghost" title="Move down" aria-label="Move module down" disabled={selected >= layout.modules.length - 1} onClick={() => move(1)}><ArrowDown size={14} /></Button><Button size="icon" variant="ghost" title="Duplicate module" aria-label="Duplicate module" onClick={() => { const next = [...layout.modules]; next.splice(selected + 1, 0, { ...structuredClone(module), id: crypto.randomUUID() }); replace(next); setSelected(selected+1); }}><Copy size={14} /></Button><Button size="icon" variant="ghost" title="Delete module" aria-label="Delete module" onClick={() => { replace(layout.modules.filter((_,i) => i !== selected)); setSelected(Math.max(0, selected-1)); }}><Trash2 size={14} /></Button></div></div><SourceModuleFields fields={definition?.fields ?? []} data={module.data} prefix={module.id ?? `module-${selected}`} onChange={patch} />
        {module.type === "row" && <div className="mt-4 space-y-4">{Array.from({ length: Number(string(module.data.layout).split("-")[0]) === 1 && string(module.data.layout).includes("-") ? 2 : string(module.data.layout).includes("-") ? 2 : Number(module.data.layout) || 3 }, (_,i) => {
          const slots = Array.isArray(module.data.slots) ? [...module.data.slots] : []; const slot = record(slots[i]); const slotType = string(slot.type);
          return <div key={i} className="space-y-3 border-t border-border pt-3"><label className="text-sm font-medium">Slot {i+1}<select aria-label={`Slot ${i+1} module`} className="mt-2 w-full rounded-sm border border-input bg-background p-2" value={slotType} onChange={e => { slots[i] = e.target.value ? blankSourceModule(e.target.value) : null; patch({ ...module.data, slots }); }}><option value="">Empty</option>{Object.entries(SOURCE_MODULES).filter(([type]) => !["row", "pagebreak"].includes(type)).map(([type,d]) => <option key={type} value={type}>{d.name}</option>)}</select></label>{slotType && <SourceModuleFields fields={SOURCE_MODULES[slotType]?.fields ?? []} data={record(slot.data)} prefix={`slot-${i}`} onChange={next => { slots[i] = { ...slot, data: next }; patch({ ...module.data, slots }); }} />}</div>;
        })}</div>}
        {extraFields.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Additional source settings</summary><div className="mt-3 space-y-3">{extraFields.map(field => field.t === "json" ? <JsonSourceField key={`${module.id}-${field.k}`} name={field.k} value={module.data[field.k]} onChange={value => patch({ ...module.data, [field.k]: value })} /> : <SourceModuleFields key={field.k} fields={[field]} data={module.data} prefix={module.id ?? "extra"} onChange={patch} />)}</div></details>}
        </>}
        {!module && <p className="text-sm text-muted-foreground">No modules.</p>}
      </aside>
    </div>
  </div>;
});

function JsonSourceField({ name, value, onChange }: { name: string; value: unknown; onChange: (value: unknown) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2)); const [error, setError] = useState(false);
  return <label className="block text-xs font-medium">{name}<textarea aria-label={name} className="mt-2 min-h-32 w-full rounded-sm border border-input bg-background p-2 font-mono text-xs" value={draft} onChange={e => { setDraft(e.target.value); try { onChange(JSON.parse(e.target.value)); setError(false); } catch { setError(true); } }} />{error && <span role="alert" className="text-destructive">Invalid JSON; last valid value retained.</span>}</label>;
}