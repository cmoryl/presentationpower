import { useCallback, useRef, useState } from "react";
import type { CanvasBlock, CanvasBlockKind } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";

/**
 * FreeCanvasEditor — a thin interaction layer over CanvasBlockLayer.
 * Renders draggable, click-to-edit text blocks in stage coordinates
 * (0–1920 × 0–1080). Persists via onChange after each interaction.
 *
 * Wrap this AROUND ScaledSlide so the layer inherits the scale transform;
 * pointer math converts screen deltas to stage deltas using the wrapper's
 * measured size.
 */
export function FreeCanvasEditor({
  brand,
  blocks,
  onChange,
  children,
}: {
  brand: BrandMode;
  blocks: readonly CanvasBlock[] | undefined;
  onChange: (next: CanvasBlock[]) => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const list: CanvasBlock[] = blocks ? [...blocks] : [];

  const stageFromClient = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * 1920,
      y: ((clientY - r.top) / r.height) * 1080,
    };
  }, []);

  const patch = (id: string, p: Partial<CanvasBlock>) => {
    onChange(list.map((b) => (b.id === id ? { ...b, ...p } : b)));
  };

  const addBlock = (kind: CanvasBlockKind) => {
    const id = `blk-${Date.now().toString(36)}`;
    const defaults: Record<CanvasBlockKind, Partial<CanvasBlock>> = {
      heading: { text: "New headline", w: 1100, h: 200, x: 160, y: 200 },
      body:    { text: "Body copy — click to edit.", w: 900, h: 120, x: 160, y: 500 },
      caption: { text: "Caption", w: 600, h: 60, x: 160, y: 900 },
    };
    onChange([...list, { id, kind, x: 200, y: 200, w: 900, h: 120, text: "", ...defaults[kind] } as CanvasBlock]);
    setEditingId(id);
  };

  const ink = brand.tokens.ink ?? brand.tokens.primary;

  return (
    <div ref={wrapRef} className="relative w-full">
      {children}
      <div className="absolute inset-0 z-40">
        {list.map((b) => {
          const fs = b.kind === "heading" ? 96 : b.kind === "body" ? 40 : 26;
          const style: React.CSSProperties = {
            position: "absolute",
            left: `${(b.x / 1920) * 100}%`,
            top: `${(b.y / 1080) * 100}%`,
            width: `${(b.w / 1920) * 100}%`,
            minHeight: `${(b.h / 1080) * 100}%`,
            color: b.color ?? ink,
            fontSize: fs,
            lineHeight: b.kind === "heading" ? 1.02 : 1.28,
            letterSpacing: b.kind === "heading" ? "-0.03em" : "-0.005em",
            fontWeight: b.weight ?? (b.kind === "heading" ? 700 : 500),
            textAlign: b.align ?? "left",
            whiteSpace: "pre-wrap",
            outline: dragId === b.id || editingId === b.id ? `2px dashed ${brand.tokens.accent}` : "1px dashed rgba(0,0,0,0.15)",
            outlineOffset: 2,
            cursor: editingId === b.id ? "text" : "move",
            userSelect: editingId === b.id ? "text" : "none",
            background: editingId === b.id ? "rgba(255,255,255,0.05)" : "transparent",
          };
          return (
            <div
              key={b.id}
              style={style}
              contentEditable={editingId === b.id}
              suppressContentEditableWarning
              onPointerDown={(e) => {
                if (editingId === b.id) return;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                const s = stageFromClient(e.clientX, e.clientY);
                setDragId(b.id);
                setDragOffset({ dx: s.x - b.x, dy: s.y - b.y });
              }}
              onPointerMove={(e) => {
                if (dragId !== b.id) return;
                const s = stageFromClient(e.clientX, e.clientY);
                patch(b.id, {
                  x: Math.max(0, Math.min(1920 - b.w, s.x - dragOffset.dx)),
                  y: Math.max(0, Math.min(1080 - b.h, s.y - dragOffset.dy)),
                });
              }}
              onPointerUp={() => setDragId(null)}
              onDoubleClick={() => setEditingId(b.id)}
              onBlur={(e) => {
                if (editingId === b.id) {
                  patch(b.id, { text: (e.currentTarget.textContent ?? "").trim() });
                  setEditingId(null);
                }
              }}
            >
              {b.text}
              {editingId === b.id && (
                <button
                  type="button"
                  className="absolute -right-3 -top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(list.filter((x) => x.id !== b.id));
                    setEditingId(null);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="pointer-events-auto absolute left-3 top-3 z-50 flex gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow">
        <button type="button" onClick={() => addBlock("heading")} className="rounded-full px-2 hover:bg-white/10">+ Heading</button>
        <button type="button" onClick={() => addBlock("body")} className="rounded-full px-2 hover:bg-white/10">+ Body</button>
        <button type="button" onClick={() => addBlock("caption")} className="rounded-full px-2 hover:bg-white/10">+ Caption</button>
      </div>
    </div>
  );
}
