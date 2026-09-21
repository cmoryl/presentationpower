// Zoom and pan frame for the rebuilt venue plans.
//
// A venue plan is read close up — a room name, a lockup, a door — so the plan
// needs to be magnified and dragged without leaving the page. Wheel and pinch
// zoom are anchored on the cursor, the buttons zoom about the centre, and the
// frame can be opened full screen. The ground stays a solid brand token; no
// artwork is used as a background.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

const pill =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#03002C]/15 bg-white/95 text-[#03002C] shadow-sm transition-colors hover:bg-[#F2F2F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export type PlanZoomFrameProps = {
  children: React.ReactNode;
  /** Read out beside the controls, e.g. "Ground floor". */
  label: string;
  className?: string;
};

export function PlanZoomFrame({ children, label, className }: PlanZoomFrameProps) {
  const [full, setFull] = useState(false);
  return (
    <>
      <ZoomSurface label={label} className={className} onFull={() => setFull(true)} full={false}>
        {children}
      </ZoomSurface>
      {full ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} plan, full screen`}
          className="fixed inset-0 z-50 bg-[#03002C]/95 p-4"
        >
          <button
            type="button"
            aria-label="Close full screen"
            className="absolute right-5 top-5 z-10 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            onClick={() => setFull(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <ZoomSurface label={label} full className="h-full">
            {children}
          </ZoomSurface>
        </div>
      ) : null}
    </>
  );
}

function ZoomSurface({
  children,
  label,
  className,
  onFull,
  full,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  onFull?: () => void;
  full: boolean;
}) {
  const frame = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Zoom about a point, keeping whatever sits under it still.
  const zoomAt = useCallback((next: number, px: number, py: number) => {
    setZoom((z) => {
      const to = clamp(next, MIN_ZOOM, MAX_ZOOM);
      const k = to / z;
      setOffset((o) => {
        if (to === MIN_ZOOM) return { x: 0, y: 0 };
        return { x: px - (px - o.x) * k, y: py - (py - o.y) * k };
      });
      return to;
    });
  }, []);

  const wheel = useRef((e: WheelEvent) => {
    void e;
  });
  wheel.current = (e: WheelEvent) => {
    const el = frame.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(zoom * Math.exp(-dy * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
  };

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    // React's onWheel is passive, so the page would scroll behind the plan.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheel.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const centreZoom = (factor: number) => {
    const el = frame.current;
    const rect = el?.getBoundingClientRect();
    zoomAt(zoom * factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={frame}
        className={`relative overflow-hidden bg-[#EEF1F7] ${full ? "h-full" : ""} ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onDoubleClick={(e) => {
          const rect = frame.current?.getBoundingClientRect();
          if (!rect) return;
          if (zoom > 1) return reset();
          zoomAt(2.5, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
          className={full ? "flex h-full items-center justify-center" : ""}
        >
          {children}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className="rounded-full bg-white/95 px-2.5 py-1 font-mono text-[10.5px] font-semibold text-[#03002C]/70 shadow-sm">
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          className={pill}
          aria-label={`Zoom out of the ${label} plan`}
          onClick={() => centreZoom(1 / 1.4)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={pill}
          aria-label={`Zoom into the ${label} plan`}
          onClick={() => centreZoom(1.4)}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" className={pill} aria-label="Reset the view" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </button>
        {onFull ? (
          <button
            type="button"
            className={pill}
            aria-label={`Open the ${label} plan full screen`}
            onClick={onFull}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
