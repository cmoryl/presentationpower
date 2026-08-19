/**
 * Authoring-chrome suppression for exports.
 *
 * Editing affordances (dashed safe-area / bleed guides, hero resize rails,
 * click-to-edit outlines, icon-swap hints, selection rings) live in the same
 * DOM we rasterize for PNG / PDF export. Without suppression they end up
 * baked into printed artifacts.
 *
 * `beginExportChrome()` adds a single class to <html>; CSS in src/styles.css
 * hides everything marked `data-export-ignore="true"` / `data-editing-chrome`
 * and strips the outlines added by the live-edit and icon-slot layers. The
 * returned function restores the previous state. Calls nest safely.
 */

const CLASS = "tp-export-capture";
let depth = 0;

export function beginExportChrome(): () => void {
  if (typeof document === "undefined") return () => {};
  depth += 1;
  document.documentElement.classList.add(CLASS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth === 0) document.documentElement.classList.remove(CLASS);
  };
}

/** True while a capture is in progress (components may skip chrome renders). */
export function isExportingChrome(): boolean {
  return depth > 0;
}

/**
 * Run `fn` with authoring chrome suppressed, releasing on every exit path.
 * Use this for ANY export path that reads or rasterizes live DOM (PNG, PDF,
 * PPTX plates, zip kits) so guides never land in a delivered file.
 */
export async function withExportChrome<T>(fn: () => Promise<T> | T): Promise<T> {
  const release = beginExportChrome();
  try {
    return await fn();
  } finally {
    release();
  }
}

/** Attributes/classes that mark an element as authoring-only chrome. */
const CHROME_SELECTOR = [
  '[data-export-ignore="true"]',
  "[data-editing-chrome]",
  "[data-canvas-guide]",
  "[data-safe-area-guide]",
  "[data-bleed-guide]",
  "[data-resize-handle]",
  "[data-selection-ring]",
].join(",");

/**
 * True when the element (or an ancestor) is an authoring affordance that must
 * never be measured, decomposed, or rasterized into an export.
 */
export function isAuthoringChrome(el: Element | null | undefined): boolean {
  if (!el) return false;
  try {
    return !!el.closest?.(CHROME_SELECTOR);
  } catch {
    return false;
  }
}

/** html-to-image `filter` that drops authoring chrome from any capture. */
export function exportNodeFilter(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !isAuthoringChrome(node);
}

