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
