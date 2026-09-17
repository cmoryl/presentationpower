// /social/legal-bloom — the Legal "We're here for the tricky ones." bloom board.
//
// Eight frames, four turned picture shapes, either side for the copy, five trims, a
// large view that writes the artwork at its true pixel size, and a live layout
// editor: the picture and the text block can be dragged and resized per ad and
// per size, with the type sizes on sliders. Moves are remembered in this browser.

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Download,
  Maximize2,
  Minus,
  Move,
  Package,
  Plus,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BloomAd } from "@/components/social/BloomAd";
import { BloomLayoutEditor } from "@/components/social/BloomLayoutEditor";
import { BloomMotionPanel } from "@/components/social/BloomMotionPanel";
import {
  BLOOM_SPLASHES,
  bloomAutoLayout,
  bloomLayoutKey,
  readBloomLayouts,
  writeBloomLayouts,
  type BloomAdLayout,
  type BloomLayoutMap,
  type BloomSplash,
} from "@/lib/social-legal-bloom-layout";
import {
  bloomAssetPath,
  bloomCopyDeckCsv,
  bloomCopyDeckText,
  bloomLayoutSettingsJson,
  bloomPackManifestJson,
  bloomPackReadme,
  bloomPackRoot,
  bloomPlacementsCsv,
  type BloomPackEntry,
  type BloomPackMotion,
  type BloomPackSize,
} from "@/lib/social-legal-bloom-pack";
import {
  BLOOM_PLACEMENTS,
  bloomClipSeconds,
  bloomMotionPath,
  bloomMotionReadme,
  bloomMotionSpecCsv,
  bloomPreset,
  bloomPresetsByFamily,
} from "@/lib/social-legal-bloom-motion";
import { recordBloomSceneClip } from "@/lib/social-legal-bloom-record";
import { bloomVideoFormat, type BloomVideoFormat } from "@/lib/social-legal-bloom-video";
import {
  LEGAL_BLOOM_APERTURES,
  LEGAL_BLOOM_COLOURS,
  LEGAL_BLOOM_CONCEPT,
  LEGAL_BLOOM_SCENES,
  LEGAL_BLOOM_SIZES,
  bloomHeadline,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";

export const Route = createFileRoute("/social/legal-bloom")({
  head: () => ({
    meta: [
      { title: "We're here for the tricky ones · Legal bloom board · TransPerfect Element" },
      {
        name: "description",
        content:
          "The bloom variation of the TransPerfect Legal campaign: eight documentary frames cut to the turned house shape with an accent keyline and a soft colour bloom, one phrase across the set, and a live layout editor for every ad and size.",
      },
      { property: "og:title", content: "We're here for the tricky ones · Legal bloom board" },
      {
        property: "og:description",
        content:
          "Eight Legal frames on colour blooms — turned picture shapes, copy either side, five trims, live layout editing and a full-size download.",
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
  const [editing, setEditing] = useState(false);
  /** How close the large view sits: 1 = fits the window, 4 = four times that. */
  const [viewZoom, setViewZoom] = useState(1);
  const [dlFormat, setDlFormat] = useState<"png" | "jpeg">("png");
  const [dlScale, setDlScale] = useState<number>(2);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<BloomLayoutMap>({});
  const exportRef = useRef<HTMLDivElement>(null);

  // pack export: which ads, which placements, and how far it has got
  const [packAd, setPackAd] = useState<string>("all");
  const [packSize, setPackSize] = useState<string>("all");
  const [packBusy, setPackBusy] = useState(false);
  const [packProgress, setPackProgress] = useState<{ done: number; total: number } | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  // one ad is rendered off-screen at its true pixel size at a time, so the pack
  // writes exactly what the board shows.
  type StageItem = { scene: BloomScene; size: BloomPackSize; layout: BloomAdLayout };
  const [stageItem, setStageItem] = useState<StageItem | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageResolve = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!stageItem || !stageResolve.current) return;
    const resolve = stageResolve.current;
    stageResolve.current = null;
    // two frames: one to lay the ad out, one to let the browser paint it
    const raf = requestAnimationFrame(() => requestAnimationFrame(resolve));
    return () => cancelAnimationFrame(raf);
  }, [stageItem]);

  const stage = (item: StageItem) =>
    new Promise<void>((resolve) => {
      stageResolve.current = resolve;
      setStageItem(item);
    });

  // Saved moves live in this browser, so they survive a reload of the board.
  useEffect(() => setLayouts(readBloomLayouts()), []);

  const size = LEGAL_BLOOM_SIZES.find((s) => s.id === sizeId) ?? LEGAL_BLOOM_SIZES[0];
  const zoomIndex = zoom ? LEGAL_BLOOM_SCENES.findIndex((s) => s.id === zoom) : -1;
  const zoomScene = zoomIndex >= 0 ? LEGAL_BLOOM_SCENES[zoomIndex] : null;

  const cutFor = (sceneCut: BloomAperture) => (aperture === "scene" ? sceneCut : aperture);
  const sideFor = (sceneSide: BloomSide) => (side === "scene" ? sceneSide : side);

  const saved = useCallback(
    (sceneId: string) => layouts[bloomLayoutKey(sceneId, size.id)],
    [layouts, size.id],
  );

  const zoomLayout = useMemo<BloomAdLayout | undefined>(() => {
    if (!zoomScene) return undefined;
    return (
      saved(zoomScene.id) ??
      (editing
        ? bloomAutoLayout(zoomScene, size.w, size.h, cutFor(zoomScene.aperture), sideFor(zoomScene.side))
        : undefined)
    );
  }, [zoomScene, saved, editing, size.w, size.h, aperture, side]);

  // whether this ad has a stored arrangement for this size — the only case where
  // "Reset" has anything to undo.
  const hasSaved = zoomScene ? Boolean(saved(zoomScene.id)) : false;

  const putLayout = (next: BloomAdLayout) => {
    if (!zoomScene) return;
    const map = { ...layouts, [bloomLayoutKey(zoomScene.id, size.id)]: next };
    setLayouts(map);
    writeBloomLayouts(map);
  };

  const resetLayout = () => {
    if (!zoomScene) return;
    const map = { ...layouts };
    delete map[bloomLayoutKey(zoomScene.id, size.id)];
    setLayouts(map);
    writeBloomLayouts(map);
  };

  const closeZoom = () => {
    setZoom(null);
    setEditing(false);
  };

  const step = (dir: -1 | 1) => {
    if (zoomIndex < 0) return;
    const next = (zoomIndex + dir + LEGAL_BLOOM_SCENES.length) % LEGAL_BLOOM_SCENES.length;
    setZoom(LEGAL_BLOOM_SCENES[next].id);
  };

  // the large view covers the page, so the page behind it must not scroll
  useEffect(() => {
    if (!zoom) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  useEffect(() => setDlError(null), [zoom, sizeId]);
  // a new ad or a new trim starts from the fitted view again
  useEffect(() => setViewZoom(1), [zoom, sizeId]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
      if (editing) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, zoomIndex, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    const node = exportRef.current;
    if (!node || !zoomScene) return;
    setDlBusy(true);
    setDlError(null);
    try {
      const { toPng, toJpeg } = await import("html-to-image");
      const opts = {
        pixelRatio: dlScale,
        width: size.w,
        height: size.h,
        cacheBust: true,
        backgroundColor: "#FBFBFD",
        filter: (n: HTMLElement) => n?.dataset?.exportIgnore !== "true",
      };
      const url =
        dlFormat === "png" ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.94 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `tp-legal-bloom-${zoomScene.id}-${size.id}-${dlScale}x.${dlFormat}`;
      a.click();
    } catch (err) {
      // a failed write must be visible, never a silent no-op
      setDlError(err instanceof Error ? err.message : "The file could not be written.");
    } finally {
      setDlBusy(false);
    }
  };

  // ------------------------------------------------------------------
  // The pack export: every requested ad at every requested placement, filed
  // into one .zip with the copy deck and the layout settings beside it.
  const buildPack = async () => {
    setPackBusy(true);
    setPackError(null);
    const scenes =
      packAd === "all" ? LEGAL_BLOOM_SCENES : LEGAL_BLOOM_SCENES.filter((s) => s.id === packAd);
    const sizes: BloomPackSize[] =
      packSize === "all"
        ? LEGAL_BLOOM_SIZES.map((s) => ({ ...s }))
        : LEGAL_BLOOM_SIZES.filter((s) => s.id === packSize).map((s) => ({ ...s }));
    try {
      const [{ default: JSZip }, { toPng, toJpeg }] = await Promise.all([
        import("jszip"),
        import("html-to-image"),
      ]);
      const zip = new JSZip();
      const root = zip.folder(bloomPackRoot())!;
      const entries: BloomPackEntry[] = [];
      let done = 0;
      const total = scenes.length * sizes.length;
      setPackProgress({ done, total });

      for (const s of sizes) {
        for (const scene of scenes) {
          const cut = cutFor(scene.aperture);
          const sceneSide = sideFor(scene.side);
          const stored = layouts[bloomLayoutKey(scene.id, s.id)];
          const layout = stored ?? bloomAutoLayout(scene, s.w, s.h, cut, sceneSide);
          await stage({ scene, size: s, layout });
          const node = stageRef.current;
          if (!node) throw new Error("The staging area was not ready.");
          const opts = {
            pixelRatio: dlScale,
            width: s.w,
            height: s.h,
            cacheBust: true,
            backgroundColor: "#FBFBFD",
            filter: (n: HTMLElement) => n?.dataset?.exportIgnore !== "true",
          };
          const url =
            dlFormat === "png" ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.94 });
          const path = bloomAssetPath(scene, s, dlScale, dlFormat);
          root.file(path, url.slice(url.indexOf(",") + 1), { base64: true });
          entries.push({ scene, size: s, aperture: cut, side: sceneSide, layout, arranged: Boolean(stored), path });
          done += 1;
          setPackProgress({ done, total });
        }
      }

      root.file("README.txt", bloomPackReadme(entries, dlScale, dlFormat));
      root.file("manifest.json", bloomPackManifestJson(entries, dlScale, dlFormat));
      root.file("02_Copy/copy-deck.csv", bloomCopyDeckCsv(scenes));
      root.file("02_Copy/copy-deck.txt", bloomCopyDeckText(scenes));
      root.file("03_Specifications/placements.csv", bloomPlacementsCsv(sizes, dlScale, dlFormat));
      root.file("03_Specifications/layout-settings.json", bloomLayoutSettingsJson(entries, dlScale));

      const blob = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${bloomPackRoot()}${packAd === "all" ? "" : `_${packAd}`}.zip`;
      a.click();
      // let the browser take hold of the file before the handle is released
      setTimeout(() => URL.revokeObjectURL(href), 4000);
    } catch (err) {
      setPackError(err instanceof Error ? err.message : "The pack could not be written.");
    } finally {
      setStageItem(null);
      setPackProgress(null);
      setPackBusy(false);
    }
  };

  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    apply: (v: number) => void,
  ) => (
    <label className="flex items-center gap-2 text-[11px] text-white/80">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 100}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => apply(Number(e.target.value))}
        className="w-28"
      />
    </label>
  );

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
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/55">
            Open any ad larger and switch on <strong>Move things</strong> to drag or stretch the
            picture and the text — run the picture wide with the words over it, or hold it back and
            set the words bigger beside it. Each ad remembers its own arrangement for each size.
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

          {/* the pack export: one zip, filed into sections, for a whole set or
              just the ads a person wants */}
          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
              Download a pack
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-black/55">
              One zip holding the artwork filed by placement, the copy deck as a spreadsheet and
              plain text, and the placement list and layout settings behind every file.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <Field label="Ad set">
                <select
                  value={packAd}
                  onChange={(e) => setPackAd(e.target.value)}
                  className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All {LEGAL_BLOOM_SCENES.length} ads</option>
                  {LEGAL_BLOOM_SCENES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {bloomHeadline(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Placements">
                <select
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All {LEGAL_BLOOM_SIZES.length} sizes</option>
                  {LEGAL_BLOOM_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} · {s.w}×{s.h}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="File type">
                <select
                  value={dlFormat}
                  onChange={(e) => setDlFormat(e.target.value as "png" | "jpeg")}
                  className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPG</option>
                </select>
              </Field>
              <Field label="Size written">
                <select
                  value={dlScale}
                  onChange={(e) => setDlScale(Number(e.target.value))}
                  className="rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                >
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      {s}× size
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                id="bloom-pack-button"
                onClick={buildPack}
                disabled={packBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-[#03002C] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <Package size={14} />
                {packBusy
                  ? packProgress
                    ? `Writing ${packProgress.done} of ${packProgress.total}…`
                    : "Writing…"
                  : "Download pack"}
              </button>
            </div>
            {packError ? (
              <p className="mt-2 text-xs text-[#E53D2E]">
                The pack could not be written: {packError}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* the off-screen staging area the pack renders through — kept out of the
          reading order and out of the page's own exports */}
      {stageItem ? (
        <div
          aria-hidden
          data-export-ignore="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: stageItem.size.w,
            height: stageItem.size.h,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
            overflow: "hidden",
          }}
        >
          <div ref={stageRef}>
            <BloomAd
              scene={stageItem.scene}
              w={stageItem.size.w}
              h={stageItem.size.h}
              aperture={aperture === "scene" ? undefined : aperture}
              side={side === "scene" ? undefined : side}
              layout={stageItem.layout}
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <BloomMotionPanel aperture={aperture} side={side} />

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
                  {() => (
                    <BloomAd
                      scene={scene}
                      w={size.w}
                      h={size.h}
                      aperture={aperture === "scene" ? undefined : aperture}
                      side={side === "scene" ? undefined : side}
                      layout={saved(scene.id)}
                    />
                  )}
                </Scaled>
                <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#03002C]/80 px-2.5 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                  <Maximize2 size={11} /> Open & edit
                </span>
              </button>
              <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/55">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: LEGAL_BLOOM_COLOURS[scene.colour].glow }}
                />
                <span className="font-medium text-[#03002C]">{bloomHeadline(scene)}</span>
                <span>{scene.shot}</span>
                {saved(scene.id) ? (
                  <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-medium text-[#003FC7]">
                    Arranged for this size
                  </span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {zoomScene
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex flex-col bg-[#03002C]/92 p-4 backdrop-blur"
              role="dialog"
              aria-modal="true"
              aria-label={`${bloomHeadline(zoomScene)} — full size`}
            >
          <div className="flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="text-sm">
              {bloomHeadline(zoomScene)} · {size.label} · {size.w}×{size.h}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  editing ? "bg-[#A1FBF9] text-[#03002C]" : "border border-white/25 text-white"
                }`}
              >
                <Move size={12} /> {editing ? "Done moving" : "Move things"}
              </button>
              {hasSaved ? (
                <button
                  type="button"
                  onClick={resetLayout}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              ) : null}
              <div className="flex items-center gap-1 rounded-lg border border-white/25 px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => setViewZoom((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
                  className="rounded-md px-1.5 py-1 text-white disabled:opacity-40"
                  disabled={viewZoom <= 0.25}
                  aria-label="Zoom out"
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewZoom(1)}
                  className="min-w-[3.2rem] rounded-md px-1 py-1 text-[11px] text-white"
                  aria-label="Fit to the window"
                >
                  {Math.round(viewZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setViewZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                  className="rounded-md px-1.5 py-1 text-white disabled:opacity-40"
                  disabled={viewZoom >= 4}
                  aria-label="Zoom in"
                >
                  <Plus size={12} />
                </button>
              </div>
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
                onClick={closeZoom}
                className="rounded-lg border border-white/25 p-1.5 text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {editing && zoomLayout ? (
            <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
              {slider("Headline", zoomLayout.headPx, 0.03, 0.3, (v) =>
                putLayout({ ...zoomLayout, headPx: v }),
              )}
              {slider("Small line", zoomLayout.supportPx, 0.012, 0.06, (v) =>
                putLayout({ ...zoomLayout, supportPx: v }),
              )}
              {/* 1 = the same size as the rest of the headline; never below it. */}
              {slider("Accent word", zoomLayout.turnEm ?? 1.62, 1, 3, (v) =>
                putLayout({ ...zoomLayout, turnEm: Math.max(1, v) }),
              )}
              {slider("Logo", zoomLayout.lockup.h, 0.01, 0.1, (v) =>
                putLayout({ ...zoomLayout, lockup: { ...zoomLayout.lockup, h: v } }),
              )}
              {/* soft focus behind words that lie over the picture; 0 = none */}
              {slider("Soft focus behind text", zoomLayout.scrimEm ?? 1, 0, 2, (v) =>
                putLayout({ ...zoomLayout, scrimEm: v }),
              )}
              {slider("Bloom softness", zoomLayout.bloomEm ?? 1, 0, 3, (v) =>
                putLayout({ ...zoomLayout, bloomEm: v }),
              )}
              {/* the shape of the lower accent splash behind the lockup */}
              <label className="flex items-center gap-2 text-[11px] text-white/70">
                Splash shape
                <select
                  value={zoomLayout.splashShape ?? "soft"}
                  onChange={(e) =>
                    putLayout({ ...zoomLayout, splashShape: e.target.value as BloomSplash })
                  }
                  className="rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-xs text-white"
                >
                  {BLOOM_SPLASHES.map((s) => (
                    <option className="text-black" key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-[11px] text-white/55">
                Drag the outlined boxes to move, corners to resize. Saved as you go.
              </span>
            </div>
          ) : null}

          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl">
              <Scaled w={size.w} h={size.h} factor={viewZoom}>
                {(scale) => (
                  <div style={{ position: "relative", width: size.w, height: size.h }}>
                    <div ref={exportRef}>
                      <BloomAd
                        scene={zoomScene}
                        w={size.w}
                        h={size.h}
                        aperture={aperture === "scene" ? undefined : aperture}
                        side={side === "scene" ? undefined : side}
                        layout={zoomLayout}
                      />
                    </div>
                    {editing && zoomLayout ? (
                      <BloomLayoutEditor
                        layout={zoomLayout}
                        w={size.w}
                        h={size.h}
                        scale={scale}
                        onChange={putLayout}
                      />
                    ) : null}
                  </div>
                )}
              </Scaled>
            </div>
              </div>

              {dlError ? (
                <p className="mt-2 text-[11px] text-[#FF9B70]">
                  The file could not be written: {dlError}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * Holds an artwork at its true pixel size and scales it to the box it is in.
 * `factor` multiplies that fitted scale, so 1 = fits the width and 2 = twice as
 * close; anything over 1 overflows and the scrolling parent takes over.
 */
function Scaled({
  w,
  h,
  factor = 1,
  children,
}: {
  w: number;
  h: number;
  factor?: number;
  children: (scale: number) => React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // a zero-width box (a hidden or not-yet-laid-out panel) would give a scale of
    // 0, which makes the drag handles unusable, so it is floored. The width comes
    // from the parent because this wrapper itself grows when zoomed in.
    const fit = () =>
      setFitScale(Math.max(0.02, (el.parentElement?.clientWidth || el.clientWidth) / w));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [w]);
  const scale = fitScale * factor;
  return (
    <div ref={box} style={{ width: "fit-content", minWidth: "100%" }}>
      <div style={{ width: w * scale, height: h * scale, overflow: "hidden" }}>
        <div
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children(scale)}
        </div>
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
