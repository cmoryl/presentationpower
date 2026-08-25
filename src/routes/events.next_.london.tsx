// /events/next/london — TransPerfect NEXT 2026 London location signage kit.
//
// Job 2281 · QEII Centre Westminster · 54 scenic panels. Renders the venue's
// own artwork (live vector gradients) against the issued print schedule, with
// spec-compliant downloads: vector .ai / .svg for the RIP, plus dithered PNG
// rasters generated in-browser at the spec resolution tiers.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  FileDown,
  ImageIcon,
  Info,
  Layers,
  MapPin,
  Ruler,
  Table2,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LondonPpiPreview } from "@/components/events/LondonPpiPreview";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { runWithExportFeedback } from "@/lib/export-feedback";
import { renderDitheredPng } from "@/lib/london-panel-raster";
import {
  LONDON_PANELS,
  LONDON_PRINT_SPEC,
  LONDON_STYLES,
  LONDON_VENUE,
  loadLondonArtwork,
  londonPanelsByFloor,
  londonRasterWeightMb,
  londonScheduleCsv,
  panelSlug,
  rasterSizeFor,
  recommendedPpi,
  type LondonArtwork,
  type LondonPanel,
} from "@/lib/next-london-signage";

export const Route = createFileRoute("/events/next_/london")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 London signage · QEII Centre panel kit" },
      {
        name: "description",
        content:
          "All 54 scenic panels for TransPerfect NEXT 2026 at the QEII Centre — trim and bleed geometry, gradient treatments, measured banding, and spec-compliant vector and dithered raster downloads.",
      },
      { property: "og:title", content: "NEXT 2026 London location signage" },
      {
        property: "og:description",
        content:
          "Job 2281 — 54 QEII Centre panels with print schedule, print specification, and vector-first downloads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LondonSignagePage,
});

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function PanelThumb({ panel, svg }: { panel: LondonPanel; svg?: string }) {
  const style = LONDON_STYLES[panel.style];
  const ratio = panel.bleedW / panel.bleedH;
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-black/10 bg-[#E0E8F5]"
      style={{ aspectRatio: `${Math.max(ratio, 0.08)}` }}
    >
      {svg ? (
        <img
          src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`}
          alt={`${panel.room} panel ${panel.name} — ${style?.label ?? panel.style} gradient ground`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${(style?.stops ?? ["#7C4EF4", "#7FE3E8"]).join(", ")})`,
          }}
        />
      )}
    </div>
  );
}

