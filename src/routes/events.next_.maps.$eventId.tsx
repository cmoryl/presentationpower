// /events/next/maps/$eventId — the venue map set for any event. Floors come
// from the venue's own vector files; the London map engine draws, colours and
// exports them with the same looks, room cuts and approved palette.

import { saveFile } from "@/lib/save-file";
import { selfContainedSvg } from "@/lib/export-self-contained-svg";
import { Button } from "@/design-system/element";
import { PlanZoomFrame } from "@/components/events/PlanZoomFrame";
import { listVenueMapEdits, saveVenueMapEdits } from "@/lib/qeii-map-edits.functions";
import { EMPTY_QEII_MAP_EDITS, qeiiFloorMapEdits, qeiiApplyRoomEdit, qeiiClearRoomEdit, qeiiRoomEdit, type QeiiMapEdits, type QeiiRoomEdit } from "@/lib/qeii-map-edits";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { eventDisplayName } from "@/lib/event-names";
import { useEffect, useMemo, useState } from "react";
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
import { saveVenueFloor } from "@/lib/venues.functions";
import { eventFloorId, importSvgFloor } from "@/lib/venue-map-import";
import { eventMapFloor, eventMapSheet, eventMapSvg, type EventMapRow } from "@/lib/event-floor-plan";
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

type Row = EventMapRow;
const toFloor = eventMapFloor;

const keyFrom = (t: string) =>
  t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "floor";

