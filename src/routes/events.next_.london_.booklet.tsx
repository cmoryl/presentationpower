// /events/next/london/booklet — one printed booklet from one place.
//
// Cover, the agenda days from the agenda studio, the venue floor maps and any
// number of chart pages, exported as a press PDF, a Word file and a PowerPoint
// deck at A4 or US Letter. The agenda pages stay vector; the map and chart pages
// are rendered artwork and say so on the page.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Copy,
  FileDown,
  FileText,
  Presentation,
  Save,
  Trash2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/design-system/element";
import { runWithExportFeedback } from "@/lib/export-feedback";
import { agendaDefault, agendaGeometry, agendaPages, type AgendaConfig } from "@/lib/next-agenda";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";
import { listAgendaFiles } from "@/lib/next-agenda.functions";
import {
  BOOKLET_SIZES,
  bookletAgendaSizeId,
  bookletDefault,
  bookletPagePlan,
  bookletSlug,
  type BookletChartPage,
  type BookletConfig,
  type BookletImagePage,
} from "@/lib/next-booklet";
import {
  deleteEventBooklet,
  listEventBooklets,
  saveEventBooklet,
  updateEventBooklet,
} from "@/lib/next-booklet.functions";
import { buildBookletPdf } from "@/lib/next-booklet-pdf";
import { bookletChartPages, bookletCoverGroundPng, bookletMapPages } from "@/lib/next-booklet-render";
import {
  BOOKLET_COVER_TREATMENTS,
  bookletCoverArt,
  bookletCoverArtFor,
  bookletCoverLayout,
  type BookletCoverTreatment,
} from "@/lib/next-booklet-cover-art";
import { SUPPORTED_VIZ_KINDS } from "@/lib/infographics/variant-kinds";
import { LONDON_FLOORS, LONDON_VENUE, type LondonFloorId } from "@/lib/next-london-signage";
import { londonMappedFloors } from "@/lib/next-london-floorplan";
import type { InfographicKind } from "@/lib/infographics/spec";

export const Route = createFileRoute("/events/next_/london_/booklet")({
  component: BookletPage,
  head: () => ({
    meta: [
      { title: "NEXT London booklet builder | TransPerfect Element" },
      {
        name: "description",
        content:
          "Print one NEXT London booklet from one place: cover, agenda days, venue maps and chart pages as a press PDF, Word file or PowerPoint deck.",
      },
      { property: "og:title", content: "NEXT London booklet builder" },
      {
        property: "og:description",
        content:
          "Cover, agenda, venue maps and charts assembled into one A4 or US Letter booklet with press, Word and PowerPoint exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/** Chart looks offered on a booklet page — the ones that read at handout size. */
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

/** Only looks with a print renderer can become a booklet page. */
const CHART_KINDS: { id: InfographicKind; label: string }[] = SUPPORTED_VIZ_KINDS.map((id) => ({
  id,
  label: CHART_LABELS[id] ?? id,
}));

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * On-screen cover proof. It follows the same fractions the press file uses, so
 * what the operator moves here is what the printed cover does — but it is a
 * screen proof, not the press artwork.
 */
function CoverPreview({ cover, trim }: { cover: BookletConfig["cover"]; trim: { w: number; h: number } }) {
  const art = bookletCoverArt(cover.artId);
  const layout = bookletCoverLayout(cover.treatment ?? "full-bleed");
  const veil = Math.max(0, Math.min(1, layout.scrim.strength * ((cover.scrim ?? 88) / 100)));
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const veilStyle =
    layout.scrim.from === "all"
      ? { background: `rgba(3,0,44,${veil})` }
      : {
          background: `linear-gradient(to ${layout.scrim.from === "bottom" ? "top" : "bottom"}, rgba(3,0,44,${veil}) 0%, rgba(3,0,44,${veil * 0.45}) ${pct(layout.scrim.span * 0.55)}, rgba(3,0,44,0) ${pct(layout.scrim.span)})`,
        };
  return (
    <div
      className="relative w-full overflow-hidden rounded-md bg-[#03002C]"
      style={{ aspectRatio: `${trim.w} / ${trim.h}` }}
    >
      {art ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: pct(layout.photo.x),
            top: pct(layout.photo.y),
            width: pct(layout.photo.w),
            height: pct(layout.photo.h),
          }}
        >
          <img src={art.src} alt={art.name} loading="lazy" className="size-full object-cover" />
          <div className="absolute inset-0" style={veilStyle} />
        </div>
      ) : null}
      <div
        className="absolute flex flex-col gap-[3%] px-[8%]"
        style={{
          left: 0,
          right: 0,
          top: art ? pct(layout.copy.y) : "8%",
          height: art ? pct(layout.copy.h) : "60%",
          justifyContent: art && layout.copy.anchor === "bottom" ? "flex-end" : "flex-start",
          // The footnote owns the page foot in the press file, so a
          // bottom-anchored copy block stops above it here too.
          paddingBottom: cover.footnote ? "8%" : undefined,
        }}
      >
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block h-[5px] w-[22px] rounded-[1px]"
              style={{ background: i === 4 ? "#003FC7" : "rgba(255,255,255,0.92)" }}
            />
          ))}
        </div>
        {cover.eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {cover.eyebrow}
          </p>
        ) : null}
        {cover.title ? (
          <p className="text-[clamp(14px,3.2vw,26px)] font-bold uppercase leading-[1.04] text-white">
            {cover.title}
          </p>
        ) : null}
        {cover.subtitle ? (
          <p className="text-[10px] leading-snug text-white/90">{cover.subtitle}</p>
        ) : null}
      </div>
      {cover.footnote ? (
        <p className="absolute inset-x-0 bottom-[4%] px-[8%] text-[8px] leading-snug text-white/70">
          {cover.footnote}
        </p>
      ) : null}
    </div>
  );
}

