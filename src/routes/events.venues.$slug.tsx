// /events/venues/$slug — one venue: its facts and floors. Floors load from the
// venue's own SVG sheets; tab, title, order and hidden venue clutter are edited here.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  deleteVenueFloor,
  getVenue,
  importBundledQeiiFloors,
  saveVenue,
  saveVenueFloor,
  updateVenueFloorMeta,
} from "@/lib/venues.functions";
import { importSvgFloor } from "@/lib/venue-map-import";

export const Route = createFileRoute("/events/venues/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Venue · ${params.slug} — floors and facts` },
      { name: "description", content: "A venue's floor sheets, rooms and facts, shared by every event held there." },
      { property: "og:title", content: `Venue · ${params.slug}` },
      { property: "og:description", content: "Floor sheets and venue facts from the venue library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VenuePage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50";
const field = "mt-1 w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-[14px] font-normal text-[#03002C]";
const keyFrom = (t: string) =>
  t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "floor";

type Floor = {
  id: string; floor_key: string; marker: string; title: string; position: number;
  source_kind: string; source_name: string | null; off_plan_labels: string[]; roomCount: number;
};

function VenuePage() {
  const { slug } = Route.useParams();
  const userId = useSessionUser();
  const qc = useQueryClient();
  const get = useServerFn(getVenue);
  const q = useQuery({ queryKey: ["venue", slug], queryFn: () => get({ data: { slug } }), enabled: !!userId });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["venue", slug] }), qc.invalidateQueries({ queryKey: ["venues"] }), qc.invalidateQueries({ queryKey: ["venue-floors", slug] })]);

  const saveFacts = useServerFn(saveVenue);
  const saveFloor = useServerFn(saveVenueFloor);
  const saveMeta = useServerFn(updateVenueFloorMeta);
  const removeFloor = useServerFn(deleteVenueFloor);
  const copyBundled = useServerFn(importBundledQeiiFloors);

  const [facts, setFacts] = useState<Record<string, string> | null>(null);
  const [title, setTitle] = useState("");
  const [marker, setMarker] = useState("");
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  if (userId === null) return <AppShell><p className="p-8 text-[14px]">Sign in to see this venue.</p></AppShell>;
  const v = q.data?.venue;
  const floors = (q.data?.floors ?? []) as Floor[];
  const f = facts ?? (v ? { name: v.name, city: v.city, country: v.country, address: v.address, timezone: v.timezone, sourceNote: v.source_note } : null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await refresh(); toast.success(label); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't save."); }
    finally { setBusy(false); }
  }

  async function onFile(file: File) {
    if (!title.trim()) return toast.error("Name the floor first, e.g. “Third floor”.");
    if (file.size > 15 * 1024 * 1024) return toast.error("That file is over 15 MB. Export just the floor plan as SVG.");
    const key = keyFrom(marker || title);
    const { floor, notes: n } = importSvgFloor(await file.text(), {
      id: key, marker: marker.trim() || title.trim().slice(0, 2).toUpperCase(), title: title.trim(),
    });
    setNotes(n);
    if (floor.kind === "artwork") return;
    await run("Floor saved to the venue", () =>
      saveFloor({ data: {
        slug, floorKey: key, marker: floor.marker, title: floor.title,
        position: floors.find((x) => x.floor_key === key)?.position ?? floors.length,
        sourceKind: scan ? "scan" : "vector", sourceName: file.name.slice(0, 200),
        w: floor.w, h: floor.h, shapes: floor.shapes, labels: floor.labels, offPlanLabels: [],
      } }),
    );
    setTitle(""); setMarker("");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 sm:px-8 text-[#03002C]">
        <Link to="/events/venues" className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]">
          <ArrowLeft className="h-4 w-4" /> Venue library
        </Link>
        {q.isLoading && <p className="mt-6 text-[14px]">Loading venue…</p>}
        {q.error && <p className="mt-6 text-[14px] text-[#E53D2E]">Couldn't load this venue: {(q.error as Error).message}</p>}
        {q.data === null && <p className="mt-6 text-[14px]">No venue with that name is saved.</p>}
        {v && f && (
          <>
            <h1 className="mt-5 text-3xl font-bold leading-tight">{v.name}</h1>
            <p className="mt-1 text-[13px] text-[#666666]">
              {q.data!.events.length ? `Used by: ${q.data!.events.join(", ")}` : "Not linked to an event yet"}
            </p>

            <section className={`${card} mt-6`}>
              <h2 className="text-[17px] font-bold">Venue facts</h2>
              <p className="mt-1 text-[13px] text-[#666666]">Only what the venue has issued or you've confirmed. Leave anything unknown blank.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([["name", "Name"], ["city", "City"], ["country", "Country"], ["address", "Address"], ["timezone", "Time zone"], ["sourceNote", "Source note"]] as const).map(([k, label]) => (
                  <label key={k} className="text-[13px] font-semibold">
                    {label}
                    <input className={field} value={f[k] ?? ""} onChange={(e) => setFacts({ ...f, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <button className={`${btn} mt-4`} disabled={busy || !facts} onClick={() =>
                run("Venue facts saved", () => saveFacts({ data: { slug, name: f.name, city: f.city, country: f.country, address: f.address, timezone: f.timezone, sourceNote: f.sourceNote } }).then(() => setFacts(null)))}>
                <Save className="h-4 w-4" /> Save facts
              </button>
            </section>

            <section className={`${card} mt-6`}>
              <h2 className="text-[17px] font-bold">Floors</h2>
              {floors.length === 0 && (
                <p className="mt-2 text-[14px] text-[#666666]">No floors yet. Nothing is drawn until the venue's plans arrive.</p>
              )}
              {slug === "qeii-centre" && floors.length < 7 && (
                <div className="mt-3 rounded-lg bg-[#E0E8F5] p-3 text-[13px]">
                  The London maps draw from the build's own copy of the QEII floors until they're saved here.
                  <button className={`${btn} ml-3`} disabled={busy} onClick={() => run("QEII floors copied into the venue library", () => copyBundled())}>
                    Copy the built-in QEII floors
                  </button>
                </div>
              )}
              <ul className="mt-4 divide-y divide-[#03002C]/10">
                {floors.map((fl) => <FloorRow key={fl.id} fl={fl} busy={busy}
                  onSave={(m) => run("Floor updated", () => saveMeta({ data: { id: fl.id, ...m } }))}
                  onDelete={() => { if (confirm(`Remove “${fl.title}” from this venue? Every event at this venue loses the floor.`)) void run("Floor removed", () => removeFloor({ data: { id: fl.id } })); }} />)}
              </ul>

              <div className="mt-6 grid gap-3 border-t border-[#03002C]/10 pt-5 sm:grid-cols-[1fr_120px_auto]">
                <label className="text-[13px] font-semibold">Floor name<input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Third floor" /></label>
                <label className="text-[13px] font-semibold">Tab<input className={field} value={marker} maxLength={6} onChange={(e) => setMarker(e.target.value)} placeholder="3" /></label>
                <label className={`${btn} self-end cursor-pointer`}>
                  <Upload className="h-4 w-4" /> {busy ? "Saving…" : "Load floor SVG"}
                  <input type="file" accept=".svg,image/svg+xml" className="sr-only" disabled={busy}
                    onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void onFile(file); }} />
                </label>
                <label className="flex items-center gap-2 text-[13px] sm:col-span-3">
                  <input type="checkbox" checked={scan} onChange={(e) => setScan(e.target.checked)} />
                  This floor was traced from a picture scan (shown as lower quality)
                </label>
              </div>
              {notes.length > 0 && <ul className="mt-3 list-disc pl-5 text-[13px] text-[#666666]">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function FloorRow({ fl, busy, onSave, onDelete }: {
  fl: Floor; busy: boolean;
  onSave: (m: { marker: string; title: string; position: number; offPlanLabels: string[] }) => void;
  onDelete: () => void;
}) {
  const [m, setM] = useState({ marker: fl.marker, title: fl.title, position: fl.position, hide: fl.off_plan_labels.join(", ") });
  const dirty = m.marker !== fl.marker || m.title !== fl.title || m.position !== fl.position || m.hide !== fl.off_plan_labels.join(", ");
  return (
    <li className="grid gap-3 py-3 sm:grid-cols-[70px_80px_1fr_1.4fr_auto] sm:items-end">
      <label className="text-[12px] font-semibold">Order<input type="number" min={0} max={99} className={field} value={m.position} onChange={(e) => setM({ ...m, position: Number(e.target.value) || 0 })} /></label>
      <label className="text-[12px] font-semibold">Tab<input className={field} maxLength={6} value={m.marker} onChange={(e) => setM({ ...m, marker: e.target.value })} /></label>
      <label className="text-[12px] font-semibold">Name<input className={field} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} />
        <span className="mt-1 block font-normal text-[#666666]">{fl.roomCount} labels · {fl.source_kind === "scan" ? "picture scan (lower quality)" : "drawn vector"}{fl.source_name ? ` · ${fl.source_name}` : ""}</span>
      </label>
      <label className="text-[12px] font-semibold">Hide on plan (comma-separated)<input className={field} value={m.hide} onChange={(e) => setM({ ...m, hide: e.target.value })} placeholder="catering lift, void" /></label>
      <div className="flex gap-2">
        <button className={btn} disabled={busy || !dirty || !m.title.trim()} onClick={() => onSave({ marker: m.marker, title: m.title, position: m.position, offPlanLabels: m.hide.split(",").map((s) => s.trim()).filter(Boolean) })}><Save className="h-4 w-4" /> Save</button>
        <button className={btn} disabled={busy} onClick={onDelete} aria-label={`Remove ${fl.title}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </li>
  );
}
