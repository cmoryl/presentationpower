// Venue sign list — every sign spot at a venue, filled in once (on a phone
// during the site survey is fine) and reused by every later event there.
// A spot with no measured size stays "Needs measuring" and can't go to print.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteVenueSpot, listVenueSpots, saveVenueSpot, spotPhotoUrl, uploadSpotPhoto, type SignSpotRow } from "@/lib/sign-set-data";
import { SIGN_KINDS, SIGN_KIND_LABEL, type SignKind } from "@/lib/sign-set";

const field = "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-[14px] font-normal text-[#03002C]";
const btn = "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";

type Floor = { floor_key: string; title: string };
type Draft = { label: string; kind: SignKind; floorKey: string; room: string; w: string; h: string; sides: number; note: string };
const blank: Draft = { label: "", kind: "room_sign", floorKey: "", room: "", w: "", h: "", sides: 1, note: "" };
const num = (s: string) => { const n = Number(s.replace(",", ".")); return s.trim() && Number.isFinite(n) && n > 0 ? n : null; };
const toDraft = (s: SignSpotRow): Draft => ({ label: s.label, kind: s.kind, floorKey: s.floor_key ?? "", room: s.room ?? "", w: s.w_in?.toString() ?? "", h: s.h_in?.toString() ?? "", sides: s.sides, note: s.note ?? "" });

