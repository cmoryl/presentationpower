// /events/next/london/booklet — the booklet studio.
//
// Three-panel print editor: pages & spreads on the left, a live proof canvas in
// the middle, and an inspector / master page / preflight / library panel on the
// right. Simple mode keeps the everyday controls; Advanced adds master pages,
// guides, spread view and drag-to-reorder. Exports: press PDF, Word, PowerPoint.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  FileDown,
  FileText,
  GripVertical,
  Info,
  Plus,
  Presentation,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PageProof, ProofGuides, type ProofPage } from "@/components/booklet/BookletProof";
import { Button } from "@/design-system/element";
import { runWithExportFeedback } from "@/lib/export-feedback";
import { agendaDefault, agendaGeometry, agendaPages, agendaFileIsLive, type AgendaConfig } from "@/lib/next-agenda";
import { listAgendaFiles } from "@/lib/next-agenda.functions";
import {
  BOOKLET_SIZES,
  bookletAgendaSizeId,
  bookletDefault,
  bookletMaster,
  bookletNotesPages,
  bookletPagePlan,
  bookletSlug,
  type BookletChartPage,
  type BookletConfig,
  type BookletImagePage,
  type BookletMaster,
} from "@/lib/next-booklet";
import { deleteEventBooklet, listEventBooklets, saveEventBooklet, updateEventBooklet } from "@/lib/next-booklet.functions";
import { bookletChartPages, bookletCoverGroundPng, bookletMapPages } from "@/lib/next-booklet-render";
import { BOOKLET_COVER_TREATMENTS, bookletCoverArt, bookletCoverArtFor, type BookletCoverTreatment } from "@/lib/next-booklet-cover-art";
import { COVER_CAPS, bookletPreflight, preflightSummary, type PreflightCheck } from "@/lib/next-booklet-preflight";
import { SUPPORTED_VIZ_KINDS } from "@/lib/infographics/variant-kinds";
import { LONDON_FLOORS, LONDON_VENUE, type LondonFloorId } from "@/lib/next-london-signage";
import { londonMappedFloors } from "@/lib/next-london-floorplan";
import type { InfographicKind } from "@/lib/infographics/spec";

// Browser-only export bundles — loaded on demand, never during server rendering.
const buildAgendaDocx: (typeof import("@/lib/next-agenda-docx"))["buildAgendaDocx"] = async (...args) =>
  (await import("@/lib/next-agenda-docx")).buildAgendaDocx(...args);
const buildAgendaPptx: (typeof import("@/lib/next-agenda-pptx"))["buildAgendaPptx"] = async (...args) =>
  (await import("@/lib/next-agenda-pptx")).buildAgendaPptx(...args);
const buildBookletPdf: (typeof import("@/lib/next-booklet-pdf"))["buildBookletPdf"] = async (...args) =>
  (await import("@/lib/next-booklet-pdf")).buildBookletPdf(...args);

