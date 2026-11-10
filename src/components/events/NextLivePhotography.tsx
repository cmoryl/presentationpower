import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { Button } from "@/design-system/element";
import { listNextGuidePhotos, type NextGuidePhoto } from "@/lib/next-guide-photos.functions";

/** Real installed-event photographs; visible to everyone only once approved and cleared for marketing. */
export function NextLivePhotography() {
  const fn = useServerFn(listNextGuidePhotos);
  const q = useQuery({ queryKey: ["next-guide-photos"], queryFn: () => fn(), staleTime: 60 * 60 * 1000 });
  const [sel, setSel] = useState<NextGuidePhoto | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const photos = q.data ?? [];
  const areas = [...new Set(photos.map((p) => p.area))];
  return <div className="mt-6" data-next-live-photos>
    <h3 className="text-lg font-semibold">The brand in use · live event photography</h3>
    {q.isLoading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Loading photographs…</p>
      : q.isError ? <p role="alert" className="mt-3 text-sm text-destructive">Event photographs could not load.</p>
      : !photos.length ? <p className="mt-3 text-sm text-muted-foreground">No photographs are approved and cleared for marketing yet. A shortlist is waiting for review in Approvals.</p>
      : areas.map((a) => <div key={a} className="mt-5">
          <p className="text-xs font-medium uppercase text-muted-foreground">{a}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.filter((p) => p.area === a).map((p) => <button key={p.id} type="button" onClick={() => { setSel(p); dlg.current?.showModal(); }} className="group overflow-hidden bg-muted text-left focus-visible:outline-2 focus-visible:outline-primary">
              <img src={p.thumbUrl} alt={`${a} at TransPerfect NEXT ${p.event}`} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90" />
              <span className="block px-2 py-1 text-[11px] text-muted-foreground">{p.event}{p.room ? ` · ${p.room}` : ""}</span>
            </button>)}
          </div>
        </div>)}
    <p className="mt-3 text-[11px] text-muted-foreground">Actual installations photographed at NEXT · approved for the guide and cleared for marketing.</p>
    <dialog ref={dlg} onClose={() => setSel(null)} className="m-auto max-w-5xl bg-background p-4 backdrop:bg-black/70" aria-label="Event photograph">
      <div className="flex justify-between gap-3"><p className="text-sm font-medium">{sel?.area} · {sel?.event}</p><Button size="sm" variant="ghost" aria-label="Close" onClick={() => dlg.current?.close()}><X size={16} /></Button></div>
      {sel && <img src={sel.fullUrl || sel.thumbUrl} alt={`${sel.area} at TransPerfect NEXT`} className="mt-3 max-h-[75vh] w-full object-contain" />}
    </dialog>
  </div>;
}
