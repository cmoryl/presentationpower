// TransPerfect NEXT 2026 — London signage REMOVALS.
//
// Sometimes the location team ends up with a sign too many: a duplicate pillar,
// a board that is no longer being printed, a version that was a mistake. This
// store records which signs have been taken out of the kit. It works exactly
// like the other unpublished edits — kept in this browser, broadcast to any
// other open tab — and the auto-publisher carries the removals forward into the
// next revision, so the vendor pack drops them too.
//
// Nothing is destroyed: a removed sign can be put back at any time, and every
// published revision keeps its own record of what was in force.

import { useSyncExternalStore } from "react";

import type { LondonPanel } from "@/lib/next-london-signage";

export type LondonRemovalMap = Record<string, string>;

const EMPTY: LondonRemovalMap = {};
const STORAGE_KEY = "tp-next-london-removals-v1";
const CHANNEL = "tp-next-london-removals";

let store: LondonRemovalMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return;
    const next: LondonRemovalMap = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!id) continue;
      next[id] = typeof value === "string" ? value.slice(0, 160) : id;
    }
    store = next;
  } catch {
    store = {};
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage blocked — in-memory removals still apply this session */
  }
  try {
    new BroadcastChannel(CHANNEL).postMessage({ removals: store });
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire */
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Every sign removed in this browser, id → the name it had when removed. */
export function londonRemovals(): LondonRemovalMap {
  hydrate();
  return store;
}

export function londonRemovedIds(): string[] {
  return Object.keys(londonRemovals());
}

export function isLondonPanelRemoved(id: string): boolean {
  return id in londonRemovals();
}

/** Take a sign out of the kit. Reversible — see `restoreLondonPanel`. */
export function removeLondonPanel(panel: Pick<LondonPanel, "id" | "name">): void {
  const current = londonRemovals();
  if (panel.id in current) return;
  store = { ...current, [panel.id]: panel.name.slice(0, 160) };
  persist();
  emit();
}

/** Put a removed sign back exactly as it was. */
export function restoreLondonPanel(id: string): void {
  const current = londonRemovals();
  if (!(id in current)) return;
  const next = { ...current };
  delete next[id];
  store = next;
  persist();
  emit();
}

/** Put every removed sign back. */
export function restoreAllLondonPanels(): void {
  if (Object.keys(londonRemovals()).length === 0) return;
  store = {};
  persist();
  emit();
}

/** Drop removed signs from a panel list. */
export function withoutLondonRemovals(
  panels: LondonPanel[],
  map: LondonRemovalMap = londonRemovals(),
): LondonPanel[] {
  if (Object.keys(map).length === 0) return panels;
  return panels.filter((panel) => !(panel.id in map));
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const incoming = (event.data as { removals?: LondonRemovalMap } | null)?.removals;
      if (!incoming) return;
      store = incoming;
      emit();
    };
  } catch {
    channel = null;
  }
  return () => {
    listeners.delete(listener);
    channel?.close();
  };
}

/** React binding: re-renders whenever a sign is removed or restored. */
export function useLondonRemovals(): LondonRemovalMap {
  return useSyncExternalStore(
    subscribe,
    () => londonRemovals(),
    () => EMPTY,
  );
}
