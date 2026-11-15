import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, ExternalLink, X } from "lucide-react";
import { Button } from "@/design-system/element";
import { supabase } from "@/integrations/supabase/client";
import { eventWebReferences } from "@/lib/event-web-references";

export interface EventWebReferencesProps { eventId: string }

export function EventWebReferences({ eventId }: EventWebReferencesProps) {
  const references = eventWebReferences(eventId);
  const [selected, setSelected] = useState<(typeof references)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnails = useQuery({
    queryKey: ["event-web-reference-thumbnails", eventId], enabled: references.length > 0, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrls(references.map(r => r.thumbPath), 3600);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
      return urls;
    },
  });
  const full = useQuery({
    queryKey: ["event-web-reference-full", selected?.path], enabled: !!selected, retry: false,
    queryFn: async () => {
      if (!selected) return null;
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrl(selected.path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  if (!references.length) return null;
  return <section className="mt-10 border-t border-border pt-8" aria-labelledby="event-web-reference-heading" data-export-ignore="true">
    <h2 id="event-web-reference-heading" className="flex items-center gap-2 text-xl font-semibold text-foreground"><Camera size={20} />2026 event references</h2>
    <p className="mt-2 text-sm text-muted-foreground">Private research photographs and recap covers. Source rights are unconfirmed; not cleared for marketing or print production.</p>
    {thumbnails.isLoading && <p role="status" className="mt-4 text-sm text-muted-foreground">Loading private references…</p>}
    {thumbnails.isError && <p role="alert" className="mt-4 text-sm text-destructive">Private photographs could not load. Source links remain available.</p>}
    <div className="mt-5 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
      {references.map(r => <figure key={r.id}>
        <Button variant="ghost" className="h-auto w-full rounded-md border border-border bg-muted p-0" aria-label={`Enlarge ${r.title}`} disabled={!thumbnails.data?.[r.thumbPath]} onClick={() => { setSelected(r); dialog.current?.showModal(); }}>
          <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden">{thumbnails.data?.[r.thumbPath] ? <img src={thumbnails.data[r.thumbPath]} alt={r.title} loading="lazy" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">Private image unavailable</span>}</span>
        </Button>
        <figcaption className="mt-3"><h3 className="text-sm font-semibold text-foreground">{r.title}</h3><p className="mt-1 text-xs text-muted-foreground">{r.kind === "video-cover" ? "Recap video cover" : "Event photograph"} · {r.sourceDate}</p><p className="mt-1 text-xs text-muted-foreground">{r.publisher} · {r.width} × {r.height}</p><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">View original source<ExternalLink size={13} /></a></figcaption>
      </figure>)}
    </div>
    <dialog ref={dialog} onClose={() => setSelected(null)} className="m-auto max-h-[90vh] w-[min(94vw,72rem)] overflow-auto rounded-md border border-border bg-background p-5 text-foreground backdrop:bg-foreground/70">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{selected?.title}</h3><Button variant="ghost" size="icon" aria-label="Close reference" onClick={() => dialog.current?.close()}><X /></Button></div>
      {full.data ? <img src={full.data} alt={selected?.title} className="mt-4 h-[60vh] w-full object-contain" /> : <p role="status" className="py-10 text-sm">{full.isError ? "The full reference could not load." : "Loading reference…"}</p>}
      <p className="mt-4 text-sm text-muted-foreground">{selected?.note} Rights unconfirmed; private reference only.</p>
    </dialog>
  </section>;
}