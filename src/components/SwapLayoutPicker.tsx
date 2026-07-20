import { useMemo, useRef, useState } from "react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { MODULE_VARIANTS, SECTION_FRAMEWORKS, byId, variantsForSection } from "@/lib/taxonomy";
import type { BRAND_MODES } from "@/lib/taxonomy";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import type { DeckSlide } from "@/lib/deck-store";

type BrandMode = typeof BRAND_MODES[number];

export function SwapLayoutButton({
  slide,
  brand,
  onSwap,
  clientLogoUrl,
  clientName,
  subCompany,
}: {
  slide: DeckSlide;
  brand: BrandMode;
  onSwap: (variantId: string) => void;
  clientLogoUrl?: string | null;
  clientName?: string | null;
  subCompany?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose: () => setOpen(false), containerRef: dialogRef });
  const currentVariant = byId(MODULE_VARIANTS, slide.variantId);
  const currentFamilyId = currentVariant?.familyId;

  const options = useMemo(() => {
    // Same section framework's permitted variants — the safe compatible set.
    const sectionVariants = variantsForSection(slide.sectionId);
    // Rank: same family first, then everything else.
    return [...sectionVariants].sort((a, b) => {
      const aFam = a.familyId === currentFamilyId ? 0 : 1;
      const bFam = b.familyId === currentFamilyId ? 0 : 1;
      return aFam - bFam;
    });
  }, [slide.sectionId, currentFamilyId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#003FC7]/40 hover:text-[#003FC7]"
      >
        Swap layout…
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-layout-title"
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
              <div>
                <div id="swap-layout-title" className="text-xs uppercase tracking-widest text-black/50">
                  Swap layout · {byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}
                </div>
                <div className="mt-1 text-sm text-black/70">
                  Overlapping fields carry over. Same family shown first.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-widest hover:border-black/30"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {options.map((v) => {
                  const isCurrent = v.id === slide.variantId;
                  const sameFamily = v.familyId === currentFamilyId;
                  const previewSlide: DeckSlide = { ...slide, variantId: v.id, layoutId: v.permittedLayoutIds[0] };
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => {
                        onSwap(v.id);
                        setOpen(false);
                      }}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        isCurrent
                          ? "border-[#003FC7] ring-2 ring-[#003FC7]/20"
                          : "border-black/10 hover:border-[#003FC7]/40 hover:shadow-lg"
                      }`}
                    >
                      <div className="aspect-[16/9] bg-white">
                        <ScaledSlide>
                          <VariantRenderer
                            slide={previewSlide}
                            variant={v}
                            brand={brand}
                            pageNumber={1}
                            clientName={clientName ?? undefined}
                            clientLogoUrl={clientLogoUrl ?? null}
                            subCompany={subCompany ?? undefined}
                          />
                        </ScaledSlide>
                      </div>
                      <div className="border-t border-black/10 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{v.name}</span>
                          {sameFamily && !isCurrent && (
                            <span className="rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-[#003FC7]">
                              Family
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-white">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-black/50">{v.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
