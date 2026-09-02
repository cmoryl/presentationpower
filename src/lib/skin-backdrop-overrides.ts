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
/**
 * ARTIFACT GUARD — has the replacement library settled yet?
 *
 * Until the loader has answered, `skinBackdropOverride()` can only return null,
 * so every ground would paint the skin's *pre-replacement* artwork for the
 * first few hundred milliseconds. That is exactly the "old background" flash
 * admins saw when Template Studio opened. Surfaces read `useSkinBackdropsReady`
 * and hold the ground plane (field only) until the truth is known.
 */
let READY = typeof window === "undefined"; // SSR/export paths publish synchronously

const listeners = new Set<() => void>();

function key(code: string, scene: string, take: number) {
  return `${code.toUpperCase()}:${scene}:${take}`;
}

/** Publish the loaded replacement library. */
export function setSkinBackdropOverrides(map: Record<string, string>, ready = true): void {
  OVERRIDES = map;
  if (ready) READY = true;
  VERSION += 1;
  for (const fn of listeners) fn();
}

/** True once the replacement library has loaded (or failed) at least once. */
export function skinBackdropsReady(): boolean {
  return READY;
}

export function markSkinBackdropsLoaded(): void {
  if (READY) return;
  READY = true;
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

/* ── module-scoped replacements ────────────────────────────────────────────
 * An admin looking at ONE module inside a look ("Spatial Clarity → Bento 5")
 * can replace the background for that module alone. Those records live in the
 * same table, keyed by a synthetic scene `mod:<variant-id>`, so persistence,
 * the public proxy, cache-busting and every consumer of this registry work
 * unchanged. A module key always outranks the skin's scene key.
 * ───────────────────────────────────────────────────────────────────────── */

/** Synthetic scene name that scopes a replacement to one module variant. */
export function moduleScene(variantId: string): string {
  return `mod:${String(variantId).trim().toUpperCase()}`;
}

/** True for a module-scoped scene name. */
export function isModuleScene(scene: string | null | undefined): boolean {
  return !!scene && /^mod:[A-Za-z0-9_-]{2,64}$/.test(scene);
}

/**
 * Module variant id carried in a ground seed.
 *
 * `VariantRenderer` publishes `mod:<variant-id>` into the scene seed, which is
 * the only channel that reaches the ground engine, the slide chrome and the
 * rasterisers alike.
 */
export function moduleIdFromSeed(seed: string | null | undefined): string | null {
  if (!seed) return null;
  const m = /\bmod:([A-Za-z0-9_-]{2,64})/.exec(seed);
  return m ? m[1]!.toUpperCase() : null;
}

/**
 * Resolve the replacement image for a skin × scene × take.
 *
 * A module-scoped replacement (when `moduleId` is known) wins outright. Then:
 * the exact composition, then take 0 of the same scene, then any replaced take
 * of that scene (an admin who replaced only "Take C" still expects to see their
 * artwork), then the skin's cover. Never crosses skins.
 */
export function skinBackdropOverride(
  skinCode: string | null | undefined,
  scene: string | null | undefined,
  take = 0,
  moduleId?: string | null,
): string | null {
  if (!skinCode) return null;
  const code = skinCode.toUpperCase();
  if (moduleId) {
    const ms = moduleScene(moduleId);
    const exactMod = OVERRIDES[key(code, ms, take)] ?? OVERRIDES[key(code, ms, 0)];
    if (exactMod) return exactMod;
    const modPrefix = `${code}:${ms}:`;
    for (const k of Object.keys(OVERRIDES)) {
      if (k.startsWith(modPrefix)) return OVERRIDES[k]!;
    }
  }
  if (!scene) return null;
  const exact = OVERRIDES[key(code, scene, take)];
  if (exact) return exact;
  const zero = OVERRIDES[key(code, scene, 0)];
  if (zero) return zero;
  const prefix = `${code}:${scene}:`;
  for (const k of Object.keys(OVERRIDES)) {
    if (k.startsWith(prefix)) return OVERRIDES[k]!;
  }
  const cover = OVERRIDES[key(code, "cover", 0)];
  return cover ?? null;
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

/**
 * Ground gate. False only while the replacement library is still in flight, so
 * a preview never paints a superseded background before the truth arrives.
 */
export function useSkinBackdropsReady(): boolean {
  return useSyncExternalStore(onSkinBackdropOverrides, skinBackdropsReady, () => true);
}
