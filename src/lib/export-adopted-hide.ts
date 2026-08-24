// -----------------------------------------------------------------------------
// Capture-time suppression of ADOPTED module sources
//
// A canvas block carrying `sourceSelector` is a MIRROR of a module element the
// user took over in the canvas editor. On screen `useHideAdoptedSources` hides
// that original so the block reads as "now movable" instead of duplicated.
//
// The PPTX capture never ran that pass, so the exported slide carried BOTH:
// the module's own glyphs (baked into the plate and re-emitted as measured
// native runs) AND the adopted mirror emitted by `placeCanvasBlocks`. That is
// exactly the "Live Demo / Live Demo" doubled title and the stray leftover
// plates seen in exported decks.
//
// This module applies the same hide directly to a settled offscreen stage,
// before the plate is rasterized and before runs are measured (the measurer
// skips `visibility: hidden`), so every adopted element ships exactly once.
// -----------------------------------------------------------------------------

import { matchAdoptedElement, resolveAdopted } from "./canvas-adopt";
import type { CanvasBlock } from "./deck-store";

/** Blocks that mirror a module element (adopted), including suppressed ones. */
function adoptedOf(blocks: readonly CanvasBlock[] | undefined | null): CanvasBlock[] {
  if (!blocks || blocks.length === 0) return [];
  return blocks.filter((b) => !!b.sourceSelector);
}

/**
 * Hide every module element that an adopted canvas block has taken over.
 * Returns a restore function. Safe to call with no blocks (no-op).
 */
export function hideAdoptedSourcesIn(
  root: Element | null | undefined,
  blocks: readonly CanvasBlock[] | undefined | null,
): () => void {
  const adopted = adoptedOf(blocks);
  if (!root || adopted.length === 0) return () => {};
  const touched: HTMLElement[] = [];
  const hide = (el: Element) => {
    const h = el as HTMLElement;
    if (h.style.visibility === "hidden") return;
    h.style.visibility = "hidden";
    touched.push(h);
  };
  for (const b of adopted) {
    const found = resolveAdopted(root, b.sourceSelector as string);
    if (found.length) {
      for (const el of found) hide(el);
      continue;
    }
    // The recorded nth-child path is relative to the surface that adopted the
    // element; the offscreen capture tree differs, so fall back to matching by
    // look + position — the same safety net the on-screen hider uses.
    const alt = matchAdoptedElement(root, b);
    if (alt) hide(alt);
  }
  return () => {
    for (const h of touched) h.style.visibility = "";
  };
}

/** Read `canvasBlocks` off an untyped slide object (the capture args are `unknown`). */
export function canvasBlocksOf(slide: unknown): CanvasBlock[] | undefined {
  if (!slide || typeof slide !== "object") return undefined;
  const blocks = (slide as { canvasBlocks?: unknown }).canvasBlocks;
  return Array.isArray(blocks) ? (blocks as CanvasBlock[]) : undefined;
}
