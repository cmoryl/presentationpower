import { forwardRef, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/design-system/element";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import { createPrintAsset } from "@/lib/print-assets.functions";
import { ELEMENT_UPDATE_ITEMS } from "@/lib/element-update/catalog";
import { SOURCE_MODULES, UNPORTED_MODULES, blankSourceModule, workingLayout, type SourceModule } from "@/lib/element-update/registry";
import { SourceModulePreview } from "./SourceModulePreview";
import "./source-build.css";

export interface SourceModuleLibraryProps { format?: string; className?: string }
export const SourceModuleLibrary = forwardRef<HTMLElement, SourceModuleLibraryProps>(function SourceModuleLibraryImpl({ format = "letter", className = "" }, ref) {
  const capabilities = useWorkspaceCapabilities(); const [query, setQuery] = useState(""); const [group, setGroup] = useState("all"); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const create = useServerFn(createPrintAsset); const navigate = useNavigate();
  const examples = useMemo(() => {
    const map = new Map<string, SourceModule[]>();
    for (const item of ELEMENT_UPDATE_ITEMS) for (const module of workingLayout(item.content)?.modules ?? []) {
      const rows = map.get(module.type) ?? [];
      const key = SOURCE_MODULES[module.type]?.vk;
      if (!rows.some(row => JSON.stringify(key ? row.data[key] : row.data) === JSON.stringify(key ? module.data[key] : module.data))) rows.push(module);
      map.set(module.type, rows);
    }
    return map;
  }, []);
  const [selected, setSelected] = useState("hero"); const [variantIndex, setVariantIndex] = useState(0);
  const definition = SOURCE_MODULES[selected]; const variants = examples.get(selected) ?? []; const sample = variants[variantIndex] ?? blankSourceModule(selected);
  if (capabilities.isLoading || !capabilities.canAuthorSystem) return null;
  async function open() {
    setBusy(true); setError(null);
    try {
      const module = blankSourceModule(selected); // Start without sample numbers, claims or people.
      const title = `${definition?.name ?? selected} · new material`;
      const row = await create({ data: { kind: "ebrochure", title, brandModeId: "bm-enterprise", content: { title, sourceLayout: { format, modules: [module] }, importReview: "pending" }, context: { sourceLibrary: "claude-element-update", importReview: "pending" } } });
      await navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch(e) { setError(e instanceof Error ? e.message : "Could not create material."); } finally { setBusy(false); }
  }
  return <section ref={ref} className={`mb-8 border-b border-border pb-8 ${className}`} aria-label="Element source modules">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Element modules</h2><div className="flex gap-2"><label className="flex items-center gap-2 rounded-sm border border-input bg-background px-3"><Search size={15} /><input aria-label="Search Element modules" className="min-w-0 w-40 bg-transparent py-2 text-sm outline-none" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Module group" className="max-w-36 rounded-sm border border-input bg-background p-2 text-sm" value={group} onChange={e => setGroup(e.target.value)}><option value="all">All groups</option>{[...new Set(Object.values(SOURCE_MODULES).map(d => d.group))].map(g => <option key={g} value={g}>{g}</option>)}</select></div></div>
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><div className="max-h-80 space-y-1 overflow-auto lg:max-h-[540px]">{Object.entries(SOURCE_MODULES).filter(([type,d]) => (group === "all" || group === d.group) && `${d.name} ${type}`.toLowerCase().includes(query.toLowerCase())).map(([type,d]) => <Button key={type} className="h-auto w-full justify-between whitespace-normal text-left text-sm" variant={selected === type ? "secondary" : "ghost"} onClick={() => { setSelected(type); setVariantIndex(0); }}>{d.name}<span className="text-xs text-muted-foreground">{examples.get(type)?.length ?? 0}</span></Button>)}</div>
      <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">{definition?.name}</h3><p className="text-xs text-muted-foreground">{UNPORTED_MODULES.has(selected) ? "Layout pending" : "Source example · review pending"}</p></div><div className="flex flex-wrap gap-2">{variants.length > 1 && <select aria-label="Source module variation" className="rounded-sm border border-input bg-background p-2 text-sm" value={variantIndex} onChange={e => setVariantIndex(Number(e.target.value))}>{variants.map((v,i) => <option key={i} value={i}>{String(definition?.vk ? v.data[definition.vk] ?? `Variation ${i+1}` : `Variation ${i+1}`)}</option>)}</select>}<Button size="sm" disabled={busy || UNPORTED_MODULES.has(selected)} onClick={() => void open()}>Use module<ArrowRight size={15} /></Button></div></div><div className="max-w-full overflow-auto border border-border bg-muted p-4"><div className="source-sheet" style={{ width: 816, zoom: .65 }}><SourceModulePreview module={sample} /></div></div>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</div>
    </div>
  </section>;
});