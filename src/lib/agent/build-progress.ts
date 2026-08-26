// Lightweight pub/sub store for "deck is being built right now" progress.
// The agent chat (demo fast-path or live stream) publishes per-slide progress;
// the right-side live preview subscribes and renders a slide-by-slide build
// indicator while the build is in flight. Kept outside the deck store so the
// transient signal never lands in persisted deck state or undo history.
import { useSyncExternalStore } from "react";

export type DeckBuildState = {
  /** Total slides expected when the build completes. */
  total: number;
  /** Slides revealed so far. */
  done: number;
  /** Human label for the slide currently being assembled. */
  currentLabel: string | null;
  /** True while the build is actively running. */
  building: boolean;
};

const states = new Map<string, DeckBuildState>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setDeckBuildState(deckId: string, state: DeckBuildState | null) {
  if (state) states.set(deckId, state);
  else states.delete(deckId);
  emit();
}

export function getDeckBuildState(deckId: string | null): DeckBuildState | null {
  return deckId ? (states.get(deckId) ?? null) : null;
}

export function useDeckBuildState(deckId: string | null): DeckBuildState | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => getDeckBuildState(deckId),
    () => getDeckBuildState(deckId),
  );
}
