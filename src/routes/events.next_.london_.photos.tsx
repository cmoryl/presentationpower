// /events/next/london/photos — private library of the London 2026 event
// photography, each photo labelled by division, room and sign, so print files
// can be compared with how they actually looked in the room.
//
// Division comes from the photographer's album. The sign type was tagged by AI
// and stays marked "auto" until someone checks it. Rooms are never guessed: they
// stay blank until a person picks one from the QEII sign schedule.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LondonPanelThumb } from "@/components/events/LondonPanelThumb";
import { supabase } from "@/integrations/supabase/client";
import { LONDON_PANELS } from "@/lib/next-london-signage";

export const Route = createFileRoute("/events/next_/london_/photos")({
  head: () => ({
    meta: [
      { title: "London 2026 event photos · TransPerfect Element" },
      {
        name: "description",
        content:
          "Private staff library of NEXT 2026 London photography, labelled by division, room and sign, for comparing print files with the signs in the room.",
      },
      { property: "og:title", content: "NEXT 2026 London — event photo library" },
      {
        property: "og:description",
        content: "Staff-only photo library labelled by division, room and sign type.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PhotosPage,
});

const EVENT = "london-2026";
const PAGE = 60;

export const SIGN_KINDS: Record<string, string> = {
  "room-backdrop": "Room backdrop",
  "pillar-totem": "Pillar / totem",
  "kiosk-booth": "Kiosk / booth",
  "registration-wall": "Registration wall",
  lectern: "Lectern",
  "stage-set": "Main stage",
  "door-or-screen-header": "Door / header",
  "digital-screen": "Screen / slides",
  "printed-collateral": "Printed collateral",
  "lanyard-badge": "Lanyard / badge",
  "other-sign": "Other sign",
  "no-sign": "No sign",
};

const DIVISIONS: Record<string, string> = {
  dataforce: "DataForce",
  digital: "Digital",
  experience: "Experience",
  finance: "Finance",
  games: "Games",
  globallink: "GlobalLink",
  learn: "Learn",
  legal: "Legal",
  lifesci: "LifeSci",
  media: "Media",
  "trial-interactive": "Trial Interactive (OPTIMIZE)",
};

const ROOMS = [...new Set(LONDON_PANELS.map((p) => p.room).filter(Boolean))].sort();

type Photo = {
  id: string;
  path: string;
  thumb_path: string;
  original_name: string;
  album: string;
  division: string | null;
  room: string | null;
  sign_kind: string | null;
  sign_kind_source: string;
  panel_id: string | null;
  print_note: string | null;
};

async function loadPhotos(): Promise<Photo[]> {
  const out: Photo[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("event_photos")
      .select("id,path,thumb_path,original_name,album,division,room,sign_kind,sign_kind_source,panel_id,print_note")
      .eq("event_id", EVENT)
      .order("album")
      .order("original_name")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Photo[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function signUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from("event-photos").createSignedUrls(paths, 3600);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  return map;
}

const sel = "h-9 rounded-md border border-[#03002C]/20 bg-white px-2 text-sm text-[#03002C]";

function PhotosPage() {
  const photos = useQuery({ queryKey: ["event-photos", EVENT], queryFn: loadPhotos });
  const [division, setDivision] = useState("");
  const [kind, setKind] = useState("");
  const [room, setRoom] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      (photos.data ?? []).filter(
        (p) =>
          (!division || (division === "none" ? !p.division : p.division === division)) &&
          (!kind || p.sign_kind === kind) &&
          (!room || (room === "none" ? !p.room : p.room === room)) &&
          (!onlyIssues || !!p.print_note),
      ),
    [photos.data, division, kind, room, onlyIssues],
  );
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const thumbs = useQuery({
    queryKey: ["event-photo-thumbs", shown.map((p) => p.thumb_path).join("|")],
    queryFn: () => signUrls(shown.map((p) => p.thumb_path)),
    enabled: shown.length > 0,
    staleTime: 50 * 60 * 1000,
  });

  const openIdx = openId ? filtered.findIndex((p) => p.id === openId) : -1;
  // Stepping through the large view keeps the grid page in step with the photo shown.
  const go = (i: number) => {
    setOpenId(filtered[i].id);
    setPage(Math.floor(i / PAGE));
  };

  const reset = (f: () => void) => {
    f();
    setPage(0);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <Link to="/events/next/london" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#03002C]/65 hover:text-[#03002C]">
          <ArrowLeft size={13} aria-hidden /> NEXT 2026 London
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-[#03002C]">London event photos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-[1.5] text-[#03002C]/70">
          Staff only. Many attendees are recognisable, so these photos are for checking prints, not for anything published.
          Division comes from the photographer's album. Sign type was tagged automatically and shows "auto" until checked.
          Rooms stay blank until someone picks one.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select aria-label="Division" className={sel} value={division} onChange={(e) => reset(() => setDivision(e.target.value))}>
            <option value="">All divisions</option>
            {Object.entries(DIVISIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="none">General / keynotes</option>
          </select>
          <select aria-label="Sign type" className={sel} value={kind} onChange={(e) => reset(() => setKind(e.target.value))}>
            <option value="">All sign types</option>
            {Object.entries(SIGN_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="Room" className={sel} value={room} onChange={(e) => reset(() => setRoom(e.target.value))}>
            <option value="">All rooms</option>
            <option value="none">Room not set</option>
            {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-[#03002C]">
            <input type="checkbox" checked={onlyIssues} onChange={(e) => reset(() => setOnlyIssues(e.target.checked))} />
            Only photos with a print note
          </label>
          <span className="ml-auto font-mono text-xs text-[#03002C]/60">{filtered.length} of {photos.data?.length ?? 0} photos</span>
        </div>

        {photos.isLoading ? <p className="mt-8 text-sm text-[#03002C]/65">Loading photos…</p> : null}
        {photos.error ? <p className="mt-8 text-sm text-red-700">Couldn't load the photos. You may need to sign in.</p> : null}

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpenId(p.id)} className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7]">
                <div className="aspect-[3/2] overflow-hidden rounded-md bg-[#EEF1F7]">
                  {thumbs.data?.[p.thumb_path] ? (
                    <img src={thumbs.data[p.thumb_path]} alt={`${SIGN_KINDS[p.sign_kind ?? ""] ?? "Photo"} — ${p.album}`} loading="lazy" className="h-full w-full object-cover transition group-hover:opacity-90" />
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[12px] font-semibold text-[#03002C]">
                  {SIGN_KINDS[p.sign_kind ?? ""] ?? "Untagged"}
                  {p.sign_kind_source === "auto" ? <span className="ml-1 font-mono text-[10px] font-normal text-[#03002C]/55">auto</span> : null}
                </p>
                <p className="truncate text-[11px] text-[#03002C]/65">{p.division ? DIVISIONS[p.division] : "General"} · {p.room ?? "room not set"}</p>
              </button>
            </li>
          ))}
        </ul>

        {pages > 1 ? (
          <div className="mt-6 flex items-center gap-3 text-sm">
            <button type="button" className="rounded-md border px-3 py-1.5 disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="font-mono text-xs">Page {page + 1} of {pages}</span>
            <button type="button" className="rounded-md border px-3 py-1.5 disabled:opacity-40" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        ) : null}
      </div>
      {openIdx >= 0 ? (
        <PhotoDialog
          key={filtered[openIdx].id}
          photo={filtered[openIdx]}
          position={`${openIdx + 1} of ${filtered.length}`}
          onPrev={openIdx > 0 ? () => go(openIdx - 1) : undefined}
          onNext={openIdx < filtered.length - 1 ? () => go(openIdx + 1) : undefined}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </AppShell>
  );
}

function PhotoDialog({ photo, onClose, onPrev, onNext, position }: { photo: Photo; onClose: () => void; onPrev?: () => void; onNext?: () => void; position: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      else if (e.key === "ArrowRight" && onNext) onNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext, onClose]);
  const qc = useQueryClient();
  const full = useQuery({ queryKey: ["event-photo-full", photo.path], queryFn: () => signUrls([photo.path]) });
  const [room, setRoom] = useState(photo.room ?? "");
  const [kind, setKind] = useState(photo.sign_kind ?? "");
  const [panelId, setPanelId] = useState(photo.panel_id ?? "");
  const [note, setNote] = useState(photo.print_note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const panels = useMemo(() => LONDON_PANELS.filter((p) => !room || p.room === room), [room]);
  const panel = LONDON_PANELS.find((p) => p.id === panelId) ?? null;

  async function save() {
    setMsg(null);
    const { error, data } = await supabase
      .from("event_photos")
      .update({ room: room || null, sign_kind: kind || null, sign_kind_source: "checked", panel_id: panelId || null, print_note: note || null })
      .eq("id", photo.id)
      .select("id");
    if (error || !data?.length) {
      setMsg("Couldn't save. Only admins, brand leads and brand reviewers can label photos.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["event-photos", EVENT] });
    setMsg("Saved");
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo details" className="fixed inset-0 z-50 flex items-center justify-center bg-[#03002C]/80 p-4" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-[96rem] flex-col overflow-auto rounded-md bg-white lg:flex-row" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex flex-1 items-center justify-center gap-3 bg-[#03002C] p-3 lg:min-h-[80vh]">
          <span className="absolute left-3 top-3 rounded bg-black/40 px-2 py-0.5 font-mono text-[11px] text-white/85">{position}</span>
          <button type="button" aria-label="Previous photo" disabled={!onPrev} onClick={onPrev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30 disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft size={22} aria-hidden /></button>
          <button type="button" aria-label="Next photo" disabled={!onNext} onClick={onNext} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30 disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><ChevronRight size={22} aria-hidden /></button>
          {full.data?.[photo.path] ? <img src={full.data[photo.path]} alt={`Event photo ${photo.original_name}`} className="max-h-[88vh] max-w-full object-contain" /> : <p className="text-sm text-white/70">Loading…</p>}
          {panel ? (
            <div className="shrink-0 text-center">
              <LondonPanelThumb panel={panel} size={320} />
              <p className="mt-1 font-mono text-[10px] text-white/70">Print file · {panel.name}</p>
            </div>
          ) : null}
        </div>
        <div className="w-full shrink-0 space-y-3 p-5 lg:w-80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#03002C]">{photo.album}</p>
              <p className="font-mono text-[11px] text-[#03002C]/60">{photo.original_name}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-[#EEF1F7]"><X size={16} /></button>
          </div>
          <label className="block text-xs font-semibold text-[#03002C]">Sign type
            <select className={`${sel} mt-1 w-full`} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Not set</option>
              {Object.entries(SIGN_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#03002C]">Room
            <select className={`${sel} mt-1 w-full`} value={room} onChange={(e) => { setRoom(e.target.value); setPanelId(""); }}>
              <option value="">Not set</option>
              {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#03002C]">Sign in the schedule (to compare)
            <select className={`${sel} mt-1 w-full`} value={panelId} onChange={(e) => setPanelId(e.target.value)}>
              <option value="">None</option>
              {panels.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#03002C]">Print note
            <textarea className="mt-1 w-full rounded-md border border-[#03002C]/20 p-2 text-sm" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className="text-[11px] text-[#03002C]/60">{photo.sign_kind_source === "auto" ? "Sign type and note were tagged automatically — check before relying on them." : "Checked by a person."}</p>
          <button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-[#003FC7] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"><Check size={14} /> Save labels</button>
          {msg ? <p className="text-xs text-[#03002C]/75">{msg}</p> : null}
        </div>
      </div>
    </div>
  );
}
