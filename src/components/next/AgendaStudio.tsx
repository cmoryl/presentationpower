// NEXT division agenda studio. One approved agenda master, live editable per
// division: programme rows, formats, dark / light faces, real QR codes, saved
// live files and layered vector press export for Illustrator.

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FileText,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useSignedIn } from "@/components/CloudDeckControls";
import { AgendaSheet } from "@/components/next/AgendaSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCanEditNextDivision } from "@/hooks/use-next-edit-permission";
import { announceNextMasterSaved } from "@/hooks/use-next-live-masters";

import { exportAgendaSheet } from "@/lib/next-agenda-export";
import { agendaFit } from "@/lib/next-agenda-fit";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";

import {
  deleteAgendaFile,
  listAgendaFiles,
  saveAgendaFile,
  updateAgendaFile,
} from "@/lib/next-agenda.functions";
import {
  AGENDA_CUSTOM_SIZE,
  AGENDA_ROWS_PER_PAGE,
  AGENDA_DIVISIONS,
  AGENDA_FACES,
  AGENDA_LOCKUP_SCALE,
  AGENDA_QR_SIZE,
  AGENDA_QR_STYLES,
  AGENDA_QR_ANCHORS,
  AGENDA_QR_MIN_CONTRAST,
  AGENDA_QR_CAPTION_SIZE,
  AGENDA_QR_CAPTION_PAD,
  AGENDA_QR_NUDGE,
  agendaBlocks,
  agendaQrAnchor,
  agendaQrCaptionAlign,
  agendaQrBlockers,
  agendaQrContrast,
  agendaQrPrintQuality,
  agendaQrStyle,
  type AgendaCaptionAlign,
  type AgendaQrAnchor,
  type AgendaQrStyleId,
  AGENDA_SIZES,
  AGENDA_SPEC,
  AGENDA_STYLE_IDS,
  AGENDA_TEXT_COLORS,
  addAgendaDay,
  agendaCapacity,
  agendaDays,
  agendaDefault,
  agendaDivision,
  agendaPages,
  removeAgendaDay,
  writeAgendaDay,
  agendaGeometry,
  agendaName,
  AGENDA_ROW_STYLES,
  AGENDA_BAND_TREATMENTS,
  AGENDA_BAND_LAYOUTS,
  AGENDA_LOCATION_ICONS,
  AGENDA_LOCATION_INKS,
  AGENDA_LOCATION_SIZES,
  AGENDA_FOOTER_STYLES,
  AGENDA_FOOTER_FILLS,
  AGENDA_FOOTER_HEIGHTS,
  agendaBandLayout,
  agendaLocation,
  type AgendaLocationIconId,
  type AgendaLocationInkId,
  type AgendaLocationSizeId,
  type AgendaLocationWeightId,
  type AgendaLocationAlignId,
  agendaFooter,
  type AgendaBandLayoutId,
  type AgendaFooterStyleId,
  type AgendaFooterFillId,
  type AgendaFooterHeightId,
  agendaBandTreatment,
  agendaProgramme,
  agendaParallels,
  AGENDA_MAX_PARALLEL,
  agendaProgrammeIsStock,
  agendaRowStyle,
  type AgendaRowStyleId,
  type AgendaBandTreatmentId,
  agendaSlug,
  agendaStyleLabel,
  normalizeAgendaConfig,
  withAgendaDivision,
  type AgendaConfig,
  type AgendaSession,
  type AgendaParallel,
} from "@/lib/next-agenda";
import {
  AGENDA_GUARD_GAPS,
  agendaCopyInk,
  agendaCopyReadouts,
  agendaGroundKey,
  agendaTitleInkOptions,
} from "@/lib/next-agenda-contrast";
import { NEXT_CITY_SERIES, NEXT_EVENT } from "@/lib/next-event";
import { QR_SCAN_VERIFIED_STYLES, type QrModuleStyle } from "@/lib/qr-print";

const NATIVE_PX_PER_MM = 1.2;