export function VenueSignSpots({ venueId, floors }: { venueId: string; floors: Floor[] }) {
  const qc = useQueryClient();
  const key = ["venue-sign-spots", venueId];
  const q = useQuery({ queryKey: key, queryFn: () => listVenueSpots(venueId) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const [add, setAdd] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const spots = q.data ?? [];
  const measured = spots.filter((s) => s.w_in != null && s.h_in != null).length;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await refresh(); toast.success(label); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't save."); }
    finally { setBusy(false); }
  }
  const save = (d: Draft, id?: string, position = spots.length) =>
    saveVenueSpot({ id, venueId, label: d.label.trim(), kind: d.kind, floorKey: d.floorKey || null, room: d.room.trim() || null, wIn: num(d.w), hIn: num(d.h), sides: d.sides, note: d.note.trim() || null, position });

  return (
    <section className="mt-6 rounded-2xl border border-[#03002C]/12 bg-white p-5" aria-labelledby="sign-list-h">
      <h2 id="sign-list-h" className="text-[17px] font-bold">Sign list</h2>
      <p className="mt-1 text-[13px] text-[#666666]">
        Every place a sign goes at this venue, with its measured size. Fill it in once and every later event here reuses it.
        Sizes come from the site survey only; a spot with no size stays “Needs measuring” and can't be sent to print.
      </p>
      {spots.length > 0 && <p className="mt-2 text-[13px] font-semibold">{spots.length} spot{spots.length === 1 ? "" : "s"} · {measured} measured</p>}
      {q.error && <p className="mt-3 text-[13px] text-[#E53D2E]">Couldn't load the sign list: {(q.error as Error).message}</p>}

      <ul className="mt-4 divide-y divide-[#03002C]/10">
        {spots.map((s) => (
          <SpotRow key={s.id} spot={s} floors={floors} busy={busy}
            onSave={(d) => run("Sign spot saved", () => save(d, s.id, s.position))}
            onPhoto={(file) => run("Photo added", async () => { const path = await uploadSpotPhoto(venueId, s.id, file); await saveVenueSpot({ ...{ id: s.id, venueId, label: s.label, kind: s.kind, floorKey: s.floor_key, room: s.room, wIn: s.w_in, hIn: s.h_in, sides: s.sides, note: s.note, position: s.position }, photoPath: path }); })}
            onDelete={() => { if (confirm(`Remove “${s.label}” from this venue's sign list? Signs built for it in any event are removed too.`)) void run("Sign spot removed", () => deleteVenueSpot(s.id)); }} />
        ))}
      </ul>

      <div className="mt-5 border-t border-[#03002C]/10 pt-5">
        <h3 className="text-[14px] font-bold">Add a sign spot</h3>
        <SpotFields d={add} floors={floors} onChange={setAdd} />
        <button className={`${btn} mt-3`} disabled={busy || !add.label.trim()} onClick={() => run("Sign spot added", () => save(add).then(() => setAdd({ ...blank, kind: add.kind, floorKey: add.floorKey })))}>
          <Plus className="h-4 w-4" /> Add spot
        </button>
      </div>
    </section>
  );
}

function SpotFields({ d, floors, onChange }: { d: Draft; floors: Floor[]; onChange: (d: Draft) => void }) {
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-[12px] font-semibold lg:col-span-2">Name<input className={field} value={d.label} onChange={(e) => onChange({ ...d, label: e.target.value })} placeholder="e.g. Sutter room door" /></label>
      <label className="text-[12px] font-semibold">Type
        <select className={field} value={d.kind} onChange={(e) => onChange({ ...d, kind: e.target.value as SignKind })}>
          {SIGN_KINDS.map((k) => <option key={k} value={k}>{SIGN_KIND_LABEL[k]}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-semibold">Floor
        <select className={field} value={d.floorKey} onChange={(e) => onChange({ ...d, floorKey: e.target.value })}>
          <option value="">Not set</option>
          {floors.map((f) => <option key={f.floor_key} value={f.floor_key}>{f.title}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-semibold lg:col-span-2">Room (as on the room list)<input className={field} value={d.room} onChange={(e) => onChange({ ...d, room: e.target.value })} placeholder="Leave empty if it isn't for one room" /></label>
      <label className="text-[12px] font-semibold">Width (in)<input inputMode="decimal" className={field} value={d.w} onChange={(e) => onChange({ ...d, w: e.target.value })} placeholder="Measured" /></label>
      <label className="text-[12px] font-semibold">Height (in)<input inputMode="decimal" className={field} value={d.h} onChange={(e) => onChange({ ...d, h: e.target.value })} placeholder="Measured" /></label>
      <label className="text-[12px] font-semibold">Sides
        <select className={field} value={d.sides} onChange={(e) => onChange({ ...d, sides: Number(e.target.value) })}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "One-sided" : n === 2 ? "Two-sided" : `${n} sides`}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-semibold sm:col-span-2 lg:col-span-3">Note<input className={field} value={d.note} onChange={(e) => onChange({ ...d, note: e.target.value })} placeholder="Fixing, access, anything the printer should know" /></label>
    </div>
  );
}

function SpotRow({ spot, floors, busy, onSave, onPhoto, onDelete }: { spot: SignSpotRow; floors: Floor[]; busy: boolean; onSave: (d: Draft) => void; onPhoto: (f: File) => void; onDelete: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(spot));
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => { setD(toDraft(spot)); }, [spot]);
  useEffect(() => { let live = true; if (spot.photo_path) void spotPhotoUrl(spot.photo_path).then((u) => live && setPhoto(u)); return () => { live = false; }; }, [spot.photo_path]);
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(spot));
  const size = spot.w_in != null && spot.h_in != null ? `${spot.w_in} × ${spot.h_in} in` : "Needs measuring";
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        {photo ? <img src={photo} alt={`Photo of ${spot.label}`} className="h-12 w-12 rounded object-cover" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{spot.label}</p>
          <p className="text-[12px] text-[#666666]">
            {SIGN_KIND_LABEL[spot.kind]} · {floors.find((f) => f.floor_key === spot.floor_key)?.title ?? "No floor"}{spot.room ? ` · ${spot.room}` : ""} ·{" "}
            <span className={spot.w_in == null || spot.h_in == null ? "font-semibold text-[#03002C]" : ""}>{size}</span>
            {spot.sides > 1 ? ` · ${spot.sides} sides` : ""}
          </p>
        </div>
        <button className={btn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Close" : "Edit"}</button>
        <label className={`${btn} cursor-pointer`}>
          <Camera className="h-4 w-4" /> Photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPhoto(f); }} />
        </label>
        <button className={btn} disabled={busy} onClick={onDelete} aria-label={`Remove ${spot.label}`}><Trash2 className="h-4 w-4" /> Remove</button>
      </div>
      {open && (
        <div className="mt-2">
          <SpotFields d={d} floors={floors} onChange={setD} />
          <button className={`${btn} mt-3`} disabled={busy || !dirty || !d.label.trim()} onClick={() => onSave(d)}><Save className="h-4 w-4" /> {dirty ? "Save changes" : "Saved"}</button>
        </div>
      )}
    </li>
  );
}
