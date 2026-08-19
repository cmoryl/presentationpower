import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CanvasBlock, DeckSlide } from "@/lib/deck-store";
import { useDeckStore } from "@/lib/deck-store";
import {
  clearCanvasEmphasis,
  setCanvasEmphasis,
  useCanvasEmphasis,
} from "@/lib/canvas-emphasis";


/**
 * Read/adjust the slide's canvas layers from the right-hand inspector rail.
 *
 * Mirrors the Studio layers panel (paint order, top-most first) but stays
 * compact: visibility, lock, export scope, reorder and select. Multi-select
 * (click checkbox, ⌘/Ctrl-click, ⇧-click for a range) unlocks bulk actions.
 * Heavy editing still happens on the enlarged stage.
 */

function labelFor(b: CanvasBlock): string {
  const text = (b.text ?? "").replace(/\s+/g, " ").trim();
  if (b.kind === "image") return b.alt?.trim() || "Image";
  if (b.kind === "shape") return "Shape";
  return text ? (text.length > 30 ? `${text.slice(0, 30)}…` : text) : b.kind;
}

function iconFor(b: CanvasBlock): string {
  if (b.sourceSelector) return "✥";
  if (b.kind === "image") return "▣";
  if (b.kind === "shape") return "◇";
  return "T";
}

