// NEXT division agenda studio. One approved agenda master, live editable per
// division: programme rows, formats, dark / light faces, real QR codes, saved
// live files and layered vector press export for Illustrator.

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Download, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useSignedIn } from "@/components/CloudDeckControls";
import { AgendaSheet } from "@/components/next/AgendaSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportAgendaSheet } from "@/lib/next-agenda-export";
import {
  deleteAgendaFile,
  listAgendaFiles,
  saveAgendaFile,
  updateAgendaFile,
} from "@/lib/next-agenda.functions";
import {
  AGENDA_CUSTOM_SIZE,
  AGENDA_DIVISIONS,
  AGENDA_FACES,
  AGENDA_LOCKUP_SCALE,
  AGENDA_QR_SIZE,
  AGENDA_SIZES,
  AGENDA_SPEC,
  AGENDA_STYLE_IDS,
  AGENDA_TEXT_COLORS,
  agendaDefault,
  agendaDivision,
  agendaGeometry,
  agendaName,
  agendaProgramme,
  agendaStyleLabel,
  normalizeAgendaConfig,
  withAgendaDivision,
  type AgendaConfig,
  type AgendaSession,
} from "@/lib/next-agenda";
import { NEXT_CITY_SERIES, NEXT_EVENT } from "@/lib/next-event";

const NATIVE_PX_PER_MM = 1.2;

const EVENT_OPTIONS: { label: string; value: string }[] = [
  { label: `${NEXT_EVENT.name} — ${NEXT_EVENT.city} (flagship)`, value: `${NEXT_EVENT.name} — ${NEXT_EVENT.city}` },
  ...NEXT_CITY_SERIES.stops
    .filter((s) => s.id !== "london")
    .map((s) => ({
      label: `${NEXT_CITY_SERIES.name} — ${s.city}${s.status === "confirmed" ? "" : " (tbc)"}`,
      value: `${NEXT_CITY_SERIES.name} — ${s.city}`,
    })),
];

