import { useCallback, useRef, useState } from "react";
import type { CanvasBlock, CanvasBlockKind } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";

/**
 * FreeCanvasEditor — a thin interaction layer over CanvasBlockLayer.
 * Renders draggable, click-to-edit text blocks in stage coordinates
 * (0–1920 × 0–1080). Persists via onChange after each interaction.
 *
 * Multi-select: shift-click to toggle a block into the selection.
 * When 2+ selected: align actions and equalize sizes.
 * When 3+ selected: distribute horizontal/vertical spacing (equal gaps
 * between adjacent bounds, keeping the outermost blocks pinned).
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
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [equalizeMode, setEqualizeMode] = useState<"off" | "width" | "height" | "both">("off");

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
      body: { text: "Body copy — click to edit.", w: 900, h: 120, x: 160, y: 500 },
      caption: { text: "Caption", w: 600, h: 60, x: 160, y: 900 },
    };
    onChange([
      ...list,
      { id, kind, x: 200, y: 200, w: 900, h: 120, text: "", ...defaults[kind] } as CanvasBlock,
    ]);
    setEditingId(id);
  };

  const toggleSelect = (id: string, additive: boolean) => {
    setSelected((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedBlocks = list.filter((b) => selected.has(b.id));

  const applySelectionUpdate = (updater: (b: CanvasBlock) => Partial<CanvasBlock>) => {
    onChange(list.map((b) => (selected.has(b.id) ? { ...b, ...updater(b) } : b)));
  };

  /** Distribute equal gaps between adjacent bounds along axis. Outer blocks stay pinned. */
  const distributeSpacing = (axis: "x" | "y") => {
    if (selectedBlocks.length < 3) return;
    const size = axis === "x" ? "w" : "h";
    const sorted = [...selectedBlocks].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpan = last[axis] + last[size] - first[axis];
    const contentSum = sorted.reduce((s, b) => s + b[size], 0);
    const gap = (totalSpan - contentSum) / (sorted.length - 1);
    let cursor = first[axis];
    const nextById = new Map<string, number>();
    sorted.forEach((b, i) => {
      nextById.set(b.id, cursor);
      cursor += b[size] + gap;
      // pin last exactly to avoid float drift
      if (i === sorted.length - 2) cursor = last[axis];
    });
    onChange(
      list.map((b) =>
        nextById.has(b.id) ? ({ ...b, [axis]: nextById.get(b.id)! } as CanvasBlock) : b,
      ),
    );
  };

  const alignSelection = (edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (selectedBlocks.length < 2) return;
    if (edge === "left") {
      const v = Math.min(...selectedBlocks.map((b) => b.x));
      applySelectionUpdate(() => ({ x: v }));
    } else if (edge === "right") {
      const v = Math.max(...selectedBlocks.map((b) => b.x + b.w));
      applySelectionUpdate((b) => ({ x: v - b.w }));
    } else if (edge === "hcenter") {
      const v =
        (Math.min(...selectedBlocks.map((b) => b.x)) +
          Math.max(...selectedBlocks.map((b) => b.x + b.w))) /
        2;
      applySelectionUpdate((b) => ({ x: v - b.w / 2 }));
    } else if (edge === "top") {
      const v = Math.min(...selectedBlocks.map((b) => b.y));
      applySelectionUpdate(() => ({ y: v }));
    } else if (edge === "bottom") {
      const v = Math.max(...selectedBlocks.map((b) => b.y + b.h));
      applySelectionUpdate((b) => ({ y: v - b.h }));
    } else {
      const v =
        (Math.min(...selectedBlocks.map((b) => b.y)) +
          Math.max(...selectedBlocks.map((b) => b.y + b.h))) /
        2;
      applySelectionUpdate((b) => ({ y: v - b.h / 2 }));
    }
  };

  const equalizeSizes = (mode: "width" | "height" | "both") => {
    if (selectedBlocks.length < 2) return;
    // Use the median-ish (largest) as target for predictability.
    const targetW = Math.max(...selectedBlocks.map((b) => b.w));
    const targetH = Math.max(...selectedBlocks.map((b) => b.h));
    applySelectionUpdate(() => ({
      ...(mode === "width" || mode === "both" ? { w: targetW } : {}),
      ...(mode === "height" || mode === "both" ? { h: targetH } : {}),
    }));
  };

  const toggleEqualize = (mode: "width" | "height" | "both") => {
    const next = equalizeMode === mode ? "off" : mode;
    setEqualizeMode(next);
    if (next !== "off") equalizeSizes(next);
  };

  const ink = brand.tokens.ink ?? brand.tokens.primary;
  const showAlign = selectedBlocks.length >= 2;
  const showDistribute = selectedBlocks.length >= 3;

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {children}
      <div className="absolute inset-0 z-40">
        {list.map((b) => {
          const fs = b.kind === "heading" ? 96 : b.kind === "body" ? 40 : 26;
          const isSelected = selected.has(b.id);
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
            outline:
              dragId === b.id || editingId === b.id
                ? `2px dashed ${brand.tokens.accent}`
                : isSelected
                  ? `2px solid ${brand.tokens.accent}`
                  : "1px dashed rgba(0,0,0,0.15)",
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
                if (e.shiftKey) {
                  toggleSelect(b.id, true);
                  return;
                }
                if (!selected.has(b.id)) toggleSelect(b.id, false);
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
                    setSelected((prev) => {
                      const n = new Set(prev);
                      n.delete(b.id);
                      return n;
                    });
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
        <button
          type="button"
          onClick={() => addBlock("heading")}
          className="rounded-full px-2 hover:bg-white/10"
        >
          + Heading
        </button>
        <button
          type="button"
          onClick={() => addBlock("body")}
          className="rounded-full px-2 hover:bg-white/10"
        >
          + Body
        </button>
        <button
          type="button"
          onClick={() => addBlock("caption")}
          className="rounded-full px-2 hover:bg-white/10"
        >
          + Caption
        </button>
      </div>

      {(showAlign || showDistribute) && (
        <div
          className="pointer-events-auto absolute right-3 top-3 z-50 flex flex-wrap items-center gap-1 rounded-2xl bg-black/80 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg"
          role="toolbar"
          aria-label="Distribute and align selection"
        >
          <span className="px-1 opacity-60">{selectedBlocks.length} selected</span>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <span className="px-1 opacity-60">Align</span>
          <button
            type="button"
            title="Align left"
            onClick={() => alignSelection("left")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            L
          </button>
          <button
            type="button"
            title="Align horizontal center"
            onClick={() => alignSelection("hcenter")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            C
          </button>
          <button
            type="button"
            title="Align right"
            onClick={() => alignSelection("right")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            R
          </button>
          <button
            type="button"
            title="Align top"
            onClick={() => alignSelection("top")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            T
          </button>
          <button
            type="button"
            title="Align vertical center"
            onClick={() => alignSelection("vcenter")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            M
          </button>
          <button
            type="button"
            title="Align bottom"
            onClick={() => alignSelection("bottom")}
            className="rounded px-1.5 hover:bg-white/10"
          >
            B
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <span className="px-1 opacity-60">Distribute</span>
          <button
            type="button"
            title={showDistribute ? "Distribute horizontal spacing" : "Need 3+ selected"}
            disabled={!showDistribute}
            onClick={() => distributeSpacing("x")}
            className="rounded px-1.5 hover:bg-white/10 disabled:opacity-30"
          >
            ↔ H
          </button>
          <button
            type="button"
            title={showDistribute ? "Distribute vertical spacing" : "Need 3+ selected"}
            disabled={!showDistribute}
            onClick={() => distributeSpacing("y")}
            className="rounded px-1.5 hover:bg-white/10 disabled:opacity-30"
          >
            ↕ V
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <span className="px-1 opacity-60">Equalize</span>
          <button
            type="button"
            title="Equalize widths"
            aria-pressed={equalizeMode === "width"}
            onClick={() => toggleEqualize("width")}
            className={`rounded px-1.5 hover:bg-white/10 ${equalizeMode === "width" ? "bg-white/20" : ""}`}
          >
            W
          </button>
          <button
            type="button"
            title="Equalize heights"
            aria-pressed={equalizeMode === "height"}
            onClick={() => toggleEqualize("height")}
            className={`rounded px-1.5 hover:bg-white/10 ${equalizeMode === "height" ? "bg-white/20" : ""}`}
          >
            H
          </button>
          <button
            type="button"
            title="Equalize both dimensions"
            aria-pressed={equalizeMode === "both"}
            onClick={() => toggleEqualize("both")}
            className={`rounded px-1.5 hover:bg-white/10 ${equalizeMode === "both" ? "bg-white/20" : ""}`}
          >
            W+H
          </button>
          <span className="mx-1 h-4 w-px bg-white/20" />
          <button
            type="button"
            title="Clear selection"
            onClick={() => setSelected(new Set())}
            className="rounded px-1.5 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
