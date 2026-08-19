import { useEffect, useMemo } from "react";

import type { CanvasBlock, DeckSlide } from "@/lib/deck-store";
import {
  clearCanvasEmphasis,
  setCanvasEmphasis,
  useCanvasEmphasis,
} from "@/lib/canvas-emphasis";

/**
 * Read/adjust the slide's canvas layers from the right-hand inspector rail.
 *
 * Mirrors the Studio layers panel (paint order, top-most first) but stays
 * compact: visibility, lock, export scope, reorder and select. Heavy editing
 * still happens on the enlarged stage.
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

  /** Move a block one step up (towards the viewer) or down in paint order. */
  const nudge = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + (dir === 1 ? 1 : -1);
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(i, 1);
    next.splice(j, 0, moved);
    onChange(
      next.map((b, idx) => ({ ...b, z: idx })),
      "Reorder layer",
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-black/45">
        <span>{ordered.length} layers</span>
        <button type="button" onClick={onOpenEditor} className="hover:text-black/70">
          Edit on stage ⤢
        </button>
      </div>
      <ul className="divide-y divide-black/[0.07] overflow-hidden rounded-lg border border-black/10">
        {ordered.map((b) => (
          <li key={b.id} className="flex items-center gap-1.5 bg-white px-2 py-1.5">
            <span aria-hidden className="w-4 text-center text-xs text-black/40">
              {iconFor(b)}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-xs ${
                b.hidden ? "text-black/35 line-through" : "text-black/75"
              }`}
              title={labelFor(b)}
            >
              {labelFor(b)}
            </span>
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
        Top of the list paints on top. Hidden layers stay out of present, share and export.
      </p>
    </div>
  );
}
