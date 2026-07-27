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
    <div className="inline-flex items-center">
      <button
        type="button"
        onClick={() => undo()}
        disabled={!canUndo}
        title={`Undo (${navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Z)`}
        aria-label="Undo"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/70 transition hover:bg-black/[0.05] hover:text-black disabled:cursor-not-allowed disabled:text-black/25 disabled:hover:bg-transparent dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        <span aria-hidden className="text-base leading-none">
          ↶
        </span>
      </button>
      <button
        type="button"
        onClick={() => redo()}
        disabled={!canRedo}
        title={`Redo (${navigator.platform.includes("Mac") ? "⌘⇧" : "Ctrl+Shift"}+Z)`}
        aria-label="Redo"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/70 transition hover:bg-black/[0.05] hover:text-black disabled:cursor-not-allowed disabled:text-black/25 disabled:hover:bg-transparent dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        <span aria-hidden className="text-base leading-none">
          ↷
        </span>
      </button>
    </div>
  );
}
