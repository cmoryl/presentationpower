import { useCallback, useEffect, useState } from "react";

/**
 * Reader-comfort setting for the canvas toolbars.
 *
 * The Studio toolbars are deliberately compact so they steal as little of the
 * slide stage as possible, which on a large or high-density display leaves the
 * labels small. This is a per-user preference — not a deck property — so it
 * lives in localStorage and applies to every deck the user opens on this
 * browser.
 *
 * The scale is applied as a CSS `transform: scale()` on the toolbar shell
 * rather than a font-size bump, so labels, glyph "icons", padding and hit areas
 * all grow together and the toolbar keeps its proportions at every step.
 */
export const TOOLBAR_SCALE_STEPS = [1, 1.15, 1.3, 1.5] as const;

export type ToolbarScale = (typeof TOOLBAR_SCALE_STEPS)[number];

const STORAGE_KEY = "tp.canvas.toolbarScale";
/** Cross-component sync: two toolbars can be mounted at once. */
const EVENT = "tp:toolbar-scale";

/** Exported for tests: any unknown/corrupt stored value reads as 100%. */
export function normalizeToolbarScale(v: unknown): ToolbarScale {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return (TOOLBAR_SCALE_STEPS as readonly number[]).includes(n) ? (n as ToolbarScale) : 1;
}

/** Exported for tests: the next step up, wrapping back to 100%. */
export function nextToolbarScale(current: unknown): ToolbarScale {
  const i = TOOLBAR_SCALE_STEPS.indexOf(normalizeToolbarScale(current));
  return TOOLBAR_SCALE_STEPS[(i + 1) % TOOLBAR_SCALE_STEPS.length]!;
}

function read(): ToolbarScale {
  if (typeof window === "undefined") return 1;
  try {
    return normalizeToolbarScale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 1;
  }
}

export function useToolbarScale() {
  // Starts at 1 on both server and first client render, then syncs in an effect:
  // reading localStorage in the initializer would hydration-mismatch.
  const [scale, setScale] = useState<ToolbarScale>(1);

  useEffect(() => {
    setScale(read());
    const sync = () => setScale(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const apply = useCallback((next: ToolbarScale) => {
    setScale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* private mode / storage disabled: the setting just won't persist */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const cycle = useCallback(() => apply(nextToolbarScale(read())), [apply]);

  return {
    scale,
    /** e.g. "115%" — for the control's label and its accessible name. */
    label: `${Math.round(scale * 100)}%`,
    setScale: apply,
    cycle,
  };
}
