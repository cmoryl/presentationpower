import { useEffect, useRef } from "react";
import { useDeckStore, type Deck } from "@/lib/deck-store";

/**
 * Saved slides may carry picture links that have since expired; re-sign them
 * once per open so pictures load on screen and embed in downloads.
 */
export function useResignDeckMedia(deck: Deck | undefined) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!deck?.id || done.current === deck.id) return;
    done.current = deck.id;
    const deckId = deck.id;
    void (async () => {
      const { resignExpiredInValue } = await import("@/lib/slide-media");
      for (const slide of deck.slides) {
        const content = (slide.content ?? {}) as Record<string, unknown>;
        for (const [field, value] of Object.entries(content)) {
          const next = await resignExpiredInValue(value);
          if (next !== null) useDeckStore.getState().updateSlideField(deckId, slide.id, field, next);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck?.id]);
}
