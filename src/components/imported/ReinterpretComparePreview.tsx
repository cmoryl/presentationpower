// Side-by-side visual compare for the AI reinterpretation review.
//
// Left = the imported slide rendered exactly as authored in PowerPoint
// (FaithfulSlideCanvas via ImportedFaithfulSlide). Right = the proposed
// native design, rendered with the same VariantRenderer the editor, present,
// print and export paths use — so what the reviewer approves is what ships.

import { useMemo } from "react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { ImportedFaithfulSlide } from "@/components/slide/ImportedFaithfulSlide";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import type { MappedSlide } from "@/lib/pptx-mapping";

function toDeckSlide(m: MappedSlide, position: number): DeckSlide {
  return {
    id: `preview-${position}`,
    position,
    sectionId: m.sectionId,
    variantId: m.variantId,
    layoutId: m.layoutId,
    content: m.content,
    changes: [],
    notes: m.source.notes || undefined,
  };
}

export function ReinterpretComparePreview({
  importedDeckId,
  slideIndex,
  designed,
  brandModeId,
  mode = "light",
}: {
  importedDeckId: string;
  slideIndex: number;
  /** The designed slide the approved plan produces for this source slide. */
  designed?: MappedSlide;
  brandModeId: string;
  mode?: "light" | "dark";
}) {
  const brand = useMemo(
    () => byId(BRAND_MODES, brandModeId) ?? BRAND_MODES[0],
    [brandModeId],
  );
  const variant = designed ? byId(MODULE_VARIANTS, designed.variantId) : undefined;
  const deckSlide = useMemo(
    () => (designed ? toDeckSlide(designed, slideIndex) : null),
    [designed, slideIndex],
  );

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <figure className="m-0">
        <figcaption className="mb-1 text-[11px] uppercase tracking-wider text-black/35">
          Original slide
        </figcaption>
        <div className="relative aspect-video overflow-hidden rounded-lg border border-black/10 bg-white">
          <ImportedFaithfulSlide
            deckId={importedDeckId}
            slideIndex={slideIndex}
            fitToContainer
          />
        </div>
      </figure>

      <figure className="m-0">
        <figcaption className="mb-1 text-[11px] uppercase tracking-wider text-[#003FC7]/70">
          Reinterpreted design
          {designed ? ` · ${designed.variantId}` : ""}
        </figcaption>
        <div className="relative aspect-video overflow-hidden rounded-lg border border-[#003FC7]/25 bg-white">
          {deckSlide && variant && brand ? (
            <ScaledSlide className="absolute inset-0">
              <VariantRenderer
                slide={deckSlide}
                variant={variant}
                brand={brand}
                pageNumber={slideIndex + 1}
                mode={mode}
              />
            </ScaledSlide>
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-black/40">
              No design preview for this slide yet.
            </div>
          )}
        </div>
      </figure>
    </div>
  );
}
