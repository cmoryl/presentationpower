import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { runQa, blockingIssues, warningIssues } from "@/lib/qa";
import { runExportPreflight, type PreflightIssue } from "@/lib/export-preflight";
import { ExportPreflightModal } from "@/components/ExportPreflightModal";


export const Route = createFileRoute("/decks/$deckId/export")({
  head: () => ({ meta: [{ title: "Export · TransPerfect Modular" }] }),
  component: ExportView,
});

function ExportView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const [exporting, setExporting] = useState(false);
  const [override, setOverride] = useState(false);
  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];

  const qa = useMemo(() => runQa(deck.slides, deck.brandModeId), [deck.slides, deck.brandModeId]);
  const blocks = blockingIssues(qa);
  const warns = warningIssues(qa);
  const blocked = blocks.length > 0 && !override;

  useEffect(() => {
    document.body.classList.add("export-mode");
    return () => document.body.classList.remove("export-mode");
  }, []);

  async function handlePptx() {
    if (blocked) return;
    setExporting(true);
    try {
      await exportDeckToPptx(deck, brand);
    } finally {
      setExporting(false);
    }
  }


  return (
    <div className="min-h-screen bg-neutral-100 py-12 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 1920px 1080px; margin: 0; }
          .no-print { display: none !important; }
          .print-page { break-after: page; page-break-after: always; }
        }
      `}</style>

      <div className="no-print mx-auto mb-8 flex max-w-[1200px] items-center justify-between gap-6 px-6">
        <div>
          <Link to="/decks/$deckId" params={{ deckId }} className="text-xs uppercase tracking-widest text-black/50 hover:text-black">
            ← Back to editor
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Export · {deck.title}</h1>
          <p className="mt-1 text-sm text-black/60">
            Download a native PowerPoint file, or use your browser's print dialog to save as PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePptx}
            disabled={exporting || blocked}
            title={blocked ? "Resolve blocking QA issues first" : ""}
            className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Preparing…" : "Download .pptx"}
          </button>
          <Link
            to="/decks/$deckId/document"
            params={{ deckId }}
            className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:border-black/30"
          >
            As document…
          </Link>
          <button
            onClick={() => !blocked && window.print()}
            disabled={blocked}
            className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {(blocks.length > 0 || warns.length > 0) && (
        <div className="no-print mx-auto mb-8 max-w-[1200px] px-6">
          {blocks.length > 0 && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-red-900">
                    {blocks.length} blocking QA {blocks.length === 1 ? "issue" : "issues"} — export disabled
                  </div>
                  <div className="mt-1 text-sm text-red-900/80">
                    Resolve these in the editor, or override for internal drafts only.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-red-900">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  Override (internal draft)
                </label>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {blocks.map((issue, k) => {
                  const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                  return (
                    <li key={k} className="text-red-900/90">
                      <span className="font-mono text-xs text-red-900/60">Slide {idx + 1}</span> · {issue.message}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {warns.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-900">
                {warns.length} {warns.length === 1 ? "warning" : "warnings"} — non-blocking
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {warns.map((issue, k) => {
                  const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                  return (
                    <li key={k} className="text-amber-900/90">
                      <span className="font-mono text-xs text-amber-900/60">Slide {idx + 1}</span> · {issue.message}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}



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
                  <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={i + 1} clientName={brief?.prospect} />
                </ScaledSlide>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
