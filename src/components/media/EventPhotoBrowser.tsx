// Event photography cleared for marketing, shared by every picture picker
// (print, social kits, slides). Only photos an admin or brand lead has marked
// "Cleared for marketing" in an event photo library appear here.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export type PickedEventPhoto = {
  id: string;
  url: string;
  thumbUrl: string | null;
  path: string;
  name: string;
  eventId: string;
  album: string;
  width: number | null;
  height: number | null;
};

type Row = {
  id: string;
  event_id: string;
  path: string;
  thumb_path: string;
  original_name: string;
  album: string;
  division: string | null;
  sign_kind: string | null;
  width: number | null;
  height: number | null;
};

const EVENT_LABELS: Record<string, string> = { "london-2026": "NEXT 2026 London" };
// Long-lived link: a picked photo is stored inside the design, so it must keep loading.
const LINK_TTL = 60 * 60 * 24 * 365;

export async function signEventPhoto(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("event-photos").createSignedUrl(path, LINK_TTL);
  return data?.signedUrl ?? null;
}

export function EventPhotoBrowser({
  onPick,
  tone = "dark",
}: {
  onPick: (photo: PickedEventPhoto) => void;
  tone?: "dark" | "light";
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState("");
  const [album, setAlbum] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(60);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("event_photos")
          .select("id,event_id,path,thumb_path,original_name,album,division,sign_kind,width,height")
          .eq("marketing_ok", true)
          .order("event_id")
          .order("album")
          .order("original_name")
          .range(from, from + 999);
        if (error) throw error;
        out.push(...((data ?? []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      if (alive) setRows(out);
    })().catch((e: unknown) => {
      if (alive) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Could not load event photos.");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const events = useMemo(() => [...new Set((rows ?? []).map((r) => r.event_id))], [rows]);
  const albums = useMemo(
    () => [...new Set((rows ?? []).filter((r) => !event || r.event_id === event).map((r) => r.album))].sort(),
    [rows, event],
  );
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!event || r.event_id === event) &&
        (!album || r.album === album) &&
        (!n || [r.original_name, r.album, r.division ?? "", r.sign_kind ?? ""].join(" ").toLowerCase().includes(n)),
    );
  }, [rows, event, album, q]);
  const shown = filtered.slice(0, limit);

  useEffect(() => {
    const need = shown.map((r) => r.thumb_path).filter((p) => !thumbs[p]);
    if (!need.length) return;
    let alive = true;
    supabase.storage
      .from("event-photos")
      .createSignedUrls(need, 3600)
      .then(({ data }) => {
        if (!alive) return;
        const next: Record<string, string> = {};
        for (const d of data ?? []) if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
        setThumbs((t) => ({ ...t, ...next }));
      });
    return () => {
      alive = false;
    };
  }, [shown, thumbs]);

  async function pick(r: Row) {
    setBusy(r.id);
    const url = await signEventPhoto(r.path);
    setBusy(null);
    if (!url) {
      setError("That photo could not be loaded.");
      return;
    }
    onPick({
      id: r.id,
      url,
      thumbUrl: thumbs[r.thumb_path] ?? null,
      path: r.path,
      name: r.original_name,
      eventId: r.event_id,
      album: r.album,
      width: r.width,
      height: r.height,
    });
  }

  const dark = tone === "dark";
  const field = dark
    ? "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white focus:border-white/30 focus:outline-none"
    : "rounded-md border border-[#03002C]/20 bg-white px-2 py-2 text-xs text-[#03002C]";
  const muted = dark ? "text-white/60" : "text-[#03002C]/60";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${muted}`} />
          <input
            aria-label="Search event photos"
            className={`${field} w-full pl-8`}
            placeholder="Search album, division, sign…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select aria-label="Event" className={field} value={event} onChange={(e) => { setEvent(e.target.value); setAlbum(""); }}>
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e} value={e}>{EVENT_LABELS[e] ?? e}</option>
          ))}
        </select>
        <select aria-label="Album" className={field} value={album} onChange={(e) => setAlbum(e.target.value)}>
          <option value="">All albums</option>
          {albums.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className={`text-[11px] ${muted}`}>{filtered.length} photos</span>
      </div>
      <p className={`text-[11px] ${muted}`}>
        Only photos cleared for marketing in an event photo library appear here. Check people in shot have agreed before publishing.
      </p>
      {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div> : null}
      {rows === null ? (
        <div className={`flex items-center justify-center py-10 text-sm ${muted}`}>
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className={`py-10 text-center text-sm ${muted}`}>
          No event photos cleared for marketing yet. Admins can clear them in an event's photo library.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {shown.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => void pick(r)}
                disabled={busy === r.id}
                aria-label={`Use ${r.original_name} from ${r.album}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
              >
                {thumbs[r.thumb_path] ? (
                  <img src={thumbs[r.thumb_path]} alt={`${r.album} photo`} loading="lazy" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-left text-[10px] text-white">
                  {r.album}
                </span>
                {busy === r.id ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 size={16} className="animate-spin text-white" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {filtered.length > limit ? (
            <button type="button" onClick={() => setLimit((l) => l + 60)} className={`${field} w-full`}>
              Show more
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