export function SlideLayersInspector({
  slide,
  onChange,
  onOpenEditor,
}: {
  slide: DeckSlide;
  /** Persist the new paint order / flags (bottom-most first). */
  onChange: (blocks: CanvasBlock[], label: string) => void;
  /** Jump to the full-size stage for real editing. */
  onOpenEditor: () => void;
}) {
  const blocks = useMemo<CanvasBlock[]>(() => slide.canvasBlocks ?? [], [slide.canvasBlocks]);
  // Top of the stack first, like PowerPoint's Selection Pane.
  const ordered = useMemo(() => [...blocks].reverse(), [blocks]);
  const { selectedId, hoverId } = useCanvasEmphasis();

  const [picked, setPicked] = useState<string[]>([]);
  const anchorRef = useRef<string | null>(null);
  /** Ids being dragged (a group when the grabbed row was multi-selected). */
  const [drag, setDrag] = useState<{ ids: string[] } | null>(null);
  const [dropAt, setDropAt] = useState<{ id: string; edge: "above" | "below" } | null>(null);


  // Undo / redo of layer edits rides the deck-wide session history so the
  // panel, the stage and ⌘Z all agree on the same stack.
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const pastCount = useDeckStore((s) => (s._past ?? []).length);
  const futureCount = useDeckStore((s) => (s._future ?? []).length);
  const undoName = useDeckStore((s) => s._past?.[s._past.length - 1]?.label ?? null);
  const redoName = useDeckStore((s) => s._future?.[s._future.length - 1]?.label ?? null);

  /** ⌘/Ctrl+Z and ⌘/Ctrl+⇧+Z while the panel has focus (works inside modals). */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) redo();
      else undo();
      setPicked([]);
      clearCanvasEmphasis();
    },
    [redo, undo],
  );


  // Never leave a highlight behind when the panel closes or the slide changes.
  useEffect(() => clearCanvasEmphasis, []);
  useEffect(() => {
    clearCanvasEmphasis();
    setPicked([]);
    anchorRef.current = null;
  }, [slide.id]);

  // Drop ids that no longer exist (module re-render, undo, deletion).
  useEffect(() => {
    setPicked((prev) => {
      const live = prev.filter((id) => blocks.some((b) => b.id === id));
      return live.length === prev.length ? prev : live;
    });
  }, [blocks]);

  const pickedSet = useMemo(() => new Set(picked), [picked]);

  /** Selection semantics: plain = single, ⌘/Ctrl = toggle, ⇧ = range. */
  const selectRow = useCallback(
    (id: string, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      const rows = ordered.map((b) => b.id);
      if (e.shiftKey && anchorRef.current) {
        const a = rows.indexOf(anchorRef.current);
        const b = rows.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          setPicked(rows.slice(lo, hi + 1));
          setCanvasEmphasis({ selectedId: id, hoverId: id });
          return;
        }
      }
      if (e.metaKey || e.ctrlKey) {
        setPicked((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
        anchorRef.current = id;
        setCanvasEmphasis({ selectedId: id, hoverId: id });
        return;
      }
      anchorRef.current = id;
      const only = picked.length === 1 && picked[0] === id;
      setPicked(only ? [] : [id]);
      setCanvasEmphasis({
        selectedId: only ? null : id,
        hoverId: id,
      });
    },
    [ordered, picked],
  );

  const toggleCheck = useCallback((id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    anchorRef.current = id;
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-black/60">
          This slide has no canvas layers yet. Open the full-size stage and pick any module
          element to turn it into a movable layer.
        </p>
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium hover:bg-black/[0.04]"
        >
          ⤢ Enlarge to edit
        </button>
      </div>
    );
  }

  const patch = (id: string, next: Partial<CanvasBlock>, label: string) =>
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, ...next } : b)),
      label,
    );

  /** Apply the same flags to every picked layer in one history step. */
  const patchPicked = (next: Partial<CanvasBlock>, label: string) => {
    if (picked.length === 0) return;
    onChange(
      blocks.map((b) => (pickedSet.has(b.id) ? { ...b, ...next } : b)),
      label,
    );
  };

  const reindex = (next: CanvasBlock[], label: string) =>
    onChange(
      next.map((b, idx) => ({ ...b, z: idx })),
      label,
    );

  /** Move a block one step up (towards the viewer) or down in paint order. */
  const nudge = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + (dir === 1 ? 1 : -1);
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(i, 1);
    next.splice(j, 0, moved);
    reindex(next, "Reorder layer");
  };

  /** Shift the whole picked group one step, keeping relative order intact. */
  const nudgePicked = (dir: -1 | 1) => {
    if (picked.length === 0) return;
    const next = [...blocks];
    if (dir === 1) {
      for (let i = next.length - 2; i >= 0; i--) {
        if (pickedSet.has(next[i].id) && !pickedSet.has(next[i + 1].id)) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
    } else {
      for (let i = 1; i < next.length; i++) {
        if (pickedSet.has(next[i].id) && !pickedSet.has(next[i - 1].id)) {
          [next[i], next[i - 1]] = [next[i - 1], next[i]];
        }
      }
    }
    reindex(next, picked.length > 1 ? "Reorder layers" : "Reorder layer");
  };

  const sendPicked = (edge: "front" | "back") => {
    if (picked.length === 0) return;
    const keep = blocks.filter((b) => !pickedSet.has(b.id));
    const move = blocks.filter((b) => pickedSet.has(b.id));
    reindex(
      edge === "front" ? [...keep, ...move] : [...move, ...keep],
      edge === "front" ? "Bring layers to front" : "Send layers to back",
    );
  };

  /**
   * Drop the dragged group before/after a target row. Works in the displayed
   * (top-most first) order, then flips back to paint order for storage. The
   * dragged ids keep their relative stacking regardless of where they land.
   */
  const dropOnto = (targetId: string, edge: "above" | "below") => {
    const ids = drag?.ids ?? [];
    if (ids.length === 0 || ids.includes(targetId)) return;
    const idSet = new Set(ids);
    const top = ordered.map((b) => b.id);
    const moving = top.filter((id) => idSet.has(id)); // preserves relative order
    const rest = top.filter((id) => !idSet.has(id));
    let at = rest.indexOf(targetId);
    if (at < 0) return;
    if (edge === "below") at += 1;
    const nextTop = [...rest.slice(0, at), ...moving, ...rest.slice(at)];
    const byId = new Map(blocks.map((b) => [b.id, b] as const));
    const paint = nextTop
      .slice()
      .reverse()
      .map((id) => byId.get(id))
      .filter((b): b is CanvasBlock => Boolean(b));
    if (paint.length !== blocks.length) return;
    reindex(paint, moving.length > 1 ? "Reorder layers" : "Reorder layer");
  };

  const pickedBlocks = blocks.filter((b) => pickedSet.has(b.id));
  const allHidden = pickedBlocks.length > 0 && pickedBlocks.every((b) => b.hidden);
  const allLocked = pickedBlocks.length > 0 && pickedBlocks.every((b) => b.locked);
  const allExcluded = pickedBlocks.length > 0 && pickedBlocks.every((b) => b.exportExcluded);
  const bulkBtn =
    "rounded-md border border-black/15 bg-white px-2 py-1 text-[11px] font-medium text-black/70 hover:bg-black/[0.05]";


  return (
    <div className="space-y-2" onKeyDown={onKeyDown}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-black/45">
        <span>
          {ordered.length} layers
          {picked.length > 0 ? ` · ${picked.length} selected` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              undo();
              setPicked([]);
              clearCanvasEmphasis();
            }}
            disabled={pastCount === 0}
            title={undoName ? `Undo ${undoName}` : "Undo (⌘/Ctrl+Z)"}
            className="hover:text-black/70 disabled:opacity-30"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={() => {
              redo();
              setPicked([]);
              clearCanvasEmphasis();
            }}
            disabled={futureCount === 0}
            title={redoName ? `Redo ${redoName}` : "Redo (⌘/Ctrl+⇧+Z)"}
            className="hover:text-black/70 disabled:opacity-30"
          >
            ↷ Redo
          </button>
          <button
            type="button"
            onClick={() =>
              picked.length === ordered.length
                ? setPicked([])
                : setPicked(ordered.map((b) => b.id))
            }
            className="hover:text-black/70"
          >
            {picked.length === ordered.length ? "None" : "All"}
          </button>
          <button type="button" onClick={onOpenEditor} className="hover:text-black/70">
            Edit ⤢
          </button>
        </div>

      </div>

      {picked.length > 0 && (
        <div
          role="toolbar"
          aria-label={`Bulk actions for ${picked.length} layers`}
          className="flex flex-wrap gap-1 rounded-lg border border-[#003FC7]/25 bg-[#003FC7]/[0.05] p-1.5"
        >
          <button
            type="button"
            className={bulkBtn}
            onClick={() =>
              patchPicked({ hidden: !allHidden }, allHidden ? "Show layers" : "Hide layers")
            }
          >
            {allHidden ? "◉ Show" : "◌ Hide"}
          </button>
          <button
            type="button"
            className={bulkBtn}
            onClick={() =>
              patchPicked({ locked: !allLocked }, allLocked ? "Unlock layers" : "Lock layers")
            }
          >
            {allLocked ? "🔓 Unlock" : "🔒 Lock"}
          </button>
          <button
            type="button"
            className={bulkBtn}
            onClick={() =>
              patchPicked(
                { exportExcluded: !allExcluded },
                allExcluded ? "Include in export" : "Exclude from export",
              )
            }
          >
            PPT {allExcluded ? "on" : "off"}
          </button>
          <button type="button" className={bulkBtn} onClick={() => nudgePicked(1)}>
            ↑ Up
          </button>
          <button type="button" className={bulkBtn} onClick={() => nudgePicked(-1)}>
            ↓ Down
          </button>
          <button type="button" className={bulkBtn} onClick={() => sendPicked("front")}>
            Front
          </button>
          <button type="button" className={bulkBtn} onClick={() => sendPicked("back")}>
            Back
          </button>
          <button
            type="button"
            className={bulkBtn}
            onClick={() => {
              setPicked([]);
              clearCanvasEmphasis();
            }}
          >
            Clear
          </button>
        </div>
      )}

      <ul
        className="divide-y divide-black/[0.07] overflow-hidden rounded-lg border border-black/10"
        onDragEnd={() => {
          setDrag(null);
          setDropAt(null);
        }}
      >
        {ordered.map((b) => (
          <li
            key={b.id}
            onMouseEnter={() => setCanvasEmphasis({ hoverId: b.id })}
            onMouseLeave={() => setCanvasEmphasis({ hoverId: null })}
            onDragOver={(e) => {
              if (!drag || drag.ids.includes(b.id)) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const edge = e.clientY < r.top + r.height / 2 ? "above" : "below";
              if (dropAt?.id !== b.id || dropAt.edge !== edge) setDropAt({ id: b.id, edge });
            }}
            onDrop={(e) => {
              if (!drag) return;
              e.preventDefault();
              const edge = dropAt?.id === b.id ? dropAt.edge : "above";
              dropOnto(b.id, edge);
              setDrag(null);
              setDropAt(null);
            }}
            className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors ${
              drag?.ids.includes(b.id) ? "opacity-40" : ""
            } ${
              dropAt?.id === b.id
                ? dropAt.edge === "above"
                  ? "shadow-[inset_0_2px_0_0_#003FC7]"
                  : "shadow-[inset_0_-2px_0_0_#003FC7]"
                : ""
            } ${
              pickedSet.has(b.id) || selectedId === b.id
                ? "bg-[#003FC7]/[0.08] ring-1 ring-inset ring-[#003FC7]/30"
                : hoverId === b.id
                  ? "bg-[#EC388A]/[0.06]"
                  : "bg-white"
            }`}
          >
            <span
              draggable
              onDragStart={(e) => {
                // Dragging a selected row moves the whole selection.
                const ids = pickedSet.has(b.id) && picked.length > 1 ? picked : [b.id];
                setDrag({ ids });
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", ids.join(","));
              }}
              role="button"
              tabIndex={-1}
              aria-label={`Drag ${labelFor(b)} to reorder`}
              title="Drag to reorder (drags the whole selection)"
              className="shrink-0 cursor-grab select-none px-0.5 text-[11px] text-black/30 hover:text-black/60 active:cursor-grabbing"
            >
              ⠿
            </span>
            <input
              type="checkbox"
              checked={pickedSet.has(b.id)}

              onChange={() => toggleCheck(b.id)}
              aria-label={`Select ${labelFor(b)}`}
              className="h-3.5 w-3.5 shrink-0 accent-[#003FC7]"
            />
            <span aria-hidden className="w-4 text-center text-xs text-black/40">
              {iconFor(b)}
            </span>
            <button
              type="button"
              aria-pressed={pickedSet.has(b.id)}
              onFocus={() => setCanvasEmphasis({ hoverId: b.id })}
              onBlur={() => setCanvasEmphasis({ hoverId: null })}
              onClick={(e) => selectRow(b.id, e)}
              className={`min-w-0 flex-1 truncate text-left text-xs ${
                b.hidden ? "text-black/35 line-through" : "text-black/75"
              } ${
                pickedSet.has(b.id) ? "font-semibold text-[#003FC7]" : "hover:text-black"
              }`}
              title={`${labelFor(b)} — click to highlight, ⌘/Ctrl-click or ⇧-click to multi-select`}
            >
              {labelFor(b)}
            </button>

            <button
              type="button"
              title="Move up"
              aria-label={`Move ${labelFor(b)} up`}
              onClick={() => nudge(b.id, 1)}
              className="rounded px-1 text-[11px] text-black/40 hover:bg-black/5 hover:text-black/70"
            >
              ↑
            </button>
            <button
              type="button"
              title="Move down"
              aria-label={`Move ${labelFor(b)} down`}
              onClick={() => nudge(b.id, -1)}
              className="rounded px-1 text-[11px] text-black/40 hover:bg-black/5 hover:text-black/70"
            >
              ↓
            </button>
            <button
              type="button"
              title={b.hidden ? "Show layer" : "Hide layer"}
              aria-label={b.hidden ? `Show ${labelFor(b)}` : `Hide ${labelFor(b)}`}
              aria-pressed={Boolean(b.hidden)}
              onClick={() => patch(b.id, { hidden: !b.hidden }, b.hidden ? "Show layer" : "Hide layer")}
              className="rounded px-1 text-[11px] text-black/40 hover:bg-black/5 hover:text-black/70"
            >
              {b.hidden ? "◌" : "◉"}
            </button>
            <button
              type="button"
              title={b.locked ? "Unlock layer" : "Lock layer"}
              aria-label={b.locked ? `Unlock ${labelFor(b)}` : `Lock ${labelFor(b)}`}
              aria-pressed={Boolean(b.locked)}
              onClick={() => patch(b.id, { locked: !b.locked }, b.locked ? "Unlock layer" : "Lock layer")}
              className="rounded px-1 text-[11px] text-black/40 hover:bg-black/5 hover:text-black/70"
            >
              {b.locked ? "🔒" : "🔓"}
            </button>
            <button
              type="button"
              title={b.exportExcluded ? "Include in PPTX export" : "Exclude from PPTX export"}
              aria-label={
                b.exportExcluded
                  ? `Include ${labelFor(b)} in export`
                  : `Exclude ${labelFor(b)} from export`
              }
              aria-pressed={Boolean(b.exportExcluded)}
              onClick={() =>
                patch(
                  b.id,
                  { exportExcluded: !b.exportExcluded },
                  b.exportExcluded ? "Include in export" : "Exclude from export",
                )
              }
              className={`rounded px-1 text-[10px] font-semibold uppercase tracking-wide ${
                b.exportExcluded
                  ? "bg-black/[0.06] text-black/60"
                  : "text-black/35 hover:bg-black/5 hover:text-black/70"
              }`}
            >
              PPT
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-snug text-black/45">
        Click a name to highlight it, ⌘/Ctrl-click or ⇧-click to build a group, then use the bulk
        bar. Top of the list paints on top. Hidden layers stay out of present, share and export.
      </p>
    </div>
  );
}
