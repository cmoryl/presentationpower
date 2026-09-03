/**
 * Hero crop studio — the photo-editor surface every print hero now gets.
 *
 * Direct manipulation, the way a designer expects it:
 *  - drag inside the frame to pan the photograph
 *  - scroll / pinch to zoom, anchored on the pointer (never a fixed step)
 *  - click (or arrow-key nudge) to set the focal point the auto-crop solves from
 *  - straighten, rotate in 90° steps, flip on either axis
 *  - non-destructive tone: exposure, contrast, saturation, black & white, blur
 *
 * The frame mirrors the real hero band aspect so what's cropped here is exactly
 * what prints. Values are written back to the document (`heroMedia.adjust` or a
 * hero section's `adjust`), so editor, preview and PDF/PPTX exports all agree.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Maximize,
  RotateCcw,
  RotateCw,
  Sliders,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  HERO_ZOOM_MAX,
  HERO_ZOOM_MIN,
  heroImageStyle,
  isHeroAdjustDefault,
  resolveHeroAdjust,
  zoomFromWheel,
  type PrintHeroAdjust,
} from "@/lib/print-hero-transform";

export type HeroCropStudioProps = {
  imageUrl: string | undefined;
  adjust: PrintHeroAdjust | undefined;
  onChange: (next: PrintHeroAdjust) => void;
  /** Focal point 0..100 — shared with the layout's auto-crop solver. */
  focalX?: number;
  focalY?: number;
  onFocalChange?: (next: { focalX: number; focalY: number }) => void;
  /** Frame aspect (width / height). Defaults to the 16:9 hero band. */
  aspectRatio?: number;
  /** Compact chrome for narrow inspector rails. */
  dense?: boolean;
  className?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function HeroCropStudio({
  imageUrl,
  adjust,
  onChange,
  focalX,
  focalY,
  onFocalChange,
  aspectRatio = 16 / 9,
  dense = false,
  className,
}: HeroCropStudioProps) {
  const r = resolveHeroAdjust(adjust);
  const fx = typeof focalX === "number" ? focalX : 50;
  const fy = typeof focalY === "number" ? focalY : 45;
  const focal = `${fx}% ${fy}%`;
  const [grid, setGrid] = useState(true);
  const [tab, setTab] = useState<"crop" | "tone">("crop");
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    w: number;
    h: number;
    moved: boolean;
  } | null>(null);

  const patch = useCallback(
    (next: Partial<PrintHeroAdjust>) => onChange({ ...(adjust ?? {}), ...next }),
    [adjust, onChange],
  );
  // Wheel handling runs from a native non-passive listener, so keep the live
  // handler in a ref — the effect below must not close over stale state.
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const stateRef = useRef({ zoom: r.zoom, offsetX: r.offsetX, offsetY: r.offsetY, fx, fy });
  stateRef.current = { zoom: r.zoom, offsetX: r.offsetX, offsetY: r.offsetY, fx, fy };

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      // Also covers trackpad pinch, which arrives as wheel + ctrlKey.
      event.preventDefault();
      const cur = stateRef.current;
      const nextZoom = zoomFromWheel(cur.zoom, event);
      if (nextZoom === cur.zoom) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Keep the pixel under the pointer stationary. With transform-origin at
      // the focal point, a point p maps to O + (p - O) * z + t, so
      // t2 = u - (u - t1) * (z2 / z1) where u is the pointer offset from O.
      const ux = (event.clientX - rect.left) / rect.width - cur.fx / 100;
      const uy = (event.clientY - rect.top) / rect.height - cur.fy / 100;
      const k = nextZoom / cur.zoom;
      patchRef.current({
        zoom: nextZoom,
        offsetX: clamp((ux - (ux - cur.offsetX / 100) * k) * 100, -50, 50),
        offsetY: clamp((uy - (uy - cur.offsetY / 100) * k) * 100, -50, 50),
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const imgStyle = useMemo(
    () => ({
      position: "absolute" as const,
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      objectPosition: focal,
      ...heroImageStyle(adjust, focal),
    }),
    [adjust, focal],
  );

  if (!imageUrl) {
    return (
      <div
        className={`rounded-lg border border-dashed border-black/15 px-3 py-6 text-center text-[11px] text-black/45 dark:border-white/15 dark:text-white/45 ${className ?? ""}`}
      >
        Choose a hero photo to open the crop studio.
      </div>
    );
  }

  const btn =
    "inline-flex h-7 items-center gap-1 rounded-md border border-black/10 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40 dark:border-white/12 dark:bg-white/[0.05] dark:text-white/75";
  const btnOn =
    "inline-flex h-7 items-center gap-1 rounded-md border border-[#003FC7] bg-[#003FC7] px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition";

  return (
    <div className={`space-y-2 ${className ?? ""}`} data-export-ignore>
      {/* ---- Live crop frame ------------------------------------------- */}
      <div
        ref={frameRef}
        role="application"
        aria-label="Hero crop — drag to pan, scroll to zoom, arrow keys nudge the focal point"
        tabIndex={0}
        className="relative select-none overflow-hidden rounded-lg border border-black/10 bg-[#03002C] outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] dark:border-white/12"
        style={{
          aspectRatio: String(aspectRatio),
          cursor: dragRef.current ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            ox: r.offsetX,
            oy: r.offsetY,
            w: rect.width,
            h: rect.height,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
          d.moved = true;
          patch({
            offsetX: clamp(d.ox + (dx / d.w) * 100, -50, 50),
            offsetY: clamp(d.oy + (dy / d.h) * 100, -50, 50),
          });
        }}
        onPointerUp={(e) => {
          const d = dragRef.current;
          dragRef.current = null;
          if (!d || d.moved || !onFocalChange) return;
          // A click without a drag re-points the focal centre.
          const rect = e.currentTarget.getBoundingClientRect();
          onFocalChange({
            focalX: Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)),
            focalY: Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)),
          });
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 5 : 1;
          if (e.key === "ArrowLeft") patch({ offsetX: clamp(r.offsetX - step, -50, 50) });
          else if (e.key === "ArrowRight") patch({ offsetX: clamp(r.offsetX + step, -50, 50) });
          else if (e.key === "ArrowUp") patch({ offsetY: clamp(r.offsetY - step, -50, 50) });
          else if (e.key === "ArrowDown") patch({ offsetY: clamp(r.offsetY + step, -50, 50) });
          else if (e.key === "+" || e.key === "=")
            patch({ zoom: clamp(r.zoom * 1.1, HERO_ZOOM_MIN, HERO_ZOOM_MAX) });
          else if (e.key === "-" || e.key === "_")
            patch({ zoom: clamp(r.zoom / 1.1, HERO_ZOOM_MIN, HERO_ZOOM_MAX) });
          else return;
          e.preventDefault();
        }}
      >
        <img alt="" src={imageUrl} draggable={false} style={imgStyle} />
        {grid && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {[33.333, 66.666].map((p) => (
              <div
                key={`v${p}`}
                className="absolute inset-y-0"
                style={{ left: `${p}%`, borderLeft: "1px solid rgba(255,255,255,0.34)" }}
              />
            ))}
            {[33.333, 66.666].map((p) => (
              <div
                key={`h${p}`}
                className="absolute inset-x-0"
                style={{ top: `${p}%`, borderTop: "1px solid rgba(255,255,255,0.34)" }}
              />
            ))}
            {/* Safe area — copy and trim guard. */}
            <div
              className="absolute"
              style={{
                inset: "8%",
                border: "1px dashed rgba(255,255,255,0.42)",
              }}
            />
          </div>
        )}
        {/* Focal marker */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${fx}%`, top: `${fy}%`, background: "#003FC7" }}
        />
        <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">
          {Math.round(r.zoom * 100)}%
        </span>
      </div>

      {/* ---- Toolbar ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={btn}
          title="Zoom out"
          onClick={() => patch({ zoom: clamp(r.zoom / 1.15, HERO_ZOOM_MIN, HERO_ZOOM_MAX) })}
        >
          <ZoomOut size={12} />
        </button>
        <button
          type="button"
          className={btn}
          title="Zoom in"
          onClick={() => patch({ zoom: clamp(r.zoom * 1.15, HERO_ZOOM_MIN, HERO_ZOOM_MAX) })}
        >
          <ZoomIn size={12} />
        </button>
        <button
          type="button"
          className={btn}
          title="Fit — reset zoom and pan"
          onClick={() => patch({ zoom: 1, offsetX: 0, offsetY: 0 })}
        >
          <Maximize size={12} /> Fit
        </button>
        <button
          type="button"
          className={btn}
          title="Rotate 90° left"
          onClick={() => patch({ rotate: normalizeAngle(r.rotate - 90) })}
        >
          <RotateCcw size={12} />
        </button>
        <button
          type="button"
          className={btn}
          title="Rotate 90° right"
          onClick={() => patch({ rotate: normalizeAngle(r.rotate + 90) })}
        >
          <RotateCw size={12} />
        </button>
        <button
          type="button"
          className={r.flipX ? btnOn : btn}
          title="Flip horizontally"
          aria-pressed={r.flipX}
          onClick={() => patch({ flipX: !r.flipX })}
        >
          <FlipHorizontal2 size={12} />
        </button>
        <button
          type="button"
          className={r.flipY ? btnOn : btn}
          title="Flip vertically"
          aria-pressed={r.flipY}
          onClick={() => patch({ flipY: !r.flipY })}
        >
          <FlipVertical2 size={12} />
        </button>
        <button
          type="button"
          className={grid ? btnOn : btn}
          title="Thirds + safe-area guides"
          aria-pressed={grid}
          onClick={() => setGrid((g) => !g)}
        >
          <Grid3x3 size={12} />
        </button>
        <button
          type="button"
          className={btn}
          title="Reset every crop and tone adjustment"
          disabled={isHeroAdjustDefault(adjust)}
          onClick={() => onChange({})}
        >
          Reset
        </button>
      </div>

      {/* ---- Crop / tone controls -------------------------------------- */}
      <div className="inline-flex rounded-md border border-black/10 p-0.5 dark:border-white/12">
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
            tab === "crop"
              ? "bg-[#003FC7] text-white"
              : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          }`}
          onClick={() => setTab("crop")}
        >
          <Crop size={11} /> Crop
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
            tab === "tone"
              ? "bg-[#003FC7] text-white"
              : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          }`}
          onClick={() => setTab("tone")}
        >
          <Sliders size={11} /> Tone
        </button>
      </div>

      <div className={dense ? "grid gap-1.5" : "grid gap-2"}>
        {tab === "crop" ? (
          <>
            <StudioSlider
              label="Zoom"
              value={r.zoom}
              min={HERO_ZOOM_MIN}
              max={HERO_ZOOM_MAX}
              step={0.01}
              display={`${Math.round(r.zoom * 100)}%`}
              onChange={(v) => patch({ zoom: v })}
            />
            <StudioSlider
              label="Straighten"
              value={r.rotate}
              min={-180}
              max={180}
              step={0.5}
              display={`${r.rotate.toFixed(1)}°`}
              onChange={(v) => patch({ rotate: v })}
            />
            <StudioSlider
              label="Pan X"
              value={r.offsetX}
              min={-50}
              max={50}
              step={0.5}
              display={`${Math.round(r.offsetX)}%`}
              onChange={(v) => patch({ offsetX: v })}
            />
            <StudioSlider
              label="Pan Y"
              value={r.offsetY}
              min={-50}
              max={50}
              step={0.5}
              display={`${Math.round(r.offsetY)}%`}
              onChange={(v) => patch({ offsetY: v })}
            />
          </>
        ) : (
          <>
            <StudioSlider
              label="Exposure"
              value={r.brightness}
              min={0.4}
              max={1.6}
              step={0.01}
              display={`${Math.round(r.brightness * 100)}%`}
              onChange={(v) => patch({ brightness: v })}
            />
            <StudioSlider
              label="Contrast"
              value={r.contrast}
              min={0.4}
              max={1.6}
              step={0.01}
              display={`${Math.round(r.contrast * 100)}%`}
              onChange={(v) => patch({ contrast: v })}
            />
            <StudioSlider
              label="Saturation"
              value={r.saturation}
              min={0}
              max={2}
              step={0.01}
              display={`${Math.round(r.saturation * 100)}%`}
              onChange={(v) => patch({ saturation: v })}
            />
            <StudioSlider
              label="Black & white"
              value={r.grayscale}
              min={0}
              max={1}
              step={0.01}
              display={`${Math.round(r.grayscale * 100)}%`}
              onChange={(v) => patch({ grayscale: v })}
            />
            <StudioSlider
              label="Warmth"
              value={r.sepia}
              min={0}
              max={1}
              step={0.01}
              display={`${Math.round(r.sepia * 100)}%`}
              onChange={(v) => patch({ sepia: v })}
            />
            <StudioSlider
              label="Softness"
              value={r.blurPx}
              min={0}
              max={12}
              step={0.5}
              display={`${r.blurPx.toFixed(1)}px`}
              onChange={(v) => patch({ blurPx: v })}
            />
          </>
        )}
      </div>
      <p className="text-[10px] leading-snug text-black/45 dark:text-white/45">
        Drag to pan · scroll or pinch to zoom · click to set the focal point · arrow keys nudge.
        Crops are non-destructive and carry through to PDF and PowerPoint.
      </p>
    </div>
  );
}

function normalizeAngle(deg: number) {
  let a = deg;
  while (a > 180) a -= 360;
  while (a < -180) a += 360;
  return Math.round(a * 10) / 10;
}

function StudioSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[84px_1fr_44px] items-center gap-2">
      <span className="text-[11px] text-black/60 dark:text-white/60">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#003FC7]"
      />
      <span className="text-right text-[10px] tabular-nums text-black/50 dark:text-white/50">
        {display}
      </span>
    </label>
  );
}
