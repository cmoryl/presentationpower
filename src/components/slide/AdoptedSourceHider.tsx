import { useEffect } from "react";
import type { CanvasBlock } from "@/lib/deck-store";
import { resolveAdopted } from "@/lib/canvas-adopt";

/**
 * Hide the module elements that adopted canvas blocks have taken over.
 *
 * Adoption records a DOM path, not a content edit, so the module renderer stays
 * untouched: this pass simply makes the original invisible (visibility, not
 * display — layout must not reflow around the hole) for as long as the block
 * exists. Deleting the block restores the section automatically.
 *
 * Used by the interactive editor and by every read-only surface (thumbnails,
 * present, share) so what you drag is what the audience sees.
 */
export function useHideAdoptedSources(
  rootRef: React.RefObject<HTMLElement | null>,
  blocks: readonly CanvasBlock[] | undefined,
) {
  const selectors = (blocks ?? [])
    .map((b) => b.sourceSelector)
    .filter((s): s is string => !!s)
    .join("|");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const touched: HTMLElement[] = [];
    for (const sel of selectors ? selectors.split("|") : []) {
      for (const el of resolveAdopted(root, sel)) {
        const h = el as HTMLElement;
        if (h.style.visibility === "hidden") continue;
        h.style.visibility = "hidden";
        touched.push(h);
      }
    }
    return () => {
      for (const h of touched) h.style.visibility = "";
    };
  }, [rootRef, selectors]);
}
