/**
 * Scene debug mode — a runtime overlay switch that reveals WHICH visual layers
 * a module is currently rendering: active skin pack, backdrop scene, take,
 * composition, geometry, dashboard flow and chart grammar, plus whether an
 * AI backdrop image resolved for this skin × scene.
 *
 * Enabled by any of:
 *   - `?debug=scene` (or `?debugScene=1`) on the URL
 *   - `localStorage.lovable:debug-scene = "1"`
 *   - keyboard: Shift + D (toggles, persisted to localStorage)
 *
 * Purely presentational — no data reads, no persistence beyond the local flag.
 */

const STORAGE_KEY = "lovable:debug-scene";

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
    if (q.get("debug") === "scene" || q.get("debugScene") === "1") return true;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSceneDebug(on: boolean) {
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

export function toggleSceneDebug() {
  setSceneDebug(!enabled);
}

export function isSceneDebug() {
  return enabled;
}

/** Boots the URL/localStorage read + the Shift+D hotkey exactly once. */
export function bootSceneDebug(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!booted) {
    booted = true;
    enabled = readInitial();
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "D" && e.key !== "d") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      e.preventDefault();
      toggleSceneDebug();
    };
    window.addEventListener("keydown", onKey);
  }
  return () => {};
}

export function subscribeSceneDebug(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
