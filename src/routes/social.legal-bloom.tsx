// /social/legal-bloom — the Legal "We're here for the tricky ones." bloom board.
//
// Eight frames, four turned picture shapes, either side for the copy, five trims, and a
// large view that writes the artwork at its true pixel size.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { BloomAd } from "@/components/social/BloomAd";
import {
  LEGAL_BLOOM_APERTURES,
  LEGAL_BLOOM_COLOURS,
  LEGAL_BLOOM_CONCEPT,
  LEGAL_BLOOM_SCENES,
  LEGAL_BLOOM_SIZES,
  bloomHeadline,
  type BloomAperture,
  type BloomSide,
} from "@/lib/social-legal-bloom";

export const Route = createFileRoute("/social/legal-bloom")({
  head: () => ({
    meta: [
      { title: "We're here for the tricky ones · Legal bloom board · TransPerfect Element" },
      {
        name: "description",
        content:
          "The bloom variation of the TransPerfect Legal campaign: eight documentary frames cut to the turned house shape with an offset accent keyline and a soft colour bloom, one phrase across the set and one turning word per ad.",
      },
      { property: "og:title", content: "We're here for the tricky ones · Legal bloom board" },
      {
        property: "og:description",
        content:
          "Eight Legal frames on colour blooms — four turned picture shapes, copy either side, five trims and a full-size download.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <BloomView />
    </AppShell>
  ),
});

function BloomView() {
  const [sizeId, setSizeId] = useState<string>("linkedin");
  const [aperture, setAperture] = useState<BloomAperture | "scene">("scene");
  const [side, setSide] = useState<BloomSide | "scene">("scene");
  const [zoom, setZoom] = useState<string | null>(null);
  const [dlFormat, setDlFormat] = useState<"png" | "jpeg">("png");
  const [dlScale, setDlScale] = useState<number>(2);
  const [dlBusy, setDlBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const size = LEGAL_BLOOM_SIZES.find((s) => s.id === sizeId) ?? LEGAL_BLOOM_SIZES[0];
  const zoomIndex = zoom ? LEGAL_BLOOM_SCENES.findIndex((s) => s.id === zoom) : -1;
  const zoomScene = zoomIndex >= 0 ? LEGAL_BLOOM_SCENES[zoomIndex] : null;

  const step = (dir: -1 | 1) => {
    if (zoomIndex < 0) return;
    const next = (zoomIndex + dir + LEGAL_BLOOM_SCENES.length) % LEGAL_BLOOM_SCENES.length;
    setZoom(LEGAL_BLOOM_SCENES[next].id);
  };

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, zoomIndex]);

  const download = async () => {
    const node = exportRef.current;
    if (!node || !zoomScene) return;
    setDlBusy(true);
    try {
      const { toPng, toJpeg } = await import("html-to-image");
      const opts = {
        pixelRatio: dlScale,
        width: size.w,
        height: size.h,
        cacheBust: true,
        backgroundColor: "#FBFBFD",
      };
      const url =
        dlFormat === "png" ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.94 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `tp-legal-bloom-${zoomScene.id}-${size.id}-${dlScale}x.${dlFormat}`;
      a.click();
    } finally {
      setDlBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#03002C]">
      <header className="border-b border-black/10 bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/social"
            className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-[#003FC7]"
          >
            <ArrowLeft size={14} /> Social campaigns
          </Link>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            {LEGAL_BLOOM_CONCEPT.line}
          </div>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{LEGAL_BLOOM_CONCEPT.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">
            {LEGAL_BLOOM_CONCEPT.premise}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <Field label="Size">
              <select
                value={sizeId}
                onChange={(e) => setSizeId(e.target.value)}
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {LEGAL_BLOOM_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · {s.w}×{s.h}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Picture cut">
              <select
                value={aperture}
                onChange={(e) => setAperture(e.target.value as BloomAperture | "scene")}
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
              >
                <option value="scene">Per photograph (recommended)</option>
                {LEGAL_BLOOM_APERTURES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Copy sits">
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as BloomSide | "scene")}
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
              >
                <option value="scene">Per photograph (recommended)</option>
                <option value="left">Left of the picture</option>
                <option value="right">Right of the picture</option>
              </select>
            </Field>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {LEGAL_BLOOM_SCENES.map((scene) => (
            <figure key={scene.id} className="space-y-3">
              <button
                type="button"
                onClick={() => setZoom(scene.id)}
                className="group relative block w-full overflow-hidden rounded-2xl border border-black/10 bg-white"
                aria-label={`View ${bloomHeadline(scene)} larger`}
              >
                <Scaled w={size.w} h={size.h}>
                  <BloomAd
                    scene={scene}
                    w={size.w}
                    h={size.h}
                    aperture={aperture === "scene" ? undefined : aperture}
                    side={side === "scene" ? undefined : side}
                  />
                </Scaled>
                <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#03002C]/80 px-2.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                  <Maximize2 size={11} /> Larger
                </span>
              </button>
              <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/55">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: LEGAL_BLOOM_COLOURS[scene.colour].glow }}
                />
                <span className="font-medium text-[#03002C]">{bloomHeadline(scene)}</span>
                <span>{scene.shot}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {zoomScene ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#03002C]/92 p-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="text-sm">
              {bloomHeadline(zoomScene)} · {size.label} · {size.w}×{size.h}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={dlFormat}
                onChange={(e) => setDlFormat(e.target.value as "png" | "jpeg")}
                className="rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white"
              >
                <option className="text-black" value="png">
                  PNG
                </option>
                <option className="text-black" value="jpeg">
                  JPG
                </option>
              </select>
              <select
                value={dlScale}
                onChange={(e) => setDlScale(Number(e.target.value))}
                className="rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-xs text-white"
              >
                {[1, 2, 3].map((s) => (
                  <option className="text-black" key={s} value={s}>
                    {s}× size
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={download}
                disabled={dlBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] disabled:opacity-60"
              >
                <Download size={12} /> {dlBusy ? "Writing…" : "Download"}
              </button>
              <button
                type="button"
                onClick={() => step(-1)}
                className="rounded-lg border border-white/25 p-1.5 text-white"
                aria-label="Previous ad"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="rounded-lg border border-white/25 p-1.5 text-white"
                aria-label="Next ad"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(null)}
                className="rounded-lg border border-white/25 p-1.5 text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl">
              <Scaled w={size.w} h={size.h}>
                <div ref={exportRef}>
                  <BloomAd
                    scene={zoomScene}
                    w={size.w}
                    h={size.h}
                    aperture={aperture === "scene" ? undefined : aperture}
                    side={side === "scene" ? undefined : side}
                  />
                </div>
              </Scaled>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Holds an artwork at its true pixel size and scales it to the box it is in. */
function Scaled({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={box} style={{ width: "100%", height: h * scale, overflow: "hidden" }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
        {label}
      </span>
      {children}
    </label>
  );
}
