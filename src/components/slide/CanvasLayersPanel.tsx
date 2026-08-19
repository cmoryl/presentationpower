import { useMemo, useState } from "react";

import type { CanvasBlock } from "@/lib/deck-store";

/**
 * Layers panel for the Studio canvas.
 *
 * Shows every canvas object AND every adopted module section on this slide in
 * paint order (top of the stack first, like PowerPoint's Selection Pane), and
 * lets the user reorder by drag, lock, hide, select and group them without
 * having to hit small artwork on the stage.
 */

function labelFor(b: CanvasBlock): string {
  const text = (b.text ?? "").replace(/\s+/g, " ").trim();
  if (b.kind === "image") return b.alt?.trim() || "Image";
  if (b.kind === "shape") return "Shape";
  return text ? (text.length > 34 ? `${text.slice(0, 34)}…` : text) : b.kind;
}

function iconFor(b: CanvasBlock): string {
  if (b.sourceSelector) return "✥";
  if (b.kind === "image") return "▣";
  if (b.kind === "shape") return "◇";
  return "T";
}

export function CanvasLayersPanel({
  blocks,
  selected,
  accent,
  onSelect,
  onSetHidden,
  onSetLocked,
  onSetExportExcluded,
  onExportSelectionOnly,
  onMoveBefore,
  onGroup,
  onUngroup,
  onClose,
  size = "compact",
}: {
  /** Paint order, bottom-most first (suppressed blocks already removed). */
  blocks: readonly CanvasBlock[];
  selected: readonly string[];
  accent: string;
  onSelect: (ids: readonly string[], additive: boolean) => void;
  onSetHidden: (ids: readonly string[], hidden: boolean) => void;
  onSetLocked: (ids: readonly string[], locked: boolean) => void;
  /** Keep a layer on screen but drop it from the PPTX export. */
  onSetExportExcluded: (ids: readonly string[], excluded: boolean) => void;
  /**
   * Scope the PPTX export to the current selection (every other layer becomes
   * export-excluded); called with `false` to put every layer back in scope.
   */
  onExportSelectionOnly: (only: boolean) => void;
  /**
   * Move `ids` so they sit directly below `beforeId` in paint order
   * (`beforeId: null` = send to the very top of the stack).
   */
  onMoveBefore: (ids: readonly string[], beforeId: string | null) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onClose: () => void;
  /**
   * "studio" is used when the panel is docked into a full-height rail (the
   * enlarged editor): roomier rows, bigger type, easier hit targets.
   */
  size?: "compact" | "studio";
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Top of the stack reads first, matching what the eye sees on the slide.
  const rows = useMemo(() => [...blocks].reverse(), [blocks]);
  const groupMembers = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of blocks) if (b.groupId) m.set(b.groupId, (m.get(b.groupId) ?? 0) + 1);
    return m;
  }, [blocks]);

  const studio = size === "studio";
  const headText = studio ? "text-[11px]" : "text-[10px]";
  const rowText = studio ? "text-[13px]" : "text-[11px]";
  const rowPad = studio ? "px-3 py-1.5" : "px-2 py-1";
  const iconBtn = studio
    ? "rounded-md px-1.5 py-1 text-[13px] hover:bg-muted"
    : "rounded px-1 hover:bg-muted";

  const anyExcluded = useMemo(() => blocks.some((b) => b.exportExcluded), [blocks]);

  const dragIds = (id: string) => (selectedSet.has(id) ? selected : [id]);

  return (
    <div
      className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`flex items-center justify-between border-b border-border px-3 font-semibold uppercase tracking-widest ${headText} ${
          studio ? "py-3" : "py-2"
        }`}
      >
        <span>{studio ? `Slide layers · ${rows.length}` : `Layers (${rows.length})`}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layers panel"
          className="rounded-full px-1.5 hover:bg-muted"
        >
          ✕
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-1" aria-label="Slide layers">
        {rows.length === 0 && (
          <li className="px-3 py-3 text-[11px] opacity-60">
            No objects yet — add one, or “pick from module” to make a section movable.
          </li>
        )}
        {rows.map((b) => {
          const isSel = selectedSet.has(b.id);
          const isOver = overId === b.id && dragId !== b.id;
          return (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDragId(b.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(b.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== b.id) onMoveBefore(dragIds(dragId), b.id);
                setDragId(null);
                setOverId(null);
              }}
              className={`flex items-center gap-1 ${rowPad} ${rowText} ${
                isOver ? "border-t border-dashed" : ""
              }`}
              style={{
                background: isSel ? `${accent}33` : undefined,
                borderTopColor: isOver ? accent : undefined,
              }}
            >
              <button
                type="button"
                onClick={(e) => onSelect([b.id], e.shiftKey || e.metaKey)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-muted"
                style={{ opacity: b.hidden ? 0.45 : 1 }}
                title={`Select ${labelFor(b)}`}
              >
                <span className="w-3 shrink-0 opacity-70">{iconFor(b)}</span>
                <span className="truncate">{labelFor(b)}</span>
                {b.groupId && (
                  <span className="shrink-0 rounded-full bg-muted px-1 text-[9px] uppercase">
                    g{groupMembers.get(b.groupId) ?? 1}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-pressed={!!b.hidden}
                aria-label={b.hidden ? `Show ${labelFor(b)}` : `Hide ${labelFor(b)}`}
                title={b.hidden ? "Show on the slide" : "Hide on the slide (and in export)"}
                onClick={() => onSetHidden([b.id], !b.hidden)}
                className={iconBtn}
              >
                {b.hidden ? "◌" : "◉"}
              </button>
              <button
                type="button"
                aria-pressed={!b.exportExcluded}
                aria-label={
                  b.exportExcluded
                    ? `Include ${labelFor(b)} in export`
                    : `Exclude ${labelFor(b)} from export`
                }
                title={
                  b.exportExcluded
                    ? "Excluded from PowerPoint export — click to include"
                    : "Included in PowerPoint export — click to exclude"
                }
                onClick={() => onSetExportExcluded([b.id], !b.exportExcluded)}
                className={iconBtn}
                style={{ opacity: b.exportExcluded ? 0.5 : 1 }}
              >
                {b.exportExcluded ? "⃠" : "⇩"}
              </button>
              <button
                type="button"
                aria-pressed={!!b.locked}
                aria-label={b.locked ? `Unlock ${labelFor(b)}` : `Lock ${labelFor(b)}`}
                title={b.locked ? "Unlock position" : "Lock position"}
                onClick={() => onSetLocked([b.id], !b.locked)}
                className={iconBtn}
              >
                {b.locked ? "🔒" : "🔓"}
              </button>
            </li>
          );
        })}
      </ul>

      <div
        className={`flex flex-wrap items-center gap-1 border-t border-border font-semibold uppercase tracking-widest ${headText} ${
          studio ? "px-3 py-3" : "px-2 py-1.5"
        }`}
      >
        <button
          type="button"
          disabled={selected.length < 2}
          onClick={onGroup}
          className={`rounded-full hover:bg-muted disabled:opacity-30 ${studio ? "px-3 py-1" : "px-2"}`}
        >
          group
        </button>
        <button
          type="button"
          disabled={!selected.length}
          onClick={onUngroup}
          className={`rounded-full hover:bg-muted disabled:opacity-30 ${studio ? "px-3 py-1" : "px-2"}`}
        >
          ungroup
        </button>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => onMoveBefore(selected, null)}
          title="Bring selection to the front of the stack"
          className={`rounded-full hover:bg-muted disabled:opacity-30 ${studio ? "px-3 py-1" : "px-2"}`}
        >
          ⤒ front
        </button>
        <button
          type="button"
          disabled={!selected.length}
          onClick={() => onExportSelectionOnly(true)}
          title="Export only the selected layers to PowerPoint (grouped layers ship as one slide group)"
          className={`rounded-full hover:bg-muted disabled:opacity-30 ${studio ? "px-3 py-1" : "px-2"}`}
        >
          ⇩ selection only
        </button>
        <button
          type="button"
          disabled={!anyExcluded}
          onClick={() => onExportSelectionOnly(false)}
          title="Put every layer back in the export"
          className={`rounded-full hover:bg-muted disabled:opacity-30 ${studio ? "px-3 py-1" : "px-2"}`}
        >
          ⇩ all
        </button>
      </div>
    </div>
  );
}