const EVENT_OPTIONS: { label: string; value: string }[] = [
  {
    label: `${NEXT_EVENT.name} — ${NEXT_EVENT.city} (flagship)`,
    value: `${NEXT_EVENT.name} — ${NEXT_EVENT.city}`,
  },
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

// The builder is guided: one task per step, with the board preview always on
// screen. Every control below is assigned to exactly one of these steps.
const AGENDA_STEPS = [
  {
    id: "programme",
    label: "Programme",
    hint: "Start here — pick the division area, set up the days, then type the sessions under the board.",
  },
  {
    id: "look",
    label: "Look",
    hint: "Choose the board size, the light or dark face, the programme band treatment and the header type.",
  },
  {
    id: "details",
    label: "QR & details",
    hint: "Add a scannable code and place it on the board. Everything here is optional.",
  },
  {
    id: "export",
    label: "Save & export",
    hint: "Assign the event, save the live file, and download the press file, Word or PowerPoint.",
  },
] as const;

export function AgendaStudio({
  divisionId = "city-series",
  heading = "NEXT division agenda",
  intro = "The approved NEXT agenda master, live for every division area. Edit the programme, pick the format and face, add a scannable QR code, save the live file and export layered vector art for print and Illustrator.",
  initialConfig,
  initialFileId,
}: {
  divisionId?: string;
  heading?: string;
  intro?: string;
  /** Seed the editor with a prepared board (demo asset, saved master, etc.). */
  initialConfig?: AgendaConfig;
  /** Open directly onto a saved live file so Save becomes Update. */
  initialFileId?: string | null;
}) {
  const [config, setConfig] = useState<AgendaConfig>(
    () => initialConfig ?? agendaDefault(divisionId),
  );

  const [guides, setGuides] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [customEvent, setCustomEvent] = useState("");
  const [fileName, setFileName] = useState("");
  const [openFileId, setOpenFileId] = useState<string | null>(initialFileId ?? null);
  const [activeDay, setActiveDay] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const plateRef = useRef<HTMLDivElement | null>(null);

  // Follow the host when it points the studio at a different saved live file.
  useEffect(() => {
    if (initialFileId === undefined) return;
    setOpenFileId(initialFileId ?? null);
  }, [initialFileId]);

  // Re-seed the board when the host swaps in a different prepared config.
  const seededRef = useRef<AgendaConfig | undefined>(initialConfig);
  useEffect(() => {
    if (!initialConfig || seededRef.current === initialConfig) return;
    seededRef.current = initialConfig;
    setConfig(initialConfig);
  }, [initialConfig]);

  const signedIn = useSignedIn();
  const { canEdit: canEditDivision, isLoading: canEditLoading } = useCanEditNextDivision(
    config.divisionId,
  );
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
      announceNextMasterSaved("agenda");
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
      announceNextMasterSaved("agenda");

      toast.success("Agenda file deleted");
    },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  const set = <K extends keyof AgendaConfig>(key: K, value: AgendaConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  // Everything below edits the active programme day. A single-day file keeps the
  // top-level fields, so nothing changes for existing agendas.
  const days = agendaDays(config);
  const dayIndex = Math.min(activeDay, days.length - 1);
  const day = days[dayIndex]!;
  const patchDay = (patch: Parameters<typeof writeAgendaDay>[2]) =>
    setConfig((c) => writeAgendaDay(c, dayIndex, patch));

  const setSession = (index: number, patch: Partial<AgendaSession>) =>
    patchDay({ sessions: day.sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)) });

  const moveSession = (index: number, delta: number) => {
    const next = [...day.sessions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    patchDay({ sessions: next });
  };

  const geo = agendaGeometry(config);

  // Resolved printed pages: one per programme day, split again whenever a day
  // runs past the rows that fit the chosen format.
  const pages = useMemo(() => agendaPages(config), [config]);
  const pageIndex = Math.min(activePage, pages.length - 1);
  const page = pages[pageIndex]!;
  const pageConfig = page.config;
  const autoCapacity = useMemo(() => agendaCapacity(config), [config]);
  const rowsPerPage = Math.round(Number(config.rowsPerPage) || 0);

  // Live page-size + overflow read, recomputed on every keystroke so the editor
  // behaves like the other print areas.
  const fit = useMemo(() => agendaFit(pageConfig), [pageConfig]);
  const overRows = useMemo(() => new Set(fit.lines.map((l) => l.index)), [fit.lines]);

  // Fit the sheet to the viewer on both edges, scaling small formats (A4) up and
  // wide screen formats (16:9, 21:9) down, so every format fills the review area.
  const fitScale = Math.min(
    2.4,
    760 / (geo.bleedH * NATIVE_PX_PER_MM),
    620 / (geo.bleedW * NATIVE_PX_PER_MM),
  );

  const previewScale = fitScale * zoom;

  const division = agendaDivision(config.divisionId);

  // Resolved QR geometry for the page on screen: the clamp range the placement
  // controls work inside, and where the code currently sits.
  const qrBlock = useMemo(() => agendaBlocks(pageConfig).qr, [pageConfig]);

  const placeQr = (x: number | null, y: number | null) =>
    setConfig((c) => ({ ...c, qrOffsetX: x, qrOffsetY: y }));

  const nudgeQr = (dx: number, dy: number) => {
    if (!qrBlock) return;
    placeQr(Math.round(qrBlock.x + dx), Math.round(qrBlock.y + dy));
  };

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
        description: `Layered ${AGENDA_SPEC.exportPreset} · ${result.pageCount} page${result.pageCount === 1 ? "" : "s"} · ${result.layers.length} layers · ${(result.pdfBytes / 1024).toFixed(0)} KB PDF`,
      });
    } catch (e) {
      toast.error("Export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const runWordExport = async () => {
    setBusy(true);
    const id = toast.loading("Building the editable Word file…");
    try {
      const { blob, notes } = await buildAgendaDocx(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `next-agenda-${agendaSlug(config)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Word file downloaded", { id, description: notes[0] });
    } catch (e) {
      toast.error("Word export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const runDeckExport = async () => {
    setBusy(true);
    const id = toast.loading("Building the editable PowerPoint deck…");
    try {
      const { buildAgendaPptx } = await import("@/lib/next-agenda-pptx");
      const { blob, filename, notes } = await buildAgendaPptx(config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PowerPoint deck downloaded", { id, description: notes[notes.length - 1] });
    } catch (e) {
      toast.error("PowerPoint export failed", { id, description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const programmeIsStock = useMemo(
    () => agendaProgrammeIsStock(config),
    [config],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{intro}</p>
      </header>

      {/* programme days + printed pages */}
      <section
        aria-labelledby="agenda-days"
        className="rounded-xl border border-border bg-muted/30 p-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h2 id="agenda-days" className="text-sm font-semibold tracking-tight">
              Programme days
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1 rounded-full border px-1 py-0.5 text-xs ${
                    i === dayIndex
                      ? "border-[#003FC7] bg-background font-medium"
                      : "border-border bg-background/60"
                  }`}
                >
                  <button
                    type="button"
                    className="px-2 py-1"
                    aria-pressed={i === dayIndex}
                    onClick={() => {
                      setActiveDay(i);
                      const first = pages.findIndex((p) => p.dayIndex === i);
                      if (first >= 0) setActivePage(first);
                    }}
                  >
                    {d.label || `Day ${i + 1}`}
                    <span className="ml-1.5 text-muted-foreground">{d.sessions.length}</span>
                  </button>
                  {days.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Remove ${d.label || `day ${i + 1}`}`}
                      onClick={() => {
                        setConfig((c) => removeAgendaDay(c, i));
                        setActiveDay(0);
                        setActivePage(0);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setConfig((c) => addAgendaDay(c));
                  setActiveDay(days.length);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add day
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-rows-per-page" className="text-xs">
              Rows per page
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="agenda-rows-per-page"
                type="number"
                className="w-28"
                min={0}
                max={AGENDA_ROWS_PER_PAGE.max}
                value={rowsPerPage || ""}
                placeholder={`Auto (${autoCapacity})`}
                onChange={(e) => set("rowsPerPage", Math.max(0, Number(e.target.value) || 0))}
              />
              {rowsPerPage ? (
                <Button variant="ghost" size="sm" onClick={() => set("rowsPerPage", 0)}>
                  Auto
                </Button>
              ) : null}
            </div>
            <p className="max-w-xs text-xs text-muted-foreground">
              {rowsPerPage
                ? `Each page carries ${rowsPerPage} rows, then the day continues on a new page.`
                : `Filling each ${geo.sizeName} automatically — about ${autoCapacity} rows per page.`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {pages.length} printed page{pages.length === 1 ? "" : "s"} · previewing {page.label}
          </span>
          {pages.length > 1
            ? pages.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === pageIndex}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    i === pageIndex
                      ? "border-[#003FC7] bg-background font-medium"
                      : "border-border bg-background/60"
                  }`}
                  onClick={() => {
                    setActivePage(i);
                    setActiveDay(p.dayIndex);
                  }}
                >
                  {i + 1}
                </button>
              ))
            : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* live sheet */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {division.name} · {geo.sizeName} ·{" "}
              {geo.isScreen
                ? `${geo.pxW} × ${geo.pxH} px · sRGB screen`
                : `${geo.trimW} × ${geo.trimH} mm trim · ${geo.bleedEdge} mm bleed`}
              {pages.length > 1 ? ` · page ${pageIndex + 1} of ${pages.length}` : ""}
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={guides}
                  onChange={(e) => setGuides(e.target.checked)}
                />
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
                <AgendaSheet
                  config={pageConfig}
                  pxPerMm={NATIVE_PX_PER_MM}
                  guides={guides}
                  onPlaceQr={(x, y) => {
                    // The sheet reports millimetres at native scale; the stage is
                    // zoomed, so fold the zoom back out of the drag.
                    const b = qrBlock;
                    if (!b) return;
                    placeQr(
                      Math.round(b.x + (x - b.x) / previewScale),
                      Math.round(b.y + (y - b.y) / previewScale),
                    );
                  }}
                />
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
                onChange={(e) =>
                  // A code dragged on one board size means nothing on another, so
                  // a format switch returns it to its anchored home.
                  setConfig((c) => ({
                    ...c,
                    sizeId: e.target.value as AgendaConfig["sizeId"],
                    qrOffsetX: null,
                    qrOffsetY: null,
                  }))
                }

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
            <Label htmlFor="agenda-row-style">Programme look</Label>
            <select
              id="agenda-row-style"
              className={selectClass}
              value={agendaRowStyle(config)}
              onChange={(e) => set("rowStyle", e.target.value as AgendaRowStyleId)}
            >
              {AGENDA_ROW_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {AGENDA_ROW_STYLES.find((style) => style.id === agendaRowStyle(config))?.note ?? ""}
            </p>
          </div>

          {agendaRowStyle(config) === "card" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="agenda-band-treatment">Band treatment</Label>
                <select
                  id="agenda-band-treatment"
                  className={selectClass}
                  value={agendaBandTreatment(config)}
                  onChange={(e) =>
                    set("bandTreatment", e.target.value as AgendaBandTreatmentId)
                  }
                >
                  {AGENDA_BAND_TREATMENTS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {AGENDA_BAND_TREATMENTS.find((t) => t.id === agendaBandTreatment(config))?.note ??
                    ""}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda-band-layout">Band box layout</Label>
                <select
                  id="agenda-band-layout"
                  className={selectClass}
                  value={agendaBandLayout(config).id}
                  onChange={(e) => set("bandLayout", e.target.value as AgendaBandLayoutId)}
                >
                  {AGENDA_BAND_LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {AGENDA_BAND_LAYOUTS.find((l) => l.id === agendaBandLayout(config).id)?.note ?? ""}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda-location">Room · floor line</Label>
                <Input
                  id="agenda-location"
                  value={config.locationLine ?? ""}
                  onChange={(e) => set("locationLine", e.target.value)}
                  placeholder="FLEMING 3RD FLOOR"
                />
              </div>
              {/* Room line formatting: the mark, its colour, and how the line sets. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-icon">Room line · mark</Label>
                  <select
                    id="agenda-location-icon"
                    className={selectClass}
                    value={agendaLocation(config).icon.id}
                    onChange={(e) => set("locationIcon", e.target.value as AgendaLocationIconId)}
                  >
                    {AGENDA_LOCATION_ICONS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-icon-ink">Mark colour</Label>
                  <select
                    id="agenda-location-icon-ink"
                    className={selectClass}
                    value={config.locationIconInk ?? "auto"}
                    onChange={(e) => set("locationIconInk", e.target.value as AgendaLocationInkId)}
                    disabled={agendaLocation(config).icon.id === "none"}
                  >
                    {AGENDA_LOCATION_INKS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.id === "auto" ? "House / board ink" : i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-ink">Room line colour</Label>
                  <select
                    id="agenda-location-ink"
                    className={selectClass}
                    value={config.locationInk ?? "auto"}
                    onChange={(e) => set("locationInk", e.target.value as AgendaLocationInkId)}
                  >
                    {AGENDA_LOCATION_INKS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-size">Room line size</Label>
                  <select
                    id="agenda-location-size"
                    className={selectClass}
                    value={config.locationSize ?? "standard"}
                    onChange={(e) => set("locationSize", e.target.value as AgendaLocationSizeId)}
                  >
                    {AGENDA_LOCATION_SIZES.map((sz) => (
                      <option key={sz.id} value={sz.id}>
                        {sz.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-weight">Room line weight</Label>
                  <select
                    id="agenda-location-weight"
                    className={selectClass}
                    value={config.locationWeight ?? "bold"}
                    onChange={(e) =>
                      set("locationWeight", e.target.value as AgendaLocationWeightId)
                    }
                  >
                    <option value="bold">Bold</option>
                    <option value="medium">Medium</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-align">Room line position</Label>
                  <select
                    id="agenda-location-align"
                    className={selectClass}
                    value={config.locationAlign ?? "right"}
                    onChange={(e) => set("locationAlign", e.target.value as AgendaLocationAlignId)}
                  >
                    <option value="right">Right of the lockup</option>
                    <option value="left">Left, under the lockup</option>
                    <option value="centre">Centred, under the lockup</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-location-caps">Room line case</Label>
                  <select
                    id="agenda-location-caps"
                    className={selectClass}
                    value={config.locationCaps === false ? "sentence" : "caps"}
                    onChange={(e) => set("locationCaps", e.target.value === "caps")}
                  >
                    <option value="caps">Capitals</option>
                    <option value="sentence">As typed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-left">Footer band · left</Label>
                  <Input
                    id="agenda-footer-left"
                    value={config.footerLeft ?? ""}
                    onChange={(e) => set("footerLeft", e.target.value)}
                    placeholder="WWW.TRANSPERFECTNEXT.COM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-right">Footer band · right</Label>
                  <Input
                    id="agenda-footer-right"
                    value={config.footerRight ?? ""}
                    onChange={(e) => set("footerRight", e.target.value)}
                    placeholder="24 & 25 SEPTEMBER, 2026"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda-footer-centre">Footer band · centre</Label>
                <Input
                  id="agenda-footer-centre"
                  value={config.footerCentre ?? ""}
                  onChange={(e) => set("footerCentre", e.target.value)}
                  placeholder="QEII CENTRE, LONDON"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-style">Footer style</Label>
                  <select
                    id="agenda-footer-style"
                    className={selectClass}
                    value={agendaFooter(config).style}
                    onChange={(e) => set("footerStyle", e.target.value as AgendaFooterStyleId)}
                  >
                    {AGENDA_FOOTER_STYLES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-fill">Footer colour</Label>
                  <select
                    id="agenda-footer-fill"
                    className={selectClass}
                    value={agendaFooter(config).fillId}
                    disabled={agendaFooter(config).style !== "band"}
                    onChange={(e) => set("footerFill", e.target.value as AgendaFooterFillId)}
                  >
                    {AGENDA_FOOTER_FILLS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-height">Footer depth</Label>
                  <select
                    id="agenda-footer-height"
                    className={selectClass}
                    value={config.footerHeight ?? "standard"}
                    onChange={(e) => set("footerHeight", e.target.value as AgendaFooterHeightId)}
                  >
                    {AGENDA_FOOTER_HEIGHTS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda-footer-caps">Footer lettering</Label>
                  <select
                    id="agenda-footer-caps"
                    className={selectClass}
                    value={config.footerCaps === false ? "sentence" : "caps"}
                    onChange={(e) => set("footerCaps", e.target.value === "caps")}
                  >
                    <option value="caps">All caps</option>
                    <option value="sentence">As typed</option>
                  </select>
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="agenda-eyebrow">Eyebrow</Label>
            <Input
              id="agenda-eyebrow"
              value={config.eyebrow}
              onChange={(e) => set("eyebrow", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-title">Day title</Label>
            <Input
              id="agenda-title"
              value={day.label}
              onChange={(e) => patchDay({ label: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-meta">Date · venue line</Label>
            <Input
              id="agenda-meta"
              value={day.meta}
              onChange={(e) => patchDay({ meta: e.target.value })}
            />
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
                {agendaTitleInkOptions(config).map((o, i) => (
                  <option key={`${o.hex}-${i}`} value={i === 0 ? "" : o.hex}>
                    {i === 0 ? "Face default" : o.label} · {o.ratio.toFixed(1)}:1
                    {o.ok ? "" : " (too low to read)"}
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
              <p className="text-xs text-muted-foreground">
                {Math.round(config.lockupScale * 100)}%
              </p>
          </div>

          {/* A printed board has no zoom, so the editor states the contrast every
              band of copy will be read at, and says when the guard stepped in. */}
          {(() => {
            const guard = agendaCopyInk(config);
            const readouts = agendaCopyReadouts(config);
            const failing = readouts.filter((r) => !r.ok);
            return (
               <details className="group rounded-md border border-border/60 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                  {failing.length ? (
                    <AlertTriangle
                      size={14}
                      className="shrink-0 text-destructive"
                      aria-hidden
                    />
                  ) : (
                    <Check size={14} className="shrink-0 text-[#003FC7]" aria-hidden />
                  )}
                  <span>Copy legibility</span>
                  <span
                    className={`min-w-0 flex-1 truncate text-xs font-normal ${failing.length ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {failing.length
                      ? `${failing.length} of ${readouts.length} bands below their floor`
                      : `All ${readouts.length} bands pass`}
                  </span>
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition group-open:rotate-180"
                  />
                </summary>
                <div className="mt-2 space-y-2">
                <p
                  className={`text-xs ${failing.length ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {failing.length === 0
                    ? `All ${readouts.length} bands clear their contrast floor · copy ink ${guard.hex}${guard.auto ? " (guard applied: the face ink stopped reading on this ground)" : ""}`
                    : `${failing.length} of ${readouts.length} bands sit below their floor on this ground — pick a different ground or move the copy: ${failing.map((r) => r.label).join(", ")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {AGENDA_GUARD_GAPS.includes(agendaGroundKey(config))
                    ? "This ground has no approved ink that reads across the whole board in the dark face — use the light face or a different gradient."
                    : "Floors follow WCAG: 3:1 for display copy, 4.5:1 for body copy."}
                </p>
                <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {readouts.map((r) => (
                    <li key={r.role} className={r.ok ? "" : "text-destructive"}>
                      {r.label} · {r.ratio.toFixed(1)}:1 (needs {r.floor}:1)
                    </li>
                  ))}
                </ul>
                </div>
              </details>
            );
          })()}

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

            {config.qrData.trim() ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="agenda-qr-anchor">Position</Label>
                  <select
                    id="agenda-qr-anchor"
                    className={selectClass}
                    value={agendaQrAnchor(config)}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        qrAnchor: e.target.value as AgendaQrAnchor,
                        // A saved drag would win over the new position, so clear it.
                        qrOffsetX: null,
                        qrOffsetY: null,
                      }))
                    }
                  >
                    {AGENDA_QR_ANCHORS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {AGENDA_QR_ANCHORS.find((a) => a.id === agendaQrAnchor(config))?.note}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-style">Module shape</Label>
                    <select
                      id="agenda-qr-style"
                      className={selectClass}
                      value={agendaQrStyle(config)}
                      onChange={(e) => set("qrStyle", e.target.value as AgendaQrStyleId)}
                    >
                      {AGENDA_QR_STYLES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                          {QR_SCAN_VERIFIED_STYLES.includes(s.id as QrModuleStyle)
                            ? ""
                            : " — not scan-verified"}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {AGENDA_QR_STYLES.find((s) => s.id === agendaQrStyle(config))?.note}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-ink">Code ink</Label>
                    <select
                      id="agenda-qr-ink"
                      className={selectClass}
                      value={config.qrForeground}
                      onChange={(e) => set("qrForeground", e.target.value)}
                    >
                      <option value="">Blue 800 (default)</option>
                      {AGENDA_TEXT_COLORS.map((c) => (
                        <option key={c.id} value={c.hex}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-plate">Plate colour</Label>
                    <select
                      id="agenda-qr-plate"
                      className={selectClass}
                      value={config.qrBackground}
                      onChange={(e) => set("qrBackground", e.target.value)}
                      disabled={config.qrTransparent}
                    >
                      <option value="">White (default)</option>
                      {AGENDA_TEXT_COLORS.map((c) => (
                        <option key={c.id} value={c.hex}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-capsize">Caption size (mm)</Label>
                    <Input
                      id="agenda-qr-capsize"
                      type="number"
                      min={0}
                      max={AGENDA_QR_CAPTION_SIZE.max}
                      step={AGENDA_QR_CAPTION_SIZE.step}
                      value={config.qrCaptionSize}
                      onChange={(e) => set("qrCaptionSize", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">0 follows the footer size.</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.qrTransparent}
                    onChange={(e) => set("qrTransparent", e.target.checked)}
                  />
                  Drop the plate — print the code straight on the gradient
                </label>

                {/* A code phone cameras cannot read is a reprint, so the editor
                    states the contrast it will actually be scanned at. */}
                {(() => {
                  const c = agendaQrContrast(config);
                  const quality = agendaQrPrintQuality(config);
                  const blockers = agendaQrBlockers(config);
                  return (
                    <div className="space-y-1">
                      <p
                        className={`text-xs ${c.ok ? "text-muted-foreground" : "text-destructive"}`}
                      >
                        Scan contrast {c.ratio.toFixed(1)}:1{" "}
                        {c.ok
                          ? "· comfortably scannable"
                          : `· below ${AGENDA_QR_MIN_CONTRAST}:1, darken the ink or keep the plate`}
                      </p>
                      {quality ? (
                        <p className="text-xs text-muted-foreground">
                          {quality.modules} modules · {quality.moduleMm.toFixed(2)}mm each ·{" "}
                          {quality.quietMm.toFixed(1)}mm quiet zone
                        </p>
                      ) : null}
                      {blockers.map((b) => (
                        <p key={b} className="text-xs text-destructive">
                          {b}
                        </p>
                      ))}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-align">Caption alignment</Label>
                    <select
                      id="agenda-qr-align"
                      className={selectClass}
                      value={agendaQrCaptionAlign(config)}
                      onChange={(e) => set("qrCaptionAlign", e.target.value as AgendaCaptionAlign)}
                    >
                      <option value="left">Left</option>
                      <option value="center">Centre</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agenda-qr-pad">Edge padding (mm)</Label>
                    <Input
                      id="agenda-qr-pad"
                      type="number"
                      min={AGENDA_QR_CAPTION_PAD.min}
                      max={AGENDA_QR_CAPTION_PAD.max}
                      step={AGENDA_QR_CAPTION_PAD.step}
                      value={config.qrCaptionPad}
                      onChange={(e) => set("qrCaptionPad", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-sm font-medium">Position on the page</p>
                  <p className="text-xs text-muted-foreground">
                    Drag the code on the sheet, use the nine spots, or type the exact millimetres
                    from the trim corner. Everything stays inside the safe margin.
                  </p>
                  <div className="grid w-fit grid-cols-3 gap-1">
                    {(
                      [
                        ["Top left", 0, 0],
                        ["Top", 0.5, 0],
                        ["Top right", 1, 0],
                        ["Left", 0, 0.5],
                        ["Centre", 0.5, 0.5],
                        ["Right", 1, 0.5],
                        ["Bottom left", 0, 1],
                        ["Bottom", 0.5, 1],
                        ["Bottom right", 1, 1],
                      ] as [string, number, number][]
                    ).map(([label, fx, fy]) => (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        aria-label={label}
                        className="h-7 w-7 rounded border border-border text-[10px] hover:bg-muted"
                        onClick={() => {
                          const b = qrBlock;
                          if (!b) return;
                          setConfig((c) => ({
                            ...c,
                            qrOffsetX: Math.round(b.minX + (b.maxX - b.minX) * fx),
                            qrOffsetY: Math.round(b.minY + (b.maxY - b.minY) * fy),
                          }));
                        }}
                      >
                        ·
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="agenda-qr-x">X from trim (mm)</Label>
                      <Input
                        id="agenda-qr-x"
                        type="number"
                        step={AGENDA_QR_NUDGE.fine}
                        value={Math.round(qrBlock?.x ?? 0)}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            qrOffsetX: Number(e.target.value),
                            qrOffsetY: c.qrOffsetY ?? Math.round(qrBlock?.y ?? 0),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agenda-qr-y">Y from trim (mm)</Label>
                      <Input
                        id="agenda-qr-y"
                        type="number"
                        step={AGENDA_QR_NUDGE.fine}
                        value={Math.round(qrBlock?.y ?? 0)}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            qrOffsetY: Number(e.target.value),
                            qrOffsetX: c.qrOffsetX ?? Math.round(qrBlock?.x ?? 0),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["Left", -AGENDA_QR_NUDGE.coarse, 0],
                        ["Right", AGENDA_QR_NUDGE.coarse, 0],
                        ["Up", 0, -AGENDA_QR_NUDGE.coarse],
                        ["Down", 0, AGENDA_QR_NUDGE.coarse],
                      ] as [string, number, number][]
                    ).map(([label, dx, dy]) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="outline"
                        onClick={() => nudgeQr(dx, dy)}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => placeQr(null, null)}>
                      Back to default spot
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {qrBlock?.placed ? "Placed by hand" : "Following the default footer flow"}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda-event">Event</Label>
            <select
              id="agenda-event"
              className={selectClass}
              value={
                EVENT_OPTIONS.some((o) => o.value === config.eventLabel)
                  ? config.eventLabel
                  : config.eventLabel
                    ? "__other"
                    : ""
              }
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
            <Button variant="outline" onClick={runWordExport} disabled={busy}>
              <FileText className="mr-2 h-4 w-4" />
              Export editable Word
            </Button>
            <Button variant="outline" onClick={runDeckExport} disabled={busy}>
              <FileText className="mr-2 h-4 w-4" />
              Export editable PowerPoint
            </Button>

            <Button
              variant="secondary"
              disabled={
                signedIn !== true || saveMutation.isPending || !canEditDivision || canEditLoading
              }
              onClick={() => saveMutation.mutate()}
            >
              <Save className="mr-2 h-4 w-4" />
              {openFileId ? "Update live file" : "Save live file"}
            </Button>
          </div>
          {signedIn !== true ? (
            <p className="text-xs text-muted-foreground">Sign in to save live agenda files.</p>
          ) : canEditLoading ? (
            <p className="text-xs text-muted-foreground">Checking division editing permissions…</p>
          ) : !canEditDivision ? (
            <p className="text-xs text-muted-foreground">
              You are not assigned as an editor for this division. Ask an admin or brand reviewer to
              add you.
            </p>
          ) : null}
        </div>
      </div>

      {/* live page fit — same page-size + overflow awareness as the other print areas */}
      <section
        aria-labelledby="agenda-fit"
        className={`rounded-xl border p-4 ${
          fit.status === "over"
            ? "border-destructive/50 bg-destructive/5"
            : fit.status === "tight"
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-border bg-muted/30"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="agenda-fit" className="text-sm font-semibold tracking-tight">
              Page fit · {geo.sizeName} · {geo.trimW}×{geo.trimH} mm
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{fit.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium">
              {Math.round(fit.usedFraction * 100)}% of band · {fit.rowH.toFixed(1)} mm rows
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium">
              capacity {fit.maxRows} rows
            </span>
            {fit.suggestSizeId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set("sizeId", fit.suggestSizeId as AgendaConfig["sizeId"])}
              >
                Use {fit.suggestSizeName}
              </Button>
            )}
          </div>
        </div>
        {fit.lines.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {fit.lines.slice(0, 6).map((line, i) => (
              <li key={`${line.index}-${line.field}-${i}`}>
                Row {line.index + 1} {line.field} runs {line.overMm} mm past its column — trim about{" "}
                {line.trimChars} character{line.trimChars === 1 ? "" : "s"}.
              </li>
            ))}
            {fit.lines.length > 6 && <li>+{fit.lines.length - 6} more lines past their column.</li>}
          </ul>
        )}
      </section>

      {/* programme rows */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {days.length > 1 ? `${day.label || `Day ${dayIndex + 1}`} programme` : "Programme"} —{" "}
            {day.sessions.length} rows
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              of {fit.maxRows} that fit {geo.sizeName}
            </span>
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              patchDay({
                sessions: [
                  ...day.sessions,
                  { time: "", title: "New session", detail: "", track: "", muted: false },
                ],
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add row
          </Button>
        </div>
        <div className="space-y-2">
          {day.sessions.map((session, i) => (
            <div
              key={i}
              className={`grid gap-2 rounded-lg border p-3 md:grid-cols-[90px_1fr_1fr_120px_auto] ${
                overRows.has(i) ? "border-destructive/60 bg-destructive/5" : "border-border"
              } ${i >= fit.maxRows ? "opacity-70" : ""}`}
            >
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
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move row ${i + 1} up`}
                  onClick={() => moveSession(i, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move row ${i + 1} down`}
                  onClick={() => moveSession(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete row ${i + 1}`}
                  onClick={() => patchDay({ sessions: day.sessions.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {agendaRowStyle(config) === "card"
                ? (() => {
                    // Up to four tracks can run alongside one slot; each gets its
                    // own aqua card on the board and in every export.
                    const pars = agendaParallels(session);
                    const write = (next: AgendaParallel[]) =>
                      setSession(i, {
                        parallels: next,
                        parallel: next[0] ?? null,
                        pin: next.length ? true : session.pin,
                      });
                    return (
                      <div className="space-y-2 md:col-span-5">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {pars.length
                              ? `${pars.length} parallel track${pars.length === 1 ? "" : "s"} alongside this slot`
                              : "No parallel tracks alongside this slot"}
                          </span>
                          {pars.length < AGENDA_MAX_PARALLEL ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                write([
                                  ...pars,
                                  { time: "", title: "", speaker: "", detail: "" },
                                ])
                              }
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" /> Add parallel track
                            </Button>
                          ) : null}
                        </div>
                        {pars.map((par, pi) => {
                          const edit = (patch: Partial<AgendaParallel>) =>
                            write(pars.map((p, j) => (j === pi ? { ...p, ...patch } : p)));
                          return (
                            <div
                              key={pi}
                              className="rounded-lg border border-black/10 p-2 dark:border-white/15"
                            >
                              <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                <span>Track {pi + 1}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remove row ${i + 1} parallel ${pi + 1}`}
                                  onClick={() => write(pars.filter((_, j) => j !== pi))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr]">
                                <Input
                                  aria-label={`Row ${i + 1} parallel ${pi + 1} time`}
                                  value={par.time ?? ""}
                                  placeholder="Time"
                                  onChange={(e) => edit({ time: e.target.value })}
                                />
                                <Input
                                  aria-label={`Row ${i + 1} parallel ${pi + 1} title`}
                                  value={par.title}
                                  placeholder={`Parallel session ${pi + 1} title`}
                                  onChange={(e) => edit({ title: e.target.value })}
                                />
                                <Input
                                  aria-label={`Row ${i + 1} parallel ${pi + 1} speaker`}
                                  value={par.speaker ?? ""}
                                  placeholder="Speaker"
                                  onChange={(e) => edit({ speaker: e.target.value })}
                                />
                              </div>
                              <Input
                                className="mt-2"
                                aria-label={`Row ${i + 1} parallel ${pi + 1} notes`}
                                value={par.detail}
                                placeholder="Notes or room"
                                onChange={(e) => edit({ detail: e.target.value })}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                : null}
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
                      {/* Fixed UTC format: toLocaleDateString() resolves against
                          the host locale/timezone, so SSR and the browser
                          produced different text and hydration failed. */}
                      {new Date(row.updated_at).toISOString().slice(0, 10)}
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
