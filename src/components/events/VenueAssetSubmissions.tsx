// Venue assets on an event page: add a new spot (e.g. a staircase floor wrap)
// with its location photo and live file in one step, then get a design review
// in the event's existing look. Sizes come only from the site survey.
import { spotPhotosFor, VENUE_SPOT_LIVE_FILES } from "@/lib/venue-spot-photos";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Download, FileUp, ImagePlus, PenTool, Plus, Sparkles, X } from "lucide-react";
import { venueFirstSignId } from "@/lib/legal-next-signage";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { saveVenueSpot, spotPhotoUrl, uploadSpotPhoto } from "@/lib/sign-set-data";
import { SIGN_KINDS, SIGN_KIND_LABEL, type SignKind } from "@/lib/sign-set";
import { reviewVenueArtwork } from "@/lib/venue-artwork.functions";

const field = "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-[14px] font-normal text-[#03002C]";
const btn = "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";
const primary = "inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03002C]";

type Review = { summary: string; fit: { ok: boolean; text: string }[]; design: string[]; risks: string[]; ask_venue: string[] };
type Artboard = { w_in: number; h_in: number };
type Row = { id: string; label: string; kind: string; room: string | null; w_in: number | null; h_in: number | null; sides: number; note: string | null; photo_path: string | null; artwork_path: string | null; artwork_name: string | null; artboards: Artboard[]; review: Review | null; reviewed_at: string | null };

/** Artboard sizes (inches) from a PDF-compatible .ai or .pdf. Best effort. */
async function readArtboards(file: File): Promise<Artboard[]> {
  if (!/\.(ai|pdf)$/i.test(file.name)) return [];
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const out: Artboard[] = [];
  for (const m of text.matchAll(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/g)) {
    const w = (Number(m[3]) - Number(m[1])) / 72, h = (Number(m[4]) - Number(m[2])) / 72;
    if (w > 0 && h > 0) out.push({ w_in: +w.toFixed(3), h_in: +h.toFixed(3) });
  }
  return out.slice(0, 40);
}

async function venueFor(eventId: string): Promise<string | null> {
  const { data } = await supabase.from("event_venues").select("venue_id").eq("event_id", eventId).maybeSingle();
  return data?.venue_id ?? null;
}

