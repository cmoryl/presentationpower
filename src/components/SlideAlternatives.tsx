import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { MODULE_VARIANTS, byId, variantsForSection } from "@/lib/taxonomy";
import type { BRAND_MODES } from "@/lib/taxonomy";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import type { DeckSlide } from "@/lib/deck-store";

type BrandMode = (typeof BRAND_MODES)[number];

/**
 * "Show alternatives" — up to three other section-permitted layouts with the
 * slide's own content already flowed in. "Shuffle" pages through the rest.
 * Same-family layouts come first because they share the most fields.
 */
export function rankAlternatives(slide: Pick<DeckSlide, "variantId" | "sectionId">): string[] {
  const fam = byId(MODULE_VARIANTS, slide.variantId)?.familyId;
  return variantsForSection(slide.sectionId)
    .filter((v) => v.id !== slide.variantId)
    .sort((a, b) => {
      const af = a.familyId === fam ? 0 : 1;
      const bf = b.familyId === fam ? 0 : 1;
      return af - bf || a.name.localeCompare(b.name);
    })
    .map((v) => v.id);
}

export function SlideAlternatives({
  slide,
  brand,
  onSwap,
  clientName,
  clientLogoUrl,
  subCompany,
}: {
  slide: DeckSlide;
  brand: BrandMode;
  onSwap: (variantId: string) => void;
  clientName?: string | null;
  clientLogoUrl?: string | null;
  subCompany?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const ranked = useMemo(() => rankAlternatives(slide), [slide.variantId, slide.sectionId]);
  const pages = Math.max(1, Math.ceil(ranked.length / 3));
  const shown = ranked.slice((page % pages) * 3, (page % pages) * 3 + 3);

  if (!ranked.length) return null;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-left text-sm font-medium hover:border-[#003FC7]/50 focus-visible:outline-2 focus-visible:outline-[#003FC7]"
      >
        {open ? "Hide alternatives" : "Show alternatives"}
      </button>
      {open && (
        <div className="space-y-2">
          {shown.map((id) => {
            const v = byId(MODULE_VARIANTS, id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSwap(id)}
                title={`Use ${v.name}`}
                className="block w-full overflow-hidden rounded-md border border-black/10 bg-white text-left hover:border-[#003FC7]/50 focus-visible:outline-2 focus-visible:outline-[#003FC7]"
              >
                <div className="relative aspect-[16/9] w-full">
                  <ScaledSlide>
                    <VariantRenderer
                      slide={{ ...slide, variantId: v.id, layoutId: v.permittedLayoutIds[0] }}
                      variant={v}
                      brand={brand}
                      pageNumber={1}
                      clientName={clientName ?? undefined}
                      clientLogoUrl={clientLogoUrl ?? null}
                      subCompany={subCompany ?? undefined}
                    />
                  </ScaledSlide>
                </div>
                <div className="px-2 py-1.5 text-xs font-medium">{v.name}</div>
              </button>
            );
          })}
          {pages > 1 && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden /> Shuffle ({(page % pages) + 1} of {pages})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
