// In-situ location preview for any London signage panel.
//
// Composites the real generated panel artwork (or the supplied vendor proof)
// into the measured installation face of a photographic venue scene, with
// scene switching, click-to-enlarge and a PNG download of exactly what is
// on screen. The plates are photoreal visualisations of the kind of space
// each item hangs in, not photographs of the QEII Centre.

import { londonSuppliedGroundUrl } from "@/lib/next-london-supplied-masters";
import { Download, ImageIcon, Maximize2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLondonLivePanel } from "@/hooks/use-london-live-panel";
import { useLondonSignageFace } from "@/hooks/use-london-signage-face";
import { buildLondonPanelSvg, type LondonArtOptions } from "@/lib/next-london-revise";
import {
  fitArtworkInFace,
  sceneArtworkObjectFit,
  scenesForPanel,
  type LondonScene,
} from "@/lib/next-london-scenes";
import { londonBoothArtworkUrl, type LondonPanel } from "@/lib/next-london-signage";
import { SceneArtworkPlate } from "@/components/next/SceneArtworkPlate";

export interface LondonLocationRenderPreviewProps {
  panel: LondonPanel;
  /** Published revision options this browser's edits layer on top of. */
  baseOptions?: LondonArtOptions;
}


function Stage({
  panel,
  scene,
  art,
  stageRef,
}: {
  panel: LondonPanel;
  scene: LondonScene;
  art: string | null;
  stageRef?: React.Ref<HTMLDivElement>;
}) {
  const box = useMemo(() => fitArtworkInFace(panel, scene), [panel, scene]);
  // Applied vinyls cover their surface; hung items fill a box already cut to
  // the item's true trim ratio. Nothing is ever stretched.
  const fit = useMemo(() => sceneArtworkObjectFit(panel, scene), [panel, scene]);
  return (
    <div
      ref={stageRef}
      data-insitu-stage="london"
      className="relative w-full overflow-hidden rounded-xl bg-[#0d1117]"
      style={{ aspectRatio: `${scene.plate.w} / ${scene.plate.h}` }}
    >
      <img
        src={scene.src}
        alt={`${scene.label} at a conference centre`}
        width={scene.plate.w}
        height={scene.plate.h}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {art ? (
        <SceneArtworkPlate
          box={box}
          sceneId={scene.id}
          face={fit === "cover" ? undefined : scene.face}
          substrate={
            <img
              src={art}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: "cover" }}
            />
          }
        >
          <img
            src={art}
            alt={`${panel.name} installed as a ${scene.label.toLowerCase()}`}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: fit }}
          />
        </SceneArtworkPlate>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-black/55 px-3 py-1 font-mono text-[11px] text-white">
            Preparing artwork…
          </span>
        </div>
      )}
      <span
        data-export-ignore="true"
        className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
      >
        Visualisation · not a venue photo
      </span>
    </div>
  );
}

export function LondonLocationRenderPreview({
  panel: input,
  baseOptions,
}: LondonLocationRenderPreviewProps) {
  const faceReady = useLondonSignageFace();
  // The in-situ view shows the sign as edited here, not the last published file.
  const live = useLondonLivePanel(input, baseOptions);
  const panel = live.panel;
  const scenes = useMemo(() => scenesForPanel(panel), [panel]);
  const [sceneId, setSceneId] = useState(scenes[0]!.id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardStage = useRef<HTMLDivElement | null>(null);
  const modalStage = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSceneId(scenes[0]!.id);
  }, [scenes]);

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0]!;

  const boothArt = londonBoothArtworkUrl(panel.id) ?? londonSuppliedGroundUrl(panel.id);
  const artKey = `${panel.trimW}|${panel.trimH}|${live.signature}`;
  const art = useMemo(() => {
    if (boothArt) return boothArt;
    if (!faceReady) return null;
    try {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildLondonPanelSvg(panel, live.options))}`;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artKey, faceReady, boothArt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function downloadPng(from: HTMLDivElement | null) {
    if (!from || busy) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(from, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset["exportIgnore"] === "true"),
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${panel.id}-${scene.id}-in-situ.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
            In place at the venue
          </p>
          <p className="mt-1 text-[13px] font-medium text-[#03002C]">
            {scene.label} · {scene.where}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
          >
            <Maximize2 className="h-3.5 w-3.5" /> View larger
          </button>
          <button
            type="button"
            onClick={() => void downloadPng(cardStage.current)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Download PNG"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View ${panel.name} in ${scene.label} larger`}
          className="block w-full cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
        >
          <Stage panel={panel} scene={scene} art={art} stageRef={cardStage} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose a location">
        {scenes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSceneId(s.id)}
            aria-pressed={s.id === scene.id}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              s.id === scene.id
                ? "bg-[#03002C] text-white"
                : "border border-black/15 text-[#03002C] hover:bg-[#F2F2F2]"
            }`}
          >
            <ImageIcon className="h-3 w-3" /> {s.label}
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${panel.name} in ${scene.label}`}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#03002C]/85 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-[#03002C]">
                {panel.name} · {scene.label}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadPng(modalStage.current)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Download PNG"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close larger preview"
                  className="rounded-full border border-black/15 p-1.5 text-[#03002C] hover:bg-[#F2F2F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Stage panel={panel} scene={scene} art={art} stageRef={modalStage} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
