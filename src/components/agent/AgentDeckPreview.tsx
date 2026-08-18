// Live slide preview for the PowerPoint agent page: reads the deck the agent is
// building and renders real slides with the same renderer the editor uses.
//
// The deck's design skin (OnDeck catalog skin or built-in style pack, stored on
// `deck.context.stylePackId`) is applied here through the same StylePack scope
// the library and editor use, and can be switched live from the header so a
// reviewer can audition looks on their own content.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { APPROVED_STYLE_PACKS, packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";
import { DESIGN_SKINS } from "@/lib/design-skins";
import { skinPackId } from "@/lib/design-skin-pack";
import { auditVisualData } from "@/lib/agent/visual-data-gaps";
import type { DeckSlide } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";

/** Slide content inside the active design skin's token scope. */
function SkinScope({ pack, children }: { pack: StylePack | null; children: React.ReactNode }) {
  if (!pack) return <>{children}</>;
  return (
    <StylePackProvider pack={pack}>
      <StylePackVars pack={pack} className="h-full w-full">
        {children}
      </StylePackVars>
    </StylePackProvider>
  );
}


type Row = {
  id: string;
  position: number;
  section_id: string;
  variant_id: string;
  layout_id: string;
  content: Record<string, unknown> | null;
  notes: string | null;
};

