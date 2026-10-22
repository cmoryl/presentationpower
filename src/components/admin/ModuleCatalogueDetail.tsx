import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, RotateCcw, Archive, Download } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge } from "@/design-system/element";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getModuleHistory, restoreModuleHistory, setCatalogueVisibility } from "@/lib/module-catalogue.functions";
import { MODULE_CLASSES, restorePolicy, usageTotal, type ModuleManifest } from "@/lib/module-catalogue-core";
import { PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";
import { applyPrintOverride, type ModuleOverrideRow } from "@/lib/module-overrides";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";

export interface ModuleCatalogueDetailProps { module: ModuleManifest; onClose: () => void; overrides: ModuleOverrideRow[] }
export function downloadCatalogueJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ModuleCatalogueDetail({ module: m, onClose, overrides }: ModuleCatalogueDetailProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const historyFn = useServerFn(getModuleHistory); const restoreFn = useServerFn(restoreModuleHistory); const visibilityFn = useServerFn(setCatalogueVisibility);
  const qc = useQueryClient();
  const history = useQuery({ queryKey: ["module-history", m.historyTable, m.historyKey], enabled: !!m.historyTable && !!m.historyKey,
    queryFn: () => {
      if (!m.historyKey || !["module_overrides", "custom_modules", "print_page_templates"].includes(m.historyTable ?? "")) throw new Error("This module is code-versioned");
      return historyFn({ data: { table: m.historyTable as "module_overrides" | "custom_modules" | "print_page_templates", key: m.historyKey } });
    },
  });
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["module-catalogue"] }), qc.invalidateQueries({ queryKey: ["module-overrides"] }), qc.invalidateQueries({ queryKey: ["custom-modules"] }), qc.invalidateQueries({ queryKey: ["print-page-templates"] }), history.refetch()]); };
  const restore = useMutation({ mutationFn: async (id: number) => {
    const latest = history.data?.[0]; if (!latest) throw new Error("Refresh history first");
    return restoreFn({ data: { id, expectedRevision: latest.revision } });
  }, onSuccess: async () => { setRestoreId(null); toast.success("Version restored with review safeguards"); await refresh(); onClose(); }, onError: (e) => toast.error(e.message) });
  const visibility = useMutation({ mutationFn: () => visibilityFn({ data: { scope: m.classification === "team" ? "team" : m.classification === "template" ? "template" : m.classification === "system" ? "deck" : "print", id: m.id, retired: m.lifecycle !== "retired", acknowledgeImpact: acknowledged } }),
    onSuccess: async () => { toast.success(m.lifecycle === "retired" ? "Module returned to the library" : "Module retired; saved work is preserved"); await refresh(); onClose(); }, onError: (e) => toast.error(e.message),
  });
  const print = PRINT_SECTION_MODULES.find((r) => r.id === m.id);
  const ov = overrides.find((r) => r.scope === "print" && r.module_id === m.id);
  const compare = history.data?.find((r) => r.id === compareId);
  const latest = history.data?.[0];
  const liveSnapshot = latest?.snapshot as Record<string, unknown> | undefined;
  const oldSnapshot = compare?.snapshot as Record<string, unknown> | undefined;
  const changes = oldSnapshot ? [...new Set([...Object.keys(oldSnapshot), ...Object.keys(liveSnapshot ?? {})])].filter((k) => JSON.stringify(oldSnapshot[k]) !== JSON.stringify(liveSnapshot?.[k])) : [];
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto [animation:none]">
      <div className="pr-7"><Badge variant="secondary">{MODULE_CLASSES[m.classification]}</Badge><DialogTitle className="mt-3 break-words">{m.label}</DialogTitle><DialogDescription className="mt-2">{m.description || m.id}</DialogDescription></div>
      <div className="flex flex-wrap gap-2">
        {m.classification === "print" || m.classification === "adaptation" ? <Button asChild size="sm"><Link to="/admin/modules/print/$moduleId" params={{ moduleId: m.id }}><ArrowUpRight />Edit master</Link></Button> : m.classification === "team" ? <Button asChild size="sm"><Link to="/admin/module-studio" search={{ module: m.id }}><ArrowUpRight />Open in Module Studio</Link></Button> : <Button asChild size="sm"><Link to="/admin/modules" search={{ tab: m.classification === "template" ? "page-templates" : "deck", q: m.id }}><ArrowUpRight />Edit catalogue entry</Link></Button>}
        <Button size="sm" variant="outline" onClick={() => downloadCatalogueJson(m, `${m.id}-manifest.json`)}><Download />Manifest</Button>
        {m.classification === "team" && <Button asChild size="sm" variant="outline"><Link to="/approvals" search={{ tab: "modules" }}>Review</Link></Button>}
      </div>
      {print && <div className="max-h-80 overflow-y-auto border-y border-border py-3"><PrintSectionPreviewFrame section={applyPrintOverride(print, ov).make()} /></div>}
      {m.preview && !print && <img src={m.preview} alt={`${m.label} saved preview`} className="max-h-64 w-full object-contain" />}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        {[["Identity", m.id], ["Lifecycle", m.lifecycle], ["Owner", m.owner], ["Source", m.source], ["Renderer", m.renderer], ["Review / release", m.reviewRule], ["Brand support", m.brandSupport.join(", ")], ["Compatibility", m.allowedContexts.join(", ") || "Not declared"], ["Exports", m.exports.join(" · ")], ["Modified", m.modifiedAt ? new Date(m.modifiedAt).toLocaleString() : "Code release"], ["Modified by", m.modifiedBy ?? "Not recorded"], ["Dependencies", m.dependencies.join(", ") || "None declared"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
      </dl>
      <details className="border-y border-border py-3"><summary className="cursor-pointer text-sm font-medium">Editable contract and capacity</summary><div className="mt-3 space-y-2 text-sm"><p>Editable: {m.editableFields.join(", ") || "See source editor"}</p><p>Locked: {m.lockedFields.join(", ") || "Not declared"}</p><pre className="max-h-48 overflow-auto bg-muted p-3 text-xs">{JSON.stringify(m.capacity, null, 2)}</pre></div></details>
      <section><h3 className="font-semibold">Usage and impact</h3><p className="mt-1 text-sm text-muted-foreground">{m.usageComplete ? "Checked saved references" : "Incomplete reference check"} · {usageTotal(m.usage)} references</p>
        <div className="my-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{Object.entries(m.usage).map(([kind, n]) => <div key={kind}><div className="text-xl font-semibold">{n}</div><div className="text-xs capitalize text-muted-foreground">{kind}</div></div>)}</div>
        {m.warnings.map((w) => <p key={w} className="my-2 text-sm text-muted-foreground">{w}</p>)}
        <ul className="max-h-40 overflow-y-auto text-sm">{m.references.map((r, i) => <li key={`${r.kind}:${r.id}:${i}`} className="flex gap-2 border-b border-border py-2"><span className="text-xs capitalize text-muted-foreground">{r.kind}</span>{r.href ? <a className="text-primary hover:underline" href={r.href}>{r.title}</a> : <span>{r.title}</span>}</li>)}</ul>
        {m.classification !== "adaptation" && <div className="mt-4 space-y-3 border-t border-border pt-4">
          {m.lifecycle !== "retired" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1 accent-primary" />I have reviewed saved-work references. Retirement removes new selection, not existing copies.</label>}
          <Button variant="outline" size="sm" disabled={visibility.isPending || (!m.usageComplete && m.lifecycle !== "retired") || (usageTotal(m.usage) > 0 && !acknowledged && m.lifecycle !== "retired")} onClick={() => visibility.mutate()}><Archive />{m.lifecycle === "retired" ? "Return to library" : "Retire module"}</Button>
        </div>}
      </section>
      <section className="border-t border-border pt-4"><h3 className="font-semibold">Version history</h3><p className="mt-1 text-sm text-muted-foreground">{restorePolicy(m.historyTable ?? "")} History starts at the first recorded change; earlier releases are not reconstructed.</p>
        {history.isPending ? <p className="mt-3 text-sm">Loading history…</p> : history.error ? <p role="alert" className="mt-3 text-sm text-destructive">{history.error.message}</p> : !history.data?.length ? <p className="mt-3 text-sm text-muted-foreground">No recorded changes yet. System renderers remain code-versioned.</p> : <ul className="mt-3 max-h-52 overflow-y-auto">{history.data.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 text-sm"><span className="mr-auto">Revision {r.revision} · {r.operation} · {new Date(r.created_at).toLocaleString()}</span><Button variant="ghost" size="sm" onClick={() => { setCompareId(r.id); setRestoreId(null); }}>Compare</Button>{r.id !== latest?.id && r.operation !== "DELETE" && <Button variant="outline" size="sm" onClick={() => setRestoreId(r.id)}><RotateCcw />Restore</Button>}</li>)}</ul>}
        {compare && <div className="mt-3"><h4 className="text-sm font-medium">Revision {compare.revision} compared with latest</h4>{changes.length ? changes.map((key) => <div key={key} className="mt-2 text-xs"><strong>{key}</strong><div className="grid gap-2 sm:grid-cols-2"><pre className="max-h-32 overflow-auto bg-muted p-2">{JSON.stringify(oldSnapshot?.[key], null, 2)}</pre><pre className="max-h-32 overflow-auto bg-muted p-2">{JSON.stringify(liveSnapshot?.[key], null, 2)}</pre></div></div>) : <p className="text-sm text-muted-foreground">No differences from the latest recorded snapshot.</p>}</div>}
        {restoreId !== null && <div className="mt-4 space-y-2 border border-border p-3"><p className="text-sm">{restorePolicy(m.historyTable ?? "")}</p><Button size="sm" disabled={restore.isPending} onClick={() => restore.mutate(restoreId)}><RotateCcw />Confirm restore</Button><Button size="sm" variant="ghost" onClick={() => setRestoreId(null)}>Cancel</Button></div>}
      </section>
    </DialogContent>
  </Dialog>;
}