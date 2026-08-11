import { useCallback, useRef, useState } from "react";

/**
 * Linear undo/redo history for a single editable value (the Slide Studio draft).
 *
 * The editor is the source of truth for "current"; this hook only remembers
 * snapshots either side of it. Call `push(previous, label)` right before you
 * apply a change, then `undo(current)` / `redo(current)` return the value the
 * editor should adopt (or `null` when there is nothing to do).
 *
 * Consecutive edits that share a coalesce key inside `coalesceMs` collapse into
 * one restore point so typing a sentence is a single undo, not one per keypress.
 */
export type UndoEntry<T> = { value: T; label: string };

export function useUndoHistory<T>(opts?: { limit?: number; coalesceMs?: number }) {
  const limit = opts?.limit ?? 60;
  const coalesceMs = opts?.coalesceMs ?? 600;

  const past = useRef<UndoEntry<T>[]>([]);
  const future = useRef<UndoEntry<T>[]>([]);
  const lastPush = useRef<{ key: string; at: number } | null>(null);
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  /** Remember `previous` as a restore point. `coalesceKey` groups rapid edits. */
  const push = useCallback(
    (previous: T, label = "Edit", coalesceKey?: string) => {
      const now = Date.now();
      const grouped =
        coalesceKey !== undefined &&
        lastPush.current?.key === coalesceKey &&
        now - lastPush.current.at < coalesceMs &&
        past.current.length > 0;
      lastPush.current = coalesceKey === undefined ? null : { key: coalesceKey, at: now };
      future.current = [];
      if (grouped) {
        // Keep the older snapshot; just refresh its label + timer.
        past.current[past.current.length - 1] = {
          value: past.current[past.current.length - 1].value,
          label,
        };
        bump();
        return;
      }
      past.current = [...past.current, { value: previous, label }].slice(-limit);
      bump();
    },
    [coalesceMs, limit],
  );

  const undo = useCallback((current: T): UndoEntry<T> | null => {
    const entry = past.current[past.current.length - 1];
    if (!entry) return null;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, { value: current, label: entry.label }];
    lastPush.current = null;
    bump();
    return entry;
  }, []);

  const redo = useCallback((current: T): UndoEntry<T> | null => {
    const entry = future.current[future.current.length - 1];
    if (!entry) return null;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, { value: current, label: entry.label }].slice(-limit);
    lastPush.current = null;
    bump();
    return entry;
  }, [limit]);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    lastPush.current = null;
    bump();
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undoLabel: past.current[past.current.length - 1]?.label ?? null,
    redoLabel: future.current[future.current.length - 1]?.label ?? null,
    depth: past.current.length,
    /** Changes whenever the stacks move; useful as a render key. */
    version,
  };
}
