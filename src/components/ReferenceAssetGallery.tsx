import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReferenceAsset } from "@/components/ReferenceAssetUploader";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(a: ReferenceAsset) {
  return a.mimeType === "application/pdf";
}

/**
 * Visual confirmation surface for attached reference files: large thumbnails,
 * PDF page previews, and a lightbox with page-by-page navigation so the user
 * can verify the right brand files before kicking off generation.
 */
export function ReferenceAssetGallery({ assets }: { assets: ReferenceAsset[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const active = openIndex === null ? null : (assets[openIndex] ?? null);
  const pageCount = active && isPdf(active) ? Math.max(1, active.pages ?? 1) : 1;

  useEffect(() => {
    setPage(1);
  }, [openIndex]);

  // Close the lightbox if the underlying asset disappears (removed/replaced).
  useEffect(() => {
    if (openIndex !== null && openIndex >= assets.length) setOpenIndex(null);
  }, [assets.length, openIndex]);

  const totals = useMemo(() => {
    const pdfPages = assets.filter(isPdf).reduce((n, a) => n + (a.pages ?? 1), 0);
    const images = assets.filter((a) => !isPdf(a)).length;
    return { pdfPages, images };
  }, [assets]);

  if (!assets.length) return null;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">
          Reference gallery
        </div>
        <div className="text-[10px] text-black/40">
          {totals.images ? `${totals.images} image${totals.images > 1 ? "s" : ""}` : null}
          {totals.images && totals.pdfPages ? " · " : null}
          {totals.pdfPages ? `${totals.pdfPages} PDF page${totals.pdfPages > 1 ? "s" : ""}` : null}
        </div>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {assets.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Preview reference ${i + 1}: ${a.name}`}
              className="group block w-full overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-[#003FC7]/50 hover:shadow-[0_6px_20px_-12px_rgba(0,63,199,0.55)]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/[0.04]">
                {isPdf(a) ? (
                  <>
                    <iframe
                      src={`${a.dataUrl}#page=1&toolbar=0&navpanes=0&view=FitH`}
                      title={`First page of ${a.name}`}
                      className="pointer-events-none h-full w-full"
                    />
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-black/60">
                      <FileText className="h-3 w-3 text-icon-muted" aria-hidden />
                      PDF{a.pages ? ` · ${a.pages}p` : ""}
                    </span>
                  </>
                ) : (
                  <img
                    src={a.dataUrl}
                    alt={`Reference ${i + 1}: ${a.name}`}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute right-1.5 top-1.5 rounded-md bg-black/55 p-1 opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3 text-white" aria-hidden />
                </span>
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">
                  {i + 1}
                </span>
              </div>
              <div className="px-2 py-1.5">
                <div className="truncate text-[11px] font-medium text-[#03002C]">{a.name}</div>
                <div className="text-[10px] text-black/45">{formatBytes(a.size)}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={openIndex !== null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate text-base">{active?.name ?? "Reference"}</DialogTitle>
            <DialogDescription className="text-xs">
              {active
                ? `${isPdf(active) ? "PDF" : "Image"} · ${formatBytes(active.size)}${
                    isPdf(active) && active.pages ? ` · ${active.pages} pages` : ""
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="rounded-xl border border-black/10 bg-black/[0.03] p-2">
              {isPdf(active) ? (
                <iframe
                  key={`${active.id}-${page}`}
                  src={`${active.dataUrl}#page=${page}&toolbar=0&navpanes=0&view=FitH`}
                  title={`${active.name} page ${page}`}
                  className="h-[60vh] w-full rounded-lg bg-white"
                />
              ) : (
                <img
                  src={active.dataUrl}
                  alt={active.name}
                  className="mx-auto max-h-[60vh] w-auto rounded-lg object-contain"
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {active && isPdf(active) && pageCount > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="rounded-lg border border-black/15 p-1.5 text-icon-muted transition hover:text-icon disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <span className="text-[11px] tabular-nums text-black/55">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  aria-label="Next page"
                  className="rounded-lg border border-black/15 p-1.5 text-icon-muted transition hover:text-icon disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={openIndex === null || openIndex === 0}
                onClick={() => setOpenIndex((i) => (i === null ? i : Math.max(0, i - 1)))}
                className="rounded-lg border border-black/15 px-2.5 py-1.5 text-[11px] font-semibold text-black/65 transition hover:border-black/35 hover:text-black disabled:opacity-30"
              >
                Previous file
              </button>
              <button
                type="button"
                disabled={openIndex === null || openIndex >= assets.length - 1}
                onClick={() =>
                  setOpenIndex((i) => (i === null ? i : Math.min(assets.length - 1, i + 1)))
                }
                className="rounded-lg border border-black/15 px-2.5 py-1.5 text-[11px] font-semibold text-black/65 transition hover:border-black/35 hover:text-black disabled:opacity-30"
              >
                Next file
              </button>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close preview"
                className="rounded-lg border border-black/15 p-1.5 text-icon-muted transition hover:text-icon"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
