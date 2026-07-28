import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { populateSlideWithDivisionInfo } from "@/lib/populate-slide.functions";
import { byId, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";

/**
 * Auto-fills a newly inserted slide with real division-specific copy.
 * Runs in the background right after insert, with toast progress + undo.
 */
export function useAiSlidePopulate(deckId: string, enabled: boolean) {
  const run = useServerFn(populateSlideWithDivisionInfo);
  const applyAiContent = useDeckStore((s) => s.applyAiContent);
  const [busySlideId, setBusySlideId] = useState<string | null>(null);

  const populate = useCallback(
    async (slideId: string) => {
      if (!enabled) return;
      const state = useDeckStore.getState();
      const deck = state.decks[deckId];
      const slide = deck?.slides.find((s) => s.id === slideId);
      if (!deck || !slide) return;
      const brief = state.briefs[deck.briefId];
      const variant = byId(MODULE_VARIANTS, slide.variantId);
      const before = slide.content as Record<string, unknown>;

      setBusySlideId(slideId);
      const toastId = toast.loading("Populating slide with division info…", {
        description: variant?.name ?? slide.variantId,
      });
      try {
        const res = await run({
          data: {
            divisionId: deck.brandModeId,
            divisionName: brief?.brandModeId ?? deck.brandModeId,
            variantId: slide.variantId,
            variantName: variant?.name,
            sectionName: byId(SECTION_FRAMEWORKS, slide.sectionId)?.name ?? "",
            content: before as Record<string, unknown>,
            context: {
              deckTitle: deck.title,
              prospect: brief?.prospect,
              industry: brief?.industry,
              audience: brief?.audience,
              meetingObjective: brief?.meetingObjective,
              assetRequest: deck.context?.assetRequest?.text,
              neighborTitles: deck.slides
                .map((s) =>
                  s.content && typeof s.content === "object" && "title" in s.content
                    ? String((s.content as { title?: unknown }).title ?? "")
                    : "",
                )
                .filter(Boolean)
                .slice(0, 12),
            },
          },
        });

        if (res.error) {
          toast.error("Couldn't auto-populate this slide", {
            id: toastId,
            description: res.error,
          });
          return;
        }

        applyAiContent(deckId, [{ id: slideId, content: res.content as never }]);
        toast.success("Slide populated with division info", {
          id: toastId,
          description: res.note,
          action: {
            label: "Undo",
            onClick: () => applyAiContent(deckId, [{ id: slideId, content: before as never }]),
          },
        });
      } catch (e) {
        toast.error("Couldn't auto-populate this slide", {
          id: toastId,
          description: (e as Error).message,
        });
      } finally {
        setBusySlideId(null);
      }
    },
    [applyAiContent, deckId, enabled, run],
  );

  return { populate, busySlideId };
}
