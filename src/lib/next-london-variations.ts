// TransPerfect NEXT 2026 — London signage VARIATIONS.
//
// A pillar (or any other sign) often needs a second version: same board, same
// room, different treatment or different copy. This store lets the location team
// copy a sign that already exists in the kit and keep the copy alongside it as
// its own asset, with its own logo placement, board size and uploaded artwork.
//
// Variations live in this browser until a revision is published, exactly like
// the other unpublished edits, and they carry the source sign's current look at
// the moment they are made so the copy starts where the original stands.

import { useSyncExternalStore } from "react";

import {
  londonBoardSizes,
  resetLondonBoardSize,
  setLondonBoardSize,
  type LondonBoardSizeMap,
} from "@/lib/next-london-board-size";
import {
  londonLogoPlacements,
  resetLondonLogoPlacement,
  setLondonLogoPlacement,
} from "@/lib/next-london-logo-placement";
import { londonPlacedArt, setLondonPlacedArt } from "@/lib/next-london-placed-art";
import {
  resetStepRepeatConfig,
  setStepRepeatConfig,
  stepRepeatConfigs,
} from "@/lib/next-london-step-repeat";
import type { LondonPanel } from "@/lib/next-london-signage";

export type LondonVariation = {
  /** Panel id of the copy, e.g. `ldn-v49-var-2`. */
  id: string;
  /** Panel id it was copied from. */
  sourceId: string;
  /** Full sign name shown on the card. */
  name: string;
  /** Short label, e.g. "Version B". */
  label: string;
  /** Gradient treatment id at the time of copying (editable afterwards). */
  style: string;
  createdAt: string;
};

export type LondonVariationMap = Record<string, LondonVariation>;

const EMPTY: LondonVariationMap = {};
const STORAGE_KEY = "tp-next-london-variations-v1";
const CHANNEL = "tp-next-london-variations";
const MAX_PER_SOURCE = 12;

let store: LondonVariationMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

/** `Version B`, `Version C`, … for the nth copy of one sign. */
function versionLabel(index: number): string {
  const letters = "BCDEFGHIJKLMNOP";
  return `Version ${letters[Math.min(index, letters.length - 1)] ?? String(index + 2)}`;
}

