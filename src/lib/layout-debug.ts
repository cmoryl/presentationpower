/**
 * Layout debug mode — a build-time-free, runtime overlay switch used to verify
 * that decorative connectors (chain rails, promise lines, seams) stay inside
 * the GUTTERS between tiles and never cross a numeral, icon, image or copy
 * block.
 *
 * Enabled by any of:
 *   - `?debug=gutters` (or `?debugGutters=1`) on the URL
 *   - `localStorage.lovable:debug-gutters = "1"`
 *   - keyboard: Shift + G (toggles, persisted to localStorage)
 *
 * It is purely presentational: no data, no persistence beyond the local flag.
 */

const STORAGE_KEY = "lovable:debug-gutters";

let enabled = false;
let booted = false;
const listeners = new Set<(on: boolean) => void>();

function emit() {
  for (const fn of listeners) fn(enabled);
}

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    const flag = q.get("debug");
    if (flag === "gutters" || q.get("debugGutters") === "1") return true;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLayoutDebug(on: boolean) {
  enabled = on;
  try {
    if (typeof window !== "undefined") {
      if (on) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage unavailable — in-memory only */
  }
  emit();
}

export function toggleLayoutDebug() {
  setLayoutDebug(!enabled);
}

export function isLayoutDebug() {
  return enabled;
}

/** Boots the URL/localStorage read + the Shift+G hotkey exactly once. */
export function bootLayoutDebug(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!booted) {
    booted = true;
    enabled = readInitial();
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "G" && e.key !== "g") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      e.preventDefault();
      toggleLayoutDebug();
    };
    window.addEventListener("keydown", onKey);
  }
  return () => {};
}

export function subscribeLayoutDebug(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Selectors the overlay treats as connector/rail decoration. */
export const CONNECTOR_SELECTOR = "[data-chain-connector], [data-connector]";
/** Selectors the overlay treats as protected assets a connector must not cross. */
export const ASSET_SELECTOR =
  "[data-icon-well], [data-step-copy], [data-media-tile], [data-asset], img[data-media-kind]";
/** Selectors for tiles/columns whose in-between space forms the gutter. */
export const TILE_SELECTOR = "[data-step-tile], [data-gutter-tile]";
