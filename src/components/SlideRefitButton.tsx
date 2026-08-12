import { useCallback, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { refitSlideToVariant } from "@/lib/refit-slide.functions";
import { MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { useDeckStore, type DeckSlide, type SlideContent } from "@/lib/deck-store";

/**
 * Re-fits a slide's existing copy (plus its speaker notes) into the layout it
 * currently sits on. Used right after a manual layout swap, where the
 * deterministic merge can only carry over keys the two modules share.
 */
export function useSlideRefit(deckId: string) {
  const run = useServerFn(refitSlideToVariant);
  const applyCopilotUpdates = useDeckStore((s) => s.applyCopilotUpdates);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refit = useCallback(
    async (slideId: string, sourceContent?: SlideContent) => {
      const state = useDeckStore.getState();
      const deck = state.decks[deckId];
      const slide = deck?.slides.find((sl) => sl.id === slideId);
      if (!deck || !slide) return;
      const variant = byId(MODULE_VARIANTS, slide.variantId);
      if (!variant) return;

      setBusyId(slideId);
      const t = toast.loading("Refitting slide content with AI…");
      try {
        const res = await run({
          data: {
            deckTitle: deck.title ?? "",
            divisionId: deck.brandModeId ?? null,
            variantId: variant.id,
            variantName: variant.name,
            variantDescription: variant.description ?? "",
            capacity: (variant.capacity ?? {}) as Record<string, unknown>,
            editableFields: (variant.editableFields ?? []) as string[],
            templateContent: slide.content as Record<string, unknown>,
            sourceContent: (sourceContent ?? slide.content) as Record<string, unknown>,
            notes: slide.notes ?? "",
          },
        });

        if (res.error || !res.contentJson) {
          toast.error(res.error ?? "AI refit returned nothing", { id: t });
          return;
        }
        const content = JSON.parse(res.contentJson) as SlideContent;
        applyCopilotUpdates(deckId, [
          {
            index: slide.position,
            variantId: slide.variantId,
            layoutId: slide.layoutId,
            content,
          },
        ]);
        toast.success(res.summary || "Slide refitted to the new layout", {
          id: t,
          description: res.usedNotes ? "Speaker-note detail was pulled onto the slide." : undefined,
        });
      } catch (e) {
        toast.error((e as Error).message || "AI refit failed", { id: t });
      } finally {
        setBusyId(null);
      }
    },
    [applyCopilotUpdates, deckId, run],
  );

  return { refit, busyId };
}

export function SlideRefitButton({
  deckId,
  slide,
  label = "Refit content with AI",
}: {
  deckId: string;
  slide: DeckSlide;
  label?: string;
}) {
  const { refit, busyId } = useSlideRefit(deckId);
  const busy = busyId === slide.id;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void refit(slide.id)}
      title="Re-author this slide's copy and notes into the current layout"
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium text-black/70 transition hover:border-black/40 hover:text-black disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
      )}
      {busy ? "Refitting…" : label}
    </button>
  );
}
