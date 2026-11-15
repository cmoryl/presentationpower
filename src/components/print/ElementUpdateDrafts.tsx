import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Search, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/design-system/element";
import { ELEMENT_UPDATE_ITEMS } from "@/lib/element-update/catalog";
import { createPrintAsset, findMyPrintAssetForLibraryItem } from "@/lib/print-assets.functions";
import { editableContextFor, toEditableContent } from "@/lib/print-library/editable";
import { BRAND_MODES } from "@/lib/taxonomy";
import { SourceModulePreview } from "@/components/editor/SourceModulePreview";
import { workingLayout } from "@/lib/element-update/registry";
import "@/components/editor/source-build.css";

export interface ElementUpdateDraftsProps { className?: string }

export function ElementUpdateDrafts({ className = "" }: ElementUpdateDraftsProps) {
  const [query, setQuery] = useState(""); const [brand, setBrand] = useState("all"); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const create = useServerFn(createPrintAsset); const find = useServerFn(findMyPrintAssetForLibraryItem); const navigate = useNavigate();
  const items = useMemo(() => ELEMENT_UPDATE_ITEMS.filter(item => (brand === "all" || item.divisionId === brand) && `${item.title} ${item.seedSlug}`.toLowerCase().includes(query.toLowerCase())), [query, brand]);
  async function open(id: string) {
    const item = ELEMENT_UPDATE_ITEMS.find(i => i.id === id); if (!item) return;
    setBusy(id); setError(null);
    try {
      const existing = await find({ data: { libraryItemId: id } });
      if (existing?.id) { await navigate({ to: "/asset/$assetId", params: { assetId: existing.id } }); return; }
      const content = toEditableContent(item); if (!content) throw new Error("Source content unavailable.");
      const row = await create({ data: { kind: item.kind, title: item.title.slice(0, 200), brandModeId: item.divisionId ?? "bm-enterprise", content, context: editableContextFor(item) } });
      await navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch(e) { setError(e instanceof Error ? e.message : "Could not open this draft."); } finally { setBusy(null); }
  }
  function source(id: string) {
    const item = ELEMENT_UPDATE_ITEMS.find(i => i.id === id); if (!item) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(item.content?.sourceRecord, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${item.seedSlug}-source.json`; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className={`space-y-5 border-y border-border py-6 ${className}`} aria-labelledby="element-update-drafts">
    <div><h2 id="element-update-drafts" className="text-xl font-semibold text-foreground">Element templates</h2><p className="mt-2 text-sm text-muted-foreground">Source collection · review pending</p></div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium">Search templates<span className="flex items-center gap-2 rounded-md border border-input bg-background px-3"><Search size={16} /><input className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></span></label>
      <label className="flex flex-col gap-1 text-xs font-medium">Brand<select className="rounded-md border border-input bg-background p-2 text-sm" value={brand} onChange={e => { setBrand(e.target.value); setPage(0); }}><option value="all">All brands</option>{BRAND_MODES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <span className="py-2 text-sm text-muted-foreground">{items.length} templates</span>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.slice(page * 18, page * 18 + 18).map(item => {
      const missing = Array.isArray(item.content?.missingArtwork) ? item.content.missingArtwork as string[] : [];
      const unsupported = Array.isArray(item.content?.unsupportedSourceModules) ? item.content.unsupportedSourceModules as string[] : [];
      return <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="aspect-[4/3] overflow-hidden border-b border-border bg-muted"><div className="source-sheet pointer-events-none origin-top-left" style={{ width: 816, zoom: .33 }}>{workingLayout(item.content)?.modules.slice(0, 3).map((module, i) => <SourceModulePreview key={i} module={module} />)}</div></div>
        <div className="flex flex-1 flex-col gap-3 p-4"><p className="text-xs font-medium text-muted-foreground">Unapproved draft · {item.kind}</p><h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          {(missing.length > 0 || unsupported.length > 0) && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer"><AlertTriangle className="mr-1 inline size-3" />{missing.length} missing images · {unsupported.length} unmapped section types</summary><ul className="mt-2 space-y-1 break-all">{unsupported.map(x => <li key={x}>Section: {x}</li>)}{missing.map(x => <li key={x}>{x}</li>)}</ul></details>}
          <div className="mt-auto flex flex-wrap gap-2"><Button size="sm" disabled={busy !== null} onClick={() => void open(item.id)}><Copy size={14} />{busy === item.id ? "Opening…" : "Open template"}</Button><Button size="sm" variant="outline" onClick={() => source(item.id)}><Download size={14} />Source</Button></div>
        </div>
      </article>;
    })}</div>
    {!items.length && <p className="text-sm text-muted-foreground">No matching imported drafts.</p>}
    {items.length > 18 && <div className="flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-xs text-muted-foreground">{page + 1} / {Math.ceil(items.length / 18)}</span><Button variant="outline" size="sm" disabled={(page + 1) * 18 >= items.length} onClick={() => setPage(p => p + 1)}>Next</Button></div>}
  </section>;
}