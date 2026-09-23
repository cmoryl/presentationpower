// /events/next/maps/$eventId — the venue map set for any event. Floors come
// from the venue's own vector files; the London map engine draws, colours and
// exports them with the same looks, room cuts and approved palette.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  deleteEventMapFloor,
  listEventMapFloors,
  saveEventMapFloor,
  updateEventMapRooms,
} from "@/lib/event-maps.functions";
import { eventFloorId, importSvgFloor } from "@/lib/venue-map-import";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";
import { QEII_ROOM_PALETTE, qeiiRoomShapes } from "@/lib/next-london-qeii-rooms";
import { QEII_MAP_LOOKS, QEII_MAP_LOOK_ORDER, type QeiiPlanFace } from "@/lib/next-london-qeii-style";

export const Route = createFileRoute("/events/next_/maps/$eventId")({
  head: () => ({
    meta: [
      { title: "Event venue maps — floors for any venue" },
      {
        name: "description",
        content: "Load a venue's own floor plans, colour each room in approved colours and download editable maps.",
      },
      { property: "og:title", content: "Event venue maps" },
      { property: "og:description", content: "Venue floor maps for any event, drawn in the NEXT map looks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapsPage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50";
const field = "w-full rounded-lg border border-[#03002C]/20 bg-white px-3 py-2 text-[14px] text-[#03002C]";

type Row = {
  floor_key: string;
  marker: string;
  title: string;
  position: number;
  source_kind: string;
  source_name: string | null;
  w: number;
  h: number;
  shapes: unknown;
  labels: unknown;
  room_colours: unknown;
  room_uses: unknown;
};

const toFloor = (eventId: string, r: Row): QeiiFloorVector => ({
  id: eventFloorId(eventId, r.floor_key),
  marker: r.marker,
  title: r.title,
  page: r.position + 1,
  kind: "vector",
  w: r.w,
  h: r.h,
  shapes: (r.shapes as QeiiFloorVector["shapes"]) ?? [],
  labels: (r.labels as QeiiFloorVector["labels"]) ?? [],
});

const keyFrom = (t: string) =>
  t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "floor";

function MapsPage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const list = useServerFn(listEventMapFloors);
  const save = useServerFn(saveEventMapFloor);
  const saveRooms = useServerFn(updateEventMapRooms);
  const remove = useServerFn(deleteEventMapFloor);
  const q = useQuery({ queryKey: ["event-map-floors", eventId], queryFn: () => list({ data: { eventId } }) });

  const rows = (q.data?.floors ?? []) as Row[];
  const [active, setActive] = useState<string | null>(null);
  const current = rows.find((r) => r.floor_key === active) ?? rows[0];
  const [face, setFace] = useState<QeiiPlanFace>("signage");
  const [colours, setColours] = useState<Record<string, Record<string, string>>>({});
  const [uses, setUses] = useState<Record<string, Record<string, string>>>({});
  const [brush, setBrush] = useState<string>(QEII_ROOM_PALETTE[0].hex);

  // Upload form
  const [title, setTitle] = useState("");
  const [marker, setMarker] = useState("");
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  const floor = useMemo(() => (current ? toFloor(eventId, current) : null), [eventId, current]);
  const roomColours = current ? (colours[current.floor_key] ?? (current.room_colours as Record<string, string>) ?? {}) : {};
  const roomUses = current ? (uses[current.floor_key] ?? (current.room_uses as Record<string, string>) ?? {}) : {};
  const rooms = useMemo(
    () => (floor ? [...new Set(qeiiRoomShapes(floor).map((r) => r.room))].sort() : []),
    [floor],
  );
  const plan = q.data?.plan;
  const sheet = useMemo(
    () => ({
      venueName: plan?.venue || plan?.name || "Venue",
      tabs: rows.map((r) => ({ id: eventFloorId(eventId, r.floor_key), label: r.marker })),
    }),
    [plan, rows, eventId],
  );
  const svg = useMemo(
    () => (floor ? qeiiPlanSvg(floor, { face, roomColours, sheet }) : ""),
    [floor, face, roomColours, sheet],
  );

  async function onFile(file: File) {
    if (!title.trim()) return toast.error("Name the floor first, e.g. “Third floor”.");
    if (file.size > 15 * 1024 * 1024) return toast.error("That file is over 15 MB. Export just the floor plan as SVG.");
    setBusy(true);
    setNotes([]);
    try {
      const key = keyFrom(marker || title);
      const { floor: f, notes: n } = importSvgFloor(await file.text(), {
        id: eventFloorId(eventId, key),
        marker: marker.trim() || title.trim().slice(0, 2).toUpperCase(),
        title: title.trim(),
      });
      setNotes(n);
      if (f.kind === "artwork") return;
      await save({
        data: {
          eventId,
          floorKey: key,
          marker: f.marker,
          title: f.title,
          position: rows.find((r) => r.floor_key === key)?.position ?? rows.length,
          sourceKind: scan ? "scan" : "vector",
          sourceName: file.name.slice(0, 200),
          w: f.w,
          h: f.h,
          shapes: f.shapes,
          labels: f.labels,
        },
      });
      await qc.invalidateQueries({ queryKey: ["event-map-floors", eventId] });
      setActive(key);
      setTitle("");
      setMarker("");
      toast.success(`${f.title} loaded — ${f.shapes.length} shapes, ${f.labels.length} names.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveRooms() {
    if (!current) return;
    try {
      await saveRooms({ data: { eventId, floorKey: current.floor_key, roomColours, roomUses } });
      await qc.invalidateQueries({ queryKey: ["event-map-floors", eventId] });
      toast.success("Room colours and uses saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function download() {
    if (!current || !svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rdraft-${eventId}-${current.floor_key}-${face}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const paint = (room: string) => {
    if (!current) return;
    const next = { ...roomColours };
    if (brush === "none") delete next[room];
    else next[room] = brush;
    setColours((c) => ({ ...c, [current.floor_key]: next }));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 text-[#03002C]">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/events/next/intake/$eventId" params={{ eventId }} className={btn}>
            <ArrowLeft className="h-4 w-4" /> Venue checklist
          </Link>
        </div>
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#666666]">Venue maps</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">{plan?.name ?? eventId}</h1>
          <p className="mt-1 text-[14px] text-[#666666]">
            {[plan?.venue, plan?.city, plan?.dates_label].filter(Boolean).join(" · ") || "Venue details still to come"}
          </p>
        </header>

        <section className={card}>
          <h2 className="text-[17px] font-bold">Add a floor from the venue's file</h2>
          <p className="mt-1 text-[13px] text-[#666666]">
            Use the venue's vector plan saved as SVG (from Illustrator, Canva or Acrobat). Walls and rooms are used exactly
            as drawn; room names must be live text so each room can be matched and coloured.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto_auto] sm:items-end">
            <label className="text-[13px] font-semibold">
              Floor name
              <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Third floor" />
            </label>
            <label className="text-[13px] font-semibold">
              Tab
              <input className={field} value={marker} maxLength={6} onChange={(e) => setMarker(e.target.value)} placeholder="3" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-[13px]">
              <input type="checkbox" checked={scan} onChange={(e) => setScan(e.target.checked)} />
              Traced from a picture
            </label>
            <label className={`${btn} cursor-pointer`}>
              <Upload className="h-4 w-4" /> {busy ? "Reading…" : "Choose SVG"}
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onFile(f);
                }}
              />
            </label>
          </div>
          {notes.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </section>

        {q.isLoading && <p className="text-[14px]">Loading floors…</p>}
        {q.error && <p className="text-[14px] text-[#E53D2E]">Couldn't load floors: {(q.error as Error).message}</p>}
        {!q.isLoading && !rows.length && (
          <p className="text-[14px] text-[#666666]">No floors yet. Nothing is drawn until the venue's plans arrive.</p>
        )}

        {current && floor && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {rows.map((r) => (
                  <button
                    key={r.floor_key}
                    type="button"
                    onClick={() => setActive(r.floor_key)}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                      r.floor_key === current.floor_key ? "bg-[#003FC7] text-white" : "border border-[#03002C]/20 bg-white"
                    }`}
                  >
                    {r.marker} · {r.title}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[13px] font-semibold" htmlFor="look">
                  Look
                </label>
                <select id="look" className="rounded-lg border border-[#03002C]/20 px-2 py-1.5 text-[13px]" value={face} onChange={(e) => setFace(e.target.value as QeiiPlanFace)}>
                  {QEII_MAP_LOOK_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {QEII_MAP_LOOKS[id].name}
                    </option>
                  ))}
                </select>
                <button type="button" className={btn} onClick={download}>
                  <Download className="h-4 w-4" /> SVG
                </button>
                <button
                  type="button"
                  className={btn}
                  onClick={async () => {
                    if (!confirm(`Remove ${current.title} from this map set?`)) return;
                    await remove({ data: { eventId, floorKey: current.floor_key } });
                    setActive(null);
                    await qc.invalidateQueries({ queryKey: ["event-map-floors", eventId] });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove floor
                </button>
              </div>
              {current.source_kind === "scan" && (
                <p className="rounded-lg bg-[#FFEB66]/50 px-3 py-2 text-[13px]">
                  Traced from a picture — lower quality than the venue's own drawing.
                </p>
              )}
              <div
                className="overflow-hidden rounded-2xl border border-[#03002C]/12 bg-white [&_svg]:h-auto [&_svg]:w-full"
                // Our own renderer's output from the venue's geometry.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="text-[12px] text-[#666666]">Draft — file names use “rdraft-” until a revision is published.</p>
            </div>

            <aside className={`${card} h-fit space-y-4`}>
              <div>
                <h2 className="text-[15px] font-bold">Room colours</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QEII_ROOM_PALETTE.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.label}
                      aria-label={p.label}
                      onClick={() => setBrush(p.hex)}
                      className={`h-7 w-7 rounded-full border ${brush === p.hex ? "ring-2 ring-[#003FC7] ring-offset-2" : "border-[#03002C]/20"}`}
                      style={{ background: p.hex }}
                    />
                  ))}
                  <button type="button" onClick={() => setBrush("none")} className={`rounded-full border px-2 text-[12px] ${brush === "none" ? "ring-2 ring-[#003FC7]" : "border-[#03002C]/20"}`}>
                    No colour
                  </button>
                </div>
              </div>
              {rooms.length === 0 ? (
                <p className="text-[13px] text-[#666666]">
                  No rooms matched — room names need to sit inside closed room shapes as live text.
                </p>
              ) : (
                <ul className="max-h-[520px] space-y-2 overflow-auto pr-1">
                  {rooms.map((room) => (
                    <li key={room} className="rounded-lg border border-[#03002C]/10 p-2">
                      <button type="button" onClick={() => paint(room)} className="flex w-full items-center gap-2 text-left text-[13px] font-semibold">
                        <span className="h-4 w-4 rounded-sm border border-[#03002C]/20" style={{ background: roomColours[room] ?? "#FFFFFF" }} />
                        {room}
                      </button>
                      <input
                        className="mt-1 w-full rounded border border-[#03002C]/15 px-2 py-1 text-[12px]"
                        placeholder="What it holds (optional)"
                        value={roomUses[room] ?? ""}
                        onChange={(e) =>
                          setUses((u) => ({ ...u, [current.floor_key]: { ...roomUses, [room]: e.target.value.slice(0, 200) } }))
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className={btn} onClick={onSaveRooms}>
                <Save className="h-4 w-4" /> Save rooms
              </button>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
