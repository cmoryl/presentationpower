import { useEffect } from "react";
import { useDeckStore } from "@/lib/deck-store";

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
    <div className="flex items-center gap-1 rounded-full border border-black/15 bg-white px-1 py-1">
      <button
        type="button"
        onClick={() => undo()}
        disabled={!canUndo}
        title={`Undo (${navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Z)`}
        aria-label="Undo"
        className="rounded-full px-2.5 py-1 text-sm text-black/70 hover:bg-black/5 disabled:cursor-not-allowed disabled:text-black/25"
      >
        ↶
      </button>
      <div className="h-4 w-px bg-black/10" />
      <button
        type="button"
        onClick={() => redo()}
        disabled={!canRedo}
        title={`Redo (${navigator.platform.includes("Mac") ? "⌘⇧" : "Ctrl+Shift"}+Z)`}
        aria-label="Redo"
        className="rounded-full px-2.5 py-1 text-sm text-black/70 hover:bg-black/5 disabled:cursor-not-allowed disabled:text-black/25"
      >
        ↷
      </button>
    </div>
  );
}