function BookletPage() {
  const mappedFloors = useMemo<LondonFloorId[]>(
    () => londonMappedFloors().map((f) => f.id),
    [],
  );
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
  /** Which file the notes below describe, so they never read as advice about the next one. */
  const [notesFor, setNotesFor] = useState<string>("");

  const [busy, setBusy] = useState<string | null>(null);
  /** The agenda carried inside an opened saved booklet, when it has one. */
  const [agendaSnapshot, setAgendaSnapshot] = useState<AgendaConfig | null>(null);

  const list = useServerFn(listAgendaFiles);
  const saved = useQuery({
    queryKey: ["agenda-files"],
    queryFn: () => list(),
    retry: false,
  });

  const rows = (saved.data ?? []) as unknown as { id: string; name: string; config: AgendaConfig }[];

  /** The agenda the booklet prints, forced to the booklet's own page format. */
  const agenda = useMemo<AgendaConfig>(() => {
    const base =
      rows.find((r) => r.id === savedId)?.config ?? agendaSnapshot ?? agendaDefault("city-series");
    return { ...base, sizeId: bookletAgendaSizeId(config.sizeId) };
  }, [rows, savedId, agendaSnapshot, config.sizeId]);

  const agendaPageCount = useMemo(() => {
    try {
      return config.includeAgenda ? agendaPages(agenda).length : 0;
    } catch {
      return 0;
    }
  }, [agenda, config.includeAgenda]);

  const plan = useMemo(() => bookletPagePlan(config, agendaPageCount), [config, agendaPageCount]);

  /** The printed trim of the booklet, taken from the agenda page it prints. */
  const bookletGeo = useMemo(() => agendaGeometry(agenda), [agenda]);

  /** Render the map and chart pages once per export. */
  const renderExtras = async (): Promise<{ pages: BookletImagePage[]; warnings: string[] }> => {
    const pages: BookletImagePage[] = [];
    const warnings: string[] = [];
    if (config.includeMap && config.mapFloors.length) {
      pages.push(
        ...(await bookletMapPages(
          config.mapFloors,
          {},
          { wMm: bookletGeo.trimW, hMm: bookletGeo.trimH },
        )),
      );
    }
    if (config.charts.length) {
      const charts = await bookletChartPages(config.charts, "light");
      pages.push(...charts.pages);
      warnings.push(...charts.warnings);
    }
    return { pages, warnings };
  };

  const runExport = async (kind: "pdf" | "docx" | "pptx") => {
    setBusy(kind);
    try {
      await runWithExportFeedback(
        {
          pending: "Building the booklet…",
          success: "Booklet ready",
          failure: "The booklet could not be built",
        },
        async () => {
        const { pages, warnings } = await renderExtras();
        const cover = config.includeCover ? config.cover : null;
        // Word and PowerPoint need the cover picture composed with its veil; the
        // press PDF places the picture live and does its own veil in vector.
        const coverGround =
          cover && kind !== "pdf"
            ? await bookletCoverGroundPng(cover, {
                wMm: bookletGeo.trimW,
                hMm: bookletGeo.trimH,
              })
            : null;
        const stem = bookletSlug(config);
        if (kind === "pdf") {
          const built = await buildBookletPdf({ config, agenda, imagePages: pages });
          download(new Blob([built.bytes], { type: "application/pdf" }), `${stem}.pdf`);
          setNotes([...built.notes, ...warnings]);
        } else if (kind === "docx") {
          const built = await buildAgendaDocx(agenda, {
            cover,
            coverGround,
            imagePages: pages,
            omitAgenda: !config.includeAgenda,
          });
          download(built.blob, `${stem}.docx`);
          setNotes([...built.notes, ...warnings]);
        } else {
          const built = await buildAgendaPptx(agenda, {
            cover,
            coverGround,
            imagePages: pages,
            omitAgenda: !config.includeAgenda,
          });
          download(built.blob, `${stem}.pptx`);
          setNotes([...built.notes, ...warnings]);
        }
        },
      );
    } finally {
      setBusy(null);
    }
  };

  const addChart = () => {
    const chart: BookletChartPage = {
      id: `c${Date.now().toString(36)}`,
      kind: "waterfall",
      title: "Programme at a glance",
      subtitle: "",
    };
    setConfig((c) => ({ ...c, charts: [...c.charts, chart] }));
  };

  const patchChart = (id: string, patch: Partial<BookletChartPage>) =>
    setConfig((c) => ({
      ...c,
      charts: c.charts.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)),
    }));

  // ── saved booklets ─────────────────────────────────────────────────────────
  // A booklet is stored per event, city and year with the agenda snapshotted
  // inside it, so a later year can open it, change the details and reprint.
  const qc = useQueryClient();
  const listBooklets = useServerFn(listEventBooklets);
  const saveBooklet = useServerFn(saveEventBooklet);
  const patchBooklet = useServerFn(updateEventBooklet);
  const removeBooklet = useServerFn(deleteEventBooklet);

  const booklets = useQuery({
    queryKey: ["event-booklets"],
    queryFn: () => listBooklets(),
    retry: false,
  });
  const bookletRows = (booklets.data ?? []) as unknown as {
    id: string;
    name: string;
    year: number;
    city: string;
    notes: string;
    config: BookletConfig;
    agenda: AgendaConfig | null;
    updated_at: string;
  }[];

  const [openId, setOpenId] = useState<string>("");
  const [bookletName, setBookletName] = useState("NEXT London booklet");
  const [bookletYear, setBookletYear] = useState(2026);
  const [libError, setLibError] = useState<string>("");

  const refreshBooklets = () => qc.invalidateQueries({ queryKey: ["event-booklets"] });

  const runLibrary = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setLibError("");
    try {
      await fn();
      await refreshBooklets();
    } catch (err) {
      setLibError(err instanceof Error ? err.message : "That could not be saved.");
    } finally {
      setBusy(null);
    }
  };

  const onSave = () =>
    runLibrary("save", async () => {
      const payload = {
        name: bookletName.trim() || "Untitled booklet",
        year: bookletYear,
        city: "london",
        eventId: "next",
        notes: "",
        config,
        agenda: agenda as unknown as Record<string, unknown>,
      };
      if (openId) {
        await patchBooklet({ data: { id: openId, ...payload } });
      } else {
        const row = (await saveBooklet({ data: payload })) as unknown as { id: string };
        setOpenId(row.id);
      }
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
  };

  /** Copy the open booklet into the next year as a fresh, editable record. */
  const onDuplicate = () =>
    runLibrary("copy", async () => {
      const nextYear = bookletYear + 1;
      const name = bookletName.replace(String(bookletYear), String(nextYear));
      const row = (await saveBooklet({
        data: {
          name: name === bookletName ? `${bookletName} ${nextYear}` : name,
          year: nextYear,
          city: "london",
          eventId: "next",
          notes: "",
          config,
          agenda: agenda as unknown as Record<string, unknown>,
        },
      })) as unknown as { id: string; name: string };
      setOpenId(row.id);
      setBookletName(row.name);
      setBookletYear(nextYear);
    });

  const onDelete = (id: string) =>
    runLibrary("delete", async () => {
      await removeBooklet({ data: { id } });
      if (openId === id) setOpenId("");
    });

  const field =
    "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm";
  const labelCls = "text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <Link
          to="/events/next/london"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)] hover:underline"
        >
          <ArrowLeft className="size-4" /> NEXT London kit
        </Link>

        <header className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            <BookOpen className="size-4" /> Booklet builder
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">One printed NEXT booklet</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted-foreground)]">
            Cover, the agenda days, the venue maps and any chart pages, in one file. The agenda pages
            stay vector print artwork; map and chart pages are rendered artwork and carry a printed
            credit line saying so.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            {/* ── stock ─────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Page size</h2>
              <div className="flex flex-wrap gap-2">
                {BOOKLET_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, sizeId: size.id }))}
                    aria-pressed={config.sizeId === size.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      config.sizeId === size.id
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                        : "border-[color:var(--color-border)]"
                    }`}
                  >
                    {size.name}
                    <span className="block text-[11px] opacity-70">{size.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── cover ─────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={config.includeCover}
                  onChange={(e) => setConfig((c) => ({ ...c, includeCover: e.target.checked }))}
                />
                Cover page
              </label>
              {config.includeCover ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["eyebrow", "Eyebrow"],
                      ["title", "Title"],
                      ["subtitle", "Sub-line"],
                      ["footnote", "Footnote"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="space-y-1">
                      <span className={labelCls}>{label}</span>
                      <input
                        className={field}
                        value={config.cover[key]}
                        onChange={(e) =>
                          setConfig((c) => ({ ...c, cover: { ...c.cover, [key]: e.target.value } }))
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              {config.includeCover ? (
                <div className="space-y-3 rounded-md border border-[color:var(--color-border)] p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={labelCls}>Cover picture</span>
                    <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                      London starter set
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({ ...c, cover: { ...c.cover, artId: "" } }))
                      }
                      aria-pressed={!config.cover.artId}
                      className={`flex h-24 items-center justify-center rounded-md border-2 bg-[color:var(--color-primary)] text-xs font-semibold text-[color:var(--color-primary-foreground)] ${
                        !config.cover.artId
                          ? "border-[color:var(--color-primary)]"
                          : "border-transparent opacity-70"
                      }`}
                    >
                      No picture
                    </button>
                    {bookletCoverArtFor("london").map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({ ...c, cover: { ...c.cover, artId: art.id } }))
                        }
                        aria-pressed={config.cover.artId === art.id}
                        title={art.name}
                        className={`overflow-hidden rounded-md border-2 text-left ${
                          config.cover.artId === art.id
                            ? "border-[color:var(--color-primary)]"
                            : "border-transparent"
                        }`}
                      >
                        <img
                          src={art.src}
                          alt={art.name}
                          loading="lazy"
                          width={1280}
                          height={1792}
                          className="h-24 w-full object-cover"
                        />
                        <span className="block px-1.5 py-1 text-[11px] leading-tight">
                          {art.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {config.cover.artId ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {BOOKLET_COVER_TREATMENTS.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            title={t.note}
                            onClick={() =>
                              setConfig((c) => ({
                                ...c,
                                cover: { ...c.cover, treatment: t.id as BookletCoverTreatment },
                              }))
                            }
                            aria-pressed={(config.cover.treatment ?? "full-bleed") === t.id}
                            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                              (config.cover.treatment ?? "full-bleed") === t.id
                                ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                                : "border-[color:var(--color-border)]"
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                      <label className="block space-y-1">
                        <span className={labelCls}>
                          Ink veil · {config.cover.scrim ?? 88}%
                        </span>
                        <input
                          type="range"
                          min={40}
                          max={100}
                          step={2}
                          value={config.cover.scrim ?? 88}
                          onChange={(e) =>
                            setConfig((c) => ({
                              ...c,
                              cover: { ...c.cover, scrim: Number(e.target.value) },
                            }))
                          }
                          className="w-full"
                        />
                      </label>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        {bookletCoverArt(config.cover.artId)?.credit}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ── agenda ────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={config.includeAgenda}
                  onChange={(e) => setConfig((c) => ({ ...c, includeAgenda: e.target.checked }))}
                />
                Agenda days
              </label>
              <label className="block space-y-1">
                <span className={labelCls}>Agenda</span>
                <select
                  className={field}
                  value={savedId}
                  onChange={(e) => setSavedId(e.target.value)}
                >
                  <option value="">Demo programme (city series)</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {saved.isError
                  ? "Sign in to print a saved agenda — the demo programme is used until then."
                  : `Printed at the booklet page size · ${agendaPageCount} agenda page${agendaPageCount === 1 ? "" : "s"}.`}
              </p>
            </div>

            {/* ── maps ──────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={config.includeMap}
                  onChange={(e) => setConfig((c) => ({ ...c, includeMap: e.target.checked }))}
                />
                Venue maps
              </label>
              {config.includeMap ? (
                <div className="flex flex-wrap gap-2">
                  {LONDON_FLOORS.filter((f) => mappedFloors.includes(f.id)).map((floor) => {
                    const on = config.mapFloors.includes(floor.id);
                    return (
                      <button
                        key={floor.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            mapFloors: on
                              ? c.mapFloors.filter((f) => f !== floor.id)
                              : [...c.mapFloors, floor.id],
                          }))
                        }
                        className={`rounded-md border px-3 py-1.5 text-sm ${
                          on
                            ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                            : "border-[color:var(--color-border)]"
                        }`}
                      >
                        {floor.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* ── charts ────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Chart pages</h2>
                <Button variant="secondary" size="sm" onClick={addChart}>
                  Add chart page
                </Button>
              </div>
              {config.charts.length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  No chart pages yet. Added pages start from the module's sample figures and are
                  labelled as sample data until you replace them.
                </p>
              ) : null}
              <div className="space-y-3">
                {config.charts.map((chart) => (
                  <div
                    key={chart.id}
                    className="grid gap-3 rounded-lg border border-[color:var(--color-border)] p-3 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <label className="space-y-1">
                      <span className={labelCls}>Look</span>
                      <select
                        className={field}
                        value={chart.kind}
                        onChange={(e) =>
                          patchChart(chart.id, { kind: e.target.value as InfographicKind })
                        }
                      >
                        {CHART_KINDS.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className={labelCls}>Title</span>
                      <input
                        className={field}
                        value={chart.title}
                        onChange={(e) => patchChart(chart.id, { title: e.target.value })}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={labelCls}>Sub-line</span>
                      <input
                        className={field}
                        value={chart.subtitle}
                        onChange={(e) => patchChart(chart.id, { subtitle: e.target.value })}
                      />
                    </label>
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            charts: c.charts.filter((ch) => ch.id !== chart.id),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── running order + exports ─────────────────────────────────── */}
          <aside className="space-y-6">
            {/* ── saved booklets ───────────────────────────────────────── */}
            <div className="space-y-3 rounded-lg border border-[color:var(--color-border)] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Saved booklets</h2>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                Save this booklet so it can be re-opened, edited and reused for a later year.
              </p>
              <label className="block space-y-1">
                <span className={labelCls}>Booklet name</span>
                <input
                  className={field}
                  value={bookletName}
                  onChange={(e) => setBookletName(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelCls}>Year</span>
                <input
                  className={field}
                  type="number"
                  min={2000}
                  max={2100}
                  value={bookletYear}
                  onChange={(e) => setBookletYear(Number(e.target.value) || bookletYear)}
                />
              </label>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy !== null} onClick={onSave}>
                  <Save className="mr-2 size-4" />
                  {busy === "save" ? "Saving…" : openId ? "Update" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={onDuplicate}
                  title="Copy this booklet into the following year"
                >
                  <Copy className="mr-2 size-4" />
                  {busy === "copy" ? "Copying…" : `Reuse for ${bookletYear + 1}`}
                </Button>
              </div>
              {libError ? (
                <p className="text-xs text-[color:var(--color-destructive)]">{libError}</p>
              ) : null}
              <ul className="space-y-1 border-t border-[color:var(--color-border)] pt-3 text-sm">
                {bookletRows.map((row) => (
                  <li key={row.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(row.id)}
                      aria-pressed={openId === row.id}
                      className={`flex-1 truncate rounded px-2 py-1 text-left ${
                        openId === row.id
                          ? "bg-[color:var(--color-muted)] font-semibold"
                          : "hover:bg-[color:var(--color-muted)]"
                      }`}
                    >
                      {row.name}
                      <span className="ml-2 text-xs text-[color:var(--color-muted-foreground)]">
                        {row.year}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${row.name}`}
                      disabled={busy !== null}
                      onClick={() => onDelete(row.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
                {bookletRows.length === 0 ? (
                  <li className="text-xs text-[color:var(--color-muted-foreground)]">
                    {booklets.isError
                      ? "Sign in to save and re-open booklets."
                      : "No booklets saved yet."}
                  </li>
                ) : null}
              </ul>
            </div>

            {config.includeCover ? (
              <div className="space-y-2 rounded-lg border border-[color:var(--color-border)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Cover proof</h2>
                <CoverPreview
                  cover={config.cover}
                  trim={{ w: bookletGeo.trimW, h: bookletGeo.trimH }}
                />
                <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                  Screen proof at the booklet trim — the press file places the picture and type
                  itself.
                </p>
              </div>
            ) : null}

            <div className="rounded-lg border border-[color:var(--color-border)] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide">Running order</h2>
              <ol className="mt-3 space-y-1 text-sm">
                {plan.map((page, i) => (
                  <li key={`${page.kind}-${i}`} className="flex gap-2">
                    <span className="w-6 shrink-0 text-[color:var(--color-muted-foreground)]">
                      {i + 1}
                    </span>
                    <span>{page.label}</span>
                  </li>
                ))}
                {plan.length === 0 ? (
                  <li className="text-[color:var(--color-muted-foreground)]">
                    Nothing selected yet.
                  </li>
                ) : null}
              </ol>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={!plan.length || busy !== null}
                onClick={() => runExport("pdf")}
              >
                <FileDown className="mr-2 size-4" />
                {busy === "pdf" ? "Building…" : "Press PDF"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!plan.length || busy !== null}
                onClick={() => runExport("docx")}
              >
                <FileText className="mr-2 size-4" />
                {busy === "docx" ? "Building…" : "Word"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!plan.length || busy !== null}
                onClick={() => runExport("pptx")}
              >
                <Presentation className="mr-2 size-4" />
                {busy === "pptx" ? "Building…" : "PowerPoint"}
              </Button>
            </div>

            {notes.length ? (
              <div className="rounded-lg border border-[color:var(--color-border)] p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide">Export notes</h2>
                <ul className="mt-2 space-y-1 text-xs text-[color:var(--color-muted-foreground)]">
                  {notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
