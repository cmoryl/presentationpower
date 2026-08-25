// Arrange layer for Slide Studio.
//
// Two responsibilities, both living on top of the scaled slide stage:
//
//  1. Freeform layers — extra text / image blocks the curator adds in arrange
//     mode. They render whenever the studio is open (not just while arranging)
//     so the saved sample previews exactly what was laid out. Coordinates are
//     stored in the slide's 1920×1080 space and scaled to the stage.
//
//  2. Arrange mode — when enabled, every live-edit field gets a draggable
//     frame and every freeform layer becomes draggable + resizable. Movement
//     is constrained so nothing can break the frame:
//       · edges clamp inside a 48px safe area (0 when the element is wider
//         than the safe bounds),
//       · positions snap (12px) to the 96px brand margins, the slide
//         centre lines, and the edges/centres of every sibling element,
//       · snap guides render while dragging so the constraint is visible.
//     Committed offsets are applied to the rendered field via an injected
//     `transform: translate()` rule keyed on `data-live-path`, so the
//     underlying variant layout keeps its flow and simply shifts — an
//     automatic reflow that can never detach content from the slide.

import { useCallback, useEffect, useRef, useState } from "react";
import type { SampleLayout, StudioFreeLayer } from "@/hooks/use-variant-samples";

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const MARGIN = 96;
const SAFE = 48;
const SNAP = 12;

type Rect = { x: number; y: number; w: number; h: number };

type DragState =
  | { kind: "field"; path: string; startDx: number; startDy: number; el: HTMLElement; rect: Rect }
  | { kind: "layer"; id: string; start: Rect; resize: boolean };

const clampRect = (r: Rect): Rect => {
  const maxX = SLIDE_W - r.w - SAFE;
  const maxY = SLIDE_H - r.h - SAFE;
  const minX = maxX < SAFE ? 0 : SAFE;
  const minY = maxY < SAFE ? 0 : SAFE;
  return {
    ...r,
    x: Math.min(Math.max(r.x, minX), Math.max(maxX, minX)),
    y: Math.min(Math.max(r.y, minY), Math.max(maxY, minY)),
  };
};

/** Snap a rect's edges/centres to the nearest target lines within SNAP px. */
function snapRect(
  r: Rect,
  targetsX: number[],
  targetsY: number[],
): { rect: Rect; guideX: number | null; guideY: number | null } {
  let bestX: { d: number; line: number } | null = null;
  for (const edge of [r.x, r.x + r.w / 2, r.x + r.w]) {
    for (const t of targetsX) {
      const d = t - edge;
      if (Math.abs(d) <= SNAP && (!bestX || Math.abs(d) < Math.abs(bestX.d)))
        bestX = { d, line: t };
    }
  }
  let bestY: { d: number; line: number } | null = null;
  for (const edge of [r.y, r.y + r.h / 2, r.y + r.h]) {
    for (const t of targetsY) {
      const d = t - edge;
      if (Math.abs(d) <= SNAP && (!bestY || Math.abs(d) < Math.abs(bestY.d)))
        bestY = { d, line: t };
    }
  }
  return {
    rect: { ...r, x: r.x + (bestX?.d ?? 0), y: r.y + (bestY?.d ?? 0) },
    guideX: bestX?.line ?? null,
    guideY: bestY?.line ?? null,
  };
}

