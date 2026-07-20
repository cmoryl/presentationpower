import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import {
  DOCUMENT_FAMILIES,
  documentFamily,
  pageDims,
  projectDeckToDocument,
  sectionName,
  type DocumentFamilyId,
  type PageOrientation,
  type PageSize,
} from "@/lib/document-families";

export const Route = createFileRoute("/decks/$deckId/document")({
  head: () => ({ meta: [{ title: "Document · TransPerfect Modular" }] }),
  component: DocumentView,
});

function DocumentView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const [familyId, setFamilyId] = useState<DocumentFamilyId>("ebrochure");
  const family = documentFamily(familyId);
  const [size, setSize] = useState<PageSize>(family.defaultSize);
  const [orientation, setOrientation] = useState<PageOrientation>(family.defaultOrientation);

  useEffect(() => {
    setSize(family.defaultSize);
    setOrientation(family.defaultOrientation);
  }, [familyId, family.defaultOrientation, family.defaultSize]);

  useEffect(() => {
    document.body.classList.add("export-mode");
    return () => document.body.classList.remove("export-mode");
  }, []);

  if (!deck) throw notFound();
  const brand = resolveBrandMode(deck.brandModeId, deck.subCompany);
  const slides = useMemo(() => projectDeckToDocument(deck, family), [deck, family]);
  const dims = pageDims(size, orientation);

  // Chunk slides according to slidesPerPage
  const pages: Array<typeof slides> = [];
  for (let i = 0; i < slides.length; i += family.slidesPerPage) {
    pages.push(slides.slice(i, i + family.slidesPerPage));
  }

  const dateStr = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-neutral-100 py-10 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: ${dims.widthIn}in ${dims.heightIn}in; margin: 0; }
          .no-print { display: none !important; }
          .doc-page { break-after: page; page-break-after: always; }
        }
      `}</style>

      <div className="no-print mx-auto mb-8 max-w-[1200px] px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Link to="/decks/$deckId" params={{ deckId }} className="text-xs uppercase tracking-widest text-black/50 hover:text-black">
              ← Back to editor
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Document · {deck.title}</h1>
            <p className="mt-1 text-sm text-black/60">
              Re-flow this deck into a print-ready document. Use your browser's print dialog to save as PDF.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {DOCUMENT_FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamilyId(f.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                f.id === familyId ? "border-[#0B2A4A] bg-white ring-2 ring-[#0B2A4A]/20" : "border-black/10 bg-white hover:border-black/30"
              }`}
            >
              <div className="text-xs uppercase tracking-widest text-black/50">{f.tagline}</div>
              <div className="mt-1 text-lg font-semibold">{f.name}</div>
              <div className="mt-2 text-xs text-black/60">{f.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm">
          <span className="text-xs uppercase tracking-widest text-black/50">Page</span>
          <label className="flex items-center gap-2">
            <span className="text-black/60">Size</span>
            <select value={size} onChange={(e) => setSize(e.target.value as PageSize)} className="rounded border border-black/15 bg-white px-2 py-1 text-sm">
              <option value="letter">US Letter</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-black/60">Orientation</span>
            <select value={orientation} onChange={(e) => setOrientation(e.target.value as PageOrientation)} className="rounded border border-black/15 bg-white px-2 py-1 text-sm">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <span className="text-xs text-black/50">
            {pages.length} page{pages.length === 1 ? "" : "s"} · {slides.length} of {deck.slides.length} slides
          </span>
        </div>
      </div>

      <div className="mx-auto flex flex-col items-center gap-6 print:gap-0">
        {/* Cover */}
        <DocumentPage dims={dims}>
          <div className="flex h-full flex-col justify-between p-[0.6in]">
            <div className="flex items-center justify-between">
              <BrandLockup brand={brand} color="dark" size="lg" />
              <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">{family.cover.eyebrow}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-black/50">Prepared for</div>
              <div className="mt-1 text-3xl font-semibold">{brief?.prospect ?? deck.title}</div>
              <h2 className="mt-8 text-4xl font-semibold leading-tight">{deck.title}</h2>
              <div className="mt-3 text-base text-black/60">{family.cover.subtitle}</div>
            </div>
            <div className="flex items-end justify-between text-xs text-black/50">
              <div>
                <div className="uppercase tracking-widest">Brand mode</div>
                <div className="mt-1 text-black/80">{brand.name}</div>
              </div>
              <div className="text-right">
                <div className="uppercase tracking-widest">Prepared</div>
                <div className="mt-1 text-black/80">{dateStr}</div>
              </div>
            </div>
          </div>
        </DocumentPage>

        {/* Content pages */}
        {pages.map((chunk, pageIdx) => (
          <DocumentPage key={pageIdx} dims={dims}>
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-black/10 px-[0.5in] py-[0.3in]">
                <BrandLockup brand={brand} color="dark" size="sm" />
                <div className="text-[10px] uppercase tracking-[0.3em] text-black/50">
                  {family.name} · {deck.title}
                </div>
              </div>
              {/* Slide content — 1 or 2 up */}
              <div className={`grid flex-1 gap-[0.3in] p-[0.4in] ${chunk.length === 2 ? "grid-rows-2" : "grid-rows-1"}`}>
                {chunk.map((slide, k) => {
                  const variant = byId(MODULE_VARIANTS, slide.variantId);
                  if (!variant) return null;
                  const globalIdx = pageIdx * family.slidesPerPage + k;
                  return (
                    <div key={slide.id} className="flex flex-col">
                      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-black/50">
                        <span>{sectionName(slide.sectionId)}</span>
                        <span>{String(globalIdx + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="flex-1 overflow-hidden rounded-lg border border-black/10">
                        <ScaledSlide>
                          <VariantRenderer
                            slide={slide}
                            variant={variant}
                            brand={brand}
                            pageNumber={globalIdx + 1}
                            clientName={brief?.prospect}
                          />
                        </ScaledSlide>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between border-t border-black/10 px-[0.5in] py-[0.25in] text-[10px] uppercase tracking-[0.25em] text-black/50">
                <span>{brief?.prospect ? `Prepared for ${brief.prospect}` : brand.name}</span>
                <span>
                  Page {pageIdx + 2} of {pages.length + 1}
                </span>
              </div>
            </div>
          </DocumentPage>
        ))}
      </div>
    </div>
  );
}

function DocumentPage({
  dims,
  children,
}: {
  dims: { widthIn: number; heightIn: number };
  children: React.ReactNode;
}) {
  return (
    <div
      className="doc-page overflow-hidden bg-white shadow-md ring-1 ring-black/5 print:shadow-none print:ring-0"
      style={{ width: `${dims.widthIn}in`, height: `${dims.heightIn}in` }}
    >
      {children}
    </div>
  );
}
