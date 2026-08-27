import { useSyncExternalStore } from "react";
/**
 * REPLACED BACKGROUND REGISTRY (module-global, not React state)
 *
 * When an admin replaces a background in the background directory / set editor,
 * that artwork must become the skin's ground EVERYWHERE — the slide stage, the
 * approved-style cards, the style-pack thumbnails, the module library previews,
 * the raster/PPTX/PDF exporters. React context only reached the surfaces that
 * happened to sit inside a provider, which is why a replaced S01 cover looked
 * right in the editor and stale in the library.
 *
 * The ground engine (`packGroundPaint`) is the one place every one of those
 * surfaces passes through, so the lookup lives here as plain module state and
 * the loader (SkinBackdropLibrary) publishes into it.
 */

let OVERRIDES: Record<string, string> = {};
let VERSION = 0;

const listeners = new Set<() => void>();

function key(code: string, scene: string, take: number) {
  return `${code.toUpperCase()}:${scene}:${take}`;
}

/** Publish the loaded replacement library. */
export function setSkinBackdropOverrides(map: Record<string, string>): void {
  OVERRIDES = map;
  VERSION += 1;
  for (const fn of listeners) fn();
}

/** Bumped on every publish so memoised surfaces can invalidate. */
export function skinBackdropOverrideVersion(): number {
  return VERSION;
}

export function onSkinBackdropOverrides(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function hasSkinBackdropOverrides(): boolean {
  return Object.keys(OVERRIDES).length > 0;
}

/**
 * Resolve the replacement image for a skin × scene × take.
 *
 * Fallback order: the exact composition, then take 0 of the same scene, then any
 * replaced take of that scene (an admin who replaced only "Take C" still expects
 * to see their artwork), then the skin's cover. Never crosses skins.
 */
export function skinBackdropOverride(
  skinCode: string | null | undefined,
  scene: string | null | undefined,
  take = 0,
): string | null {
  if (!skinCode || !scene) return null;
  const code = skinCode.toUpperCase();
  const exact = OVERRIDES[key(code, scene, take)];
  if (exact) return exact;
  const zero = OVERRIDES[key(code, scene, 0)];
  if (zero) return zero;
  const prefix = `${code}:${scene}:`;
  for (const k of Object.keys(OVERRIDES)) {
    if (k.startsWith(prefix)) return OVERRIDES[k]!;
  }
  return OVERRIDES[key(code, "cover", 0)] ?? null;
}

/** Scene + take parsed out of a `ground()` seed, matching the ground engine. */
export function sceneTakeFromSeed(seed: string): { take: number } {
  const m = /take:(\d+)/i.exec(seed);
  return { take: m ? parseInt(m[1]!, 10) : 0 };
}

/**
 * Re-render on replacement.
 *
 * Surfaces that paint through `packGroundPaint` (pack thumbnails, scene
 * galleries, slide chrome) subscribe so a saved replacement repaints them
 * immediately — the registry is plain module state, so nothing else would tell
 * React that the ground just changed.
 */
export function useSkinBackdropVersion(): number {
  return useSyncExternalStore(onSkinBackdropOverrides, skinBackdropOverrideVersion, () => 0);
}
