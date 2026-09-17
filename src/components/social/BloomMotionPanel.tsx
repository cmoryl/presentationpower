// "Motion for social" — the moving versions of the bloom ads.
//
// One placement, one motion, one length: the ad plays here exactly as it will be
// written, and the same drawing routine records it. Every social location in the
// campaign is listed with its true trim, its clear band and its file ceiling, so
// nothing is written that a platform will refuse or re-compress.

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Package } from "lucide-react";
import { BloomMotionAd } from "@/components/social/BloomMotionAd";
import {
  LEGAL_BLOOM_SCENES,
  bloomHeadline,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";
import { bloomAutoLayout, type BloomAdLayout } from "@/lib/social-legal-bloom-layout";
import {
  BLOOM_MOTION_PRESETS,
  BLOOM_PLACEMENTS,
  bloomAspectLabel,
  bloomClipSeconds,
  bloomExpectedMb,
  bloomMotionFrame,
  bloomMotionPath,
  bloomMotionReadme,
  bloomMotionSpecCsv,
  bloomMotionStem,
  bloomPlacement,
  bloomPlacementsByPlatform,
  bloomPreset,
  bloomSafeLayout,
  bloomVideoBitrate,
} from "@/lib/social-legal-bloom-motion";
import { bloomPackRoot } from "@/lib/social-legal-bloom-pack";
import {
  drawBloomMotionFrame,
  ensureBloomFonts,
  loadBloomAssets,
} from "@/lib/social-legal-bloom-draw";
import { bloomVideoFormat, recordBloomClip } from "@/lib/social-legal-bloom-video";

const FPS = 30;

type Props = {
  aperture: BloomAperture | "scene";
  side: BloomSide | "scene";
};

export function BloomMotionPanel({ aperture, side }: Props) {
  const [placementId, setPlacementId] = useState("li-feed-square");
  const [presetId, setPresetId] = useState("lift");
  const [wantSeconds, setWantSeconds] = useState(8);
  const [sceneId, setSceneId] = useState(LEGAL_BLOOM_SCENES[0]!.id);
  const [scopeAd, setScopeAd] = useState("all");
  const [scopePlacement, setScopePlacement] = useState("this");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordRef = useRef<HTMLCanvasElement>(null);

  const placement = bloomPlacement(placementId);
  const preset = bloomPreset(presetId);
  const seconds = bloomClipSeconds(placement, wantSeconds);
  const scene = LEGAL_BLOOM_SCENES.find((s) => s.id === sceneId) ?? LEGAL_BLOOM_SCENES[0]!;
  const format = useMemo(() => bloomVideoFormat(), []);

  useEffect(() => {
    setError(null);
  }, [placementId, presetId, sceneId]);

  const layoutFor = (s: BloomScene, w: number, h: number): BloomAdLayout => {
    const cut = aperture === "scene" ? s.aperture : aperture;
    const copySide = side === "scene" ? s.side : side;
    const p = bloomPlacement(placementId);
    return bloomSafeLayout(bloomAutoLayout(s, w, h, cut, copySide), p.safeTop, p.safeBottom);
  };

  const previewLayout = useMemo(
    () => layoutFor(scene, placement.w, placement.h),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, placement, aperture, side],
  );

  /** Record one clip off an off-screen canvas at the placement's true size. */
  const writeClip = async (s: BloomScene, p = placement): Promise<Blob> => {
    if (!format) throw new Error("This browser cannot write video files.");
    const canvas = recordRef.current;
    if (!canvas) throw new Error("The recording area was not ready.");
    canvas.width = p.w;
    canvas.height = p.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The recording area could not be prepared.");
    await ensureBloomFonts();
    const assets = await loadBloomAssets(s);
    const cut = aperture === "scene" ? s.aperture : aperture;
    const copySide = side === "scene" ? s.side : side;
    const layout = bloomSafeLayout(
      bloomAutoLayout(s, p.w, p.h, cut, copySide),
      p.safeTop,
      p.safeBottom,
    );
    const clip = bloomClipSeconds(p, wantSeconds);
    return recordBloomClip({
      canvas,
      seconds: clip,
      fps: FPS,
      bitsPerSecond: bloomVideoBitrate(p, clip),
      format,
      draw: (t) =>
        drawBloomMotionFrame(ctx, {
          scene: s,
          w: p.w,
          h: p.h,
          aperture: cut,
          side: copySide,
          layout,
          motion: bloomMotionFrame(preset, t, clip),
          assets,
        }),
    });
  };

  const save = (blob: Blob, name: string) => {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  };

  const downloadOne = async () => {
    setError(null);
    setBusy("one");
    try {
      const blob = await writeClip(scene);
      save(blob, `${bloomMotionStem(scene, placement, seconds, FPS)}.${format!.ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The clip could not be written.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPack = async () => {
    setError(null);
    setBusy("pack");
    try {
      if (!format) throw new Error("This browser cannot write video files.");
      const scenes =
        scopeAd === "all" ? LEGAL_BLOOM_SCENES : LEGAL_BLOOM_SCENES.filter((s) => s.id === scopeAd);
      const placements =
        scopePlacement === "this"
          ? [placement]
          : scopePlacement === "platform"
            ? BLOOM_PLACEMENTS.filter((p) => p.platform === placement.platform)
            : BLOOM_PLACEMENTS;
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const root = zip.folder(`${bloomPackRoot()}_MOTION`)!;
      const total = scenes.length * placements.length;
      let done = 0;
      setProgress({ done, total });
      for (const p of placements) {
        for (const s of scenes) {
          const blob = await writeClip(s, p);
          const clip = bloomClipSeconds(p, wantSeconds);
          root.file(bloomMotionPath(s, p, clip, FPS, format.ext), blob);
          done += 1;
          setProgress({ done, total });
        }
      }
      root.file("04_Motion/README.txt", bloomMotionReadme(scenes, placements, preset, seconds, FPS, format.ext));
      root.file("04_Motion/placements.csv", bloomMotionSpecCsv(placements, wantSeconds, FPS));
      const blob = await zip.generateAsync({ type: "blob" });
      save(blob, `${bloomPackRoot()}_MOTION${scopeAd === "all" ? "" : `_${scopeAd}`}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The motion pack could not be written.");
    } finally {
      setProgress(null);
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white/70 p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
        <Film size={13} /> Motion for social
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Set these ads moving</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/65">
        The photograph travels inside its frame, the line rises word by word, the italic word settles
        in last and the lockup lands after it. Pick where the ad is going and it plays here at that
        exact trim — then download that clip, or a whole set filed by platform.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
          Where it is going
          <select
            value={placementId}
            onChange={(e) => setPlacementId(e.target.value)}
            className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#03002C]"
          >
            {bloomPlacementsByPlatform().map((group) => (
              <optgroup key={group.platform} label={group.platform}>
                {group.placements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.placement} · {p.w}×{p.h}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
          Motion
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#03002C]"
          >
            {BLOOM_MOTION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
          Which ad
          <select
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            className="mt-1 block max-w-[260px] rounded-xl border border-black/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#03002C]"
          >
            {LEGAL_BLOOM_SCENES.map((s) => (
              <option key={s.id} value={s.id}>
                {bloomHeadline(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
          Length · {seconds}s
          <input
            type="range"
            min={3}
            max={Math.min(30, placement.maxSeconds)}
            step={1}
            value={Math.min(wantSeconds, placement.maxSeconds)}
            onChange={(e) => setWantSeconds(Number(e.target.value))}
            className="mt-2 block w-40"
          />
        </label>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-black/55">
        {preset.says} {placement.platform} · {placement.placement} — {placement.w}×{placement.h} (
        {bloomAspectLabel(placement.w, placement.h)}), written at about{" "}
        {bloomExpectedMb(placement, seconds)}MB, under this placement's {placement.platformCapMb}MB
        limit. {placement.safeTop || placement.safeBottom ? (
          <>
            The words and lockup are held clear of the top {Math.round(placement.safeTop * 100)}% and
            bottom {Math.round(placement.safeBottom * 100)}%, where the platform's own buttons sit.{" "}
          </>
        ) : null}
        {placement.note}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <BloomMotionAd
            scene={scene}
            w={placement.w}
            h={placement.h}
            aperture={aperture === "scene" ? undefined : aperture}
            side={side === "scene" ? undefined : side}
            layout={previewLayout}
            preset={preset}
            seconds={seconds}
            playing
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              id="bloom-motion-one"
              onClick={downloadOne}
              disabled={busy !== null || !format}
              className="inline-flex items-center gap-2 rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Film size={14} />
              {busy === "one" ? "Recording…" : `Download this clip (.${format?.ext ?? "—"})`}
            </button>
          </div>

          <div className="rounded-2xl border border-black/10 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
              Download a moving set
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
                Ads
                <select
                  value={scopeAd}
                  onChange={(e) => setScopeAd(e.target.value)}
                  className="mt-1 block max-w-[240px] rounded-xl border border-black/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#03002C]"
                >
                  <option value="all">All {LEGAL_BLOOM_SCENES.length} ads</option>
                  {LEGAL_BLOOM_SCENES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.turn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] uppercase tracking-[0.12em] text-black/50">
                Placements
                <select
                  value={scopePlacement}
                  onChange={(e) => setScopePlacement(e.target.value)}
                  className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm normal-case tracking-normal text-[#03002C]"
                >
                  <option value="this">This placement only</option>
                  <option value="platform">Every {placement.platform} placement</option>
                  <option value="all">All {BLOOM_PLACEMENTS.length} placements</option>
                </select>
              </label>
              <button
                type="button"
                id="bloom-motion-pack"
                onClick={downloadPack}
                disabled={busy !== null || !format}
                className="inline-flex items-center gap-2 rounded-xl bg-[#03002C] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <Package size={14} />
                {busy === "pack"
                  ? progress
                    ? `Recording ${progress.done} of ${progress.total}…`
                    : "Recording…"
                  : "Download motion pack"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-black/55">
              Each clip is recorded in real time, so a large set takes as long as it plays. The zip is
              filed under <strong>04_Motion</strong>, one folder per platform placement, with the
              placement sheet and a readme beside it.
            </p>
          </div>

          {!format ? (
            <p className="text-xs text-[#E53D2E]">
              This browser cannot write video. Chrome, Edge or a recent Safari will record these
              clips; the still artwork downloads work everywhere.
            </p>
          ) : null}
          {error ? <p className="text-xs text-[#E53D2E]">{error}</p> : null}
        </div>
      </div>

      {/* the off-screen canvas the clips are recorded from, at true pixel size */}
      <canvas
        ref={recordRef}
        aria-hidden
        data-export-ignore="true"
        style={{ position: "fixed", top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -1 }}
      />
    </section>
  );
}
