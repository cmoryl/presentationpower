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
  removed?: string[]; // built-in ids the user has deleted (soft delete)
  custom: ImageEntry[];
  usage?: Record<string, { count: number; lastUsedAt: number }>;
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
  return cache[brandId] ?? { disabled: [], custom: [], usage: {}, removed: [] };
}

// ─── Usage tracking ──────────────────────────────────────────────────────
export function recordUsage(brandId: string, id: string) {
  const s = getBrandState(brandId);
  const usage = { ...(s.usage ?? {}) };
  const prev = usage[id] ?? { count: 0, lastUsedAt: 0 };
  usage[id] = { count: prev.count + 1, lastUsedAt: Date.now() };
  cache = { ...cache, [brandId]: { ...s, usage } };
  persist();
}

export function getUsage(brandId: string): Record<string, { count: number; lastUsedAt: number }> {
  return getBrandState(brandId).usage ?? {};
}

export type ImageryAnalytics = {
  totals: { active: number; muted: number; builtin: number; uploads: number; generated: number };
  usageTotal: number;
  uniqueUsed: number;
  topUsed: Array<{ entry: ImageEntry; count: number; lastUsedAt: number }>;
  recent: ImageEntry[];
  prompts: Array<{ entry: ImageEntry; prompt: string; createdAt: number; count: number }>;
};

