// Drag handle + keyboard controls shared by the slide editor list panels. Rows
// are dragged with the native HTML5 drag events; arrow keys on a focused handle
// nudge the row so the control stays reachable without a pointer.

import { useState, type ReactNode } from "react";
import { canMoveDown, canMoveUp, moveItem } from "@/lib/reorder";

export function useReorder<T>(
  items: readonly T[],
  onChange: (next: T[]) => void,
  /** Optional custom move, e.g. keeping ring placements bound to their slot. */
  reorderFn: (items: readonly T[], from: number, to: number) => T[] = moveItem,
) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to > items.length - 1 || from === to) return;
    onChange(reorderFn(items, from, to));
  };

  const drop = (to: number) => {
    if (dragging !== null) move(dragging, to);
    setDragging(null);
    setOver(null);
  };

  return {
    dragging,
    over,
    /** Props for the row container. */
    rowProps: (index: number) => ({
      draggable: dragging === index,
      onDragOver: (e: React.DragEvent) => {
        if (dragging === null) return;
        e.preventDefault();
        setOver(index);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        drop(index);
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
      "data-dragging": dragging === index ? "" : undefined,
      "data-drop-target": over === index && dragging !== index ? "" : undefined,
    }),
    /** Props for the handle inside the row. */
    handleProps: (index: number, label: string) => ({
      onPointerDown: () => setDragging(index),
      onDragStart: (e: React.DragEvent) => {
        setDragging(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp" && canMoveUp(index)) {
          e.preventDefault();
          move(index, index - 1);
        } else if (e.key === "ArrowDown" && canMoveDown(index, items.length)) {
          e.preventDefault();
          move(index, index + 1);
        }
      },
      "aria-label": `${label} — drag to reorder, or use the arrow keys`,
      title: "Drag to reorder",
    }),
    moveUpRow: (index: number) => move(index, index - 1),
    moveDownRow: (index: number) => move(index, index + 1),
  };
}

export function ReorderHandle({
  children,
  ...rest
}: React.ComponentPropsWithoutRef<"button"> & { children?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-[13px] leading-none text-black/35 transition hover:text-[#003FC7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7] active:cursor-grabbing"
    >
      {children ?? "⠿"}
    </button>
  );
}

export function ReorderNudge({
  onUp,
  onDown,
  upDisabled,
  downDisabled,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  upDisabled: boolean;
  downDisabled: boolean;
  label: string;
}) {
  const cls =
    "h-5 w-5 rounded border border-black/10 text-[10px] leading-none text-black/55 transition enabled:hover:border-[#003FC7] enabled:hover:text-[#003FC7] disabled:opacity-30";
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={onUp}
        disabled={upDisabled}
        aria-label={`Move ${label} earlier`}
        className={cls}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={downDisabled}
        aria-label={`Move ${label} later`}
        className={cls}
      >
        ↓
      </button>
    </span>
  );
}
