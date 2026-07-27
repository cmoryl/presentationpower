import { create } from "zustand";

/**
 * Tracks the last-saved signature of a deck (deck + brief serialized) so the
 * editor can warn about unsaved changes (e.g. slide reordering) on exit.
 */
type UnsavedState = {
  savedSig: Record<string, string>;
  markSaved: (deckId: string, sig: string) => void;
};

export const useUnsavedStore = create<UnsavedState>((set) => ({
  savedSig: {},
  markSaved: (deckId, sig) => set((s) => ({ savedSig: { ...s.savedSig, [deckId]: sig } })),
}));

export function deckSignature(deck: unknown, brief: unknown): string {
  return JSON.stringify({ d: deck, b: brief });
}

export function markDeckSaved(deckId: string, sig: string) {
  useUnsavedStore.getState().markSaved(deckId, sig);
}
