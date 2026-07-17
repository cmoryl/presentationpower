import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { cn } from "@/lib/utils";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";

const focusThumb = (el: HTMLButtonElement | null) => {
  el?.focus({ preventScroll: true });
};

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
  const [stripOpen, setStripOpen] = useState(true);
  const [focusedThumb, setFocusedThumb] = useState(0);

  if (!deck) throw notFound();
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const slide = deck.slides[i];
  const variant = slide ? byId(MODULE_VARIANTS, slide.variantId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const insideStrip = stripRef.current?.contains(active) ?? false;
      if (insideStrip) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedThumb((n) => {
            const next = Math.min(n + 1, deck.slides.length - 1);
            setTimeout(() => focusThumb(thumbRefs.current[next]), 0);
            return next;
          });
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedThumb((n) => {
            const prev = Math.max(n - 1, 0);
            setTimeout(() => focusThumb(thumbRefs.current[prev]), 0);
            return prev;
          });
        } else if (e.key === "Home") {
          e.preventDefault();
          setFocusedThumb(0);
          setTimeout(() => focusThumb(thumbRefs.current[0]), 0);
        } else if (e.key === "End") {
          e.preventDefault();
          const last = deck.slides.length - 1;
          setFocusedThumb(last);
          setTimeout(() => focusThumb(thumbRefs.current[last]), 0);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setI(focusedThumb);
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") setI((n) => Math.min(n + 1, deck.slides.length - 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setI((n) => Math.max(n - 1, 0));
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(deck.slides.length - 1);
      else if (e.key === "t" || e.key === "T") setStripOpen((v) => !v);
      else if (e.key === "Escape") navigate({ to: "/decks/$deckId", params: { deckId } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.slides.length, deckId, navigate, focusedThumb]);

  useEffect(() => {
    setFocusedThumb(i);
  }, [i]);

  const pct = deck.slides.length > 0 ? ((i + 1) / deck.slides.length) * 100 : 0;
  const stripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [i]);

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

      {/* Thumbnail strip */}
      <div
        ref={stripRef}
        className={cn(
          "absolute inset-x-0 bottom-16 mx-auto flex max-w-[95vw] gap-2 overflow-x-auto px-4 py-3 transition-all duration-300",
          "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
          stripOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4",
        )}
        aria-label="Slide thumbnails"
      >
        {deck.slides.map((s, idx) => {
          const v = byId(MODULE_VARIANTS, s.variantId);
          const active = idx === i;
          return (
          <button
              key={s.id}
              ref={(el) => {
                thumbRefs.current[idx] = el;
                if (active) activeThumbRef.current = el;
              }}
              tabIndex={idx === focusedThumb ? 0 : -1}
              onClick={() => setI(idx)}
              onFocus={() => setFocusedThumb(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setI(idx);
                }
              }}
              className={cn(
                "group relative flex-shrink-0 overflow-hidden rounded-md border transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                active
                  ? "border-white ring-2 ring-white/60 shadow-lg shadow-white/10"
                  : "border-white/15 hover:border-white/40 opacity-60 hover:opacity-100",
              )}
              style={{ width: 160, height: 90 }}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={active ? "true" : undefined}
            >
              <div className="absolute inset-0" style={{ transform: "scale(0.0833)", transformOrigin: "top left", width: 1920, height: 1080 }}>
                {v && <VariantRenderer slide={s} variant={v} brand={brand} pageNumber={idx + 1} clientName={brief?.prospect} />}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                {idx + 1}
              </div>
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-white/10 px-5 py-2 text-xs text-white/80 backdrop-blur">
        <button onClick={() => setI((n) => Math.max(0, n - 1))} className="hover:text-white" aria-label="Previous slide">←</button>
        <span className="tabular-nums">{i + 1} / {deck.slides.length}</span>
        <button onClick={() => setI((n) => Math.min(deck.slides.length - 1, n + 1))} className="hover:text-white" aria-label="Next slide">→</button>
        <button onClick={() => setStripOpen((v) => !v)} className="ml-2 hover:text-white" aria-label="Toggle thumbnails" title="Toggle thumbnails (T)">
          {stripOpen ? "▾ Thumbs" : "▴ Thumbs"}
        </button>
        <Link to="/decks/$deckId" params={{ deckId }} className="ml-3 hover:text-white">Exit (Esc)</Link>
      </div>
    </div>
  );
}
