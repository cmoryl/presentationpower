// Live "what PowerPoint will show" preview for print → PPTX exports.
//
// The exporter captures each `[data-print-page]` node at its own aspect ratio
// and letterboxes it, centered, on a white trim-sized slide. This preview does
// exactly the same math with a live DOM clone of each page, so what you see
// here is the page geometry the .pptx will carry — including any letterbox
// bands top/bottom or left/right.

import { useEffect, useMemo, useRef } from "react";

import { X } from "lucide-react";
import { PRINT_PAGE_PRESETS } from "@/lib/print-asset-export";

const SLIDE_W = 320; // preview slide width in px

function trimOf(pageSize: string): { widthIn: number; heightIn: number } {
  const presets = PRINT_PAGE_PRESETS as Record<string, { widthIn: number; heightIn: number }>;
  return presets[pageSize] ?? { widthIn: 8.5, heightIn: 11 };
}

function PagePreview({
  node,
  label,
  slideW,
  slideH,
}: {
  node: HTMLElement;
  label: string;
  slideW: number;
  slideH: number;
}) {
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const rect = node.getBoundingClientRect();
    const nodeRatio = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;

    // Same letterbox fit the exporter uses.
    let w = slideW;
    let h = slideW / nodeRatio;
    if (h > slideH) {
      h = slideH;
      w = slideH * nodeRatio;
    }
    const scale = rect.width > 0 ? w / rect.width : 1;

    const clone = node.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.style.transform = `scale(${scale})`;
    clone.style.transformOrigin = "top left";
    clone.style.width = `${rect.width}px`;
    clone.style.pointerEvents = "none";
    // Drop authoring affordances from the clone, mirroring export suppression.
    clone.querySelectorAll("[data-export-ignore]").forEach((el) => el.remove());

    holder.replaceChildren(clone);
    holder.style.width = `${w}px`;
    holder.style.height = `${h}px`;
    return () => holder.replaceChildren();
  }, [node, slideW, slideH]);

  return (
    <figure className="m-0">
      <div
        className="relative overflow-hidden rounded-md border border-black/10 bg-white shadow-sm"
        style={{ width: slideW, height: slideH }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div ref={holderRef} className="overflow-hidden" />
        </div>
      </div>
      <figcaption className="mt-1.5 truncate text-[11px] text-[#666]">{label}</figcaption>
    </figure>
  );
}

export function PptxLayoutPreview({
  nodes,
  labels,
  pageSize,
  onClose,
}: {
  nodes: HTMLElement[];
  labels: string[];
  pageSize: string;
  onClose: () => void;
}) {
  const { widthIn, heightIn } = useMemo(() => trimOf(pageSize), [pageSize]);
  const slideH = Math.round((SLIDE_W * heightIn) / widthIn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-[#03002C]/70 backdrop-blur-sm"
      data-export-ignore="true"
      role="dialog"
      aria-modal="true"
      aria-label="PowerPoint layout preview"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-5 py-3 text-white">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-70">
            PowerPoint layout preview
          </p>
          <h2 className="text-sm font-medium">
            {nodes.length} slide{nodes.length === 1 ? "" : "s"} · {widthIn}×{heightIn}in page
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10"
        >
          <X size={13} aria-hidden /> Close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        {nodes.length === 0 ? (
          <p className="text-sm text-white/80">No pages selected.</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {nodes.map((n, i) => (
              <PagePreview
                key={i}
                node={n}
                label={labels[i] ?? `Slide ${i + 1}`}
                slideW={SLIDE_W}
                slideH={slideH}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
