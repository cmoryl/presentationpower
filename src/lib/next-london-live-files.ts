// London signage LIVE FILE VERSIONS — runtime registry.
//
// The finished live file for a sign is read from the database (see
// london-live-files.functions.ts) and pushed in here once. Everything that
// paints a sign — hub preview cards, the live editor ground, venue renders and
// the download buttons — asks this registry first, so replacing a live file
// updates every card in the kit with no code change and no rebuild.
//
// A newer stored version always beats the bundled artwork that shipped with the
// build. The signature changes whenever the set changes, which is what the
// preview cards key their repaint on.

import { useSyncExternalStore } from "react";

export type LondonLiveFileVersion = {
  id: string;
  panelId: string;
  version: number;
  filename: string;
  note: string | null;
  issued: string;
  trimW: number | null;
  trimH: number | null;
  masterUrl: string | null;
  proofUrl: string | null;
};

export type LondonLiveFileMap = Record<string, LondonLiveFileVersion>;

const EMPTY: LondonLiveFileMap = {};

let store: LondonLiveFileMap = EMPTY;
let signature = "";
const listeners = new Set<() => void>();

function computeSignature(map: LondonLiveFileMap): string {
  return Object.values(map)
    .map((v) => `${v.panelId}@${v.version}:${v.proofUrl ? "p" : "-"}`)
    .sort()
    .join("|");
}

/** Push the versions in force. Called once the listing resolves. */
export function setLondonLiveFiles(versions: readonly LondonLiveFileVersion[]): void {
  const next: LondonLiveFileMap = {};
  for (const version of versions) {
    if (!version?.panelId) continue;
    const existing = next[version.panelId];
    if (!existing || existing.version < version.version) next[version.panelId] = version;
  }
  const nextSignature = computeSignature(next);
  if (nextSignature === signature) return;
  store = next;
  signature = nextSignature;
  for (const listener of listeners) listener();
}

export function londonLiveFiles(): LondonLiveFileMap {
  return store;
}

/** The stored live file in force for a sign, if the team has published one. */
export function londonLiveFile(panelId: string): LondonLiveFileVersion | null {
  return store[panelId] ?? null;
}

/** Changes whenever a live file is replaced, so cards repaint. */
export function londonLiveFileSignature(): string {
  return signature;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLondonLiveFiles(): LondonLiveFileMap {
  return useSyncExternalStore(
    subscribe,
    () => londonLiveFiles(),
    () => EMPTY,
  );
}

export function useLondonLiveFileSignature(): string {
  return useSyncExternalStore(
    subscribe,
    () => londonLiveFileSignature(),
    () => "",
  );
}
