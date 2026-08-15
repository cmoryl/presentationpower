// Live slide preview for the PowerPoint agent page: reads the deck the agent is
// building and renders real slides with the same renderer the editor uses.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";

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
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        .select("id, title, brand_mode_id")
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
      const d = deck as { title?: string; brand_mode_id?: string | null } | null;
      setTitle(d?.title ?? "Untitled deck");
      setBrandModeId(d?.brand_mode_id ?? null);
      setRows((slides ?? []) as Row[]);
      setActive((prev) => Math.min(prev, Math.max(0, (slides ?? []).length - 1)));
    })();
    return () => {
      live = false;
    };
  }, [deckId, refreshKey]);

  const brand = useMemo(
    () => byId(BRAND_MODES, brandModeId ?? "") ?? BRAND_MODES[0]!,
    [brandModeId],
  );

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

  const current = slides[active];
  const currentVariant = current ? byId(MODULE_VARIANTS, current.variantId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title || "Deck"}</h2>
          <p className="text-[11px] text-foreground/45">
            {slides.length} slide{slides.length === 1 ? "" : "s"}
            {loading ? " · refreshing…" : ""}
          </p>
        </div>
        <Link
          to="/decks/$deckId"
          params={{ deckId }}
          className="ml-auto rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Open in deck editor
        </Link>
      </header>

      {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {current && currentVariant ? (
          <div
            className="relative w-full overflow-hidden rounded-xl bg-[#03002C]"
            style={{ aspectRatio: "16 / 9" }}
          >
            <ScaledSlide>
              <VariantRenderer
                slide={current}
                variant={currentVariant}
                brand={brand}
                pageNumber={active + 1}
              />
            </ScaledSlide>
          </div>
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
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === active}
                  className={`overflow-hidden rounded-lg border text-left transition ${
                    i === active
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/30"
                      : "border-border/60 hover:border-[#003FC7]/60"
                  }`}
                >
                  <div
                    className="relative w-full overflow-hidden bg-[#03002C]"
                    style={{ aspectRatio: "16 / 9", minHeight: 60 }}
                  >
                    <SlideThumbnailContext.Provider value={true}>
                      <ScaledSlide>
                        <VariantRenderer slide={s} variant={v} brand={brand} pageNumber={i + 1} />
                      </ScaledSlide>
                    </SlideThumbnailContext.Provider>
                  </div>
                  <div className="truncate px-2 py-1 font-mono text-[9px] text-foreground/40">
                    {i + 1}. {s.variantId}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
