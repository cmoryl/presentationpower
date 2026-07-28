/**
 * Portal modal for swapping a print-canvas icon. Opened by clicking any
 * glyph on the canvas in the print editor. Renders into document.body so it
 * escapes the canvas' transform/overflow context.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ICON_PATHS, type IconName } from "./print-primitives";

const NAMES = Object.keys(ICON_PATHS) as IconName[];

export function PrintIconSwapModal({
  open,
  current,
  onSelect,
  onReset,
  onClose,
}: {
  open: boolean;
  current: IconName | null;
  onSelect: (name: IconName) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change icon"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#0B0A2A]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#03002C] dark:text-white">Change icon</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {NAMES.map((n) => (
            <button
              key={n}
              type="button"
              title={n.replace(/-/g, " ")}
              aria-label={n.replace(/-/g, " ")}
              aria-pressed={current === n}
              onClick={() => {
                onSelect(n);
                onClose();
              }}
              className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                current === n
                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                  : "border-black/10 text-black/60 hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={ICON_PATHS[n]} />
              </svg>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            onReset();
            onClose();
          }}
          className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-xs text-black/60 transition hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
        >
          Reset to template default
        </button>
      </div>
    </div>,
    document.body,
  );
}
