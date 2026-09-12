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
import { lightQualityLabel, sceneLightQuality } from "@/lib/scene-lighting";
import { sceneSpace, spaceLabel } from "@/lib/scene-space";
import {
  fitArtworkInFace,
  sceneArtworkObjectFit,
  sceneCaption,
  sceneDimensionsLabel,
  sceneProvenanceLabel,
  sceneQuad,
  sceneSurfaceLabel,
  scenesForPanel,
  type LondonScene,
} from "@/lib/next-london-scenes";
import {
  londonBoothArtworkUrl,
  LONDON_FLOORS,
  type LondonFloorId,
  type LondonPanel,
} from "@/lib/next-london-signage";
import { SceneArtworkPlate } from "@/components/next/SceneArtworkPlate";
import { SceneEventScreens, sceneScreensCaption } from "@/components/next/SceneEventScreens";
import { SceneDoorLeaves } from "@/components/next/SceneDoorLeaves";
import { doorLeafLabel, londonDoorSpec } from "@/lib/next-london-doors";

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
  const door = useMemo(() => londonDoorSpec(panel), [panel]);
  // Double doors: mount on the measured opening and let each leaf carry its
  // own sheet, with the shut line where it really falls.
  const leaves = door && scene.kind === "door" ? door : null;
  const box = useMemo(
    () => (leaves ? scene.face : fitArtworkInFace(panel, scene)),
    [leaves, panel, scene],
  );
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
          quad={scene.quad}
          kind={scene.kind}
          mount={scene.mount}
          face={leaves || fit === "cover" ? undefined : scene.face}
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
          {leaves ? (
            <SceneDoorLeaves
              spec={leaves}
              art={art}
              alt={`${panel.name} installed on ${leaves.leaves > 1 ? "double doors" : "the door"}`}
            />
          ) : (
            <img
              src={art}
              alt={`${panel.name} installed as a ${scene.label.toLowerCase()}`}
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: fit }}
            />
          )}
        </SceneArtworkPlate>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-black/55 px-3 py-1 font-mono text-[11px] text-white">
            Preparing artwork…
          </span>
        </div>
      )}
      {/* Any working display in this plate runs NEXT 2026 London content. */}
      <SceneEventScreens sceneId={scene.id} />
      <span
        data-export-ignore="true"
        className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
      >
        {sceneCaption(scene, panel)}
        {sceneScreensCaption(scene.id) ? ` · ${sceneScreensCaption(scene.id)}` : ""}
      </span>
      {/* The photographer's read of this plate, so the light a design is judged
          under is never a mystery. */}
      <span
        data-export-ignore="true"
        className="absolute bottom-2 right-2 max-w-[calc(100%-1rem)] rounded bg-black/45 px-2 py-1 font-mono text-[10px] text-white/90"
      >
        {lightQualityLabel(sceneLightQuality(scene.id))}
        {" · "}
        {spaceLabel(sceneSpace(sceneQuad(scene)))}
      </span>
      {leaves ? (
        <span
          data-export-ignore="true"
          className="absolute right-2 top-2 max-w-[calc(100%-1rem)] rounded bg-black/55 px-2 py-1 font-mono text-[10px] text-white"
        >
          {doorLeafLabel(leaves)}
        </span>
      ) : null}

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
  const [floorFilter, setFloorFilter] = useState<LondonFloorId | "all">("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardStage = useRef<HTMLDivElement | null>(null);
  const modalStage = useRef<HTMLDivElement | null>(null);

  // Only floors that actually have a plate for this item are offered.
  const floorOptions = useMemo(
    () => LONDON_FLOORS.filter((f) => scenes.some((s) => s.floors?.includes(f.id))),
    [scenes],
  );
  const visible = useMemo(
    () =>
      floorFilter === "all"
        ? scenes
        : scenes.filter((s) => s.floors?.includes(floorFilter)),
    [scenes, floorFilter],
  );

  useEffect(() => {
    setFloorFilter("all");
    setSceneId(scenes[0]!.id);
  }, [scenes]);

  // A floor choice that hides the current plate moves to the first one it keeps.
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === sceneId)) setSceneId(visible[0]!.id);
  }, [visible, sceneId]);

  const scene = visible.find((s) => s.id === sceneId) ?? visible[0] ?? scenes[0]!;

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
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
            {sceneProvenanceLabel(scene)}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#03002C]/70">
            {sceneDimensionsLabel(scene, panel)}
            {scene.surface?.note ? ` · ${scene.surface.note}` : ""}
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

      {floorOptions.length ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Show locations for one floor"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/55">
            Floor
          </span>
          {([{ id: "all" as const, label: `All floors · ${scenes.length}` }] as {
            id: LondonFloorId | "all";
            label: string;
          }[])
            .concat(
              floorOptions.map((f) => ({
                id: f.id,
                label: `${f.label} · ${scenes.filter((s) => s.floors?.includes(f.id)).length}`,
              })),
            )
            .map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFloorFilter(f.id)}
                aria-pressed={floorFilter === f.id}
                className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition ${
                  floorFilter === f.id
                    ? "bg-[#003FC7] text-white"
                    : "border border-black/15 text-[#03002C] hover:bg-[#F2F2F2]"
                }`}
              >
                {f.label}
              </button>
            ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Choose a location">
        {visible.map((s) => {
          const here = s.floors?.includes(panel.floor);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSceneId(s.id)}
              aria-pressed={s.id === scene.id}
              title={`${s.where} · ${sceneCaption(s, panel)}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                s.id === scene.id
                  ? "bg-[#03002C] text-white"
                  : here
                    ? "border border-[#003FC7]/40 bg-[#E0E8F5] text-[#03002C] hover:bg-[#D5E1F3]"
                    : "border border-black/15 text-[#03002C] hover:bg-[#F2F2F2]"
              }`}
            >
              <ImageIcon className="h-3 w-3" /> {s.label}
              {s.photo ? (
                <span
                  className={`rounded-full px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.08em] ${
                    s.id === scene.id ? "bg-white/20 text-white" : "bg-[#03002C]/10 text-[#03002C]"
                  }`}
                >
                  Photo
                </span>
              ) : null}
              {sceneSurfaceLabel(s) ? (
                <span
                  className={`font-mono text-[9.5px] tracking-[0.04em] ${
                    s.id === scene.id ? "text-white/75" : "text-[#03002C]/60"
                  }`}
                >
                  {sceneSurfaceLabel(s)}
                </span>
              ) : null}
              {here ? (
                <span
                  className={`rounded-full px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.08em] ${
                    s.id === scene.id ? "bg-white/20 text-white" : "bg-[#003FC7]/15 text-[#003FC7]"
                  }`}
                >
                  This floor
                </span>
              ) : null}
            </button>
          );
        })}
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
              <div>
                <p className="text-[13px] font-semibold text-[#03002C]">
                  {panel.name} · {scene.label}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#03002C]/55">
                  {sceneCaption(scene, panel)}
                </p>
              </div>
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
