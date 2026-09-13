// In-situ location preview for any NEXT MART sign.
//
// Composites the live editable master (the same PillarSign renderer the
// production export uses) into the measured installation face of a photoreal
// merchandise-shop plate, at the sign's own trim ratio. Scene switching,
// click-to-enlarge and a PNG download of exactly what is on screen.
//
// The plates are visualisations of the type of space each piece installs
// into, not photographs of the venue.

import { Download, Maximize2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PillarSign } from "@/components/next/PillarSign";
import {
  fitMartArtworkInFace,
  scenesForMartSign,
  type MartScene,
  type MartSceneSubject,
} from "@/lib/next-mart-scenes";
import { pillarGeometry, type PillarConfig } from "@/lib/next-pillar-masters";
import { SceneArtworkPlate } from "@/components/next/SceneArtworkPlate";

export interface MartLocationRenderPreviewProps {
  /** Sign id — used for scene matching and the download filename. */
  id: string;
  name: string;
  /** The live editable master to install. */
  config: PillarConfig;
}

/** Fixed working scale for the master before it is fitted to the face. */
const PX_PER_MM = 0.4;

function Stage({
  subject,
  scene,
  config,
  stageRef,
}: {
  subject: MartSceneSubject;
  scene: MartScene;
  config: PillarConfig;
  stageRef?: React.Ref<HTMLDivElement>;
}) {
  const box = useMemo(() => fitMartArtworkInFace(subject, scene), [subject, scene]);
  const faceRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.001);

  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setScale(w / (subject.trimW * PX_PER_MM));
        return true;
      }
      return false;
    };
    // The card can be collapsed at mount (display:none inside <details>), so
    // poll a few frames until the face has a real width, then keep it in sync.
    let frames = 0;
    const tick = () => {
      if (!measure() && frames++ < 120) raf = requestAnimationFrame(tick);
    };
    tick();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [subject.trimW, subject.trimH, scene.id]);

  return (
    <div
      ref={stageRef}
      data-insitu-stage="mart"
      className="relative w-full overflow-hidden rounded-xl bg-[#0d1117]"
      style={{ aspectRatio: `${scene.plate.w} / ${scene.plate.h}` }}
    >
      <img
        src={scene.src}
        alt={`${scene.label} in a merchandise shop`}
        width={scene.plate.w}
        height={scene.plate.h}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <SceneArtworkPlate box={box} sceneId={scene.id} faceRef={faceRef}>
        {/* The master renders at a fixed scale, then is scaled to the measured
            face so the installed sign keeps its exact trim proportions. */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: subject.trimW * PX_PER_MM,
            height: subject.trimH * PX_PER_MM,
          }}
        >
          <PillarSign config={config} pxPerMm={PX_PER_MM} />
        </div>
      </SceneArtworkPlate>
      <span
        data-export-ignore="true"
        className="absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
      >
        Visualisation · not a venue photo
      </span>
    </div>
  );
}

export function MartLocationRenderPreview({ id, name, config }: MartLocationRenderPreviewProps) {
  const subject = useMemo<MartSceneSubject>(() => {
    const geo = pillarGeometry(config);
    return { id, name, trimW: geo.bleedW, trimH: geo.bleedH };
  }, [id, name, config]);

  const scenes = useMemo(() => scenesForMartSign(subject), [subject]);
  const [sceneId, setSceneId] = useState(scenes[0]!.id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardStage = useRef<HTMLDivElement | null>(null);
  const modalStage = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSceneId(scenes[0]!.id);
  }, [scenes]);

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0]!;

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
        filter: (node) => !(node instanceof HTMLElement && node.dataset["exportIgnore"] === "true"),
      });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}-${scene.id}-in-situ.png`;
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
            In place in the mart
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
          aria-label={`View ${name} at the ${scene.label} larger`}
          className="block w-full cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
        >
          <Stage subject={subject} scene={scene} config={config} stageRef={cardStage} />
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
                : "border border-black/15 text-[#03002C]/70 hover:bg-[#F2F2F2]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} at the ${scene.label}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-full w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#03002C]">
                {name} · {scene.label}
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
                  aria-label="Close"
                  className="rounded-full border border-black/15 p-1.5 text-[#03002C] hover:bg-[#F2F2F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <Stage subject={subject} scene={scene} config={config} stageRef={modalStage} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
