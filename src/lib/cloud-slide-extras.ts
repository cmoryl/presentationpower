// Round-trip helper for per-slide authoring state that has no dedicated column
// in `deck_slides`. Everything listed here is folded into the slide's JSON
// content under `__extras` on save and restored on load, so saving a deck to
// the cloud can never silently drop canvas blocks, transitions, ink overrides,
// layer settings, or appearance modes.

import type { DeckSlide } from "@/lib/deck-store";

export const SLIDE_EXTRA_KEYS = [
  "logoPosition",
  "logoOrientation",
  "mode",
  "canvasBlocks",
  "inkOverrides",
  "inkScopeOverrides",
  "textFormats",
  "transition",
  "templateOverride",
  "statLayout",
  "layers",
  "hidden",
] as const;

/** Pick the authoring extras off a slide (undefined values omitted). */
export function pickSlideExtras(slide: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SLIDE_EXTRA_KEYS) {
    const v = slide[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Split a persisted slide `content` blob into real content plus the private
 * bookkeeping keys (`__localId`, `__changes`, `__extras`).
 */
export function splitSlideContent(raw: Record<string, unknown> | null | undefined) {
  const c = { ...((raw ?? {}) as Record<string, unknown>) };
  const localId = typeof c["__localId"] === "string" ? (c["__localId"] as string) : undefined;
  const changes = Array.isArray(c["__changes"]) ? (c["__changes"] as unknown[]) : [];
  const extrasRaw = c["__extras"];
  const extras =
    extrasRaw && typeof extrasRaw === "object" && !Array.isArray(extrasRaw)
      ? (extrasRaw as Record<string, unknown>)
      : {};
  delete c["__localId"];
  delete c["__changes"];
  delete c["__extras"];
  return { content: c, localId, changes, extras };
}

/** Re-apply saved extras onto a rebuilt slide. */
export function applySlideExtras<T extends Partial<DeckSlide>>(
  slide: T,
  extras: Record<string, unknown>,
): T {
  return { ...slide, ...extras } as T;
}
