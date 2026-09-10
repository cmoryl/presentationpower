// What the revision IN FORCE already contains.
//
// Signs are auto-published the moment they are saved, so a local edit is only
// "unpublished" while it differs from the published snapshot. Every surface that
// badges a sign as a draft asks this store, so a saved-and-published edit stops
// being flagged instead of looking permanently pending.

import { useSyncExternalStore } from "react";

import { EMPTY_LONDON_OVERRIDES, type LondonOverrides } from "@/lib/next-london-revise";

let published: LondonOverrides = EMPTY_LONDON_OVERRIDES;
let ready = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Record the design overrides carried by the revision in force. */
export function setLondonPublishedOverrides(next: LondonOverrides | null | undefined): void {
  published = next ?? EMPTY_LONDON_OVERRIDES;
  ready = true;
  emit();
}

/** True once the revision in force has been read — nothing auto-publishes before. */
export function londonPublishedOverridesReady(): boolean {
  return ready;
}

export function londonPublishedOverrides(): LondonOverrides {
  return published;
}

export function useLondonPublishedOverrides(): LondonOverrides {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => published,
    () => published,
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * True when this browser's saved edits for a sign are already contained in the
 * revision in force — i.e. there is nothing left to publish.
 */
export function londonEditsArePublished(
  panelId: string,
  local: {
    placement?: unknown;
    boardSize?: unknown;
    placedArt?: unknown;
    stepRepeat?: unknown;
  },
  overrides: LondonOverrides = published,
): boolean {
  return (
    same(local.placement, overrides.placements?.[panelId]) &&
    same(local.boardSize, overrides.boardSizes?.[panelId]) &&
    same(local.placedArt, overrides.placedArt?.[panelId]) &&
    same(local.stepRepeat, overrides.stepRepeat?.[panelId])
  );
}
