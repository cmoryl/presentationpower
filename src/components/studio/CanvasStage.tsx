// The 1920×1080 composition stage for the Open Canvas Studio.
// Handles drop-to-place, drag-to-move, corner resize, marquee-free multi-select
// (shift-click), grid snapping and keyboard nudge/delete.

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import {
  GRID,
  STAGE_H,
  STAGE_W,
  snap,
  type CanvasComposition,
  type CanvasItem,
} from "@/lib/canvas-studio";
import { CanvasItemView } from "./CanvasItemView";
import { DRAG_MIME, type DragPayload } from "./StudioPalette";

type Props = {
  comp: CanvasComposition;
  brand: BrandMode;
  selectedIds: readonly string[];
  snapOn: boolean;
  showGrid: boolean;
  onSelect: (ids: string[]) => void;
  onPatch: (itemId: string, patch: Partial<CanvasItem>) => void;
  onDropPayload: (payload: DragPayload, at: { x: number; y: number }) => void;
  onDropFiles: (files: File[], at: { x: number; y: number }) => void;
  onDelete: (itemId: string) => void;
  /** Break a placed module into fully editable layers (double-click a module). */
  onExplode?: (itemId: string) => void;
};

export function CanvasStage({
  comp,
  brand,
  selectedIds,
  snapOn,
  showGrid,
  onSelect,
  onPatch,
  onDropPayload,
  onDropFiles,
  onDelete,
  onExplode,
}: Props) {

  const wrapRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  const drag = useRef<
    | { mode: "move"; id: string; dx: number; dy: number }
    | { mode: "resize"; id: string; startX: number; startY: number; w: number; h: number }
    | null
  >(null);

  const stageFrom = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * STAGE_W,
      y: ((clientY - r.top) / r.height) * STAGE_H,
    };
  }, []);

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / STAGE_W || 1));
    ro.observe(el);
    setScale(el.clientWidth / STAGE_W || 1);
    return () => ro.disconnect();
  }, []);

  const items = [...comp.items]
    .filter((i) => !i.hidden)
    .sort((a, b) => a.z - b.z);
  const bg =
    comp.background ?? (comp.mode === "dark" ? "#03002C" : (brand.tokens.surface ?? "#FFFFFF"));

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-black/10 shadow-sm"
      style={{ aspectRatio: "16 / 9", background: bg, outline: isOver ? "3px solid #003FC7" : "none" }}
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label="Slide canvas"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const at = stageFrom(e.clientX, e.clientY);
        const raw = e.dataTransfer.getData(DRAG_MIME);
        if (raw) {
          try {
            onDropPayload(JSON.parse(raw) as DragPayload, at);
          } catch {
            /* ignore malformed payloads */
          }
          return;
        }
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onDropFiles(files, at);
      }}
      onPointerDown={(e) => {
        if (e.target === wrapRef.current) onSelect([]);
      }}
      onKeyDown={(e) => {
        if (!selectedIds.length) return;
        const step = e.shiftKey ? GRID : 8;
        const map: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        if (map[e.key]) {
          e.preventDefault();
          const [dx, dy] = map[e.key]!;
          for (const id of selectedIds) {
            const it = comp.items.find((i) => i.id === id);
            if (!it) continue;
            onPatch(id, {
              x: Math.max(0, Math.min(STAGE_W - it.w, it.x + dx)),
              y: Math.max(0, Math.min(STAGE_H - it.h, it.y + dy)),
            });
          }
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          selectedIds.forEach(onDelete);
        }
      }}
    >
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #03002C 1px, transparent 1px), linear-gradient(to bottom, #03002C 1px, transparent 1px)",
            backgroundSize: `${(GRID / STAGE_W) * 100}% ${(GRID / STAGE_H) * 100}%`,
          }}
        />
      )}

      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
      >
      {items.map((it) => {
        const selected = selectedIds.includes(it.id);
        return (
          <div
            key={it.id}
            className="absolute"
            style={{
              left: it.x,
              top: it.y,
              width: it.w,
              height: it.h,
              zIndex: it.z,
              outline: selected
                ? `${2 / scale}px solid #003FC7`
                : `${1 / scale}px dashed rgba(3,0,44,0.18)`,
              outlineOffset: 1,
              cursor: it.locked ? "default" : "move",
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              wrapRef.current?.focus();
              if (e.shiftKey) {
                onSelect(
                  selectedIds.includes(it.id)
                    ? selectedIds.filter((x) => x !== it.id)
                    : [...selectedIds, it.id],
                );
                return;
              }
              onSelect([it.id]);
              if (it.locked) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              const s = stageFrom(e.clientX, e.clientY);
              drag.current = { mode: "move", id: it.id, dx: s.x - it.x, dy: s.y - it.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== it.id) return;
              const s = stageFrom(e.clientX, e.clientY);
              if (d.mode === "move") {
                onPatch(it.id, {
                  x: Math.max(0, Math.min(STAGE_W - it.w, snap(s.x - d.dx, snapOn))),
                  y: Math.max(0, Math.min(STAGE_H - it.h, snap(s.y - d.dy, snapOn))),
                });
              } else {
                onPatch(it.id, {
                  w: Math.max(60, Math.min(STAGE_W - it.x, snap(d.w + (s.x - d.startX), snapOn))),
                  h: Math.max(40, Math.min(STAGE_H - it.y, snap(d.h + (s.y - d.startY), snapOn))),
                });
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            <div className="pointer-events-none h-full w-full">
              <CanvasItemView item={it} brand={brand} mode={comp.mode} />
            </div>
            {selected && !it.locked && (
              <div
                role="presentation"
                className="absolute cursor-nwse-resize rounded-full border-2 border-white bg-[#003FC7] shadow"
                style={{
                  width: 20 / scale,
                  height: 20 / scale,
                  right: -10 / scale,
                  bottom: -10 / scale,
                  borderWidth: 2 / scale,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget.parentElement as HTMLElement)?.setPointerCapture?.(e.pointerId);
                  const s = stageFrom(e.clientX, e.clientY);
                  drag.current = {
                    mode: "resize",
                    id: it.id,
                    startX: s.x,
                    startY: s.y,
                    w: it.w,
                    h: it.h,
                  };
                }}
              />
            )}
          </div>
        );
      })}

      </div>

      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-semibold text-black/45">Blank slide</p>
          <p className="max-w-md text-sm text-black/40">
            Drag preset modules, text, stats, imagery or surfaces from the left rail. Drop image
            files straight onto the canvas.
          </p>
        </div>
      )}
    </div>
  );
}
