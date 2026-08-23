import { useEffect } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { EditorHistoryControls } from "@/components/editor/EditorHistoryControls";

/**
 * Session-scoped undo/redo toolbar + keyboard shortcuts for the deck editor.
 * Bounded history (50 entries) lives in the deck store; this component is
 * pure wiring for Ctrl/Cmd-Z and Ctrl/Cmd-Shift-Z.
 */
export function UndoRedoControls() {
  const undo = useDeckStore((s) => s.undo);
  const redo = useDeckStore((s) => s.redo);
  const pastLen = useDeckStore((s) => s._past.length);
  const futureLen = useDeckStore((s) => s._future.length);
  const canUndo = pastLen > 0;
  const canRedo = futureLen > 0;
  // Labelled history: layout swaps and AI refits name themselves, so the
  // tooltip tells the user exactly what a click will revert.
  const undoLabel = useDeckStore((s) => s._past[s._past.length - 1]?.label ?? null);
  const redoLabel = useDeckStore((s) => s._future[s._future.length - 1]?.label ?? null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Let the browser handle undo inside inputs/textareas/contentEditable
      // — those maintain their own field-level history and the deck-store
      // only tracks committed values.
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return (
    <EditorHistoryControls
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={() => undo()}
      onRedo={() => redo()}
      undoLabel={undoLabel}
      redoLabel={redoLabel}
    />
  );
}