export function StudioLayoutLayer({
  stageRef,
  enabled,
  layout,
  revision,
  onCommit,
  onPickImage,
  selectedLayerId,
  onSelectLayer,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  layout: SampleLayout;
  /** Changes whenever copy/items/mode change — triggers a rect re-measure. */
  revision: string;
  onCommit: (next: SampleLayout, label: string) => void;
  onPickImage: (layerId: string) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
}) {
  const [scale, setScale] = useState(0);
  const [fieldRects, setFieldRects] = useState<Record<string, Rect>>({});
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragRef = useRef<{ state: DragState; px: number; py: number } | null>(null);

  const layers = layout.layers ?? [];
  const offsets = layout.offsets ?? {};

  // ── Stage scale (slide px → screen px) ──────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setScale(stage.getBoundingClientRect().width / SLIDE_W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [stageRef]);

  // ── Measure every live-edit field (rects include committed offsets) ─────
  const remeasure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !enabled) {
      setFieldRects({});
      return;
    }
    const s = stage.getBoundingClientRect().width / SLIDE_W;
    if (!s) return;
    const box = stage.getBoundingClientRect();
    const next: Record<string, Rect> = {};
    stage.querySelectorAll<HTMLElement>("[data-live-path]").forEach((el) => {
      const path = el.getAttribute("data-live-path");
      if (!path) return;
      const r = el.getBoundingClientRect();
      next[path] = {
        x: (r.left - box.left) / s,
        y: (r.top - box.top) / s,
        w: r.width / s,
        h: r.height / s,
      };
    });
    setFieldRects(next);
  }, [stageRef, enabled]);

  useEffect(() => {
    const raf = requestAnimationFrame(remeasure);
    return () => cancelAnimationFrame(raf);
  }, [remeasure, revision, enabled, offsets]);

  // ── Drag engine (fields + freeform layers share it) ─────────────────────
  const beginDrag = (state: DragState) => (e: React.PointerEvent) => {
    if (!enabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { state, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const snapTargets = (skip: DragState): { tx: number[]; ty: number[] } => {
    const tx = [MARGIN, SLIDE_W / 2, SLIDE_W - MARGIN];
    const ty = [MARGIN, SLIDE_H / 2, SLIDE_H - MARGIN];
    for (const [path, r] of Object.entries(fieldRects)) {
      if (skip.kind === "field" && skip.path === path) continue;
      tx.push(r.x, r.x + r.w / 2, r.x + r.w);
      ty.push(r.y, r.y + r.h / 2, r.y + r.h);
    }
    for (const l of layers) {
      if (skip.kind === "layer" && skip.id === l.id) continue;
      tx.push(l.x, l.x + l.w / 2, l.x + l.w);
      ty.push(l.y, l.y + l.h / 2, l.y + l.h);
    }
    return { tx, ty };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !scale) return;
    const dx = (e.clientX - drag.px) / scale;
    const dy = (e.clientY - drag.py) / scale;
    const { tx, ty } = snapTargets(drag.state);

    if (drag.state.kind === "field") {
      // `rect` is the field's base (un-offset) rect; the live position starts
      // from the committed offset plus this drag's pointer delta.
      const { rect, startDx, startDy } = drag.state;
      const moved: Rect = {
        ...rect,
        x: rect.x + startDx + dx,
        y: rect.y + startDy + dy,
      };
      const snapped = snapRect(clampRect(moved), tx, ty);
      const out = clampRect(snapped.rect);
      const offX = out.x - rect.x;
      const offY = out.y - rect.y;
      // Live preview: transform the node directly; commit happens on release.
      drag.state.el.style.transform = `translate(${offX}px, ${offY}px)`;
      dragRef.current = { ...drag, lastOffset: { dx: offX, dy: offY } } as never;
      setGuides({ x: snapped.guideX, y: snapped.guideY });
      return;
    }

    const start = drag.state.start;
    const moved: Rect = drag.state.resize
      ? {
          x: start.x,
          y: start.y,
          w: Math.max(40, start.w + dx),
          h: Math.max(40, start.h + dy),
        }
      : { ...start, x: start.x + dx, y: start.y + dy };
    const snapped = snapRect(drag.state.resize ? moved : clampRect(moved), tx, ty);
    const out = drag.state.resize
      ? { ...snapped.rect, w: Math.min(snapped.rect.w, SLIDE_W - start.x), h: Math.min(snapped.rect.h, SLIDE_H - start.y) }
      : clampRect(snapped.rect);
    dragRef.current = { ...drag, lastRect: out } as never;
    setGuides({ x: snapped.guideX, y: snapped.guideY });
    // Re-render cheaply by nudging state through a layout preview commit at
    // pointer-up; during the drag we mutate the DOM node for 60fps feedback.
    const node = stageRef.current?.querySelector<HTMLElement>(
      `[data-free-layer="${drag.state.id}"]`,
    );
    if (node) {
      node.style.left = `${(out.x / SLIDE_W) * 100}%`;
      node.style.top = `${(out.y / SLIDE_H) * 100}%`;
      node.style.width = `${(out.w / SLIDE_W) * 100}%`;
      node.style.height = `${(out.h / SLIDE_H) * 100}%`;
    }
  };

  const endDrag = () => {
    const drag = dragRef.current as
      | ({ lastOffset?: { dx: number; dy: number }; lastRect?: Rect } & {
          state: DragState;
        })
      | null;
    dragRef.current = null;
    setGuides({ x: null, y: null });
    if (!drag) return;

    if (drag.state.kind === "field") {
      const { el, path } = drag.state;
      el.style.transform = "";
      const off = drag.lastOffset;
      if (off && (Math.abs(off.dx) > 0.5 || Math.abs(off.dy) > 0.5)) {
        const nextOffsets = { ...offsets, [path]: { dx: Math.round(off.dx), dy: Math.round(off.dy) } };
        onCommit({ offsets: nextOffsets, layers }, `Move · ${path}`);
      }
      return;
    }

    const r = drag.lastRect;
    if (r) {
      const id = (drag.state as { id: string }).id;
      const fixed = layers.map((l) =>
        l.id === id
          ? { ...l, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }
          : l,
      );
      onCommit(
        { offsets, layers: fixed },
        drag.state.resize ? "Resize layer" : "Move layer",
      );
    }
  };

  // Delete the selected freeform layer with ⌫ (never while typing in it).
  useEffect(() => {
    if (!enabled || !selectedLayerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) return;
      e.preventDefault();
      onCommit(
        { offsets, layers: layers.filter((l) => l.id !== selectedLayerId) },
        "Delete layer",
      );
      onSelectLayer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, selectedLayerId, layers, offsets, onCommit, onSelectLayer]);

  const selLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  return (
    <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
      {/* ── Freeform layers (always rendered, interactive in arrange mode) ── */}
      {layers.map((layer) => (
        <div
          key={layer.id}
          data-free-layer={layer.id}
          className="absolute"
          style={{
            left: `${(layer.x / SLIDE_W) * 100}%`,
            top: `${(layer.y / SLIDE_H) * 100}%`,
            width: `${(layer.w / SLIDE_W) * 100}%`,
            height: `${(layer.h / SLIDE_H) * 100}%`,
            pointerEvents: enabled ? "auto" : "none",
            cursor: enabled ? "move" : undefined,
            outline:
              enabled && selectedLayerId === layer.id
                ? "2px solid #A1FBF9"
                : enabled
                  ? "1px dashed rgba(161,251,249,0.5)"
                  : undefined,
            outlineOffset: 2,
          }}
          onPointerDown={(e) => {
            if (!enabled) return;
            onSelectLayer(layer.id);
            if (editingId === layer.id) return;
            beginDrag({ kind: "layer", id: layer.id, start: { x: layer.x, y: layer.y, w: layer.w, h: layer.h }, resize: false })(e);
          }}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onDoubleClick={() => {
            if (!enabled) return;
            if (layer.kind === "text") setEditingId(layer.id);
            else onPickImage(layer.id);
          }}
        >
          {layer.kind === "image" ? (
            layer.mediaUrl ? (
              <img
                src={layer.mediaUrl}
                alt=""
                draggable={false}
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <button
                type="button"
                onClick={() => onPickImage(layer.id)}
                className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-white/40 text-[11px] text-white/60"
                style={{ fontSize: 11 }}
              >
                Choose image…
              </button>
            )
          ) : (
            <div
              contentEditable={enabled && editingId === layer.id}
              suppressContentEditableWarning
              onBlur={(e) => {
                setEditingId(null);
                const text = e.currentTarget.textContent ?? "";
                onCommit(
                  {
                    offsets,
                    layers: layers.map((l) => (l.id === layer.id ? { ...l, text } : l)),
                  },
                  "Edit layer text",
                );
              }}
              style={{
                color: layer.ink ?? "#03002C",
                lineHeight: 1.15,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                width: "100%",
                height: "100%",
                // The node lives in the *unscaled* stage overlay, so shrink
                // the slide-px font size to screen px.
                ...(scale ? { fontSize: (layer.size ?? 64) * scale } : {}),
                outline: "none",
                overflow: "hidden",
              }}
            >
              {layer.text ?? ""}
            </div>
          )}

          {/* Resize handle + delete chip for the selected layer */}
          {enabled && selectedLayerId === layer.id ? (
            <>
              <div
                data-resize-handle=""
                onPointerDown={(e) => {
                  e.stopPropagation();
                  beginDrag({ kind: "layer", id: layer.id, start: { x: layer.x, y: layer.y, w: layer.w, h: layer.h }, resize: true })(e);
                }}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-[#03002C] bg-[#A1FBF9]"
              />
              <button
                type="button"
                aria-label="Delete layer"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommit(
                    { offsets, layers: layers.filter((l) => l.id !== layer.id) },
                    "Delete layer",
                  );
                  onSelectLayer(null);
                }}
                className="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#E53D2E] text-[10px] font-bold text-white"
              >
                ✕
              </button>
            </>
          ) : null}
        </div>
      ))}

      {/* ── Draggable frames over every rendered field (arrange mode) ────── */}
      {enabled
        ? Object.entries(fieldRects).map(([path, r]) => (
            <div
              key={path}
              title={path}
              onPointerDown={beginDrag({
                kind: "field",
                path,
                startDx: offsets[path]?.dx ?? 0,
                startDy: offsets[path]?.dy ?? 0,
                el: stageRef.current?.querySelector<HTMLElement>(
                  `[data-live-path="${CSS.escape(path)}"]`,
                ) as HTMLElement,
                rect: {
                  x: r.x - (offsets[path]?.dx ?? 0),
                  y: r.y - (offsets[path]?.dy ?? 0),
                  w: r.w,
                  h: r.h,
                },
              })}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
              className="absolute cursor-move rounded-sm border border-dashed border-[#A1FBF9]/70 bg-[#A1FBF9]/5 hover:bg-[#A1FBF9]/10"
              style={{
                pointerEvents: "auto",
                left: `${(r.x / SLIDE_W) * 100}%`,
                top: `${(r.y / SLIDE_H) * 100}%`,
                width: `${(r.w / SLIDE_W) * 100}%`,
                height: `${(r.h / SLIDE_H) * 100}%`,
              }}
            />
          ))
        : null}

      {/* ── Snap guides ───────────────────────────────────────────────────── */}
      {guides.x !== null ? (
        <div
          className="absolute top-0 bottom-0 w-px bg-[#EC388A]"
          style={{ left: `${(guides.x / SLIDE_W) * 100}%` }}
        />
      ) : null}
      {guides.y !== null ? (
        <div
          className="absolute left-0 right-0 h-px bg-[#EC388A]"
          style={{ top: `${(guides.y / SLIDE_H) * 100}%` }}
        />
      ) : null}

      {/* Selected-layer hint */}
      {enabled && selLayer ? (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#03002C]/90 px-3 py-1 text-[10px] text-white/80">
          {selLayer.kind === "text" ? "Double-click to edit text" : "Double-click to swap image"} ·
          drag to move · corner to resize · ⌫ deletes
        </div>
      ) : null}
    </div>
  );
}