function normalise(input: unknown): LondonVariation | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Partial<LondonVariation>;
  if (typeof v.id !== "string" || typeof v.sourceId !== "string") return null;
  if (!v.id || !v.sourceId) return null;
  return {
    id: v.id,
    sourceId: v.sourceId,
    name: typeof v.name === "string" && v.name ? v.name.slice(0, 160) : v.id,
    label: typeof v.label === "string" && v.label ? v.label.slice(0, 40) : "Version B",
    style: typeof v.style === "string" ? v.style : "",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
  };
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return;
    const next: LondonVariationMap = {};
    for (const value of Object.values(parsed)) {
      const clean = normalise(value);
      if (clean) next[clean.id] = clean;
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
    /* storage blocked — in-memory variations still render */
  }
  try {
    new BroadcastChannel(CHANNEL).postMessage({ variations: store });
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire */
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function londonVariations(): LondonVariationMap {
  hydrate();
  return store;
}

/** Every copy made from one sign, oldest first. */
export function londonVariationsOf(sourceId: string): LondonVariation[] {
  return Object.values(londonVariations())
    .filter((v) => v.sourceId === sourceId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isLondonVariation(panelId: string): boolean {
  return Boolean(londonVariations()[panelId]);
}

/**
 * Copy a sign into a new variation. The copy inherits the source's measured
 * board, saved logo placement and uploaded artwork, so it opens looking exactly
 * like the sign it came from and is edited independently from there.
 */
export function createLondonVariation(panel: LondonPanel): LondonVariation | null {
  const all = londonVariations();
  const source = all[panel.id]?.sourceId ?? panel.id;
  const existing = londonVariationsOf(source);
  if (existing.length >= MAX_PER_SOURCE) return null;
  // Take the first free slot rather than counting the copies that exist. After
  // deleting "Version B" of a pillar, the next copy must not be handed the id
  // that "Version C" is already using.
  let index = 0;
  while (index < MAX_PER_SOURCE && `${source}-var-${index + 2}` in all) index += 1;
  if (index >= MAX_PER_SOURCE) return null;
  const label = versionLabel(index);
  const id = `${source}-var-${index + 2}`;
  const baseName = panel.name.replace(/\s*\((?:VERSION|Version)[^)]*\)/g, "").trim();
  const variation: LondonVariation = {
    id,
    sourceId: source,
    name: `${baseName} (${label.toUpperCase()})`,
    label,
    style: panel.style,
    createdAt: new Date().toISOString(),
  };
  store = { ...londonVariations(), [id]: variation };
  persist();

  // Carry the source sign's current look across.
  const placement = londonLogoPlacements()[panel.id];
  if (placement) setLondonLogoPlacement(id, placement);
  const art = londonPlacedArt(panel.id);
  if (art) setLondonPlacedArt(id, art);
  const size = (londonBoardSizes() as LondonBoardSizeMap)[panel.id];
  if (size) setLondonBoardSize({ ...panel, id }, size);
  // A step-and-repeat wall's recipe is part of how it looks, so the copy keeps it.
  const repeat = stepRepeatConfigs()[panel.id];
  if (repeat) setStepRepeatConfig({ ...panel, id }, repeat);

  emit();
  return variation;
}

/**
 * Remove a variation. Every edit held against the copy's own id goes with it, so
 * a later copy that reuses the slot starts clean instead of inheriting a deleted
 * version's board size, logo move, artwork or step-and-repeat recipe.
 */
export function removeLondonVariation(id: string): void {
  const current = londonVariations();
  if (!(id in current)) return;
  const next = { ...current };
  delete next[id];
  store = next;
  persist();
  setLondonPlacedArt(id, null);
  resetLondonLogoPlacement(id);
  resetLondonBoardSize(id);
  resetStepRepeatConfig(id);
  emit();
}

/** Rename a variation's sign name. */
export function renameLondonVariation(id: string, name: string): void {
  const current = londonVariations()[id];
  if (!current) return;
  const clean = name.trim().slice(0, 160);
  if (!clean) return;
  store = { ...londonVariations(), [id]: { ...current, name: clean } };
  persist();
  emit();
}

/** Record a treatment change on a variation so it survives a reload. */
export function setLondonVariationStyle(id: string, style: string): void {
  const current = londonVariations()[id];
  if (!current || current.style === style) return;
  store = { ...londonVariations(), [id]: { ...current, style } };
  persist();
  emit();
}

/**
 * Expand a panel list with every variation made from it, each copy sitting
 * directly after the sign it came from so the schedule reads in order.
 */
export function withLondonVariations(
  panels: LondonPanel[],
  map: LondonVariationMap = londonVariations(),
): LondonPanel[] {
  const all = Object.values(map);
  if (all.length === 0) return panels;
  // Once a copy has been published it is part of the panel set in force, so it
  // arrives here already in the list. Adding it again would put two cards with
  // the same id in the schedule and two identical files in the vendor pack.
  const present = new Set(panels.map((panel) => panel.id));
  const out: LondonPanel[] = [];
  for (const panel of panels) {
    const own = map[panel.id];
    // A published copy still takes its name and treatment from the local record,
    // so renaming or restyling it shows immediately.
    out.push(own ? { ...panel, name: own.name, style: own.style || panel.style } : panel);
    const copies = all
      .filter((v) => v.sourceId === panel.id && !present.has(v.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const copy of copies) {
      out.push({
        ...panel,
        id: copy.id,
        name: copy.name,
        style: copy.style || panel.style,
      });
    }
  }
  return out;
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const incoming = (event.data as { variations?: LondonVariationMap } | null)?.variations;
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

/** React binding: re-renders whenever a variation is added, renamed or removed. */
export function useLondonVariations(): LondonVariationMap {
  return useSyncExternalStore(
    subscribe,
    () => londonVariations(),
    () => EMPTY,
  );
}
