// Cross-surface "which layer am I pointing at?" state.
//
// The Slide layers panel lives in the right rail (and inside the .pptx preview
// modal), while the block it describes is painted by CanvasBlockLayer on the
// stage. Rather than thread props through every host, both sides read this tiny
// external store: hovering or selecting a row emphasizes the object on canvas.

import { useSyncExternalStore } from "react";

export interface CanvasEmphasis {
  /** Block id clicked in the layers list (sticky until cleared). */
  selectedId: string | null;
  /** Block id under the pointer in the layers list (transient). */
  hoverId: string | null;
}

let state: CanvasEmphasis = { selectedId: null, hoverId: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setCanvasEmphasis(next: Partial<CanvasEmphasis>) {
  const merged = { ...state, ...next };
  if (merged.selectedId === state.selectedId && merged.hoverId === state.hoverId) return;
  state = merged;
  emit();
}

export function clearCanvasEmphasis() {
  setCanvasEmphasis({ selectedId: null, hoverId: null });
}

export function useCanvasEmphasis(): CanvasEmphasis {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