export function VenueAssetSubmissions({ eventId, eventLabel }: { eventId: string; eventLabel: string }) {
  const qc = useQueryClient();
  const review = useServerFn(reviewVenueArtwork);
  const key = ["venue-asset-submissions", eventId];
  const q = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { signedIn: false, venueId: null, rows: [] as Row[] };
      const venueId = await venueFor(eventId);
      if (!venueId) return { signedIn: true, venueId: null, rows: [] as Row[] };
      const { data, error } = await supabase
        .from("venue_sign_spots")
        .select("id,label,kind,room,w_in,h_in,sides,note,photo_path,artwork_path,artwork_name,artboards,review,reviewed_at")
        .eq("venue_id", venueId).not("artwork_path", "is", null).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return { signedIn: true, venueId, rows: (data ?? []) as unknown as Row[] };
    },
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [d, setD] = useState({ label: "", kind: "stair" as SignKind, room: "", w: "", h: "", sides: 1, note: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [art, setArt] = useState<File | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const num = (s: string) => { const n = Number(s.replace(",", ".")); return s.trim() && n > 0 ? n : null; };

  const runReview = async (id: string) => {
    setBusy(id);
    try { await review({ data: { spotId: id, eventId } }); await refresh(); toast.success("Design review ready"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Review failed."); }
    finally { setBusy(null); }
  };

  const submit = async () => {
    const venueId = q.data?.venueId;
    if (!venueId || !art || !d.label.trim()) return;
    setBusy("new");
    try {
      if (art.size > 50 * 1024 * 1024) throw new Error("The live file is over 50 MB.");
      const id = await saveVenueSpot({ venueId, label: d.label.trim(), kind: d.kind, floorKey: null, room: d.room.trim() || null, wIn: num(d.w), hIn: num(d.h), sides: d.sides, note: d.note.trim() || null, position: 999 });
      const ext = (art.name.split(".").pop() ?? "ai").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
      const path = `${venueId}/${id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("venue-artwork").upload(path, art, { contentType: art.type || "application/octet-stream" });
      if (up.error) throw new Error(up.error.message);
      const photoPath = photo ? await uploadSpotPhoto(venueId, id, photo) : null;
      const artboards = await readArtboards(art);
      const { error } = await supabase.from("venue_sign_spots").update({ artwork_path: path, artwork_name: art.name, artboards: artboards as never, submitted_event_id: eventId, ...(photoPath ? { photo_path: photoPath } : {}) }).eq("id", id);
      if (error) throw new Error(error.message);
      setOpen(false); setPhoto(null); setArt(null);
      setD({ label: "", kind: "stair", room: "", w: "", h: "", sides: 1, note: "" });
      await refresh();
      toast.success("Submitted — reviewing the design now");
      setBusy(null);
      await runReview(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't submit.");
      setBusy(null);
    }
  };

  return (
    <section id="venue-assets" className="mt-12 scroll-mt-24" aria-labelledby="venue-assets-h">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#03002C]/10 pb-3">
        <h2 id="venue-assets-h" className="text-lg font-semibold text-[#03002C]">Venue spots & artwork</h2>
        {q.data?.signedIn && q.data.venueId ? (
          <button type="button" className={primary} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {open ? "Close" : "Add venue spot & artwork"}
          </button>
        ) : null}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-[1.5] text-[#03002C]/70">
        A new place to brand at {eventLabel} — a staircase, floor wrap, wall or door. Add a photo of the location and the live file;
        the review checks it against the spot and suggests how to design it in the event's look. Sizes come from the site survey only.
      </p>
      {q.data && !q.data.signedIn ? <p className="mt-2 text-sm text-[#03002C]/65">Sign in to add or see venue artwork.</p> : null}
      {q.data?.signedIn && !q.data.venueId ? <p className="mt-2 text-sm text-[#03002C]/65">This event isn't linked to a venue yet.</p> : null}

      {open && (
        <div className="mt-4 rounded-md border border-[#03002C]/12 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[12px] font-semibold lg:col-span-2">Name<input className={field} value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder="e.g. Metro stairs — 5-tier floor wrap" /></label>
            <label className="text-[12px] font-semibold">Type
              <select className={field} value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as SignKind })}>
                {SIGN_KINDS.map((k) => <option key={k} value={k}>{SIGN_KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-semibold">Sides / surfaces
              <select className={field} value={d.sides} onChange={(e) => setD({ ...d, sides: Number(e.target.value) })}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-semibold lg:col-span-2">Where (room, level)<input className={field} value={d.room} onChange={(e) => setD({ ...d, room: e.target.value })} placeholder="e.g. Level 2, top of Metro stairs" /></label>
            <label className="text-[12px] font-semibold">Measured width (in)<input inputMode="decimal" className={field} value={d.w} onChange={(e) => setD({ ...d, w: e.target.value })} placeholder="From survey" /></label>
            <label className="text-[12px] font-semibold">Measured height (in)<input inputMode="decimal" className={field} value={d.h} onChange={(e) => setD({ ...d, h: e.target.value })} placeholder="From survey" /></label>
            <label className="text-[12px] font-semibold sm:col-span-2 lg:col-span-4">Note<input className={field} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Tiers, treads vs risers, material, anything the printer should know" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className={`${btn} cursor-pointer`}><ImagePlus className="h-4 w-4" /> {photo ? photo.name : "Location photo"}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <label className={`${btn} cursor-pointer`}><FileUp className="h-4 w-4" /> {art ? art.name : "Live file (.ai, .pdf, .svg)"}
              <input type="file" accept=".ai,.pdf,.svg,.eps,.psd" className="sr-only" onChange={(e) => setArt(e.target.files?.[0] ?? null)} />
            </label>
            <button type="button" className={primary} disabled={!!busy || !art || !d.label.trim()} onClick={submit}>
              <Sparkles className="h-4 w-4" /> {busy === "new" ? "Submitting…" : "Submit and review"}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-5 grid gap-4">
        {(q.data?.rows ?? []).map((r) => <AssetCard key={r.id} r={r} busy={busy === r.id} onReview={() => runReview(r.id)} />)}
        {q.data?.signedIn && q.data.venueId && !q.data.rows.length ? <li className="text-sm text-[#03002C]/65">No venue artwork submitted yet.</li> : null}
      </ul>
    </section>
  );
}

function AssetCard({ r, busy, onReview }: { r: Row; busy: boolean; onReview: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => { let live = true; if (r.photo_path) void spotPhotoUrl(r.photo_path).then((u) => live && setPhoto(u)); return () => { live = false; }; }, [r.photo_path]);
  const download = async () => {
    if (!r.artwork_path) return;
    const { data } = await supabase.storage.from("venue-artwork").createSignedUrl(r.artwork_path, 600, { download: r.artwork_name ?? true });
    if (data?.signedUrl) window.location.href = data.signedUrl;
  };
  const size = r.w_in && r.h_in ? `${r.w_in} × ${r.h_in} in` : "Needs measuring";
  const rv = r.review;
  return (
    <li className="grid gap-4 rounded-md border border-[#03002C]/12 bg-white p-5 md:grid-cols-[220px_1fr]">
      {photo ? <img src={photo} alt={`Location photo of ${r.label}`} className="h-56 w-full rounded object-cover" /> : <div className="grid h-56 place-items-center rounded bg-[#F2F2F2] text-sm text-[#666]">No photo</div>}
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-semibold text-[#03002C]">{r.label}</p>
            <p className="text-[12px] text-[#666]">{SIGN_KIND_LABEL[r.kind as SignKind] ?? r.kind}{r.room ? ` · ${r.room}` : ""} · <span className="font-semibold text-[#03002C]">{size}</span>{r.sides > 1 ? ` · ${r.sides} surfaces` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.artboards?.length ? (
              <Link to="/events/next/sign-editor/$signId" params={{ signId: venueFirstSignId(r.id, r.artboards) }} className={primary}>
                <PenTool className="h-4 w-4" /> Open first version in live editor
              </Link>
            ) : null}
            <button type="button" className={btn} onClick={download}><Download className="h-4 w-4" /> {r.artwork_name ?? "Live file"}</button>
            <button type="button" className={btn} disabled={busy} onClick={onReview}><Sparkles className="h-4 w-4" /> {busy ? "Reviewing…" : rv ? "Review again" : "Review design"}</button>
          </div>
        </div>
        {spotPhotosFor(r.id).length ? (
          <div className="mt-3">
            <p className="text-[12px] font-semibold text-[#03002C]">Location photos</p>
            <div className="mt-1 flex gap-2 overflow-x-auto">
              {spotPhotosFor(r.id).map((ph) => (
                <a key={ph.url} href={ph.url} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`Open ${ph.label} photo`}>
                  <img src={ph.url} alt={`${ph.label} of ${r.label}`} className="h-24 w-[72px] rounded object-cover" />
                  <span className="block text-center text-[11px] text-[#666]">{ph.label}</span>
                </a>
              ))}
            </div>
            {VENUE_SPOT_LIVE_FILES[r.id.slice(0, 8)] ? (
              <a href={VENUE_SPOT_LIVE_FILES[r.id.slice(0, 8)]!.url} download className="mt-1 inline-block text-[12px] font-semibold text-[#003FC7] hover:underline">Latest live file · {VENUE_SPOT_LIVE_FILES[r.id.slice(0, 8)]!.name}</a>
            ) : null}
          </div>
        ) : null}
        {r.artboards?.length ? (
          <p className="mt-2 text-[12px] text-[#03002C]/70">
            Live file has {r.artboards.length} artboard{r.artboards.length === 1 ? "" : "s"}: {r.artboards.map((a) => `${a.w_in} × ${a.h_in}`).join(" · ")} in (designer's sizes, not the survey)
          </p>
        ) : null}
        {rv ? (
          <div className="mt-3 grid gap-3 text-[13px] leading-[1.5] text-[#03002C]">
            <p>{rv.summary}</p>
            <ReviewList title="Fit check" items={rv.fit.map((f) => `${f.ok ? "OK" : "Check"} — ${f.text}`)} />
            <ReviewList title="Design it in the NEXT look" items={rv.design} />
            <ReviewList title="Print and on-site risks" items={rv.risks} />
            <ReviewList title="Still to confirm with the venue" items={rv.ask_venue} />
            <p className="text-[11px] text-[#666]">AI review{r.reviewed_at ? ` · ${new Date(r.reviewed_at).toLocaleString()}` : ""}. Suggestions only — nothing changes the file until a designer does.</p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#03002C]/70">{title}</p>
      <ul className="mt-1 list-disc pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}