export function computeAnalytics(brandId: string): ImageryAnalytics {
  const all = getAllEntries(brandId);
  const disabled = new Set(getBrandState(brandId).disabled);
  const usage = getUsage(brandId);
  const byId = new Map(all.map((e) => [e.id, e]));

  const usageRows = Object.entries(usage)
    .map(([id, v]) => ({ entry: byId.get(id), count: v.count, lastUsedAt: v.lastUsedAt }))
    .filter((r): r is { entry: ImageEntry; count: number; lastUsedAt: number } => !!r.entry)
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt);

  const usageTotal = usageRows.reduce((s, r) => s + r.count, 0);

  const recent = [...all]
    .filter((e) => e.createdAt > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const prompts = all
    .filter((e) => !!e.prompt)
    .map((e) => ({
      entry: e,
      prompt: e.prompt ?? "",
      createdAt: e.createdAt,
      count: usage[e.id]?.count ?? 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  return {
    totals: {
      active: all.length - disabled.size,
      muted: disabled.size,
      builtin: all.filter((e) => e.source === "builtin").length,
      uploads: all.filter((e) => e.source === "upload").length,
      generated: all.filter((e) => e.source === "ai").length,
    },
    usageTotal,
    uniqueUsed: usageRows.length,
    topUsed: usageRows.slice(0, 5),
    recent,
    prompts,
  };
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
  const state = getBrandState(brandId);
  const removed = new Set(state.removed ?? []);
  const builtins = builtinEntries(brandId).filter((e) => !removed.has(e.id));
  return [...builtins, ...state.custom];
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

/** Delete any image from the brand library. Built-in images are soft-deleted
 *  (tracked in `removed`) so they can be restored later; custom entries are
 *  purged outright. Also clears any related disabled/usage bookkeeping. */
export function removeEntry(brandId: string, id: string) {
  const s = getBrandState(brandId);
  const isBuiltin = builtinEntries(brandId).some((e) => e.id === id);
  const usage = { ...(s.usage ?? {}) };
  delete usage[id];
  cache = {
    ...cache,
    [brandId]: {
      disabled: s.disabled.filter((d) => d !== id),
      custom: isBuiltin ? s.custom : s.custom.filter((c) => c.id !== id),
      removed: isBuiltin
        ? Array.from(new Set([...(s.removed ?? []), id]))
        : s.removed ?? [],
      usage,
    },
  };
  persist();
}

/** List built-in ids currently soft-deleted for this brand. */
export function getRemovedBuiltins(brandId: string): ImageEntry[] {
  const removed = new Set(getBrandState(brandId).removed ?? []);
  if (removed.size === 0) return [];
  return builtinEntries(brandId).filter((e) => removed.has(e.id));
}

/** Restore a single soft-deleted built-in. */
export function restoreEntry(brandId: string, id: string) {
  const s = getBrandState(brandId);
  const removed = (s.removed ?? []).filter((r) => r !== id);
  cache = { ...cache, [brandId]: { ...s, removed } };
  persist();
}

/** Restore every soft-deleted built-in for this brand. */
export function restoreAllBuiltins(brandId: string) {
  const s = getBrandState(brandId);
  cache = { ...cache, [brandId]: { ...s, removed: [] } };
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

// ─── Prompt-based recommendation ─────────────────────────────────────────
const STOP = new Set([
  "the","a","an","and","or","of","for","to","with","in","on","at","by","is","are","be",
  "as","this","that","it","its","from","into","about","over","under","new","some","any",
  "our","your","their","his","her","we","you","they","i","me","my","us","them",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export type ImageMatch = {
  entry: ImageEntry;
  score: number;
  reasons: string[];
};

/** Rank existing (active) library entries against a search prompt using brand
 *  guideline context + per-image memory (tags, notes, generation prompt). */
export function recommendImagery(
  brandId: string,
  userPrompt: string,
  limit = 4,
): ImageMatch[] {
  const active = getActiveEntries(brandId);
  const usage = getUsage(brandId);
  const ctx = getBrandContext(brandId);

  const queryTokens = new Set(tokenize(userPrompt));
  if (queryTokens.size === 0) return [];

  // Brand context tokens quietly boost matches that also align with brand direction.
  const brandTokens = new Set<string>([
    ...tokenize(ctx.name),
    ...tokenize(ctx.description ?? ""),
    ...tokenize(ctx.tagline ?? ""),
    ...tokenize(ctx.photography ?? ""),
    ...tokenize(ctx.brandVisuals ?? ""),
  ]);

  const scored: ImageMatch[] = active.map((e) => {
    const reasons: string[] = [];
    let score = 0;

    // Tag overlap — strongest signal, memory is curated per image.
    const tagMatches = e.tags.filter((t) => queryTokens.has(t.toLowerCase()));
    if (tagMatches.length) {
      score += tagMatches.length * 4;
      reasons.push(`tags: ${tagMatches.join(", ")}`);
    }

    // Note text overlap.
    if (e.note) {
      const noteTokens = tokenize(e.note);
      const hits = noteTokens.filter((t) => queryTokens.has(t));
      if (hits.length) {
        score += hits.length * 3;
        reasons.push(`note: ${hits.slice(0, 3).join(", ")}`);
      }
    }

    // Prior generation prompt overlap (AI-generated images).
    if (e.prompt) {
      const promptTokens = tokenize(e.prompt);
      const hits = promptTokens.filter((t) => queryTokens.has(t));
      if (hits.length) {
        score += hits.length * 2;
        reasons.push(`prior prompt: ${hits.slice(0, 3).join(", ")}`);
      }
    }

    // Kind alignment.
    for (const q of queryTokens) {
      if (q === e.kind) {
        score += 2;
        reasons.push(`${e.kind} kind`);
        break;
      }
    }

    // Brand-guideline resonance — small tie-breaker so on-brand imagery wins
    // when raw match scores are close.
    const brandHits = e.tags.filter((t) => brandTokens.has(t.toLowerCase())).length;
    if (brandHits) score += brandHits * 0.5;

    // Usage popularity — tiny nudge for images the team already reaches for.
    const used = usage[e.id]?.count ?? 0;
    if (used) score += Math.min(used, 5) * 0.2;

    return { entry: e, score, reasons };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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
    recordUsage: (id: string) => recordUsage(brandId, id),
    analytics: computeAnalytics(brandId),
    usage: getUsage(brandId),
  };
}
