// Deck card cover: renders slide 1 through the same providers the editor and
// presentation view use (deck look, slide mode, thumbnail context), so the card
// shows the deck's real cover instead of cycling through default backgrounds.
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideSkinProvider } from "@/components/slide/SlideSkinContext";
import { DeckPackScope, deckPack, deckPackResolver, packBrand } from "@/components/slide/DeckPackScope";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";
import type { Deck } from "@/lib/deck-store";

export function DeckCoverThumb({ deck }: { deck: Deck }) {
  const cover = deck.slides.find((s) => !s.hidden) ?? deck.slides[0];
  const variant = cover ? byId(MODULE_VARIANTS, cover.variantId) : undefined;
  if (!cover || !variant) return null;
  const brand = packBrand(resolveBrandMode(deck.brandModeId, deck.subCompany), deckPack(deck));
  const packFor = deckPackResolver(deck);
  const ctx = (deck as { context?: { logoOrientation?: "horizontal" | "vertical" } }).context;
  return (
    <SlideThumbnailContext.Provider value={true}>
      <SlideSkinProvider skin={null}>
        <ScaledSlide>
          <DeckPackScope pack={packFor(cover)}>
            <VariantRenderer
              slide={cover}
              variant={variant}
              brand={brand}
              pageNumber={1}
              subCompany={deck.subCompany}
              logoOrientation={ctx?.logoOrientation ?? "horizontal"}
              mode={cover.mode ?? "light"}
            />
          </DeckPackScope>
        </ScaledSlide>
      </SlideSkinProvider>
    </SlideThumbnailContext.Provider>
  );
}