function LondonSignagePage() {
  const floors = useMemo(() => londonPanelsByFloor(), []);
  const [floorId, setFloorId] = useState<string>("all");
  const [artwork, setArtwork] = useState<LondonArtwork | null>(null);
  const [artworkError, setArtworkError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<LondonPanel | null>(null);
  const [ppi, setPpi] = useState<number>(72);

  useEffect(() => {
    let live = true;
    loadLondonArtwork()
      .then((pack) => {
        if (live) setArtwork(pack);
      })
      .catch((err: unknown) => {
        if (live) setArtworkError(err instanceof Error ? err.message : "Artwork pack unavailable.");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (openPanel) setPpi(recommendedPpi(openPanel));
  }, [openPanel]);

  const shown = floorId === "all" ? floors : floors.filter((f) => f.id === floorId);
  const styleCount = new Set(LONDON_PANELS.map((p) => p.style)).size;
  const roomCount = new Set(LONDON_PANELS.map((p) => `${p.floor}·${p.room}`)).size;
  const worstBand = Math.max(...LONDON_PANELS.map((p) => p.bandMm));

  const target = openPanel ? rasterSizeFor(openPanel, ppi) : null;

  const downloadVector = (panel: LondonPanel, fmt: "svg" | "ai") =>
    runWithExportFeedback(
      {
        pending: `Preparing ${panelSlug(panel)}.${fmt}…`,
        success: `${panelSlug(panel)}.${fmt} downloaded`,
        failure: "Vector download failed",
        successDescription:
          fmt === "ai"
            ? "Live vector gradient with trim and bleed boxes set — this is the file to print."
            : "Live vector gradient sized to bleed.",
      },
      async () => {
        const pack = artwork ?? (await loadLondonArtwork());
        const entry = pack[panel.id];
        if (!entry) throw new Error("Artwork for this panel is missing from the pack.");
        const body = fmt === "svg" ? entry.svg : entry.ai;
        const type = fmt === "svg" ? "image/svg+xml" : "application/postscript";
        download(new Blob([body], { type }), `${panelSlug(panel)}.${fmt}`);
      },
    );

  const downloadRaster = (panel: LondonPanel) =>
    runWithExportFeedback(
      {
        pending: `Rendering ${panelSlug(panel)} at ${ppi} ppi…`,
        success: `${panelSlug(panel)}-${ppi}ppi.png downloaded`,
        failure: "Raster render failed",
        successDescription: "Lossless PNG, sized to bleed, triangular-PDF dither applied.",
      },
      async () => {
        const pack = artwork ?? (await loadLondonArtwork());
        const entry = pack[panel.id];
        if (!entry) throw new Error("Artwork for this panel is missing from the pack.");
        const size = rasterSizeFor(panel, ppi);
        const blob = await renderDitheredPng(entry.svg, size.w, size.h);
        download(blob, `${panelSlug(panel)}-${ppi}ppi.png`);
      },
    );

  const downloadSchedule = () =>
    runWithExportFeedback(
      {
        pending: "Building the print schedule…",
        success: "NEXT-London-print-schedule.csv downloaded",
        failure: "Schedule export failed",
        successDescription: "54 panels with trim, bleed, ground, raster size and measured banding.",
      },
      async () => {
        download(
          new Blob([londonScheduleCsv()], { type: "text/csv" }),
          "NEXT-London-print-schedule.csv",
        );
      },
    );

  const chip =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#003FC7] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> NEXT 2026 event system
        </Link>

        <header className="mt-5 overflow-hidden rounded-2xl border border-black/10">
          <div
            className="px-6 py-9 sm:px-10 sm:py-12"
            style={{
              background:
                "radial-gradient(60% 90% at 12% 92%, #8C82F0 0%, transparent 62%), radial-gradient(52% 80% at 62% 18%, #CFF6F7 0%, transparent 62%), radial-gradient(60% 90% at 96% 55%, #A9E8F2 0%, transparent 64%), #B7EEF3",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#03002C]/70">
              Location signage · Job {LONDON_VENUE.job}
            </p>
            <h1 className="mt-3 max-w-[22ch] text-3xl font-bold leading-[1.05] tracking-tight text-[#03002C] sm:text-5xl">
              NEXT 2026 London — scenic panel kit
            </h1>
            <p className="mt-4 max-w-[54ch] text-sm leading-relaxed text-[#03002C]/75 sm:text-base">
              {LONDON_VENUE.venue}, {LONDON_VENUE.city} · {LONDON_VENUE.datesLabel}. Every panel the
              London location team specified, held against the issued print schedule and
              specification, with vector-first downloads for the RIP.
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-9 gap-y-4">
              {[
                { k: "Panels", v: String(LONDON_VENUE.panelCount) },
                { k: "Rooms", v: String(roomCount) },
                { k: "Gradient grounds", v: String(styleCount) },
                { k: "Worst measured band", v: `${worstBand.toFixed(2)} mm` },
                { k: "Packaged rasters", v: `${londonRasterWeightMb().toFixed(0)} MB` },
              ].map((s) => (
                <div key={s.k}>
                  <dd className="text-2xl font-semibold tracking-tight text-[#03002C]">{s.v}</dd>
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
                    {s.k}
                  </dt>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadSchedule}
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Table2 className="h-4 w-4" /> Print schedule (CSV)
              </button>
              <Link
                to="/events/next/london/revise"
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <Ruler className="h-4 w-4" /> Revise specs &amp; regenerate
              </Link>
              <Link
                to="/events/production"
                className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#03002C] transition-colors hover:bg-white"
              >
                <Layers className="h-4 w-4" /> Open production studio
              </Link>

            </div>
          </div>
        </header>

        {/* Print specification */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
            <Info className="h-4.5 w-4.5 text-[#003FC7]" /> Print specification — London run
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {LONDON_PRINT_SPEC.map((rule) => (
              <article
                key={rule.id}
                className="rounded-xl border border-black/10 bg-white p-5"
              >
                <h3 className="text-sm font-semibold text-[#03002C]">{rule.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#03002C]/70">{rule.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-[#003FC7]/25 bg-[#E0E8F5] p-4 text-[13px] leading-relaxed text-[#03002C]/80">
            Colour space: {LONDON_VENUE.colourSpace}. Production partner: {LONDON_VENUE.producer}.
            Venue: {LONDON_VENUE.address}.
          </p>
        </section>

        {/* Gradient grounds */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#03002C]">
            <ImageIcon className="h-4.5 w-4.5 text-[#003FC7]" /> Gradient grounds in this location
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(LONDON_STYLES)
              .filter(([id]) => LONDON_PANELS.some((p) => p.style === id))
              .map(([id, style]) => (
                <article key={id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                  <div
                    className="h-20 w-full"
                    style={{ background: `linear-gradient(120deg, ${style.stops.join(", ")})` }}
                  />
                  <div className="p-4">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                      {id}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-[#03002C]">{style.label}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#03002C]/65">
                      {style.note}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-[#03002C]/55">
                      {LONDON_PANELS.filter((p) => p.style === id).length} panels
                    </p>
                  </div>
                </article>
              ))}
          </div>
        </section>

        {/* Floor spine */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 flex items-center gap-2 text-lg font-semibold text-[#03002C]">
              <MapPin className="h-4.5 w-4.5 text-[#003FC7]" /> Panels by floor
            </h2>
            <button
              type="button"
              onClick={() => setFloorId("all")}
              className={`${chip} ${
                floorId === "all"
                  ? "border-[#03002C] bg-[#03002C] text-white"
                  : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
              }`}
            >
              All floors · {LONDON_PANELS.length}
            </button>
            {floors.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => setFloorId(floor.id)}
                className={`${chip} ${
                  floorId === floor.id
                    ? "border-[#03002C] bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                {floor.id} · {floor.rooms.reduce((n, r) => n + r.panels.length, 0)}
              </button>
            ))}
          </div>

          {artworkError ? (
            <p className="mt-4 rounded-xl border border-[#E53D2E]/30 bg-[#E53D2E]/8 p-4 text-[13px] text-[#03002C]">
              {artworkError} Geometry and specification are still available; retry the download to
              fetch the vector pack again.
            </p>
          ) : null}

          {shown.map((floor) => (
            <div key={floor.id} className="mt-8">
              <div className="flex flex-wrap items-baseline gap-3 border-b border-black/10 pb-2">
                <span className="rounded border border-[#03002C] px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] text-[#03002C]">
                  {floor.id}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-[#03002C]">
                  {floor.label}
                </h3>
                <span className="ml-auto font-mono text-[11px] text-[#03002C]/55">
                  {floor.rooms.length} rooms ·{" "}
                  {floor.rooms.reduce((n, r) => n + r.panels.length, 0)} panels
                </span>
              </div>

              {floor.rooms.map((room) => (
                <div key={room.room} className="mt-6">
                  <h4 className="font-mono text-[12px] uppercase tracking-[0.12em] text-[#03002C]/70">
                    {room.room}
                  </h4>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {room.panels.map((panel) => (
                      <button
                        key={panel.id}
                        type="button"
                        onClick={() => setOpenPanel(panel)}
                        className="group rounded-xl border border-black/10 bg-white p-3 text-left transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
                      >
                        <PanelThumb panel={panel} svg={artwork?.[panel.id]?.svg} />
                        <p className="mt-3 text-[13px] font-semibold leading-snug text-[#03002C]">
                          {panel.proof.replace(/\.pdf$/i, "")} · p{String(panel.page).padStart(2, "0")}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-[#03002C]/60">
                          {panel.trimW} × {panel.trimH} mm · {panel.ground}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#03002C]/45">
                          bleed {panel.bleedEdge} mm/edge · band {panel.bandMm.toFixed(2)} mm
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>

      <Dialog open={!!openPanel} onOpenChange={(o) => !o && setOpenPanel(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {openPanel ? (
            <>
              <DialogTitle className="text-base font-semibold text-[#03002C]">
                {openPanel.name}
              </DialogTitle>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/55">
                {openPanel.floor} · {openPanel.room} · {openPanel.proof} p
                {String(openPanel.page).padStart(2, "0")}
              </p>
              <PanelThumb panel={openPanel} svg={artwork?.[openPanel.id]?.svg} />

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { k: "Trim", v: `${openPanel.trimW} × ${openPanel.trimH} mm` },
                  {
                    k: "Bleed",
                    v: `${openPanel.bleedW} × ${openPanel.bleedH} mm (${openPanel.bleedEdge}/edge)`,
                  },
                  { k: "Ground", v: `${openPanel.ground} · ${openPanel.style}` },
                  {
                    k: "Packaged raster",
                    v: `${openPanel.rasterPx} px at ${openPanel.rasterPpi} ppi`,
                  },
                  { k: "Measured banding", v: `${openPanel.bandMm.toFixed(2)} mm` },
                  { k: "Raster weight", v: `${openPanel.rasterMb.toFixed(1)} MB` },
                ].map((row) => (
                  <div key={row.k} className="rounded-lg border border-black/10 bg-[#F2F2F2] p-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/55">
                      {row.k}
                    </dt>
                    <dd className="mt-1 text-[13px] font-medium text-[#03002C]">{row.v}</dd>
                  </div>
                ))}
              </dl>

              {/* Check every resolution tier on screen before downloading. */}
              <LondonPpiPreview panel={openPanel} svg={artwork?.[openPanel.id]?.svg} />



              <div className="rounded-xl border border-black/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Vector
                  </span>
                  <button
                    type="button"
                    onClick={() => void downloadVector(openPanel, "ai")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <FileDown className="h-3.5 w-3.5" /> AI
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadVector(openPanel, "svg")}
                    className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                  >
                    <FileDown className="h-3.5 w-3.5" /> SVG
                  </button>
                  <em className="text-[11.5px] not-italic text-[#03002C]/55">
                    live gradients — print these
                  </em>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Raster
                  </span>
                  <label className="sr-only" htmlFor="ldn-ppi">
                    Output resolution
                  </label>
                  <select
                    id="ldn-ppi"
                    value={ppi}
                    onChange={(e) => setPpi(Number(e.target.value))}
                    className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs text-[#03002C]"
                  >
                    <option value={36}>36 ppi — panels over 2000 mm</option>
                    <option value={72}>72 ppi — up to 2000 mm</option>
                    <option value={120}>120 ppi — up to 800 mm</option>
                    <option value={300}>300 ppi — close-viewed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void downloadRaster(openPanel)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                  <em className="text-[11.5px] not-italic text-[#03002C]/55">
                    {target ? `${target.w} × ${target.h} px` : ""}
                    {ppi === recommendedPpi(openPanel) ? " · spec tier" : ""}
                  </em>
                </div>

                <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-[#03002C]/60">
                  <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Rasters are generated from the vector here and triangular-PDF dithered before
                  export, so they carry the same anti-banding treatment as the packaged files. Sized
                  to bleed; cut lines come from your proofs.
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
