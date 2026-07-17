import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/decks/$deckId/print")({
  head: () => ({ meta: [{ title: "Print · TransPerfect Modular" }] }),
  component: PrintView,
});

function PrintView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));

  useEffect(() => {
    // Auto-open print dialog after slides mount
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, []);

  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const clientLogoUrl = deck.clientLogo?.primaryUrl ?? null;

  return (
    <div className="print-root min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 1280px 720px landscape; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .print-root { padding: 0 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .print-slide { break-after: page; page-break-after: always; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; width: 1280px !important; height: 720px !important; }
          .print-slide:last-child { break-after: auto; page-break-after: auto; }
        }
        .print-slide, .print-slide * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      `}</style>
      <div className="no-print mx-auto mb-6 max-w-[1280px] px-6 text-xs text-black/60">
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <strong>Ready to print.</strong> If the dialog didn't open,{" "}
          <button className="underline" onClick={() => window.print()}>click here</button>.
          Select "Save as PDF" as the destination for a print-faithful PDF at 16:9.
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 print:max-w-none print:gap-0">
        {deck.slides.map((slide, i) => {
          const variant = byId(MODULE_VARIANTS, slide.variantId);
          if (!variant) return null;
          return (
            <div
              key={slide.id}
              className="print-slide overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
              style={{ width: 1280, height: 720 }}
            >
              <ScaledSlide>
                <VariantRenderer
                  slide={slide}
                  variant={variant}
                  brand={brand}
                  pageNumber={i + 1}
                  clientName={brief?.prospect}
                  clientLogoUrl={clientLogoUrl}
                  subCompany={deck.subCompany}
                />
              </ScaledSlide>
            </div>
          );
        })}
      </div>
    </div>
  );
}
