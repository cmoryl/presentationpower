import { create } from "zustand";

/**
 * Tracks the last-saved signature of a deck (deck + brief serialized) so the
 * editor can warn about unsaved changes (e.g. slide reordering) on exit.
 *
 * Decks also register a "save now" function here (the autosave flush), so the
 * navigation guard can persist pending edits instead of interrogating the user
 * with a scary confirm dialog.
 */
type Saver = () => Promise<boolean>;

type UnsavedState = {
  savedSig: Record<string, string>;
  savers: Record<string, Saver>;
  markSaved: (deckId: string, sig: string) => void;
  registerSaver: (deckId: string, fn: Saver) => void;
  unregisterSaver: (deckId: string) => void;
};

export const useUnsavedStore = create<UnsavedState>((set) => ({
  savedSig: {},
  savers: {},
  markSaved: (deckId, sig) => set((s) => ({ savedSig: { ...s.savedSig, [deckId]: sig } })),
  registerSaver: (deckId, fn) => set((s) => ({ savers: { ...s.savers, [deckId]: fn } })),
  unregisterSaver: (deckId) =>
    set((s) => {
      const next = { ...s.savers };
      delete next[deckId];
      return { savers: next };
    }),
}));

export function deckSignature(deck: unknown, brief: unknown): string {
  return JSON.stringify({ d: deck, b: brief });
}

export function markDeckSaved(deckId: string, sig: string) {
  useUnsavedStore.getState().markSaved(deckId, sig);
}

/** Best-effort "save right now"; resolves false when nothing could be saved. */
export async function saveDeckNow(deckId: string): Promise<boolean> {
  const fn = useUnsavedStore.getState().savers[deckId];
  if (!fn) return false;
  try {
    return await fn();
  } catch {
    return false;
  }
}