type AgendaFileRow = {
  id: string;
  name: string;
  event_label: string;
  division_id: string;
  notes: string;
  config: AgendaConfig;
  updated_at: string;
};

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AgendaStudio({
  divisionId = "city-series",
  heading = "NEXT division agenda",
  intro = "The approved NEXT agenda master, live for every division area. Edit the programme, pick the format and face, add a scannable QR code, save the live file and export layered vector art for print and Illustrator.",
}: {
  divisionId?: string;
  heading?: string;
  intro?: string;
}) {
  const [config, setConfig] = useState<AgendaConfig>(() => agendaDefault(divisionId));
  const [guides, setGuides] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [customEvent, setCustomEvent] = useState("");
  const [fileName, setFileName] = useState("");
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);

  const signedIn = useSignedIn();
  const qc = useQueryClient();
  const list = useServerFn(listAgendaFiles);
  const create = useServerFn(saveAgendaFile);
  const update = useServerFn(updateAgendaFile);
  const remove = useServerFn(deleteAgendaFile);

  const files = useQuery({
    queryKey: ["next-agenda-files"],
    queryFn: async () => (await list()) as unknown as AgendaFileRow[],
    enabled: signedIn === true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = fileName.trim() || agendaName(config);
      const payload = {
        name,
        eventLabel: config.eventLabel ?? "",
        divisionId: config.divisionId,
        notes: "",
        config,
      };
      if (openFileId) return update({ data: { id: openFileId, ...payload } });
      return create({ data: payload });
    },
    onSuccess: (row: unknown) => {
      const saved = row as AgendaFileRow | null;
      if (saved?.id) setOpenFileId(saved.id);
      if (saved?.name) setFileName(saved.name);
      void qc.invalidateQueries({ queryKey: ["next-agenda-files"] });
      toast.success(openFileId ? "Agenda file updated" : "Agenda file saved");
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: (_r, id) => {
      if (id === openFileId) {
        setOpenFileId(null);
        setFileName("");
      }
      void qc.invalidateQueries({ queryKey: ["next-agenda-files"] });
      toast.success("Agenda file deleted");
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  const set = <K extends keyof AgendaConfig>(key: K, value: AgendaConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const setSession = (index: number, patch: Partial<AgendaSession>) =>
    setConfig((c) => ({
      ...c,
      sessions: c.sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const moveSession = (index: number, delta: number) =>
    setConfig((c) => {
      const next = [...c.sessions];
      const target = index + delta;
      if (target < 0 || target >= next.length) return c;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      return { ...c, sessions: next };
    });

  const geo = agendaGeometry(config);
  // Fit the sheet to the viewer on both edges, scaling small formats (A4) up and
  // wide screen formats (16:9, 21:9) down, so every format fills the review area.
  const fitScale = Math.min(
    2.4,
    760 / (geo.bleedH * NATIVE_PX_PER_MM),
    620 / (geo.bleedW * NATIVE_PX_PER_MM),
  );

  const previewScale = fitScale * zoom;

  const division = agendaDivision(config.divisionId);

  const runExport = async () => {
    const node = plateRef.current?.querySelector<HTMLElement>('[data-kit-asset-frame="true"]');
    if (!node) return;
    setBusy(true);
    const id = toast.loading("Preparing the agenda print package…");
    try {
      const result = await exportAgendaSheet({
        node,
        nativeWidth: geo.bleedW * NATIVE_PX_PER_MM,
        nativeHeight: geo.bleedH * NATIVE_PX_PER_MM,
        config,
        onProgress: (p) => toast.loading(p.label, { id }),
      });
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Agenda package downloaded", {
        id,
        description: `Layered ${AGENDA_SPEC.exportPreset} · ${result.layers.length} layers · ${(result.pdfBytes / 1024).toFixed(0)} KB PDF`,
      });
    } catch (e) {
      toast.error("Export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const programmeIsStock = useMemo(
    () => JSON.stringify(config.sessions) === JSON.stringify(agendaProgramme(config.divisionId).sessions),
    [config.sessions, config.divisionId],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{intro}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* live sheet */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {division.name} · {geo.sizeName} ·{" "}
              {geo.isScreen
                ? `${geo.pxW} × ${geo.pxH} px · sRGB screen`
                : `${geo.trimW} × ${geo.trimH} mm trim · ${geo.bleedEdge} mm bleed`}
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
                Guides
              </label>
              <label className="flex items-center gap-2">
                Zoom
                <input
                  type="range"
                  min={0.6}
                  max={2}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Zoom the agenda preview"
                />
              </label>
              <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
                Fit
              </Button>
            </span>
          </div>
          <div ref={plateRef} className="max-h-[780px] overflow-auto">
            <div
              className="mx-auto"
              style={{
                width: geo.bleedW * NATIVE_PX_PER_MM * previewScale,
                height: geo.bleedH * NATIVE_PX_PER_MM * previewScale,
              }}
            >

              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
                <AgendaSheet config={config} pxPerMm={NATIVE_PX_PER_MM} guides={guides} />
              </div>
            </div>
          </div>
        </div>

        {/* controls */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="agenda-division">Division area</Label>
            <select
              id="agenda-division"
              className={selectClass}
              value={config.divisionId}
              onChange={(e) => setConfig((c) => withAgendaDivision(c, e.target.value))}
            >
              {AGENDA_DIVISIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {programmeIsStock
                ? "Showing this division's default programme — edit any row below."
                : "Programme edited: switching divisions keeps your copy and only swaps the lockup."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="agenda-size">Format</Label>
              <select
                id="agenda-size"
                className={selectClass}
                value={config.sizeId}
                onChange={(e) => set("sizeId", e.target.value as AgendaConfig["sizeId"])}
              >
                <optgroup label="Print">
                  {AGENDA_SIZES.filter((s) => s.medium !== "screen").map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.trimW} × {s.trimH} mm
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Screen">
                  {AGENDA_SIZES.filter((s) => s.medium === "screen").map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.pxW} × {s.pxH} px
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-muted-foreground">
                {geo.isScreen
                  ? `Screen artwork · exports as a ${geo.pxW} × ${geo.pxH} px sRGB PNG at 1:1, plus the vector PDF. No bleed on a display.`
                  : AGENDA_SIZES.find((s) => s.id === config.sizeId)?.note}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-face">Face</Label>
              <select
                id="agenda-face"
                className={selectClass}
                value={config.face}
                onChange={(e) => set("face", e.target.value as AgendaConfig["face"])}
              >
                {AGENDA_FACES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {config.sizeId === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="agenda-w">Trim width (mm)</Label>
                <Input
                  id="agenda-w"
                  type="number"
                  min={AGENDA_CUSTOM_SIZE.w.min}
                  max={AGENDA_CUSTOM_SIZE.w.max}
                  step={AGENDA_CUSTOM_SIZE.w.step}
                  value={config.trimW}
                  onChange={(e) => set("trimW", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-h">Trim height (mm)</Label>
                <Input
                  id="agenda-h"
                  type="number"
                  min={AGENDA_CUSTOM_SIZE.h.min}
                  max={AGENDA_CUSTOM_SIZE.h.max}
                  step={AGENDA_CUSTOM_SIZE.h.step}
                  value={config.trimH}
                  onChange={(e) => set("trimH", Number(e.target.value))}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="agenda-style">Gradient ground</Label>
            <select
              id="agenda-style"
              className={selectClass}
              value={config.styleId}
              onChange={(e) => set("styleId", e.target.value)}
            >
              {AGENDA_STYLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {agendaStyleLabel(id)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-eyebrow">Eyebrow</Label>
            <Input id="agenda-eyebrow" value={config.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-title">Day title</Label>
            <Input id="agenda-title" value={config.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-meta">Date · venue line</Label>
            <Input id="agenda-meta" value={config.meta} onChange={(e) => set("meta", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="agenda-title-ink">Title ink</Label>
              <select
                id="agenda-title-ink"
                className={selectClass}
                value={config.titleColor}
                onChange={(e) => set("titleColor", e.target.value)}
              >
                <option value="">Face default</option>
                {AGENDA_TEXT_COLORS.map((c) => (
                  <option key={c.id} value={c.hex}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-lockup">Lockup size</Label>
              <input
                id="agenda-lockup"
                type="range"
                className="w-full"
                min={AGENDA_LOCKUP_SCALE.min}
                max={AGENDA_LOCKUP_SCALE.max}
                step={AGENDA_LOCKUP_SCALE.step}
                value={config.lockupScale}
                onChange={(e) => set("lockupScale", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{Math.round(config.lockupScale * 100)}%</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.showLockup}
              onChange={(e) => set("showLockup", e.target.checked)}
            />
            Print the division lockup
          </label>

          <div className="space-y-2">
            <Label htmlFor="agenda-foot">Footer line</Label>
            <Textarea
              id="agenda-foot"
              rows={2}
              value={config.footnote}
              onChange={(e) => set("footnote", e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-2">
              <Label htmlFor="agenda-qr">QR payload</Label>
              <Input
                id="agenda-qr"
                placeholder="https://next.transperfect.com/agenda"
                value={config.qrData}
                onChange={(e) => set("qrData", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="agenda-qr-size">QR size (mm)</Label>
                <Input
                  id="agenda-qr-size"
                  type="number"
                  min={AGENDA_QR_SIZE.min}
                  max={AGENDA_QR_SIZE.max}
                  step={AGENDA_QR_SIZE.step}
                  value={config.qrSize}
                  onChange={(e) => set("qrSize", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-qr-cap">QR caption</Label>
                <Input
                  id="agenda-qr-cap"
                  value={config.qrCaption}
                  onChange={(e) => set("qrCaption", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-event">Event</Label>
            <select
              id="agenda-event"
              className={selectClass}
              value={EVENT_OPTIONS.some((o) => o.value === config.eventLabel) ? config.eventLabel : config.eventLabel ? "__other" : ""}
              onChange={(e) => {
                if (e.target.value === "__other") {
                  set("eventLabel", customEvent || "");
                } else {
                  set("eventLabel", e.target.value);
                }
              }}
            >
              <option value="">Not assigned</option>
              {EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              <option value="__other">Other event…</option>
            </select>
            {!EVENT_OPTIONS.some((o) => o.value === config.eventLabel) ? (
              <Input
                placeholder="Event name"
                value={customEvent || config.eventLabel}
                onChange={(e) => {
                  setCustomEvent(e.target.value);
                  set("eventLabel", e.target.value);
                }}
              />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={runExport} disabled={busy}>
              <Download className="mr-2 h-4 w-4" />
              {busy ? "Exporting…" : "Export print package"}
            </Button>
            <Button
              variant="secondary"
              disabled={signedIn !== true || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="mr-2 h-4 w-4" />
              {openFileId ? "Update live file" : "Save live file"}
            </Button>
          </div>
          {signedIn !== true ? (
            <p className="text-xs text-muted-foreground">Sign in to save live agenda files.</p>
          ) : null}
        </div>
      </div>

      {/* programme rows */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Programme — {config.sessions.length} rows</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                sessions: [...c.sessions, { time: "", title: "New session", detail: "", track: "", muted: false }],
              }))
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add row
          </Button>
        </div>
        <div className="space-y-2">
          {config.sessions.map((session, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[90px_1fr_1fr_120px_auto]">
              <Input
                aria-label={`Row ${i + 1} time`}
                value={session.time}
                placeholder="09:30"
                onChange={(e) => setSession(i, { time: e.target.value })}
              />
              <Input
                aria-label={`Row ${i + 1} title`}
                value={session.title}
                placeholder="Session title"
                onChange={(e) => setSession(i, { title: e.target.value })}
              />
              <Input
                aria-label={`Row ${i + 1} detail`}
                value={session.detail}
                placeholder="Speaker or room"
                onChange={(e) => setSession(i, { detail: e.target.value })}
              />
              <Input
                aria-label={`Row ${i + 1} track`}
                value={session.track}
                placeholder="MAIN STAGE"
                onChange={(e) => setSession(i, { track: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1 pr-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={session.muted}
                    onChange={(e) => setSession(i, { muted: e.target.checked })}
                    aria-label={`Row ${i + 1} is a break`}
                  />
                  Break
                </label>
                <Button variant="ghost" size="icon" aria-label={`Move row ${i + 1} up`} onClick={() => moveSession(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Move row ${i + 1} down`} onClick={() => moveSession(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete row ${i + 1}`}
                  onClick={() => setConfig((c) => ({ ...c, sessions: c.sessions.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* saved live files */}
      {signedIn === true ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Saved agenda files</h2>
          <div className="space-y-2">
            <Input
              placeholder="File name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              aria-label="Agenda file name"
            />
            {(files.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved agenda files yet.</p>
            ) : (
              (files.data ?? []).map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agendaDivision(row.division_id).name}
                      {row.event_label ? ` · ${row.event_label}` : ""} · updated{" "}
                      {new Date(row.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setConfig(normalizeAgendaConfig(row.config));
                        setOpenFileId(row.id);
                        setFileName(row.name);
                        toast.success("Agenda file opened");
                      }}
                    >
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(row.id)}
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
