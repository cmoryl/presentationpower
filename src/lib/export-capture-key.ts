// Fingerprint for a captured slide scene graph.
//
// The server-side (headless) PowerPoint export cannot render a slide — there is
// no browser in the worker. Instead it replays the scene graph the app captured
// from the REAL rendered component. That is only legitimate while the capture
// still describes the slide as it stands, so every capture carries a
// fingerprint of everything that can change its appearance. A mismatch means
// the capture is stale and the slide is reported as unsupported rather than
// exported from an out-of-date picture.

import type { Deck, DeckSlide } from "./deck-store";

/** Stable JSON: object keys sorted, so key order can never change the hash. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** FNV-1a — short, dependency-free and stable across browser and worker. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

export type CaptureContext = {
  brandModeId: string;
  subCompany?: string | null;
  stylePackId?: string | null;
  designRecipeId?: string | null;
};

export function captureContextOf(deck: Deck): CaptureContext {
  return {
    brandModeId: deck.brandModeId,
    subCompany: deck.subCompany ?? null,
    stylePackId: deck.context?.stylePackId ?? null,
    designRecipeId: deck.context?.designRecipeId ?? null,
  };
}

/**
 * Everything that changes how a slide LOOKS: its module, its layout, its copy,
 * its free canvas blocks, its per-slide template overrides, and the brand /
 * alternate look the deck is rendered in.
 */
export function slideCaptureFingerprint(
  slide: DeckSlide,
  ctx: CaptureContext,
  mode: "light" | "dark",
): string {
  const s = slide as unknown as Record<string, unknown>;
  return fnv1a(
    stableStringify({
      v: 1,
      mode,
      variantId: slide.variantId,
      layoutId: s["layoutId"] ?? null,
      sectionId: s["sectionId"] ?? null,
      content: slide.content ?? null,
      canvasBlocks: s["canvasBlocks"] ?? null,
      templateOverride: s["templateOverride"] ?? null,
      slideMode: s["mode"] ?? null,
      ctx,
    }),
  );
}