export const Route = createFileRoute("/events/next_/london_/booklet")({
  component: BookletPage,
  head: () => ({
    meta: [
      { title: "NEXT London booklet studio | TransPerfect Element" },
      {
        name: "description",
        content:
          "Lay out the NEXT London booklet page by page: spreads, live proofs, master pages and print preflight, exported as a press PDF, Word file or PowerPoint deck.",
      },
      { property: "og:title", content: "NEXT London booklet studio" },
      {
        property: "og:description",
        content: "Spreads, live proofs, master pages and preflight for the A4 or US Letter NEXT London booklet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CHART_LABELS: Partial<Record<InfographicKind, string>> = {
  waterfall: "Waterfall",
  radar: "Radar",
  heatmap: "Heat map",
  "calendar-heatmap": "Delivery calendar",
  treemap: "Treemap",
  sankey: "Flow (Sankey)",
  chord: "Chord",
  beeswarm: "Beeswarm",
  bump: "Rankings (bump)",
  "market-map": "Market map",
  "stacked-area": "Stacked area",
  dumbbell: "Before / after",
  "radial-bar": "Radial bars",
  sunburst: "Sunburst",
  gantt: "Timeline (Gantt)",
  slope: "Slope",
  "gauge-grid": "Gauge grid",
  boxplot: "Spread (boxplot)",
};
const CHART_KINDS = SUPPORTED_VIZ_KINDS.map((id) => ({ id, label: CHART_LABELS[id] ?? id }));

const floorLabel = (id: string) => LONDON_FLOORS.find((f) => f.id === id)?.label ?? id;

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const field =
  "w-full rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[color:var(--color-primary)]";
const labelCls = "text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]";
const segBtn = (on: boolean) =>
  `rounded-sm px-2.5 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[color:var(--color-primary)] ${
    on
      ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
      : "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
  }`;

type Mode = "simple" | "advanced";
type PanelTab = "page" | "master" | "preflight" | "library";

function LevelIcon({ level }: { level: PreflightCheck["level"] }) {
  if (level === "fail") return <XCircle className="size-4 shrink-0 text-[color:var(--color-destructive)]" aria-label="Fail" />;
  if (level === "warn") return <AlertTriangle className="size-4 shrink-0 text-[color:var(--color-foreground)]" aria-label="Needs a decision" />;
  if (level === "info") return <Info className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" aria-label="Note" />;
  return <CheckCircle2 className="size-4 shrink-0 text-[color:var(--color-primary)]" aria-label="Pass" />;
}

function BookletPage() {
  const mappedFloors = useMemo<LondonFloorId[]>(() => londonMappedFloors().map((f) => f.id), []);
  const [config, setConfig] = useState<BookletConfig>(() => ({
    ...bookletDefault({
      title: "NEXT 2026 LONDON",
      subtitle: `${LONDON_VENUE.name} · ${LONDON_VENUE.datesLabel}`,
      footnote: "Programme subject to change · full agenda and speaker bios online",
    }),
    mapFloors: mappedFloors.slice(0, 2),
  }));
  const [savedId, setSavedId] = useState<string>("");
  const [notes, setNotes] = useState<string[]>([]);
  const [notesFor, setNotesFor] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [agendaSnapshot, setAgendaSnapshot] = useState<AgendaConfig | null>(null);

  // ── studio chrome ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("simple");
  useEffect(() => {
    const m = window.localStorage.getItem("booklet-studio-mode");
    if (m === "advanced" || m === "simple") setMode(m);
  }, []);
  const pickMode = (m: Mode) => {
    setMode(m);
    window.localStorage.setItem("booklet-studio-mode", m);
    if (m === "simple" && tab === "master") setTab("page");
  };
  const advanced = mode === "advanced";
  const [tab, setTab] = useState<PanelTab>("page");
  const [selected, setSelected] = useState(0);
  const [spread, setSpread] = useState(false);
  const [guides, setGuides] = useState(false);
  const [zoom, setZoom] = useState(100);

  const list = useServerFn(listAgendaFiles);
  const saved = useQuery({ queryKey: ["agenda-files"], queryFn: () => list(), retry: false });
  const rows = (saved.data ?? []) as unknown as { id: string; name: string; config: AgendaConfig }[];

  const pickedAgenda = rows.find((r) => r.id === savedId)?.config ?? agendaSnapshot;
  const agendaSwapped = !!pickedAgenda && !agendaFileIsLive(pickedAgenda);
  const agendaIsDemo = !pickedAgenda;

  const agenda = useMemo<AgendaConfig>(() => {
    const base = pickedAgenda && agendaFileIsLive(pickedAgenda) ? pickedAgenda : agendaDefault(pickedAgenda?.divisionId ?? "city-series");
    return { ...base, sizeId: bookletAgendaSizeId(config.sizeId) };
  }, [pickedAgenda, config.sizeId]);

  const agendaPageCount = useMemo(() => {
    try {
      return config.includeAgenda ? agendaPages(agenda).length : 0;
    } catch {
      return 0;
    }
  }, [agenda, config.includeAgenda]);

  const plan = useMemo(() => bookletPagePlan(config, agendaPageCount), [config, agendaPageCount]);
  const planKey = plan.map((p) => p.label).join("|");
  useEffect(() => {
    setNotes([]);
    setNotesFor("");
  }, [planKey]);

  const geo = useMemo(() => agendaGeometry(agenda), [agenda]);
  const trim = { w: geo.trimW, h: geo.trimH };
  const bleed = { w: geo.bleedW, h: geo.bleedH };

  /** Running order with a pointer back to what each page is made from. */
  const pages = useMemo<ProofPage[]>(() => {
    let a = 0;
    let m = 0;
    let c = 0;
    return plan.map((p) => {
      if (p.kind === "agenda") return { kind: "agenda", label: p.label, agendaIndex: a++ };
      if (p.kind === "map") {
        const floorId = config.mapFloors[m++]!;
        return { kind: "map", label: `Map · ${floorLabel(floorId)}`, floorId, floorLabel: floorLabel(floorId) };
      }
      if (p.kind === "chart") return { kind: "chart", label: p.label, chartId: config.charts[c++]!.id };
      return { kind: p.kind, label: p.label } as ProofPage;
    });
  }, [plan, config.mapFloors, config.charts]);

  useEffect(() => {
    if (selected > pages.length - 1) setSelected(Math.max(0, pages.length - 1));
  }, [pages.length, selected]);
  const current = pages[selected];

  const checks = useMemo(
    () => bookletPreflight({ config, plan, agendaSwapped, agendaIsDemo, geo }),
    [config, plan, agendaSwapped, agendaIsDemo, geo],
  );
  const summary = preflightSummary(checks);

  // ── rendered proofs (maps + charts), on request ───────────────────────────
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const proofKey = (p: ProofPage) =>
    p.kind === "map" ? `map:${p.floorId}:${config.sizeId}` : p.kind === "chart" ? `chart:${JSON.stringify(config.charts.find((c) => c.id === p.chartId))}` : "";
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const renderProof = async (p: ProofPage) => {
    const key = proofKey(p);
    if (!key || proofs[key]) return;
    setBusy("proof");
    try {
      let png: Uint8Array | undefined;
      if (p.kind === "map") {
        const out = await bookletMapPages([p.floorId as LondonFloorId], {}, { wMm: geo.trimW, hMm: geo.trimH });
        png = out[0]?.png;
      } else if (p.kind === "chart") {
        const ch = config.charts.find((c) => c.id === p.chartId);
        if (ch) png = (await bookletChartPages([ch], "light")).pages[0]?.png;
      }
      if (png) {
        const url = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
        urls.current.push(url);
        setProofs((s) => ({ ...s, [key]: url }));
      }
    } finally {
      setBusy(null);
    }
  };

  // ── exports ───────────────────────────────────────────────────────────────
  const renderExtras = async (): Promise<{ pages: BookletImagePage[]; warnings: string[] }> => {
    const out: BookletImagePage[] = [];
    const warnings: string[] = [];
    if (config.includeMap && config.mapFloors.length) {
      out.push(...(await bookletMapPages(config.mapFloors, {}, { wMm: geo.trimW, hMm: geo.trimH })));
    }
    if (config.charts.length) {
      const charts = await bookletChartPages(config.charts, "light");
      out.push(...charts.pages);
      warnings.push(...charts.warnings);
    }
    return { pages: out, warnings };
  };

  const runExport = async (kind: "pdf" | "docx" | "pptx") => {
    setNotesFor(kind === "pdf" ? "press PDF" : kind === "docx" ? "Word file" : "PowerPoint file");
    setBusy(kind);
    try {
      await runWithExportFeedback(
        { pending: "Building the booklet…", success: "Booklet ready", failure: "The booklet could not be built" },
        async () => {
          const { pages: art, warnings } = await renderExtras();
          const cover = config.includeCover ? config.cover : null;
          const coverGround = cover && kind !== "pdf" ? await bookletCoverGroundPng(cover, { wMm: geo.trimW, hMm: geo.trimH }) : null;
          const stem = bookletSlug(config);
          if (kind === "pdf") {
            const built = await buildBookletPdf({ config, agenda, imagePages: art });
            download(new Blob([built.bytes], { type: "application/pdf" }), `${stem}.pdf`);
            setNotes([...built.notes, ...warnings]);
          } else {
            const extra = kind === "docx" ? buildAgendaDocx : buildAgendaPptx;
            const built = await extra(agenda, { cover, coverGround, imagePages: art, omitAgenda: !config.includeAgenda });
            download(built.blob, `${stem}.${kind}`);
            const skipped: string[] = [];
            if (bookletNotesPages(config)) skipped.push("Notes pages are in the press PDF only.");
            const master = bookletMaster(config);
            if (master.folios || master.runningFoot.trim()) skipped.push("Folios and running foot are in the press PDF only.");
            setNotes([...built.notes, ...warnings, ...skipped]);
          }
          setTab("preflight");
        },
      );
    } finally {
      setBusy(null);
    }
  };

  // ── editing helpers ───────────────────────────────────────────────────────
  const patchCover = (patch: Partial<BookletConfig["cover"]>) => setConfig((c) => ({ ...c, cover: { ...c.cover, ...patch } }));
  const patchMaster = (patch: Partial<BookletMaster>) => setConfig((c) => ({ ...c, master: { ...bookletMaster(c), ...patch } }));
  const patchChart = (id: string, patch: Partial<BookletChartPage>) =>
    setConfig((c) => ({ ...c, charts: c.charts.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)) }));
  const addChart = () => {
    const chart: BookletChartPage = { id: `c${Date.now().toString(36)}`, kind: "waterfall", title: "Programme at a glance", subtitle: "" };
    setConfig((c) => ({ ...c, charts: [...c.charts, chart] }));
    setSelected(plan.length - bookletNotesPages(config));
    setTab("page");
  };
  const move = <T,>(arr: T[], from: number, to: number) => {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    return next;
  };
  const moveFloor = (floorId: string, dir: -1 | 1) => {
    const i = config.mapFloors.indexOf(floorId as LondonFloorId);
    setConfig((c) => ({ ...c, mapFloors: move(c.mapFloors, i, i + dir) }));
    setSelected((s) => s + dir);
  };
  const moveChart = (id: string, dir: -1 | 1) => {
    const i = config.charts.findIndex((c) => c.id === id);
    if (i + dir < 0 || i + dir >= config.charts.length) return;
    setConfig((c) => ({ ...c, charts: move(c.charts, i, i + dir) }));
    setSelected((s) => s + dir);
  };

  // Drag-to-reorder within a group (maps with maps, charts with charts).
  const [drag, setDrag] = useState<number | null>(null);
  const onDrop = (to: number) => {
    const from = drag;
    setDrag(null);
    if (from === null || from === to) return;
    const a = pages[from];
    const b = pages[to];
    if (!a || !b || a.kind !== b.kind) return;
    if (a.kind === "map" && b.kind === "map") {
      const i = config.mapFloors.indexOf(a.floorId as LondonFloorId);
      const j = config.mapFloors.indexOf(b.floorId as LondonFloorId);
      setConfig((c) => ({ ...c, mapFloors: move(c.mapFloors, i, j) }));
    } else if (a.kind === "chart" && b.kind === "chart") {
      const i = config.charts.findIndex((c) => c.id === a.chartId);
      const j = config.charts.findIndex((c) => c.id === b.chartId);
      setConfig((c) => ({ ...c, charts: move(c.charts, i, j) }));
    } else return;
    setSelected(to);
  };

  const onPagesKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setSelected((s) => Math.min(pages.length - 1, s + 1));
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    }
  };
  const pageBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (pageBtnRefs.current.some((b) => b === document.activeElement)) pageBtnRefs.current[selected]?.focus();
  }, [selected]);

  // ── saved booklets ────────────────────────────────────────────────────────
  const qc = useQueryClient();
  const listBooklets = useServerFn(listEventBooklets);
  const saveBooklet = useServerFn(saveEventBooklet);
  const patchBooklet = useServerFn(updateEventBooklet);
  const removeBooklet = useServerFn(deleteEventBooklet);
  const booklets = useQuery({ queryKey: ["event-booklets"], queryFn: () => listBooklets(), retry: false });
  const bookletRows = (booklets.data ?? []) as unknown as {
    id: string;
    name: string;
    year: number;
    config: BookletConfig;
    agenda: AgendaConfig | null;
    updated_at: string;
  }[];
  const [openId, setOpenId] = useState<string>("");
  const [bookletName, setBookletName] = useState("NEXT London booklet");
  const [bookletYear, setBookletYear] = useState(2026);
  const [libError, setLibError] = useState<string>("");
  const [savedAt, setSavedAt] = useState<string>("");

  const runLibrary = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setLibError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["event-booklets"] });
      if (label !== "delete") setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setLibError(err instanceof Error ? err.message : "That could not be saved.");
      setTab("library");
    } finally {
      setBusy(null);
    }
  };
  const payload = (name: string, year: number) => ({
    name,
    year,
    city: "london",
    eventId: "next",
    notes: "",
    config,
    agenda: agenda as unknown as Record<string, unknown>,
  });
  const onSave = () =>
    runLibrary("save", async () => {
      const data = payload(bookletName.trim() || "Untitled booklet", bookletYear);
      if (openId) await patchBooklet({ data: { id: openId, ...data } });
      else setOpenId(((await saveBooklet({ data })) as unknown as { id: string }).id);
    });
  const onOpen = (id: string) => {
    const row = bookletRows.find((r) => r.id === id);
    if (!row) return;
    setOpenId(row.id);
    setBookletName(row.name);
    setBookletYear(row.year);
    setConfig(row.config);
    setAgendaSnapshot(row.agenda ?? null);
    setSavedId("");
    setLibError("");
    setSelected(0);
    setSavedAt("");
  };
  const onDuplicate = () =>
    runLibrary("copy", async () => {
      const nextYear = bookletYear + 1;
      const renamed = bookletName.replace(String(bookletYear), String(nextYear));
      const name = renamed === bookletName ? `${bookletName} ${nextYear}` : renamed;
      const row = (await saveBooklet({ data: payload(name, nextYear) })) as unknown as { id: string; name: string };
      setOpenId(row.id);
      setBookletName(row.name);
      setBookletYear(nextYear);
    });
  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    void runLibrary("delete", async () => {
      await removeBooklet({ data: { id } });
      if (openId === id) setOpenId("");
    });
  };

  // ── canvas layout ─────────────────────────────────────────────────────────
  const spreadPages = useMemo(() => {
    if (!spread || !config.includeCover) return spread ? [selected - (selected % 2), selected - (selected % 2) + 1] : [selected];
    // Cover sits alone on the right; inside pages pair up 2–3, 4–5 …
    if (selected === 0) return [0];
    const left = selected % 2 === 1 ? selected : selected - 1;
    return [left, left + 1];
  }, [spread, selected, config.includeCover]);
  const pageW = Math.round(((spread ? 340 : 460) * zoom) / 100);

  const folioFor = (i: number) => {
    const m = bookletMaster(config);
    const first = config.includeCover ? 1 : 0;
    return i < first ? null : m.startFolio + (i - first);
  };

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "page", label: "Page" },
    ...(advanced ? [{ id: "master" as const, label: "Master" }] : []),
    { id: "preflight", label: summary.fail + summary.warn ? `Preflight · ${summary.fail + summary.warn}` : "Preflight" },
    { id: "library", label: "Library" },
  ];

  const exportDisabled = !plan.length || busy !== null;

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-64px)] flex-col bg-[color:var(--color-muted)]/40">
        {/* ── top bar ───────────────────────────────────────────────────── */}
        <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-background)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <Link
              to="/events/next/london"
              className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)] hover:underline"
            >
              <ArrowLeft className="size-3.5" /> NEXT London
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="sr-only">Booklet studio</h1>
              <label className="sr-only" htmlFor="booklet-name">Booklet name</label>
              <input
                id="booklet-name"
                value={bookletName}
                onChange={(e) => setBookletName(e.target.value)}
                className="w-56 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold hover:border-[color:var(--color-border)] focus-visible:border-[color:var(--color-primary)] focus-visible:outline-none"
              />
              <label className="sr-only" htmlFor="booklet-year">Year</label>
              <input
                id="booklet-year"
                type="number"
                min={2000}
                max={2100}
                value={bookletYear}
                onChange={(e) => setBookletYear(Number(e.target.value) || bookletYear)}
                className="w-20 rounded-sm border border-[color:var(--color-border)] bg-transparent px-1.5 py-1 text-sm"
              />
              <span className="text-xs text-[color:var(--color-muted-foreground)]" aria-live="polite">
                {busy === "save" ? "Saving…" : savedAt ? `Saved ${savedAt}` : openId ? "Opened from library" : "Not saved yet"}
              </span>
            </div>

            <div role="group" aria-label="Page size" className="flex gap-0.5 rounded-sm border border-[color:var(--color-border)] p-0.5">
              {BOOKLET_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.note}
                  aria-pressed={config.sizeId === s.id}
                  onClick={() => setConfig((c) => ({ ...c, sizeId: s.id }))}
                  className={segBtn(config.sizeId === s.id)}
                >
                  {s.id === "a4" ? "A4" : "US Letter"}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Studio mode" className="flex gap-0.5 rounded-sm border border-[color:var(--color-border)] p-0.5">
              <button type="button" aria-pressed={!advanced} onClick={() => pickMode("simple")} className={segBtn(!advanced)}>
                Simple
              </button>
              <button type="button" aria-pressed={advanced} onClick={() => pickMode("advanced")} className={segBtn(advanced)}>
                Advanced
              </button>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={onSave}>
                <Save className="mr-1.5 size-4" />
                {openId ? "Update" : "Save"}
              </Button>
              <Button size="sm" variant="outline" disabled={exportDisabled} onClick={() => runExport("docx")}>
                <FileText className="mr-1.5 size-4" />
                {busy === "docx" ? "Building…" : "Word"}
              </Button>
              <Button size="sm" variant="outline" disabled={exportDisabled} onClick={() => runExport("pptx")}>
                <Presentation className="mr-1.5 size-4" />
                {busy === "pptx" ? "Building…" : "PowerPoint"}
              </Button>
              <Button size="sm" disabled={exportDisabled} onClick={() => runExport("pdf")}>
                <FileDown className="mr-1.5 size-4" />
                {busy === "pdf" ? "Building…" : "Press PDF"}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_340px]">
          {/* ── pages panel ─────────────────────────────────────────────── */}
          <aside className="border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] lg:border-b-0 lg:border-r" aria-label="Pages">
            <div className="space-y-2 border-b border-[color:var(--color-border)] p-3">
              <p className={labelCls}>Sections</p>
              {(
                [
                  ["includeCover", "Cover"],
                  ["includeAgenda", "Agenda days"],
                  ["includeMap", "Venue maps"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[color:var(--color-primary)]"
                    checked={config[key]}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={addChart}>
                <Plus className="mr-1.5 size-4" /> Add chart page
              </Button>
            </div>

            <div className="flex items-baseline justify-between px-3 pt-3">
              <p className={labelCls}>Pages</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{plan.length} in running order</p>
            </div>
            <ol
              className="grid max-h-[70vh] grid-cols-2 gap-x-2 gap-y-3 overflow-y-auto p-3"
              onKeyDown={onPagesKey}
              aria-label="Running order — arrow keys move between pages"
            >
              {pages.map((p, i) => {
                const draggable = advanced && (p.kind === "map" || p.kind === "chart");
                const on = i === selected;
                // Cover sits alone on the right, like a printed spread.
                const offset = i === 0 && config.includeCover ? "col-start-2" : "";
                return (
                  <li
                    key={`${p.kind}-${p.label}-${i}`}
                    className={offset}
                    onDragOver={(e) => draggable && drag !== null && e.preventDefault()}
                    onDrop={() => onDrop(i)}
                  >
                    <button
                      ref={(el) => {
                        pageBtnRefs.current[i] = el;
                      }}
                      type="button"
                      draggable={draggable}
                      onDragStart={() => setDrag(i)}
                      onDragEnd={() => setDrag(null)}
                      onClick={() => {
                        setSelected(i);
                        setTab("page");
                      }}
                      aria-current={on ? "page" : undefined}
                      tabIndex={on ? 0 : -1}
                      className={`group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] ${drag === i ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`relative overflow-hidden border shadow-sm ${
                          on ? "border-[color:var(--color-primary)] ring-2 ring-[color:var(--color-primary)]" : "border-[color:var(--color-border)] group-hover:border-[color:var(--color-foreground)]/40"
                        }`}
                      >
                        <PageProof page={p} config={config} agenda={agenda} trim={trim} bleed={bleed} widthPx={100} compact renderedSrc={proofs[proofKey(p)]} />
                        {draggable ? (
                          <GripVertical className="absolute right-0.5 top-0.5 size-3.5 text-[color:var(--color-muted-foreground)]" aria-hidden />
                        ) : null}
                      </div>
                      <span className="mt-1 flex items-baseline gap-1 text-[11px] leading-tight">
                        <span className="font-semibold tabular-nums">{i + 1}</span>
                        <span className="truncate text-[color:var(--color-muted-foreground)]">{p.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {pages.length === 0 ? (
                <li className="col-span-2 text-xs text-[color:var(--color-muted-foreground)]">
                  No pages yet — tick a section above or add a chart page.
                </li>
              ) : null}
            </ol>
          </aside>

          {/* ── canvas ──────────────────────────────────────────────────── */}
          <main className="flex min-w-0 flex-col" aria-label="Proof canvas">
            <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-2 text-xs">
              <span className="font-semibold">{current ? `Page ${selected + 1} · ${current.label}` : "No page"}</span>
              <span className="text-[color:var(--color-muted-foreground)]">
                {geo.trimW} × {geo.trimH} mm trim · {geo.bleedEdge} mm bleed
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {advanced ? (
                  <>
                    <div role="group" aria-label="View" className="flex gap-0.5 rounded-sm border border-[color:var(--color-border)] p-0.5">
                      <button type="button" aria-pressed={!spread} onClick={() => setSpread(false)} className={segBtn(!spread)}>
                        Page
                      </button>
                      <button type="button" aria-pressed={spread} onClick={() => setSpread(true)} className={segBtn(spread)}>
                        Spread
                      </button>
                    </div>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" className="accent-[color:var(--color-primary)]" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
                      Trim & safe guides
                    </label>
                  </>
                ) : null}
                <label className="flex items-center gap-1.5">
                  Zoom
                  <input type="range" min={60} max={160} step={10} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-valuetext={`${zoom}%`} />
                  <span className="w-9 tabular-nums">{zoom}%</span>
                </label>
              </div>
            </div>

            <div className="flex flex-1 items-start justify-center overflow-auto p-6 lg:p-10">
              {current ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex shadow-[0_8px_28px_rgba(3,0,44,0.18)]">
                    {spreadPages.map((idx) => {
                      const p = pages[idx];
                      const folio = folioFor(idx);
                      const m = bookletMaster(config);
                      return (
                        <div key={idx} style={{ width: pageW }} className={`relative ${p ? "" : "bg-[color:var(--color-background)]/60"}`}>
                          {p ? (
                            <button
                              type="button"
                              onClick={() => setSelected(idx)}
                              className={`relative block w-full text-left ${idx === selected && spreadPages.length > 1 ? "outline outline-2 outline-[color:var(--color-primary)]" : ""}`}
                              aria-label={`Select page ${idx + 1}`}
                            >
                              <PageProof page={p} config={config} agenda={agenda} trim={trim} bleed={bleed} widthPx={pageW} renderedSrc={proofs[proofKey(p)]} />
                              {folio !== null && (m.folios || m.runningFoot) ? (
                                <span
                                  className={`absolute flex gap-2 text-[9px] text-[color:var(--color-foreground)] ${folio % 2 ? "right-[4%] flex-row-reverse" : "left-[4%]"}`}
                                  style={{ bottom: `${((geo.safeInset * 0.42) / geo.trimH) * 100}%` }}
                                >
                                  {m.folios ? <b>{folio}</b> : null}
                                  {m.runningFoot ? <span className="opacity-70">{m.runningFoot}</span> : null}
                                </span>
                              ) : null}
                              {guides ? <ProofGuides trim={trim} safeInset={geo.safeInset} /> : null}
                            </button>
                          ) : (
                            <div style={{ aspectRatio: `${trim.w} / ${trim.h}` }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted-foreground)]">
                    <Button size="sm" variant="ghost" disabled={selected === 0} onClick={() => setSelected((s) => Math.max(0, s - 1))} aria-label="Previous page">
                      <ArrowLeft className="size-4" />
                    </Button>
                    <span>Screen proof — the press file places picture and type itself.</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={selected >= pages.length - 1}
                      onClick={() => setSelected((s) => Math.min(pages.length - 1, s + 1))}
                      aria-label="Next page"
                    >
                      <ArrowLeft className="size-4 rotate-180" />
                    </Button>
                  </div>
                  {(current.kind === "map" || current.kind === "chart") && !proofs[proofKey(current)] ? (
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => renderProof(current)}>
                      {busy === "proof" ? "Rendering…" : "Render proof"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-20 max-w-sm text-center text-sm text-[color:var(--color-muted-foreground)]">
                  Nothing to lay out yet. Tick the cover, agenda or venue maps on the left, or add a chart page.
                </div>
              )}
            </div>
          </main>

          {/* ── right panel ─────────────────────────────────────────────── */}
          <aside className="border-t border-[color:var(--color-border)] bg-[color:var(--color-background)] lg:border-l lg:border-t-0" aria-label="Inspector">
            <div role="tablist" aria-label="Inspector panels" className="flex border-b border-[color:var(--color-border)]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 border-b-2 px-2 py-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[color:var(--color-primary)] ${
                    tab === t.id ? "border-[color:var(--color-primary)] text-[color:var(--color-foreground)]" : "border-transparent text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="space-y-5 p-4">
              {tab === "page" ? (
                <PagePanel
                  page={current}
                  config={config}
                  setConfig={setConfig}
                  patchCover={patchCover}
                  patchChart={patchChart}
                  moveFloor={moveFloor}
                  moveChart={moveChart}
                  mappedFloors={mappedFloors}
                  rows={rows}
                  savedId={savedId}
                  setSavedId={setSavedId}
                  agendaIsError={saved.isError}
                  agendaPageCount={agendaPageCount}
                  agendaSwapped={agendaSwapped}
                />
              ) : null}

              {tab === "master" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">Inside-page master</h2>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                      Applied to every page after the cover, inside the lower safe margin so it never touches page content.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-[color:var(--color-primary)]"
                      checked={bookletMaster(config).folios}
                      onChange={(e) => patchMaster({ folios: e.target.checked })}
                    />
                    Page numbers (folios)
                  </label>
                  <label className="block space-y-1">
                    <span className={labelCls}>First inside page number</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className={field}
                      value={bookletMaster(config).startFolio}
                      onChange={(e) => patchMaster({ startFolio: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelCls}>Running foot</span>
                    <input
                      className={field}
                      maxLength={60}
                      placeholder="e.g. NEXT 2026 London · QEII Centre"
                      value={bookletMaster(config).runningFoot}
                      onChange={(e) => patchMaster({ runningFoot: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelCls}>Notes pages at the back</span>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      className={field}
                      value={bookletNotesPages(config)}
                      onChange={(e) => setConfig((c) => ({ ...c, notesPages: Number(e.target.value) || 0 }))}
                    />
                  </label>
                  <div className="border-t border-[color:var(--color-border)] pt-4">
                    <h2 className="text-sm font-semibold">Brand styles</h2>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">Locked to the approved system — every page uses these.</p>
                    <dl className="mt-3 space-y-2 text-xs">
                      {[
                        ["Cover title", "Geist Bold · uppercase · tight leading"],
                        ["Running head", "Geist Bold · uppercase"],
                        ["Body & captions", "Geist Regular · 140% leading"],
                        ["Folio", "Geist Bold · 7.5 pt"],
                        ["Colour", "Ink #03002C on paper · Blue 500 accents"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-[color:var(--color-border)] pb-1.5">
                          <dt className="font-semibold">{k}</dt>
                          <dd className="text-right text-[color:var(--color-muted-foreground)]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">Master furniture and notes pages print in the press PDF only.</p>
                </div>
              ) : null}

              {tab === "preflight" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold">Print preflight</h2>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]" aria-live="polite">
                      {summary.fail
                        ? `${summary.fail} problem${summary.fail === 1 ? "" : "s"} to fix before press.`
                        : summary.warn
                          ? `${summary.warn} item${summary.warn === 1 ? "" : "s"} need${summary.warn === 1 ? "s" : ""} a decision.`
                          : "Ready for press."}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {checks.map((c) => (
                      <li key={c.id} className="flex gap-2 border-b border-[color:var(--color-border)] pb-2">
                        <LevelIcon level={c.level} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{c.title}</p>
                          <p className="text-xs leading-snug text-[color:var(--color-muted-foreground)]">{c.detail}</p>
                          <div className="mt-1 flex gap-3">
                            {c.fix?.kind === "pad-notes" ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
                                onClick={() => setConfig((cfg) => ({ ...cfg, notesPages: c.fix!.pages }))}
                              >
                                Add notes pages
                              </button>
                            ) : null}
                            {c.page !== undefined && c.page >= 0 ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-[color:var(--color-primary)] hover:underline"
                                onClick={() => {
                                  setSelected(c.page!);
                                  setTab("page");
                                }}
                              >
                                Go to page {c.page + 1}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {notes.length ? (
                    <div className="border-t border-[color:var(--color-border)] pt-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide">About the {notesFor} you just made</h3>
                      <ul className="mt-2 space-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                        {notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === "library" ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold">Saved booklets</h2>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">Re-open, edit, or copy a booklet into the following year.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy !== null} onClick={onSave}>
                      <Save className="mr-1.5 size-4" />
                      {busy === "save" ? "Saving…" : openId ? "Update" : "Save"}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={onDuplicate}>
                      <Copy className="mr-1.5 size-4" />
                      {busy === "copy" ? "Copying…" : `Reuse for ${bookletYear + 1}`}
                    </Button>
                  </div>
                  {libError ? <p className="text-xs text-[color:var(--color-destructive)]">{libError}</p> : null}
                  <ul className="space-y-1 border-t border-[color:var(--color-border)] pt-3 text-sm">
                    {bookletRows.map((row) => (
                      <li key={row.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          aria-pressed={openId === row.id}
                          className={`flex-1 truncate rounded-sm px-2 py-1 text-left ${openId === row.id ? "bg-[color:var(--color-muted)] font-semibold" : "hover:bg-[color:var(--color-muted)]"}`}
                        >
                          {row.name}
                          <span className="ml-2 text-xs text-[color:var(--color-muted-foreground)]">{row.year}</span>
                        </button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${row.name}`} disabled={busy !== null} onClick={() => onDelete(row.id, row.name)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                    {bookletRows.length === 0 ? (
                      <li className="text-xs text-[color:var(--color-muted-foreground)]">
                        {booklets.isError ? "Sign in to save and re-open booklets." : "No booklets saved yet."}
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

// ── page inspector ──────────────────────────────────────────────────────────

function PagePanel(props: {
  page: ProofPage | undefined;
  config: BookletConfig;
  setConfig: React.Dispatch<React.SetStateAction<BookletConfig>>;
  patchCover: (p: Partial<BookletConfig["cover"]>) => void;
  patchChart: (id: string, p: Partial<BookletChartPage>) => void;
  moveFloor: (id: string, dir: -1 | 1) => void;
  moveChart: (id: string, dir: -1 | 1) => void;
  mappedFloors: LondonFloorId[];
  rows: { id: string; name: string }[];
  savedId: string;
  setSavedId: (v: string) => void;
  agendaIsError: boolean;
  agendaPageCount: number;
  agendaSwapped: boolean;
}) {
  const { page, config, setConfig, patchCover } = props;
  if (!page) {
    return <p className="text-sm text-[color:var(--color-muted-foreground)]">Pick a page on the left to edit it.</p>;
  }

  const heading = (title: string, note?: string) => (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {note ? <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">{note}</p> : null}
    </div>
  );

  if (page.kind === "cover") {
    const c = config.cover;
    return (
      <div className="space-y-4">
        {heading("Cover", "Every line is editable; nothing is invented.")}
        {(
          [
            ["eyebrow", "Eyebrow"],
            ["title", "Title"],
            ["subtitle", "Sub-line"],
            ["footnote", "Footnote"],
          ] as const
        ).map(([key, label]) => {
          const cap = COVER_CAPS[key];
          const len = c[key].length;
          return (
            <label key={key} className="block space-y-1">
              <span className="flex justify-between">
                <span className={labelCls}>{label}</span>
                <span className={`text-[11px] tabular-nums ${len > cap - 10 ? "text-[color:var(--color-foreground)]" : "text-[color:var(--color-muted-foreground)]"}`}>
                  {len}/{cap}
                </span>
              </span>
              <input className={field} maxLength={cap} value={c[key]} onChange={(e) => patchCover({ [key]: e.target.value })} />
            </label>
          );
        })}
        <div className="space-y-2">
          <span className={labelCls}>Cover picture</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => patchCover({ artId: "" })}
              aria-pressed={!c.artId}
              className={`flex aspect-[3/4] items-center justify-center rounded-sm border-2 bg-[color:var(--color-foreground)] text-[11px] font-semibold text-[color:var(--color-background)] ${!c.artId ? "border-[color:var(--color-primary)]" : "border-transparent opacity-70"}`}
            >
              Ink only
            </button>
            {bookletCoverArtFor("london").map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => patchCover({ artId: art.id })}
                aria-pressed={c.artId === art.id}
                title={art.name}
                className={`overflow-hidden rounded-sm border-2 ${c.artId === art.id ? "border-[color:var(--color-primary)]" : "border-transparent"}`}
              >
                <img src={art.src} alt={art.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </button>
            ))}
          </div>
          {c.artId ? <p className="text-[11px] text-[color:var(--color-muted-foreground)]">{bookletCoverArt(c.artId)?.credit}</p> : null}
        </div>
        {c.artId ? (
          <>
            <div className="space-y-1.5">
              <span className={labelCls}>Layout</span>
              <div className="flex flex-wrap gap-1.5">
                {BOOKLET_COVER_TREATMENTS.map((t) => {
                  const on = (c.treatment ?? "full-bleed") === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.note}
                      aria-pressed={on}
                      onClick={() => patchCover({ treatment: t.id as BookletCoverTreatment })}
                      className={`rounded-sm border px-2.5 py-1 text-xs font-semibold ${on ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]" : "border-[color:var(--color-border)]"}`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block space-y-1">
              <span className={labelCls}>Ink veil · {c.scrim ?? 88}%</span>
              <input type="range" min={40} max={100} step={2} value={c.scrim ?? 88} onChange={(e) => patchCover({ scrim: Number(e.target.value) })} className="w-full" />
            </label>
          </>
        ) : null}
      </div>
    );
  }

  if (page.kind === "agenda") {
    return (
      <div className="space-y-4">
        {heading(
          "Agenda days",
          `Vector pages from the agenda studio, printed at the booklet size · ${props.agendaPageCount} page${props.agendaPageCount === 1 ? "" : "s"}.`,
        )}
        <label className="block space-y-1">
          <span className={labelCls}>Agenda file</span>
          <select className={field} value={props.savedId} onChange={(e) => props.setSavedId(e.target.value)}>
            <option value="">Demo programme (city series)</option>
            {props.rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        {props.agendaIsError ? <p className="text-xs text-[color:var(--color-muted-foreground)]">Sign in to print a saved agenda.</p> : null}
        {props.agendaSwapped ? (
          <p className="flex gap-2 border-l-2 border-[color:var(--color-foreground)] bg-[color:var(--color-muted)] px-3 py-2 text-xs">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            This saved agenda was built on an older programme, so the approved programme prints instead. Re-save it in the agenda studio to print your version.
          </p>
        ) : null}
      </div>
    );
  }

  if (page.kind === "map") {
    const i = config.mapFloors.indexOf(page.floorId as LondonFloorId);
    return (
      <div className="space-y-4">
        {heading(`Map · ${page.floorLabel}`, "Rendered from the live floor plan at 300 ppi, turned to fit the page.")}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={i <= 0} onClick={() => props.moveFloor(page.floorId, -1)}>
            <ArrowUp className="mr-1 size-4" /> Earlier
          </Button>
          <Button size="sm" variant="outline" disabled={i >= config.mapFloors.length - 1} onClick={() => props.moveFloor(page.floorId, 1)}>
            <ArrowDown className="mr-1 size-4" /> Later
          </Button>
        </div>
        <div className="space-y-1.5">
          <span className={labelCls}>Floors in the booklet</span>
          {LONDON_FLOORS.filter((f) => props.mappedFloors.includes(f.id)).map((floor) => {
            const on = config.mapFloors.includes(floor.id);
            return (
              <label key={floor.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[color:var(--color-primary)]"
                  checked={on}
                  onChange={() =>
                    setConfig((c) => ({
                      ...c,
                      mapFloors: on ? c.mapFloors.filter((f) => f !== floor.id) : [...c.mapFloors, floor.id],
                    }))
                  }
                />
                {floor.label}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (page.kind === "chart") {
    const chart = config.charts.find((c) => c.id === page.chartId);
    if (!chart) return null;
    const i = config.charts.indexOf(chart);
    return (
      <div className="space-y-4">
        {heading("Chart page", "Starts from sample figures and is labelled as sample data until replaced.")}
        <label className="block space-y-1">
          <span className={labelCls}>Chart type</span>
          <select className={field} value={chart.kind} onChange={(e) => props.patchChart(chart.id, { kind: e.target.value as InfographicKind })}>
            {CHART_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={labelCls}>Title</span>
          <input className={field} value={chart.title} onChange={(e) => props.patchChart(chart.id, { title: e.target.value })} />
        </label>
        <label className="block space-y-1">
          <span className={labelCls}>Sub-line</span>
          <input className={field} value={chart.subtitle} onChange={(e) => props.patchChart(chart.id, { subtitle: e.target.value })} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={i <= 0} onClick={() => props.moveChart(chart.id, -1)}>
            <ArrowUp className="mr-1 size-4" /> Earlier
          </Button>
          <Button size="sm" variant="outline" disabled={i >= config.charts.length - 1} onClick={() => props.moveChart(chart.id, 1)}>
            <ArrowDown className="mr-1 size-4" /> Later
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfig((c) => ({ ...c, charts: c.charts.filter((ch) => ch.id !== chart.id) }))}>
            <Trash2 className="mr-1 size-4" /> Remove page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {heading("Notes pages", "Ruled pages at the back — often used to reach a multiple of 4 for saddle stitching. Press PDF only.")}
      <label className="block space-y-1">
        <span className={labelCls}>How many</span>
        <input
          type="number"
          min={0}
          max={12}
          className={field}
          value={bookletNotesPages(config)}
          onChange={(e) => setConfig((c) => ({ ...c, notesPages: Number(e.target.value) || 0 }))}
        />
      </label>
    </div>
  );
}
