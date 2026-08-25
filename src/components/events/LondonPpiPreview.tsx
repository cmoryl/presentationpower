// Live ppi-tier preview for the NEXT 2026 London signage panels.
//
// Shows, before anything is downloaded, exactly what each print resolution tier
// produces for a panel: the whole plate rendered at that tier, a true 1:1 (and
// magnified, nearest-neighbour) crop so the dither and quantisation steps are
// visible, plus the physical numbers — pixel pitch in mm, worst flat-tone run,
// file weight, and whether the 6000 px ceiling clipped the tier.

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, ZoomIn } from "lucide-react";

import { runWithExportFeedback } from "@/lib/export-feedback";
import {
  londonTiers,
  loadSvgImage,
  paintTierCrop,
  paintTierFit,
  renderDitheredPng,
  tierVerdict,
  type CropAnchor,
  type LondonTier,
} from "@/lib/london-panel-raster";
import { LONDON_STYLES, panelSlug, type LondonPanel } from "@/lib/next-london-signage";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";

const ZOOMS = [1, 2, 4, 8] as const;

const ANCHOR_LABELS: { id: CropAnchor; label: string }[] = [
  { id: "start", label: "Gradient start" },
  { id: "middle", label: "Mid blend" },
  { id: "end", label: "Gradient end" },
];

