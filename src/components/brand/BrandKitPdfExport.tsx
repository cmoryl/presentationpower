import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/design-system/element";
import { makeBrandGuideDocument, makeKitDocument, type KitDocument, type KitDocumentId } from "@/lib/brand-kit-document";
import type { BrandGuide } from "@/lib/brand-guides";
import { kitRelease } from "@/lib/brand-kit-releases";

export interface BrandKitPdfExportProps { kitId?: KitDocumentId; guide?: BrandGuide; shareUrl?: string }
export function BrandKitPdfExport({ kitId, guide, shareUrl }: BrandKitPdfExportProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [model, setModel] = useState<KitDocument | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<{ blob: Blob; filename: string; missing: string[] } | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => { if (!ready) { setUrl(""); return; } const value = URL.createObjectURL(ready.blob); setUrl(value); return () => URL.revokeObjectURL(value); }, [ready]);
  async function open() {
    dialog.current?.showModal(); setError(""); setReady(null); setBusy(true); setStatus("Loading brand sections…");
    try { const m = guide ? await makeBrandGuideDocument(guide) : kitId ? await makeKitDocument(kitId, shareUrl) : null; if (!m) throw new Error("Brand kit unavailable."); setModel(m); setIds(m.sections.map(s => s.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load kit."); }
    finally { setBusy(false); setStatus(""); }
  }
  async function build() { if (!model) return; setBusy(true); setError(""); setReady(null); try { const { buildKitDocumentPdf } = await import("@/lib/brand-kit-document-pdf"); setReady(await buildKitDocumentPdf(model, ids, setStatus)); } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare PDF."); } finally { setBusy(false); setStatus(""); } }
  function toggle(id: string) { setReady(null); setIds(previous => previous.includes(id) ? previous.filter(s => s !== id) : [...previous, id]); }
  const release = kitRelease(kitId ?? guide?.slug);
  return <>
    <div className="flex flex-wrap items-center gap-3">
      {release && <Button asChild><a href={release.file} download><Download className="size-4" />Released PDF v{release.version}</a></Button>}
      <Button variant="outline" onClick={open}><FileText className="size-4" />Download kit PDF</Button>
      {release && <p className="text-sm text-muted-foreground">Last released {new Date(`${release.released}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {release.pages} pages · choose sections with Download kit PDF</p>}
    </div>
    <dialog ref={dialog} className="m-auto max-h-[90vh] w-[min(94vw,42rem)] overflow-auto rounded-md border border-border bg-background p-6 text-foreground backdrop:bg-foreground/70">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{model?.name ?? "Brand kit"} PDF</h2><p className="mt-2 text-sm text-muted-foreground">Included sections</p></div><Button aria-label="Close PDF options" variant="ghost" size="icon" onClick={() => dialog.current?.close()}><X /></Button></div>
      {model && <><div className="mt-5 flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => { setIds(model.sections.map(s => s.id)); setReady(null); }}>Select all</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => { setIds([]); setReady(null); }}>Clear selection</Button></div><fieldset disabled={busy} className="mt-4 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Included PDF sections</legend>{model.sections.map(s => <label key={s.id} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} className="mt-1 size-4 accent-primary" />{s.title}</label>)}</fieldset></>}
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      {ready?.missing.length ? <p role="alert" className="mt-5 text-sm text-destructive">{ready.missing.length} previews could not load: {ready.missing.slice(0, 5).join(", ")}. The PDF labels unavailable previews and retains the original links.</p> : null}
      <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={build} disabled={busy || !model || !ids.length}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}{busy ? status || "Preparing…" : "Prepare PDF"}</Button>{ready && url && <Button asChild><a href={url} download={ready.filename}><Download className="size-4" />Save PDF</a></Button>}</div>
      <p className="mt-4 text-xs text-muted-foreground">Asset links retain their access restrictions. Private photos are excluded.</p>
    </dialog>
  </>;
}