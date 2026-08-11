// Drag-to-crop frame drawn over the selected image cell in the Slide Studio.
//
// Two gestures:
//  • drag anywhere inside the frame → pans the photo (writes `mediaFocus`)
//  • drag a corner handle → scales the photo inside its frame (`mediaZoom`)
//
// The overlay is positioned in the stage's coordinate space, so it tracks the
// scaled slide without touching the renderer's transforms.
import { useEffect, useRef, useState } from "react";

export type CropRect = { left: number; top: number; width: number; height: number };

const CORNERS = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
] as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function parseFocus(focus?: string): { x: number; y: number } {
  const parts = (focus ?? "").trim().split(/\s+/);
  const x = parseFloat(parts[0] ?? "");
  const y = parseFloat(parts[1] ?? "");
  return {
    x: Number.isFinite(x) ? clamp(x, 0, 100) : 50,
    y: Number.isFinite(y) ? clamp(y, 0, 100) : 50,
  };
}

export function CropFrameOverlay({
  rect,
  focus,
  zoom,
  onChange,
  onCommit,
}: {
  rect: CropRect;
  focus?: string;
  zoom?: number;
  /** Live update while dragging (cheap, coalesced by the undo history). */
  onChange: (next: { mediaFocus: string; mediaZoom: number }) => void;
  /** Fired once on pointer-up so the change lands as one history entry. */
  onCommit?: () => void;
}) {
  const [mode, setMode] = useState<null | "pan" | (typeof CORNERS)[number]["id"]>(null);
  const start = useRef<{ x: number; y: number; fx: number; fy: number; zoom: number } | null>(null);

  useEffect(() => {
    if (!mode) return;
    const onMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (mode === "pan") {
        // Dragging right reveals the left of the photo → focus moves left.
        const fx = clamp(s.fx - ((e.clientX - s.x) / Math.max(1, rect.width)) * 100, 0, 100);
        const fy = clamp(s.fy - ((e.clientY - s.y) / Math.max(1, rect.height)) * 100, 0, 100);
        onChange({
          mediaFocus: `${Math.round(fx)}% ${Math.round(fy)}%`,
          mediaZoom: s.zoom,
        });
        return;
      }
      // Corner: pulling outward from the frame centre enlarges the photo.
      const corner = CORNERS.find((c) => c.id === mode)!;
      const dx = (e.clientX - s.x) * (corner.x === 0 ? -1 : 1);
      const dy = (e.clientY - s.y) * (corner.y === 0 ? -1 : 1);
      const diag = Math.max(1, Math.hypot(rect.width, rect.height));
      const next = clamp(s.zoom + ((dx + dy) / diag) * 2, 0.5, 3);
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
  }, [mode, rect.width, rect.height, onChange, onCommit]);

  const begin = (e: React.PointerEvent, next: NonNullable<typeof mode>) => {
    e.preventDefault();
    e.stopPropagation();
    const f = parseFocus(focus);
    start.current = { x: e.clientX, y: e.clientY, fx: f.x, fy: f.y, zoom: zoom && zoom > 0 ? zoom : 1 };
    setMode(next);
  };

  const f = parseFocus(focus);

  return (
    <div
      className="pointer-events-auto absolute z-40"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Frame + thirds guides */}
      <div
        role="presentation"
        onPointerDown={(e) => begin(e, "pan")}
        className="absolute inset-0"
        style={{
          cursor: mode === "pan" ? "grabbing" : "grab",
          outline: "2px solid rgba(161,251,249,0.95)",
          outlineOffset: -2,
          touchAction: "none",
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60">
          {[33.333, 66.666].map((p) => (
            <div
              key={`v${p}`}
              className="absolute inset-y-0"
              style={{ left: `${p}%`, width: 1, background: "rgba(255,255,255,0.5)" }}
            />
          ))}
          {[33.333, 66.666].map((p) => (
            <div
              key={`h${p}`}
              className="absolute inset-x-0"
              style={{ top: `${p}%`, height: 1, background: "rgba(255,255,255,0.5)" }}
            />
          ))}
        </div>
        {/* Focal dot */}
        <span
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            background: "#A1FBF9",
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
            background: "#A1FBF9",
            borderColor: "rgba(3,0,44,0.65)",
            touchAction: "none",
          }}
        />
      ))}

      <span
        className="pointer-events-none absolute -top-6 left-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
        style={{ background: "#A1FBF9", color: "#03002C" }}
      >
        Drag to crop · corners zoom {(zoom && zoom > 0 ? zoom : 1).toFixed(2)}×
      </span>
    </div>
  );
}
