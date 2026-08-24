// Rendered page gallery for the print demo landing pages.
//
// Print layouts are container-query based, so rendering the real layout inside
// a small box scales it faithfully — no separate preview code path. Every demo
// page therefore shows a finished comp of every page, click to enlarge.

import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

import { LazyMount } from "@/components/LazyMount";
import { PrintKindPreview } from "@/components/print/PrintKindPreview";
import { PrintPageProvider } from "@/components/print/print-page-context";
import { PrintContentFitFrame } from "@/components/print/PrintContentFitFrame";
import { PrintDocModeProvider, resolvePrintIconStyle } from "@/components/print/print-doc-mode";
import { isMultiProposal } from "@/components/print/MultiProposalLayout";
import { multiPageLabel } from "@/components/print/MultiProposalLayout";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintMode,
  PrintPageSize,
  SolutionProposalContent,
} from "@/lib/print-assets.types";
import type { BrandMode } from "@/lib/taxonomy";

type Props = {
  kind: PrintAssetKind;
  content: unknown;
  brand: BrandMode;
  mode?: PrintMode;
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  accent?: string;
  /** Auto-fit content to the trim (margin relief, then uniform scale). */
  fit?: boolean;
};

function Page({
  kind,
  content,
  brand,
  mode = "light",
  pageSize = "Letter",
  density = "standard",
  pageIndex,
  fit = false,
}: Props & { pageIndex?: number }) {
  const page = (
    <div className="pointer-events-none">
      <PrintKindPreview
        kind={kind}
        content={content}
        brand={brand}
        mode={mode}
        pageSize={pageSize}
        density={density}
        {...(typeof pageIndex === "number" ? { pageIndex } : {})}
      />
    </div>
  );
  return (
    <PrintPageProvider size={pageSize} margin="standard" density={density}>
      <PrintDocModeProvider icons iconStyle={resolvePrintIconStyle({ scale: 1 })}>
        {fit ? (
          <PrintContentFitFrame
            settings={{ enabled: true }}
            dep={{ content, pageSize, density, pageIndex }}
          >
            {page}
          </PrintContentFitFrame>
        ) : (
          page
        )}
      </PrintDocModeProvider>
    </PrintPageProvider>
  );
}

export function ShowcasePrintGallery(props: Props) {
  const { content, accent } = props;
  const [open, setOpen] = useState<number | null>(null);

  const proposal = content as SolutionProposalContent | undefined;
  const multi =
    props.kind === "solution-proposal" && proposal && isMultiProposal(proposal)
      ? (proposal.pages ?? [])
      : null;

  const entries: { label: string; pageIndex?: number }[] = multi?.length
    ? multi.map((p, i) => ({ label: multiPageLabel(p, i), pageIndex: i }))
    : [{ label: "Full piece" }];

  const lightbox =
    open !== null && entries[open] && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${entries[open].label} preview`}
            className="fixed inset-0 z-[130] flex items-start justify-center overflow-auto bg-[#03002C]/85 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setOpen(null)}
          >
            <div
              className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 truncate text-sm font-semibold text-[#03002C]">
                  {open + 1}. {entries[open].label}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="Close page preview"
                  className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-[#03002C] hover:bg-black/5"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
              <Page
                {...props}
                {...(entries[open].pageIndex !== undefined
                  ? { pageIndex: entries[open].pageIndex }
                  : {})}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div>
      {lightbox}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((e, i) => (
          <li key={`${e.label}-${i}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Enlarge ${e.label}`}
              className="group relative block w-full overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-sm transition hover:shadow-md"
            >
              <LazyMount placeholder={<div className="aspect-[8.5/11] w-full bg-black/5" />}>
                <Page
                  {...props}
                  {...(e.pageIndex !== undefined ? { pageIndex: e.pageIndex } : {})}
                />
              </LazyMount>
              <span
                // Bottom-left: the page number must never cover the piece's headline.
                className="absolute bottom-2 left-2 grid h-6 w-6 place-items-center rounded-lg text-[11px] font-semibold text-white shadow-sm"
                style={{ background: accent ?? "#003FC7" }}
              >
                {i + 1}
              </span>
              <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-[#03002C] opacity-0 transition group-hover:opacity-100">
                <Maximize2 size={12} strokeWidth={1.75} />
              </span>
            </button>
            <span className="mt-1 block truncate text-[11px] font-medium text-black/60 dark:text-white/60">
              {i + 1}. {e.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
