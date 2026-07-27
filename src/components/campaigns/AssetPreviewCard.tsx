// Clickable preview card for the /social/demo and /events/demo "Live preview"
// galleries. Each card renders a scaled SocialRenderer; clicking (or Enter)
// opens a modal that displays the same asset at a much larger size so the
// user can inspect copy, brand tokens, and layout without leaving the demo.
//
// Kept intentionally lightweight — reuses SocialRenderer with a bigger
// `displayShortEdge` inside the modal rather than exporting to an image.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SocialRenderer, type SocialRendererProps } from "@/components/campaigns/SocialRenderer";
import { useModalA11y } from "@/hooks/use-modal-a11y";

type Props = {
  rendererProps: Omit<SocialRendererProps, "displayShortEdge">;
  formatLabel: string;
  formatWidth: number;
  formatHeight: number;
  mode: string;
  thumbShortEdge?: number;
};

export function AssetPreviewCard({
  rendererProps,
  formatLabel,
  formatWidth,
  formatHeight,
  mode,
  thumbShortEdge = 220,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${formatLabel} at full size`}
        className="group flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-black/10 bg-white/70 p-3 text-left transition hover:border-[#003FC7]/50 hover:shadow-[0_10px_30px_-14px_rgba(3,0,44,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
      >
        <div className="relative flex w-full min-w-0 justify-center overflow-hidden rounded-xl bg-white/40 p-2">
          <AssetPreviewFrame
            width={formatWidth}
            height={formatHeight}
            maxShortEdge={thumbShortEdge}
          >
            {(displayShortEdge) => (
              <div className="flex justify-center">
                <SocialRenderer {...rendererProps} displayShortEdge={displayShortEdge} />
              </div>
            )}
          </AssetPreviewFrame>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#03002C]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            View full
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2 px-1 text-[11px]">
          <span className="truncate font-semibold text-[#03002C]">{formatLabel}</span>
          <span className="shrink-0 text-black/50">
            {formatWidth}×{formatHeight} · {mode}
          </span>
        </div>
      </button>
      {open ? (
        <AssetPreviewModal
          onClose={() => setOpen(false)}
          rendererProps={rendererProps}
          formatLabel={formatLabel}
          formatWidth={formatWidth}
          formatHeight={formatHeight}
          mode={mode}
        />
      ) : null}
    </>
  );
}

function AssetPreviewModal({
  onClose,
  rendererProps,
  formatLabel,
  formatWidth,
  formatHeight,
  mode,
}: {
  onClose: () => void;
  rendererProps: Omit<SocialRendererProps, "displayShortEdge">;
  formatLabel: string;
  formatWidth: number;
  formatHeight: number;
  mode: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: ref });

  // Fit the renderer inside the viewport: cap the short edge to ~78% of the
  // smaller viewport dimension, leaving room for the header + padding.
  const [shortEdge, setShortEdge] = useState<number>(720);
  useEffect(() => {
    function recompute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight - 120; // header + padding
      const shortViewport = Math.min(vw, vh);
      // Preserve the aspect: shrink the short edge if the long edge would overflow.
      const short = Math.min(formatWidth, formatHeight);
      const long = Math.max(formatWidth, formatHeight);
      const longLimit = Math.max(vw, vh) - 160;
      const maxShortFromLong = (longLimit * short) / long;
      const next = Math.max(240, Math.min(shortViewport * 0.78, maxShortFromLong, 1080));
      setShortEdge(Math.floor(next));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [formatWidth, formatHeight]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#03002C]/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-preview-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full max-w-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <div id="asset-preview-title" className="text-sm font-semibold text-[#03002C]">
              {formatLabel}
            </div>
            <div className="text-[11px] text-black/55">
              {formatWidth}×{formatHeight} · {mode}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-icon-muted transition hover:bg-black/5 hover:text-[#03002C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center overflow-auto rounded-xl bg-[#F2F2F2] p-4">
          <SocialRenderer {...rendererProps} displayShortEdge={shortEdge} />
        </div>
      </div>
    </div>
  );
}
