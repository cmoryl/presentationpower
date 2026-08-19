import { useEffect, useMemo, useRef } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useDeckStore } from "@/lib/deck-store";
import { deckSignature, markDeckSaved, saveDeckNow, useUnsavedStore } from "@/lib/unsaved-changes";

/**
 * Returns true when the in-memory deck differs from the last saved snapshot.
 * The baseline is captured on first mount, so only edits made during this
 * editing session (slide reordering, content edits, …) count as unsaved.
 */
export function useDeckDirty(deckId: string): boolean {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const savedSig = useUnsavedStore((s) => s.savedSig[deckId]);
  const sig = useMemo(() => (deck ? deckSignature(deck, brief) : ""), [deck, brief]);
  const baselined = useRef(false);

  useEffect(() => {
    if (!deck || baselined.current) return;
    baselined.current = true;
    if (savedSig === undefined) markDeckSaved(deckId, sig);
  }, [deck, deckId, sig, savedSig]);

  if (!deck) return false;
  return savedSig !== undefined && savedSig !== sig;
}

/**
 * Keeps the deck safe on exit. Leaving with pending edits first tries to save
 * them silently (the autosave flush); the user is only asked to confirm when
 * that save actually fails.
 */
export function useUnsavedDeckGuard(deckId: string) {
  const dirty = useDeckDirty(deckId);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useBlocker({
    shouldBlockFn: async () => {
      if (!dirtyRef.current) return false;
      const saved = await saveDeckNow(deckId);
      if (saved) return false;
      return !window.confirm(
        "This deck couldn't be saved to your account (you may be offline or signed out). Leave anyway? Your local copy stays on this device.",
      );
    },
    enableBeforeUnload: () => dirtyRef.current,
    withResolver: false,
  });

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Fire-and-forget save attempt, then let the browser warn.
      void saveDeckNow(deckId);
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, deckId]);

  return dirty;
}
