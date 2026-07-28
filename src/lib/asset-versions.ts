import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight, client-persisted history of assets generated from a specific
 * "Need one specific asset?" request on the brief page. Lets the user
 * regenerate the same request and switch between the resulting versions.
 */
export type AssetVersionReferences = {
  /** File names of the reference assets that steered this version. */
  fileNames: string[];
  /** Cached vision-pass guidance so a regeneration can reuse it verbatim. */
  guidance: string;
};

export type AssetVersion = {
  id: string;
  /** The verbatim request text the user typed. */
  request: string;
  /** Destinations produced for this version, human-readable. */
  matched: string[];
  /** Deck produced by this run. */
  deckId: string;
  version: number;
  createdAt: string;
  /** Reference assets applied to this version, reused by default on regenerate. */
  references?: AssetVersionReferences;
};

const KEY = "tp.asset-request-versions.v1";
const MAX = 24;
const EVENT = "tp:asset-versions-changed";

function read(): AssetVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as AssetVersion[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(next: AssetVersion[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, MAX)));
  } catch {
    /* quota / private mode — versions are non-critical */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function normalizeRequest(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recordAssetVersion(input: {
  request: string;
  matched: string[];
  deckId: string;
}): AssetVersion {
  const all = read();
  const siblings = all.filter(
    (v) => normalizeRequest(v.request) === normalizeRequest(input.request),
  );
  const entry: AssetVersion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    request: input.request.trim(),
    matched: input.matched,
    deckId: input.deckId,
    version: siblings.length + 1,
    createdAt: new Date().toISOString(),
  };
  write([entry, ...all]);
  return entry;
}

/** All versions for one request text, oldest → newest. */
export function useAssetVersions(request: string) {
  const [all, setAll] = useState<AssetVersion[]>([]);

  const sync = useCallback(() => setAll(read()), []);

  useEffect(() => {
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const key = normalizeRequest(request);
  const versions = key
    ? all.filter((v) => normalizeRequest(v.request) === key).sort((a, b) => a.version - b.version)
    : [];

  /** The most recent request the user generated, for the empty-input case. */
  const lastRequest = all[0]?.request ?? "";

  const clear = useCallback(() => {
    write(read().filter((v) => normalizeRequest(v.request) !== key));
  }, [key]);

  return { versions, lastRequest, allVersions: all, clear };
}