export function AgentDeckPreview({
  deckId,
  refreshKey,
}: {
  deckId: string | null;
  refreshKey: number;
}) {
  const [title, setTitle] = useState("");
  const [brandModeId, setBrandModeId] = useState<string | null>(null);
  const [packId, setPackId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState(0);
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openEnlarged = useCallback((i: number) => {
    setActive(i);
    setEnlargedIndex(i);
  }, []);

  useEffect(() => {
    if (!deckId) {
      setRows([]);
      setTitle("");
      return;
    }
    let live = true;
    setLoading(true);
    (async () => {
      const { data: deck, error: dErr } = await supabase
        .from("decks")
        .select("id, title, brand_mode_id, context")
        .eq("id", deckId)
        .maybeSingle();
      const { data: slides, error: sErr } = await supabase
        .from("deck_slides")
        .select("id, position, section_id, variant_id, layout_id, content, notes")
        .eq("deck_id", deckId)
        .order("position", { ascending: true });
      if (!live) return;
      setLoading(false);
      if (dErr || sErr) {
        setError(dErr?.message ?? sErr?.message ?? "Could not load the deck.");
        return;
      }
      setError(null);
      const d = deck as {
        title?: string;
        brand_mode_id?: string | null;
        context?: { stylePackId?: string | null } | null;
      } | null;
      setTitle(d?.title ?? "Untitled deck");
      setBrandModeId(d?.brand_mode_id ?? null);
      setPackId(d?.context?.stylePackId ?? "");
      setRows((slides ?? []) as Row[]);
      setActive((prev) => Math.min(prev, Math.max(0, (slides ?? []).length - 1)));
    })();
    return () => {
      live = false;
    };
  }, [deckId, refreshKey]);

  const pack = useMemo(() => stylePackById(packId), [packId]);

  /** Switching the look writes back to the deck so editor + export agree. */
  const applyPack = useCallback(
    async (next: string) => {
      setPackId(next);
      if (!deckId) return;
      const { data } = await supabase
        .from("decks")
        .select("context")
        .eq("id", deckId)
        .maybeSingle();
      const ctx = ((data as { context?: Record<string, unknown> | null } | null)?.context ??
        {}) as Record<string, unknown>;
      await supabase
        .from("decks")
        .update({ context: { ...ctx, stylePackId: next || null } } as never)
        .eq("id", deckId);
    },
    [deckId],
  );

  const baseBrand = useMemo(
    () => byId(BRAND_MODES, brandModeId ?? "") ?? BRAND_MODES[0]!,
    [brandModeId],
  );
  const brand = useMemo(
    () => (pack ? (packToneBrand(baseBrand as never, pack) as unknown as BrandMode) : baseBrand),
    [baseBrand, pack],
  );
  const frame = pack ? pack.tokens.surface : "#03002C";


  const slides: DeckSlide[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        position: r.position,
        sectionId: r.section_id,
        variantId: r.variant_id,
        layoutId: r.layout_id,
        content: (r.content ?? {}) as DeckSlide["content"],
        notes: r.notes ?? undefined,
        changes: [],
      })) as DeckSlide[],
    [rows],
  );

  if (!deckId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-foreground/70">No deck yet</p>
        <p className="max-w-xs text-xs text-foreground/45">
          Describe the presentation you need in the chat. As soon as the agent builds it, every
          slide appears here live.
        </p>
      </div>
    );
  }

  // Deterministic check so an unpopulated chart is visible to the user, not just
  // reported to the agent.
  const emptyVisuals = auditVisualData(
    rows.map((r) => ({
      position: r.position,
      variant_id: r.variant_id,
      content: (r.content ?? {}) as Record<string, unknown>,
    })),
  ).unpopulated;

  const current = slides[active];
  const currentVariant = current ? byId(MODULE_VARIANTS, current.variantId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title || "Deck"}</h2>
          <p className="text-[11px] text-foreground/45">
            {slides.length} slide{slides.length === 1 ? "" : "s"}
            {pack ? ` · ${pack.label}` : ""}
            {loading ? " · refreshing…" : ""}
          </p>
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/45">
          Skin
          <select
            value={packId}
            onChange={(e) => void applyPack(e.target.value)}
            aria-label="Deck design skin"
            className="rounded-lg border border-border/70 bg-background px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-foreground"
          >
            <option value="">Brand system</option>
            <optgroup label="Design skin catalog">
              {DESIGN_SKINS.map((s) => (
                <option key={s.code} value={skinPackId(s.code)}>
                  {s.code} · {s.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Industry background systems">
              {APPROVED_STYLE_PACKS.filter((p) => /^skin-r/i.test(p.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <Link
          to="/decks/$deckId"
          params={{ deckId }}
          className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Open in deck editor
        </Link>
      </header>

      {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

      {emptyVisuals.length > 0 && (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
          <span className="font-semibold">
            {emptyVisuals.length} chart{emptyVisuals.length === 1 ? "" : "s"} still need data:
          </span>{" "}
          slide{emptyVisuals.length === 1 ? " " : "s "}
          {emptyVisuals.map((v) => v.position + 1).join(", ")}. Ask the agent to fill in the figures
          so they plot on screen and in PowerPoint.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {current && currentVariant ? (
          <button
            type="button"
            onClick={() => openEnlarged(active)}
            aria-label={`View slide ${active + 1} larger`}
            className="group relative w-full overflow-hidden rounded-xl text-left transition hover:ring-2 hover:ring-[#003FC7]/40 focus:outline-none focus:ring-2 focus:ring-[#003FC7]"
            style={{ aspectRatio: "16 / 9", background: frame }}
          >
            <ScaledSlide>
              <SkinScope pack={pack}>
                <VariantRenderer
                  slide={current}
                  variant={currentVariant}
                  brand={brand}
                  pageNumber={active + 1}
                />
              </SkinScope>
            </ScaledSlide>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#03002C] shadow-lg">
                ⤢ View larger
              </span>
            </span>
          </button>

        ) : (
          <p className="text-xs text-foreground/45">The agent has not added slides yet.</p>
        )}

        {current?.notes && (
          <p className="mt-3 rounded-lg bg-foreground/[0.04] p-3 text-[11px] leading-relaxed text-foreground/60">
            <span className="font-semibold uppercase tracking-widest">Notes </span>
            {current.notes}
          </p>
        )}

        {slides.length > 1 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {slides.map((s, i) => {
              const v = byId(MODULE_VARIANTS, s.variantId);
              if (!v) return null;
              return (
                <div
                  key={s.id}
                  className={`group relative overflow-hidden rounded-lg border text-left transition ${
                    i === active
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/30"
                      : "border-border/60 hover:border-[#003FC7]/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active}
                    className="block w-full text-left"
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "16 / 9", minHeight: 60, background: frame }}
                    >
                      <SlideThumbnailContext.Provider value={true}>
                        <ScaledSlide>
                          <SkinScope pack={pack}>
                            <VariantRenderer slide={s} variant={v} brand={brand} pageNumber={i + 1} />
                          </SkinScope>
                        </ScaledSlide>
                      </SlideThumbnailContext.Provider>
                    </div>

                    <div className="truncate px-2 py-1 font-mono text-[9px] text-foreground/40">
                      {i + 1}. {s.variantId}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEnlarged(i);
                    }}
                    aria-label={`View slide ${i + 1} larger`}
                    className="absolute right-1.5 top-1.5 z-20 rounded-md bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 focus:opacity-100"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {enlargedIndex !== null && (
        <EnlargedSlideModal
          slides={slides}
          index={enlargedIndex}
          brand={brand}
          pack={pack}
          onClose={() => setEnlargedIndex(null)}
          onPrev={() =>
            setEnlargedIndex((i) => (i === null ? null : (i - 1 + slides.length) % slides.length))
          }
          onNext={() => setEnlargedIndex((i) => (i === null ? null : (i + 1) % slides.length))}
        />
      )}
    </div>
  );
}

function EnlargedSlideModal({
  slides,
  index,
  brand,
  pack,
  onClose,
  onPrev,
  onNext,
}: {
  slides: DeckSlide[];
  index: number;
  brand: BrandMode;
  pack: StylePack | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {

  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: ref });

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, []);

  const slide = slides[index];
  const variant = slide ? byId(MODULE_VARIANTS, slide.variantId) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext]);

  if (!slide || !variant) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-slide-title"
        tabIndex={-1}
        className="flex w-full max-w-[1200px] flex-col gap-3 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 id="agent-slide-title" className="text-sm font-semibold">
              Slide {index + 1} of {slides.length}
            </h2>
            <p className="text-xs text-white/60">{slide.variantId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={slides.length <= 1}
              aria-label="Previous slide"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={slides.length <= 1}
              aria-label="Next slide"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-30"
            >
              Next →
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close enlarged view"
              className="ml-1 rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#03002C]"
            >
              Close
            </button>
          </div>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-xl shadow-2xl"
          style={{ aspectRatio: "16 / 9", background: pack ? pack.tokens.surface : "#03002C" }}
        >
          <ScaledSlide>
            <SkinScope pack={pack}>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={index + 1} />
            </SkinScope>
          </ScaledSlide>
        </div>


        {slide.notes && (
          <p className="rounded-lg bg-white/10 p-3 text-xs leading-relaxed text-white/80">
            <span className="font-semibold uppercase tracking-widest">Notes </span>
            {slide.notes}
          </p>
        )}
      </div>
    </div>
  );
}
