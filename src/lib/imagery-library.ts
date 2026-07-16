// Master imagery library — merges built-in division backdrops with user
// curation (include/exclude), custom uploads, and AI-generated images.
// User state is persisted in localStorage keyed by brand id, and every
// image can carry "memory" tags/notes that flow into AI search + future
// generation prompts so the pool cohesively evolves per brand.

import { useSyncExternalStore } from "react";
import { getDivisionImagery } from "@/assets/backdrops/divisions";
import { BRAND_MODES } from "@/lib/taxonomy";
import { BRAND_GUIDES } from "@/lib/brand-guides";

const STORAGE_KEY = "tp.imagery-library.v1";

export type ImageKind = "photo" | "abstract" | "generated" | "upload";

export type ImageEntry = {
  id: string;
  url: string; // http(s) or data:
  kind: ImageKind;
  source: "builtin" | "upload" | "ai";
  tags: string[]; // memory tags — flow into AI prompts + search
  note?: string;
  createdAt: number;
  prompt?: string; // for AI-generated
};

type BrandLibraryState = {
  disabled: string[]; // ids turned off
  custom: ImageEntry[];
};

type Store = Record<string, BrandLibraryState>;

// ─── Persistence ─────────────────────────────────────────────────────────
function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

let cache: Store = loadStore();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getBrandState(brandId: string): BrandLibraryState {
  return cache[brandId] ?? { disabled: [], custom: [] };
}

// ─── Built-in entries ────────────────────────────────────────────────────
function builtinEntries(brandId: string): ImageEntry[] {
  const set = getDivisionImagery(brandId);
  const entries: ImageEntry[] = [];
  set.photos.forEach((url, i) =>
    entries.push({
      id: `${brandId}:photo:${i}`,
      url,
      kind: "photo",
      source: "builtin",
      tags: ["photo", "editorial"],
      createdAt: 0,
    }),
  );
  set.abstracts.forEach((url, i) =>
    entries.push({
      id: `${brandId}:abstract:${i}`,
      url,
      kind: "abstract",
      source: "builtin",
      tags: ["abstract", "atmospheric"],
      createdAt: 0,
    }),
  );
  return entries;
}

// ─── Public API ──────────────────────────────────────────────────────────
export function getAllEntries(brandId: string): ImageEntry[] {
  return [...builtinEntries(brandId), ...getBrandState(brandId).custom];
}

export function getActiveEntries(brandId: string): ImageEntry[] {
  const disabled = new Set(getBrandState(brandId).disabled);
  return getAllEntries(brandId).filter((e) => !disabled.has(e.id));
}

export function isDisabled(brandId: string, id: string): boolean {
  return getBrandState(brandId).disabled.includes(id);
}

export function toggleEnabled(brandId: string, id: string) {
  const s = getBrandState(brandId);
  const next = new Set(s.disabled);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  cache = { ...cache, [brandId]: { ...s, disabled: Array.from(next) } };
  persist();
}

export function addCustomEntry(brandId: string, entry: Omit<ImageEntry, "id" | "createdAt">) {
  const s = getBrandState(brandId);
  const full: ImageEntry = {
    ...entry,
    id: `${brandId}:${entry.source}:${crypto.randomUUID().slice(0, 8)}`,
    createdAt: Date.now(),
  };
  cache = { ...cache, [brandId]: { ...s, custom: [full, ...s.custom] } };
  persist();
  return full;
}

export function removeEntry(brandId: string, id: string) {
  const s = getBrandState(brandId);
  cache = {
    ...cache,
    [brandId]: {
      disabled: s.disabled.filter((d) => d !== id),
      custom: s.custom.filter((c) => c.id !== id),
    },
  };
  persist();
}

export function updateEntryMemory(brandId: string, id: string, patch: { tags?: string[]; note?: string }) {
  const s = getBrandState(brandId);
  // Built-in entries: create a shadow custom overlay is complex; instead we
  // store memory patches on a mirrored id in custom (source stays "builtin"
  // via a lightweight marker on tags). Simpler: only allow memory edits on
  // custom entries. Built-ins carry static tags from imagery pipeline.
  const custom = s.custom.map((c) =>
    c.id === id
      ? { ...c, tags: patch.tags ?? c.tags, note: patch.note !== undefined ? patch.note : c.note }
      : c,
  );
  cache = { ...cache, [brandId]: { ...s, custom } };
  persist();
}

// ─── Brand context for AI generation ─────────────────────────────────────
export function getBrandContext(brandId: string) {
  const brand = BRAND_MODES.find((b) => b.id === brandId);
  const guide =
    BRAND_GUIDES.find((g) => g.divisionId === brandId) ??
    BRAND_GUIDES.find((g) => g.divisionId === "master");
  return {
    name: brand?.name ?? "TransPerfect",
    description: brand?.description ?? "",
    tokens: brand?.tokens,
    tagline: guide?.tagline,
    intro: guide?.intro,
    photography: guide?.photography,
    brandVisuals: guide?.brandVisuals,
    primaryColors: guide?.primaryColors?.map((c) => c.hex) ?? [],
  };
}

/** Aggregates memory tags/notes across the active library into a hint blob
 *  the AI generator uses to keep new imagery cohesive with existing pool. */
export function aggregateMemory(brandId: string): { tags: string[]; notes: string[] } {
  const active = getActiveEntries(brandId);
  const tags = new Set<string>();
  const notes: string[] = [];
  active.forEach((e) => {
    e.tags.forEach((t) => tags.add(t));
    if (e.note) notes.push(e.note);
  });
  return { tags: Array.from(tags), notes };
}

// ─── React hook ──────────────────────────────────────────────────────────
export function useBrandLibrary(brandId: string) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${brandId}:${JSON.stringify(cache[brandId] ?? {})}`,
    () => `${brandId}:empty`,
  );
  // snapshot value only exists to trigger re-renders
  void snapshot;
  return {
    all: getAllEntries(brandId),
    active: getActiveEntries(brandId),
    isDisabled: (id: string) => isDisabled(brandId, id),
    toggle: (id: string) => toggleEnabled(brandId, id),
    add: (e: Omit<ImageEntry, "id" | "createdAt">) => addCustomEntry(brandId, e),
    remove: (id: string) => removeEntry(brandId, id),
    updateMemory: (id: string, p: { tags?: string[]; note?: string }) => updateEntryMemory(brandId, id, p),
  };
}
