import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/decks/$deckId/present")({
  head: () => ({ meta: [{ title: "Presenting · TransPerfect Modular" }] }),
  component: PresenterView,
});

function PresenterView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const slide = deck.slides[i];
  const variant = slide ? byId(MODULE_VARIANTS, slide.variantId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") setI((n) => Math.min(n + 1, deck.slides.length - 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setI((n) => Math.max(n - 1, 0));
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(deck.slides.length - 1);
      else if (e.key === "Escape") navigate({ to: "/decks/$deckId", params: { deckId } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.slides.length, deckId, navigate]);

  const pct = deck.slides.length > 0 ? ((i + 1) / deck.slides.length) * 100 : 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black">
      <div className="w-full max-w-[95vw]">
        <div className="mx-auto aspect-[16/9] w-full">
          {slide && variant && (
            <ScaledSlide>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={i + 1} clientName={brief?.prospect} />
            </ScaledSlide>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-white/10">
        <div className="h-full bg-white/70 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-white/10 px-5 py-2 text-xs text-white/80 backdrop-blur">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} className="hover:text-white" aria-label="Previous slide">←</button>
        <span className="tabular-nums">{i + 1} / {deck.slides.length}</span>
        <button onClick={() => setI((n) => Math.min(deck.slides.length - 1, n + 1))} className="hover:text-white" aria-label="Next slide">→</button>
        <Link to="/decks/$deckId" params={{ deckId }} className="ml-3 hover:text-white">Exit (Esc)</Link>
      </div>
    </div>
  );
}
