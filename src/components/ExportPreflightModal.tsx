// Lightweight modal shown before PPTX export when preflight detects
// export-risk issues (primarily pasted image URLs that will fail CORS
// fetch in the exporter). Users can jump to an affected slide, cancel,
// or export anyway.

import type { PreflightIssue } from "@/lib/export-preflight";

export function ExportPreflightModal({
  open,
  issues,
  busy,
  onCancel,
  onExportAnyway,
  onJumpToSlide,
}: {
  open: boolean;
  issues: PreflightIssue[];
  busy?: boolean;
  onCancel: () => void;
  onExportAnyway: () => void;
  onJumpToSlide?: (slideId: string) => void;
}) {
  if (!open) return null;
  const corsCount = issues.filter((i) => i.kind === "cors-image").length;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl border border-white/15 bg-white text-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-black/10 px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-amber-700">
            Export preflight
          </div>
          <h2 className="mt-1 text-xl font-semibold">
            {issues.length} {issues.length === 1 ? "issue" : "issues"} may affect this export
          </h2>
          {corsCount > 0 && (
            <p className="mt-1 text-sm text-black/60">
              {corsCount} pasted image {corsCount === 1 ? "URL" : "URLs"} likely won't embed in the .pptx.
              Re-upload via the imagery panel to guarantee fidelity — pasted URLs work in the editor
              but many hosts block cross-origin fetches PowerPoint needs.
            </p>
          )}
        </header>

        <ul className="max-h-[320px] space-y-2 overflow-y-auto px-6 py-4">
          {issues.map((issue) => (
            <li
              key={`${issue.slideId}-${issue.kind}`}
              className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{issue.message}</div>
                  {issue.detail && (
                    <div className="mt-0.5 truncate text-xs text-black/50" title={issue.detail}>
                      {issue.detail}
                    </div>
                  )}
                </div>
                {onJumpToSlide && (
                  <button
                    type="button"
                    onClick={() => onJumpToSlide(issue.slideId)}
                    className="shrink-0 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest hover:border-[#003FC7] hover:text-[#003FC7]"
                  >
                    Jump
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <footer className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs uppercase tracking-widest hover:border-black/30 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExportAnyway}
            disabled={busy}
            className="rounded-full bg-[#003FC7] px-4 py-2 text-xs uppercase tracking-widest text-white hover:bg-[#03002C] disabled:opacity-40"
          >
            {busy ? "Exporting…" : "Export anyway"}
          </button>
        </footer>
      </div>
    </div>
  );
}
