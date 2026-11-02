import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X, Camera } from "lucide-react";
import { Button } from "@/design-system/element";
import { supabase } from "@/integrations/supabase/client";
import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";
import { NEXT_EXAMPLE_AREAS, NEXT_EXAMPLE_EVENTS, loadNextArtworkExamples, nextExamplesAllowPhotos, type NextVisualExample } from "@/lib/next-visual-examples";

export interface NextVisualExamplesProps { shared?: boolean }

export function NextVisualExamples({ shared = false }: NextVisualExamplesProps) {
  const [mode, setMode] = useState<"photo" | "artwork">(shared ? "artwork" : "photo");
  const [area, setArea] = useState("");
  const [event, setEvent] = useState("");
  const [division, setDivision] = useState("");
  const [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<NextVisualExample | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const artwork = useQuery({ queryKey: ["next-visual-artwork"], queryFn: loadNextArtworkExamples });
  const photos = useQuery({
    queryKey: ["next-visual-event-photos"], enabled: nextExamplesAllowPhotos(shared), retry: false,
    queryFn: async (): Promise<NextVisualExample[]> => {
      const result: NextVisualExample[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("event_photos")
          .select("id,event_id,path,thumb_path,original_name,album,division,room,sign_kind,sign_kind_source,marketing_ok")
          .in("event_id", [...NEXT_EXAMPLE_EVENTS]).order("album").order("original_name").range(from, from + 999);
        if (error) throw error;
        for (const p of data ?? []) {
          if (p.sign_kind === "no-sign") continue;
          result.push({ id: p.id, title: p.original_name, area: NEXT_EXAMPLE_AREAS[p.sign_kind ?? ""] ?? "Other event touchpoints", division: p.division ?? "general", event: p.event_id === "london-2026" ? "London 2026" : "San Francisco 2026", kind: "photo", path: p.path, thumbPath: p.thumb_path,
            note: `${p.album}${p.room ? ` · ${p.room}` : ""} · ${p.sign_kind_source === "auto" ? "Area auto-tagged; check against the image" : "Area checked"} · ${p.marketing_ok ? "Cleared for marketing; remains private here" : "Private reference; not cleared for marketing"}` });
        }
        if (!data || data.length < 1000) break;
      }
      // Round-robin areas so the first view covers the whole event, not one album.
      const groups = Object.values(NEXT_EXAMPLE_AREAS).map(a => result.filter(p => p.area === a));
      const balanced: NextVisualExample[] = [];
      for (let i = 0; i < Math.max(0, ...groups.map(g => g.length)); i++) for (const g of groups) if (g[i]) balanced.push(g[i]);
      return balanced;
    },
  });
  const source = mode === "photo" ? photos : artwork;
  const items = source.data ?? [];
  const areas = [...new Set(items.map(p => p.area))].sort();
  const events = [...new Set(items.map(p => p.event))];
  const divisions = [...new Set(items.map(p => p.division))].sort();
  const divisionName = (id: string) => NEXT_DIVISIONS.find(d => d.id.replace(/[^a-z]/g, "") === id.replace(/[^a-z]/g, ""))?.name ?? (id === "general" ? "General event" : id);
  const filtered = useMemo(() => items.filter(p => (!area || p.area === area) && (!event || p.event === event) && (!division || p.division === division)), [items, area, event, division]);
  const shown = filtered.slice(0, limit);
  const thumbPaths = shown.flatMap(p => p.thumbPath ? [p.thumbPath] : []);
  const thumbnails = useQuery({ queryKey: ["next-example-thumbs", thumbPaths], enabled: !shared && mode === "photo" && thumbPaths.length > 0, staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrls(thumbPaths, 3600);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const p of data ?? []) if (p.path && p.signedUrl && !p.error) urls[p.path] = p.signedUrl;
      return urls;
    },
  });
  const full = useQuery({ queryKey: ["next-example-full", selected?.path], enabled: !shared && !!selected?.path,
    queryFn: async () => {
      if (!selected?.path) return null;
      const { data, error } = await supabase.storage.from("event-photos").createSignedUrl(selected.path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  function open(p: NextVisualExample) { setSelected(p); dialog.current?.showModal(); }
  function step(delta: number) { const i = filtered.findIndex(p => p.id === selected?.id); const next = filtered[i + delta]; if (next) setSelected(next); }
  function changeMode(next: "photo" | "artwork") { setMode(next); setArea(""); setEvent(""); setDivision(""); setLimit(24); }
  const selectedIndex = filtered.findIndex(p => p.id === selected?.id);
  const field = "h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm";
  return <section id="visual-examples" aria-labelledby="next-examples-heading" className="mt-12 scroll-mt-24 border-t border-border pt-8">
    <p className="text-xs font-medium uppercase text-muted-foreground">NEXT 2026 · Look & feel in practice</p>
    <h2 id="next-examples-heading" className="mt-2 text-2xl font-semibold">Event imagery & visual examples</h2>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Arrival, registration, stages, room backdrops, booths, pillars, badges and smaller touchpoints. Original event photography is separate from artwork previews; neither changes the brand rules. NEXT track colours are event-only.</p>
    {!shared && <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Example type">
      <Button size="sm" variant={mode === "photo" ? "default" : "outline"} aria-pressed={mode === "photo"} onClick={() => changeMode("photo")}><Camera size={16} />Real event photographs</Button>
      <Button size="sm" variant={mode === "artwork" ? "default" : "outline"} aria-pressed={mode === "artwork"} onClick={() => changeMode("artwork")}>Artwork variations</Button>
    </div>}
    <p className="mt-3 text-xs text-muted-foreground">{mode === "photo" ? "Private staff references. No photo is added to public shares, packs or PDF exports. Rights-pending photographs are not marketing assets. Automatically tagged areas require visual confirmation." : "Existing master artwork previews—not installed-event photographs. Withdrawn designs remain excluded."}</p>
    <div className="mt-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs font-medium">Area<select aria-label="Example area" className={field} value={area} onChange={e => { setArea(e.target.value); setLimit(24); }}><option value="">All areas</option>{areas.map(a => <option key={a}>{a}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium">Event<select aria-label="Example event" className={field} value={event} onChange={e => { setEvent(e.target.value); setLimit(24); }}><option value="">All events</option>{events.map(e => <option key={e}>{e}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium">Track<select aria-label="Example track" className={field} value={division} onChange={e => { setDivision(e.target.value); setLimit(24); }}><option value="">All tracks</option>{divisions.map(d => <option key={d} value={d}>{divisionName(d)}</option>)}</select></label>
      <span className="text-xs text-muted-foreground">{filtered.length} examples</span>
    </div>
    {source.isLoading && <p role="status" className="mt-6 text-sm text-muted-foreground">Loading examples…</p>}
    {(source.isError || thumbnails.isError) && <p role="alert" className="mt-6 text-sm text-destructive">Examples could not load. Private photographs require a staff session; artwork variations remain separate.</p>}
    {!source.isLoading && !source.isError && !filtered.length && <p className="mt-6 text-sm text-muted-foreground">No examples match these filters.</p>}
    <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {shown.map(p => { const src = p.src ?? thumbnails.data?.[p.thumbPath ?? ""]; return <figure key={p.id}>
        <Button variant="ghost" className="h-auto w-full overflow-hidden rounded-md border border-border bg-muted p-0" aria-label={`Enlarge ${p.title}`} disabled={!src} onClick={() => open(p)}><div className="flex aspect-[4/3] w-full items-center justify-center">{src ? <img src={src} alt={`${p.area} · ${p.event} · ${p.title}`} loading="lazy" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">{thumbnails.isLoading ? "Loading photo…" : "Photo unavailable"}</span>}</div></Button>
        <figcaption className="mt-3"><p className="text-xs font-medium text-muted-foreground">{p.event} · {divisionName(p.division)}</p><h3 className="mt-1 text-sm font-semibold">{p.area}</h3><p className="mt-1 break-words text-xs text-muted-foreground">{p.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.note}</p></figcaption>
      </figure>; })}
    </div>
    {filtered.length > limit && <Button className="mt-6" variant="outline" onClick={() => setLimit(n => n + 24)}>More examples</Button>}
    {!shared && <div className="mt-8 flex flex-wrap gap-3"><Button asChild variant="outline" size="sm"><Link to="/events/next/london/photos">London photo library</Link></Button><Button asChild variant="outline" size="sm"><Link to="/events/next/san-francisco/review">San Francisco sources & review</Link></Button></div>}
    <dialog ref={dialog} onClose={() => setSelected(null)} className="m-auto max-h-[90vh] w-[min(94vw,72rem)] overflow-auto rounded-md border border-border bg-background p-5 text-foreground backdrop:bg-foreground/70">
      <div className="flex items-center justify-between gap-4"><h3 className="min-w-0 break-words text-base font-semibold">{selected?.area} · {selected?.event}</h3><Button size="icon" variant="ghost" aria-label="Close example" onClick={() => dialog.current?.close()}><X /></Button></div>
      <div className="mt-4 flex min-h-40 items-center justify-center bg-muted">{selected && (selected.src || full.data) ? <img src={selected.src ?? full.data ?? undefined} alt={selected.title} className="h-[60vh] w-full object-contain" /> : <p role="status" className="p-8 text-sm">{full.isError ? "Full photograph could not load." : "Loading photograph…"}</p>}</div>
      <p className="mt-4 text-sm text-muted-foreground">{selected?.note}</p>
      <div className="mt-4 flex items-center justify-between"><Button size="icon" variant="outline" aria-label="Previous example" disabled={selectedIndex <= 0} onClick={() => step(-1)}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">{selectedIndex + 1} of {filtered.length}</span><Button size="icon" variant="outline" aria-label="Next example" disabled={selectedIndex >= filtered.length - 1} onClick={() => step(1)}><ChevronRight /></Button></div>
    </dialog>
  </section>;
}