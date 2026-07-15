import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { exportDeckToPptx } from "@/lib/pptx-export";


export const Route = createFileRoute("/decks/$deckId/export")({
  head: () => ({ meta: [{ title: "Export · TransPerfect Modular" }] }),
  component: ExportView,
});

function ExportView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];

  useEffect(() => {
    document.body.classList.add("export-mode");
    return () => document.body.classList.remove("export-mode");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 py-12 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 1920px 1080px; margin: 0; }
          .no-print { display: none !important; }
          .print-page { break-after: page; page-break-after: always; }
        }
      `}</style>

      <div className="no-print mx-auto mb-8 flex max-w-[1200px] items-center justify-between px-6">
        <div>
          <Link to="/decks/$deckId" params={{ deckId }} className="text-xs uppercase tracking-widest text-black/50 hover:text-black">
            ← Back to editor
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Export · {deck.title}</h1>
          <p className="mt-1 text-sm text-black/60">
            Use your browser's print dialog to save as PDF. Choose landscape and disable headers/footers for a clean export.
            Native PPTX export lands in phase 3.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-6 px-6 print:max-w-none print:gap-0 print:p-0">
        {deck.slides.map((slide, i) => {
          const variant = byId(MODULE_VARIANTS, slide.variantId);
          if (!variant) return null;
          return (
            <div
              key={slide.id}
              className="print-page w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
            >
              <div className="aspect-[16/9] w-full">
                <ScaledSlide>
                  <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={i + 1} />
                </ScaledSlide>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
