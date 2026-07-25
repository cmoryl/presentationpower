// Lightweight reusable confirmation modal. Mirrors the accessibility and
// visual patterns of ExportPreflightModal but trimmed for a simple
// confirm/cancel choice.

import { useRef, type ReactNode } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy,
  danger,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: onCancel, containerRef: dialogRef });
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-white text-black shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-black/10 px-6 py-5">
          <h2 id="confirm-modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-black/60">{description}</p>}
        </header>

        <footer className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs uppercase tracking-widest hover:border-black/30 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-40 ${
              danger
                ? "bg-[#E53D2E] hover:bg-[#c23022]"
                : "bg-[#003FC7] hover:bg-[#03002C]"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