function MapsPage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const list = useServerFn(listEventMapFloors);
  const save = useServerFn(saveEventMapFloor);
  const saveRooms = useServerFn(updateEventMapRooms);
  const saveToVenue = useServerFn(saveVenueFloor);
  const remove = useServerFn(deleteEventMapFloor);
  const listLabelEdits = useServerFn(listVenueMapEdits);
  const saveLabelEdits = useServerFn(saveVenueMapEdits);
  const labelScope = `event-${eventId}`;
  const labelQuery = useQuery({ queryKey: ["map-label-edits", labelScope], queryFn: () => listLabelEdits({ data: { venueSlug: labelScope } }) });
  const [labelDrafts, setLabelDrafts] = useState<Record<string, QeiiMapEdits>>({});
  const [selectedLabel, setSelectedLabel] = useState("");
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
  const labelEdits = useMemo(() => current ? qeiiFloorMapEdits(eventFloorId(eventId, current.floor_key), labelDrafts[current.floor_key] ?? labelQuery.data?.floors.find((f) => f.floorId === current.floor_key)?.edits) : EMPTY_QEII_MAP_EDITS, [current, eventId, labelDrafts, labelQuery.data]);
  const labelLayout = useMemo(() => floor ? qeiiPlanLayout(floor, { edits: labelEdits }) : null, [floor, labelEdits]);
  const labelRoom = labelLayout?.blocks.find((b) => b.room === selectedLabel)?.room ?? labelLayout?.blocks[0]?.room ?? "";
  const labelEdit = qeiiRoomEdit(labelEdits, labelRoom);
  const patchLabel = (patch: QeiiRoomEdit) => {
    if (!current || !labelRoom) return;
    setLabelDrafts((d) => ({ ...d, [current.floor_key]: qeiiApplyRoomEdit(labelEdits, labelRoom, patch) }));
  };
  const plan = q.data?.plan;
  const sheet = useMemo(
    () => eventMapSheet(eventId, rows, { plan: plan?.venue, venue: q.data?.venue?.name, fallback: plan?.name }),
    [plan, rows, eventId, q.data?.venue],
  );
  const svg = useMemo(
    () => (floor ? eventMapSvg(floor, { face, roomColours, sheet, edits: labelEdits }) : ""),
    [floor, face, roomColours, sheet, labelEdits],
  );
  const [preparedSvg, setPreparedSvg] = useState<{ source: string; file: string } | null>(null);
  const [svgError, setSvgError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setSvgError("");
    if (svg) void selfContainedSvg(svg).then((file) => {
      if (!cancelled) setPreparedSvg({ source: svg, file });
    }).catch((error) => {
      if (!cancelled) setSvgError(error instanceof Error ? error.message : "Could not embed the logo.");
    });
    return () => { cancelled = true; };
  }, [svg]);

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
      const venue = q.data?.venue;
      const common = {
        floorKey: key,
        marker: f.marker,
        title: f.title,
        position: rows.find((r) => r.floor_key === key)?.position ?? rows.length,
        sourceKind: (scan ? "scan" : "vector") as "scan" | "vector",
        sourceName: file.name.slice(0, 200),
        w: f.w,
        h: f.h,
        shapes: f.shapes,
        labels: f.labels,
      };
      // Floors belong to the venue, so every event held there shares them.
      if (venue) await saveToVenue({ data: { slug: venue.slug, ...common, offPlanLabels: [] } });
      else await save({
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
    if (!current || !preparedSvg || preparedSvg.source !== svg) {
      toast.error("The map is still drawing — try again in a moment.");
      return;
    }
    saveFile(new Blob([preparedSvg.file], { type: "image/svg+xml" }), `rdraft-${eventId}-${current.floor_key}-${face}.svg`);
  }

  const [pdfBusy, setPdfBusy] = useState(false);
  async function downloadPdf() {
    if (!current || !preparedSvg || preparedSvg.source !== svg) {
      toast.error("The map is still drawing — try again in a moment.");
      return;
    }
    setPdfBusy(true);
    try {
      // The SVG goes into the PDF as vector artwork (walls, rooms and names stay
      // editable in Illustrator/Acrobat), not as a picture.
      const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
      // PDF fills have no per-stop transparency, so a fade toward clear is written
      // as the same fade toward white — identical on the map's white ground.
      const flat = preparedSvg.file.replace(
        /stop-color="#([0-9a-fA-F]{6})"([^>]*?)\sstop-opacity="([\d.]+)"/g,
        (_m, hex: string, rest: string, op: string) => {
          const a = Number(op);
          const n = parseInt(hex, 16);
          const mix = (v: number) => Math.round(v * a + 255 * (1 - a)).toString(16).padStart(2, "0");
          return `stop-color="#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}"${rest}`;
        },
      );
      const el = new DOMParser().parseFromString(flat, "image/svg+xml").documentElement as unknown as SVGSVGElement;
      if (el.nodeName !== "svg") throw new Error("the map drawing could not be read.");
      const vb = (el.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
      const vw = vb[2] || parseFloat(el.getAttribute("width") ?? "") || 842;
      const vh = vb[3] || parseFloat(el.getAttribute("height") ?? "") || 595;
      // One page the shape of the map, sized in points from the drawing's own aspect.
      const w = 842;
      const h = (vh / vw) * w;
      const doc = new jsPDF({ unit: "pt", format: [w, h], orientation: w > h ? "landscape" : "portrait" });
      // Map names keep the Geist face, embedded in the file.
      const toB64 = async (url: string) => {
        const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return btoa(bin);
      };
      const [reg, bold] = await Promise.all([toB64("/fonts/Geist-Regular.ttf"), toB64("/fonts/Geist-Bold.ttf")]);
      doc.addFileToVFS("Geist-Regular.ttf", reg);
      doc.addFont("Geist-Regular.ttf", "Geist", "normal");
      doc.addFileToVFS("Geist-Bold.ttf", bold);
      doc.addFont("Geist-Bold.ttf", "Geist", "bold");
      // svg2pdf measures in the live document, so the drawing is mounted off-screen briefly.
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden";
      host.appendChild(el);
      document.body.appendChild(host);
      try {
        // Box-relative fades are re-set in drawing units per room, which the PDF
        // writer reproduces exactly.
        let n = 0;
        el.querySelectorAll<SVGGraphicsElement>("[fill^='url(#']").forEach((shape) => {
          const id = /url\(#([^)]+)\)/.exec(shape.getAttribute("fill") ?? "")?.[1];
          const grad = id ? el.querySelector(`#${CSS.escape(id)}`) : null;
          if (!grad || grad.getAttribute("gradientUnits") !== "objectBoundingBox") return;
          const b = shape.getBBox();
          const copy = grad.cloneNode(true) as Element;
          const at = (k: string) => Number(copy.getAttribute(k) ?? (k === "x2" ? 1 : 0));
          copy.setAttribute("id", `${id}-pdf-${n}`);
          copy.setAttribute("gradientUnits", "userSpaceOnUse");
          copy.setAttribute("x1", String(b.x + at("x1") * b.width));
          copy.setAttribute("x2", String(b.x + at("x2") * b.width));
          copy.setAttribute("y1", String(b.y + at("y1") * b.height));
          copy.setAttribute("y2", String(b.y + at("y2") * b.height));
          grad.parentNode?.appendChild(copy);
          shape.setAttribute("fill", `url(#${id}-pdf-${n++})`);
        });
        // Names are set in Geist; weights of 600 and over print in Geist Bold.
        el.querySelectorAll("text, tspan").forEach((t) => {
          if (t.getAttribute("font-family")) t.setAttribute("font-family", "Geist");
          const wgt = Number(t.getAttribute("font-weight") ?? 400);
          if (t.getAttribute("font-weight")) t.setAttribute("font-weight", wgt >= 600 ? "bold" : "normal");
        });
        await svg2pdf(el, doc, { x: 0, y: 0, width: w, height: h });
      } finally {
        host.remove();
      }
      doc.setProperties({ title: `${current.title} map`, subject: "Vector map from Element; walls, rooms and names are editable." });
      saveFile(doc.output("blob"), `rdraft-${eventId}-${current.floor_key}-${face}.pdf`);
    } catch (error) {
      toast.error(`PDF not downloaded: ${error instanceof Error ? error.message : "the map could not be drawn."}`);
    } finally {
      setPdfBusy(false);
    }
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
          <h1 className="mt-1 text-[32px] font-bold leading-tight">{plan?.name ?? eventDisplayName(eventId)}</h1>
          {q.data?.venue ? (
            <p className="mt-1 text-[13px] text-[#666666]">
              Floors come from the venue library:{" "}
              <Link to="/events/venues/$slug" params={{ slug: q.data.venue.slug }} className="font-semibold text-primary underline">
                {q.data.venue.name}
              </Link>
              . Floors you load here are saved to the venue; room colours and uses stay with this event.
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-[#666666]">
              This event isn't linked to a venue in the library yet, so floors are saved to this event only.
            </p>
          )}
          <p className="mt-1 text-[14px] text-[#666666]">
            {[plan?.venue || q.data?.venue?.name, plan?.city || q.data?.venue?.city, plan?.dates_label].filter(Boolean).join(" · ") || "Venue details still to come"}
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
                <Button variant="outline" onClick={download} disabled={preparedSvg?.source !== svg}>
                  <Download className="h-4 w-4" /> SVG
                </Button>
                <Button variant="outline" onClick={() => void downloadPdf()} disabled={preparedSvg?.source !== svg || pdfBusy} title="Proof PDF for sharing — use the SVG for print">
                  <Download className="h-4 w-4" /> {pdfBusy ? "Making PDF…" : "PDF"}
                </Button>
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
              {svgError && <p role="alert" className="text-sm text-destructive">SVG unavailable: {svgError} No file was downloaded.</p>}
              {current.source_kind === "scan" && (
                <p className="rounded-lg bg-[#FFEB66]/50 px-3 py-2 text-[13px]">
                  Traced from a picture — lower quality than the venue's own drawing.
                </p>
              )}
              <PlanZoomFrame key={current.floor_key} label={current.title}>
              <div
                className="overflow-hidden rounded-2xl border border-[#03002C]/12 bg-white [&_svg]:h-auto [&_svg]:w-full"
                // Our own renderer's output from the venue's geometry.
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              </PlanZoomFrame>
              <p className="text-[12px] text-[#666666]">Draft — file names use “rdraft-” until a revision is published.</p>
            </div>

            <aside className={`${card} h-fit space-y-4`}>
              <section className="space-y-3 border-b border-border pb-4">
                <h2 className="text-[15px] font-bold">Map text</h2>
                <label className="block text-sm">Label
                  <select aria-label="Map label" className={field} value={labelRoom} onChange={(e) => setSelectedLabel(e.target.value)}>
                    {labelLayout?.blocks.map((b) => <option key={b.key} value={b.room}>{b.room}</option>)}
                  </select>
                </label>
                <label className="block text-sm">Text <span className="text-muted-foreground">(Enter starts a new line, up to 3)</span>
                  <textarea rows={3} className={field} value={labelEdit?.name ?? labelRoom} onChange={(e) => patchLabel({ name: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">Size (%)<input aria-label="Label size percent" className={field} type="number" min="25" max="300" step="5" value={Math.round((labelEdit?.scale ?? 1) * 100)} onChange={(e) => { if (e.target.value) patchLabel({ scale: Math.max(0.25, Math.min(3, Number(e.target.value) / 100)) }); }} /></label>
                  <label className="text-sm">Rotation (°)<input aria-label="Label rotation degrees" className={field} type="number" min="-180" max="180" step="5" value={labelEdit?.angle ?? labelLayout?.blocks.find((b) => b.room === labelRoom)?.angle ?? 0} onChange={(e) => { if (e.target.value) patchLabel({ angle: Math.max(-180, Math.min(180, Number(e.target.value))) }); }} /></label>
                  <label className="text-sm">Horizontal offset<input aria-label="Label horizontal offset" className={field} type="number" min="-400" max="400" value={labelEdit?.dx ?? 0} onChange={(e) => patchLabel({ dx: Number(e.target.value) })} /></label>
                  <label className="text-sm">Vertical offset<input aria-label="Label vertical offset" className={field} type="number" min="-400" max="400" value={labelEdit?.dy ?? 0} onChange={(e) => patchLabel({ dy: Number(e.target.value) })} /></label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLabelDrafts((d) => ({ ...d, [current.floor_key]: qeiiClearRoomEdit(labelEdits, labelRoom) }))}>Reset label</Button>
                  <Button size="sm" disabled={labelQuery.isLoading || !!labelQuery.error} onClick={async () => {
                    try {
                      await saveLabelEdits({ data: { venueSlug: labelScope, floorId: current.floor_key, edits: labelEdits } });
                      await qc.invalidateQueries({ queryKey: ["map-label-edits", labelScope] });
                      toast.success("Map text saved.");
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save map text."); }
                  }}><Save />Save text</Button>
                </div>
                {labelQuery.error && <p role="alert" className="text-sm text-destructive">Couldn't load saved map text.</p>}
              </section>
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
