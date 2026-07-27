import { useEffect, useMemo, useRef } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useDeckStore } from "@/lib/deck-store";
import { deckSignature, markDeckSaved, useUnsavedStore } from "@/lib/unsaved-changes";

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
 * Warns on in-app navigation and on browser tab close/reload while the deck
 * has unsaved changes.
 */
export function useUnsavedDeckGuard(deckId: string) {
  const dirty = useDeckDirty(deckId);

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !window.confirm(
        "You have unsaved changes to this deck (including slide order). Leave without saving?",
      );
    },
    enableBeforeUnload: () => dirty,
    withResolver: false,
  });

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return dirty;
}
