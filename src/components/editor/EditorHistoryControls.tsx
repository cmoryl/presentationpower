/**
 * Shared undo / redo control pair for every editing surface.
 *
 * The deck editor wraps this with its own store bindings
 * (`UndoRedoControls`); the canvas-based studios pass their history stack in
 * directly. Keeping one component means the glyphs, hit area, tooltips and
 * shortcut hints are identical wherever history exists — previously the studios
 * had keyboard-only undo with no visible affordance at all.
 */
export function EditorHistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoLabel,
  redoLabel,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Optional name of the step, e.g. "layout swap". */
  undoLabel?: string | null;
  redoLabel?: string | null;
}) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-black/70 transition hover:bg-black/[0.05] hover:text-black disabled:cursor-not-allowed disabled:text-black/25 disabled:hover:bg-transparent dark:text-white/70 dark:hover:bg-white/[0.06] dark:hover:text-white";

  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title={`${undoLabel ? `Undo ${undoLabel}` : "Undo"} (${isMac ? "⌘" : "Ctrl"}+Z)`}
        aria-label={undoLabel ? `Undo ${undoLabel}` : "Undo"}
        className={btn}
      >
        <span aria-hidden className="text-base leading-none">
          ↶
        </span>
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title={`${redoLabel ? `Redo ${redoLabel}` : "Redo"} (${isMac ? "⌘⇧" : "Ctrl+Shift"}+Z)`}
        aria-label={redoLabel ? `Redo ${redoLabel}` : "Redo"}
        className={btn}
      >
        <span aria-hidden className="text-base leading-none">
          ↷
        </span>
      </button>
    </div>
  );
}
