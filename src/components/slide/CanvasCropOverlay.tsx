// Adobe-style crop frame for a single image block on the free canvas.
//
// Positioned in the stage's percentage coordinate space (same as every other
// editor overlay) so it tracks the slide at any zoom without extra maths.
//
//  • drag inside the frame  → pans the photo (writes `mediaFocus`)
//  • drag a corner handle   → scales the photo in its frame (`mediaZoom`)

import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";

export type CanvasCropTarget = {
  x: number;
  y: number;
  w: number;
  h: number;
  mediaFocus?: string;
  mediaZoom?: number;
};

const CORNERS = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
] as const;

type Mode = "pan" | (typeof CORNERS)[number]["id"];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function parseCropFocus(focus?: string): { x: number; y: number } {
  const parts = (focus ?? "").trim().split(/\s+/);
  const x = parseFloat(parts[0] ?? "");
  const y = parseFloat(parts[1] ?? "");
  return {
    x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
  };
}

export function CanvasCropOverlay({
  target,
  accent = "#A1FBF9",
  onChange,
  onCommit,
}: {
  target: CanvasCropTarget;
  accent?: string;
  /** Live update while dragging. */
  onChange: (next: { mediaFocus: string; mediaZoom: number }) => void;
  /** Fired on pointer-up so the gesture lands as one history entry. */
  onCommit?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const start = useRef<{
    x: number;
    y: number;
    fx: number;
    fy: number;
    zoom: number;
    w: number;
    h: number;
  } | null>(null);

  const begin = useCallback(
    (e: React.PointerEvent, next: Mode) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = hostRef.current?.getBoundingClientRect();
      const f = parseCropFocus(target.mediaFocus);
      start.current = {
        x: e.clientX,
        y: e.clientY,
        fx: f.x,
        fy: f.y,
        zoom: target.mediaZoom && target.mediaZoom > 0 ? target.mediaZoom : 1,
        w: Math.max(1, rect?.width ?? 1),
        h: Math.max(1, rect?.height ?? 1),
      };
      setMode(next);
    },
    [target.mediaFocus, target.mediaZoom],
  );

  useEffect(() => {
    if (!mode) return;
    const onMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (mode === "pan") {
        // Dragging right reveals the left of the photo → focus moves left.
        const fx = clamp(s.fx - ((e.clientX - s.x) / s.w) * 100, 0, 100);
        const fy = clamp(s.fy - ((e.clientY - s.y) / s.h) * 100, 0, 100);
        onChange({ mediaFocus: `${Math.round(fx)}% ${Math.round(fy)}%`, mediaZoom: s.zoom });
        return;
      }
      const corner = CORNERS.find((c) => c.id === mode)!;
      const dx = (e.clientX - s.x) * (corner.x === 0 ? -1 : 1);
      const dy = (e.clientY - s.y) * (corner.y === 0 ? -1 : 1);
      const diag = Math.max(1, Math.hypot(s.w, s.h));
      const next = clamp(s.zoom + ((dx + dy) / diag) * 2, 0.5, 4);
      onChange({
        mediaFocus: `${Math.round(s.fx)}% ${Math.round(s.fy)}%`,
        mediaZoom: +next.toFixed(2),
      });
    };
    const onUp = () => {
      setMode(null);
      start.current = null;
      onCommit?.();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [mode, onChange, onCommit]);

  const f = parseCropFocus(target.mediaFocus);
  const zoom = target.mediaZoom && target.mediaZoom > 0 ? target.mediaZoom : 1;

  return (
    <div
      ref={hostRef}
      className="pointer-events-auto absolute z-[60]"
      style={{
        left: `${(target.x / STAGE_W) * 100}%`,
        top: `${(target.y / STAGE_H) * 100}%`,
        width: `${(target.w / STAGE_W) * 100}%`,
        height: `${(target.h / STAGE_H) * 100}%`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="presentation"
        onPointerDown={(e) => begin(e, "pan")}
        className="absolute inset-0"
        style={{
          cursor: mode === "pan" ? "grabbing" : "grab",
          outline: `2px solid ${accent}`,
          outlineOffset: -2,
          touchAction: "none",
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60">
          {[33.333, 66.666].map((p) => (
            <div
              key={`v${p}`}
              className="absolute inset-y-0"
              style={{ left: `${p}%`, width: 1, background: "rgba(255,255,255,0.55)" }}
            />
          ))}
          {[33.333, 66.666].map((p) => (
            <div
              key={`h${p}`}
              className="absolute inset-x-0"
              style={{ top: `${p}%`, height: 1, background: "rgba(255,255,255,0.55)" }}
            />
          ))}
        </div>
        <span
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            background: accent,
            boxShadow: "0 0 0 2px rgba(3,0,44,0.6)",
          }}
        />
      </div>

      {CORNERS.map((c) => (
        <span
          key={c.id}
          role="presentation"
          onPointerDown={(e) => begin(e, c.id)}
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border"
          style={{
            left: `${c.x * 100}%`,
            top: `${c.y * 100}%`,
            cursor: c.cursor,
            background: accent,
            borderColor: "rgba(3,0,44,0.65)",
            touchAction: "none",
          }}
        />
      ))}

      <span
        className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
        style={{ background: accent, color: "#03002C" }}
      >
        Drag to crop · corners zoom {zoom.toFixed(2)}×
      </span>
    </div>
  );
}