const TONE_CLASS: Record<"good" | "watch" | "risk", string> = {
  good: "bg-[#A6FA87]/35 text-[#03002C]",
  watch: "bg-[#FFEB66]/60 text-[#03002C]",
  risk: "bg-[#E53D2E]/15 text-[#03002C]",
};

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function LondonPpiPreview({
  panel,
  svg,
  className,
}: {
  panel: LondonPanel;
  /** Optional artwork override; defaults to artwork rebuilt from the panel spec. */
  svg?: string;
  className?: string;
}) {
  const artwork = useMemo(() => svg ?? buildLondonPanelSvg(panel), [svg, panel]);
  const tiers = useMemo(() => londonTiers(panel), [panel]);
  const [ppi, setPpi] = useState<number>(panel.rasterPpi);
  const [zoom, setZoom] = useState<number>(4);
  const [anchor, setAnchor] = useState<CropAnchor>("middle");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fitRef = useRef<HTMLCanvasElement | null>(null);
  const cropRef = useRef<HTMLCanvasElement | null>(null);
  const cropBoxRef = useRef<HTMLDivElement | null>(null);

  const tier: LondonTier = useMemo(
    () => tiers.find((t) => t.ppi === ppi) ?? tiers[0]!,
    [tiers, ppi],
  );
  const verdict = tierVerdict(tier);

  useEffect(() => setPpi(panel.rasterPpi), [panel.id, panel.rasterPpi]);

  useEffect(() => {
    let alive = true;
    setImg(null);
    setError(null);
    loadSvgImage(artwork)
      .then((loaded) => {
        if (alive) setImg(loaded);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Preview render failed.");
      });
    return () => {
      alive = false;
    };
  }, [artwork]);

  // Whole-plate view at the selected tier.
  useEffect(() => {
    const canvas = fitRef.current;
    if (!canvas || !img) return;
    paintTierFit({ canvas, img, tier, boxW: 460, boxH: 300 });
  }, [img, tier]);

  // 1:1 inspection crop, repainted on tier / zoom / anchor / resize.
  useEffect(() => {
    const canvas = cropRef.current;
    const box = cropBoxRef.current;
    if (!canvas || !box || !img) return;
    const paint = () => {
      const rect = box.getBoundingClientRect();
      paintTierCrop({
        canvas,
        img,
        tier,
        boxW: rect.width,
        boxH: rect.height,
        zoom,
        anchor,
      });
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(box);
    return () => ro.disconnect();
  }, [img, tier, zoom, anchor]);

  const downloadTier = () =>
    void runWithExportFeedback(
      {
        pending: `Rendering ${panelSlug(panel)} at ${tier.ppi} ppi…`,
        success: `${panelSlug(panel)}-${tier.ppi}ppi.png downloaded`,
        failure: "PNG render failed",
        successDescription: `${tier.w}×${tier.h}px · approx. ${tier.mb} MB`,
      },
      async () => {
        const blob = await renderDitheredPng(artwork, tier.w, tier.h);
        download(blob, `${panelSlug(panel)}-${tier.ppi}ppi.png`);
      },
    );

  const style = LONDON_STYLES[panel.style];
  const cropMm = Math.round(((tier.pixelMm * 100) / zoom) * 10) / 10;

  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white p-4 ${className ?? ""}`}
      aria-label={`Print resolution preview for ${panel.name}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#03002C]">Live ppi preview</h3>
          <p className="mt-0.5 text-xs text-[#666]">
            {panel.trimW}×{panel.trimH}mm trim · {style?.label ?? panel.style} · rendered through
            the same dither pipeline as the shipped PNG.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTier}
          disabled={!img}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-[#03002C] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download {tier.ppi} ppi PNG
        </button>
      </header>

      {/* Tier chooser */}
      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Print resolution tier"
      >
        {tiers.map((t) => (
          <button
            key={t.ppi}
            role="tab"
            type="button"
            aria-selected={t.ppi === tier.ppi}
            onClick={() => setPpi(t.ppi)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              t.ppi === tier.ppi
                ? "bg-[#003FC7] text-white"
                : "border border-black/10 bg-white text-[#03002C]"
            }`}
          >
            {t.ppi} ppi
            <span className="ml-1.5 font-normal opacity-75">
              {t.w}×{t.h}
            </span>
            {t.issued ? (
              <span
                className={`ml-1.5 rounded px-1 py-0.5 text-[9px] uppercase tracking-wide ${
                  t.ppi === tier.ppi ? "bg-white/20" : "bg-[#E0E8F5] text-[#003FC7]"
                }`}
              >
                issued
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-[#E53D2E]/30 bg-[#E53D2E]/5 px-3 py-2 text-xs text-[#03002C]">
          {error} The vector file is unaffected — download the .ai instead.
        </p>
      ) : null}

      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        {/* Whole plate */}
        <figure className="m-0">
          <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-black/10 bg-[#F2F2F2] p-2">
            {img ? (
              <canvas
                ref={fitRef}
                className="max-h-[220px] max-w-full rounded"
                aria-label={`${panel.name} whole panel at ${tier.ppi} ppi`}
              />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-[#666]" aria-hidden="true" />
            )}
          </div>
          <figcaption className="mt-1.5 text-[11px] leading-[1.45] text-[#666]">
            Whole panel at {tier.ppi} ppi — {tier.w}×{tier.h}px across {panel.bleedW}×{panel.bleedH}
            mm bleed.
          </figcaption>
        </figure>

        {/* 1:1 inspector */}
        <figure className="m-0 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#666]">
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
              Actual pixels
            </span>
            <div className="flex gap-1">
              {ZOOMS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  aria-pressed={zoom === z}
                  className={`rounded px-2 py-1 text-[11px] font-semibold ${
                    zoom === z
                      ? "bg-[#03002C] text-white"
                      : "border border-black/10 bg-white text-[#03002C]"
                  }`}
                >
                  {z}×
                </button>
              ))}
            </div>
            <select
              aria-label="Crop position along the gradient"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value as CropAnchor)}
              className="ml-auto rounded-md border border-black/15 bg-white px-2 py-1 text-[11px] text-[#03002C]"
            >
              {ANCHOR_LABELS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div
            ref={cropBoxRef}
            className="relative mt-1.5 h-[188px] w-full overflow-hidden rounded-xl border border-black/10 bg-[#F2F2F2]"
          >
            {img ? (
              <canvas
                ref={cropRef}
                className="absolute inset-0 h-full w-full"
                aria-label={`${panel.name} at ${tier.ppi} ppi, ${zoom}× magnification, ${anchor} of the gradient`}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#666]" aria-hidden="true" />
              </div>
            )}
            {/* Band ruler: how wide one flat-tone run is on the printed panel. */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-white/85 px-1.5 py-1">
              <span
                className="block h-1.5 rounded-sm bg-[#03002C]"
                style={{ width: `${Math.max(4, (tier.bandMm / tier.pixelMm) * zoom)}px` }}
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold text-[#03002C]">
                {tier.bandMm} mm band
              </span>
            </div>
          </div>
          <figcaption className="mt-1.5 text-[11px] leading-[1.45] text-[#666]">
            {zoom}× nearest-neighbour view of roughly {cropMm} mm of printed panel. One device pixel
            = {tier.pixelMm} mm at {tier.ppi} ppi.
          </figcaption>
        </figure>
      </div>

      {/* Numbers */}
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { k: "Raster size", v: `${tier.w}×${tier.h}px` },
          { k: "Pixel pitch", v: `${tier.pixelMm} mm` },
          { k: "Worst band", v: `${tier.bandMm} mm` },
          { k: "PNG weight", v: `≈ ${tier.mb} MB` },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-[#F2F2F2] px-2.5 py-2">
            <dd className="text-sm font-semibold text-[#03002C]">{s.v}</dd>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#666]">
              {s.k}
            </dt>
          </div>
        ))}
      </dl>

      <p className={`mt-2 rounded-lg px-3 py-2 text-xs leading-[1.45] ${TONE_CLASS[verdict.tone]}`}>
        <strong className="font-semibold">
          {verdict.tone === "good"
            ? "Good to print"
            : verdict.tone === "watch"
              ? "Check first"
              : "Not recommended"}
          :{" "}
        </strong>
        {verdict.note}
      </p>
    </section>
  );
}
