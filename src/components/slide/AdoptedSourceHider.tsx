import { useEffect } from "react";
import type { CanvasBlock } from "@/lib/deck-store";
import { matchAdoptedElement, resolveAdopted } from "@/lib/canvas-adopt";

/**
 * Hide the module elements that adopted canvas blocks have taken over.
 *
 * Adoption records a DOM path, not a content edit, so the module renderer stays
 * untouched: this pass simply makes the original invisible (visibility, not
 * display — layout must not reflow around the hole) for as long as the block
 * exists. Deleting the block restores the section automatically.
 *
 * The hide is an inline style on renderer-owned nodes, so any re-render that
 * replaces those nodes (live text edits, field changes, layout swaps) drops it
 * and the original would pop back out from under its adopted copy — reading as
 * duplicated text. A MutationObserver re-applies the hide after every such
 * repaint.
 *
 * Used by the interactive editor and by every read-only surface (thumbnails,
 * present, share) so what you drag is what the audience sees.
 */
export function useHideAdoptedSources(
  rootRef: React.RefObject<HTMLElement | null>,
  blocks: readonly CanvasBlock[] | undefined,
  /** Resolve paths against the ref's PARENT (for overlays mounted in a stage). */
  fromParent = false,
) {
  const adopted = (blocks ?? []).filter((b) => !!b.sourceSelector);
  // Signature key: re-runs the effect when the adopted set, its text or its
  // geometry changes, since the fallback matcher keys off exactly those.
  const selectors = adopted
    .map((b) => `${b.sourceSelector}~${b.kind}~${(b.text ?? "").trim()}~${b.x},${b.y},${b.w},${b.h}`)
    .join("|");

  useEffect(() => {
    const self = rootRef.current;
    const root = fromParent ? self?.parentElement : self;
    if (!root) return;
    const touched = new Set<HTMLElement>();

    let raf = 0;
    const hide = (el: Element) => {
      const h = el as HTMLElement;
      if (h.style.visibility === "hidden") return;
      h.style.visibility = "hidden";
      touched.add(h);
    };
    const apply = () => {
      for (const b of adopted) {
        const found = resolveAdopted(root, b.sourceSelector as string);
        if (found.length) {
          for (const el of found) hide(el);
          continue;
        }
        // Path missed on this surface (different wrapper tree, re-render, layout
        // swap): fall back to matching the source by look + position so the
        // original never shows through its adopted copy.
        const alt = matchAdoptedElement(root, b);
        if (alt) hide(alt);
      }
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    apply();

    let mo: MutationObserver | undefined;
    if (adopted.length > 0) {
      mo = new MutationObserver(schedule);
      mo.observe(root, { subtree: true, childList: true, characterData: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      mo?.disconnect();
      for (const h of touched) h.style.visibility = "";
    };
  }, [rootRef, selectors, fromParent]);
}
