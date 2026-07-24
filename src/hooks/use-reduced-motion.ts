import { useEffect, useState } from "react";

/**
 * Reactive `prefers-reduced-motion: reduce` hook. SSR-safe: returns `false`
 * on the server and until the first client effect runs.
 *
 * Consumers should use this to SKIP scheduling animation work (rAF loops,
 * setInterval rotations, JS-driven transforms) — not just to hide output.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    // Safari <14 uses addListener/removeListener.
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);
  return reduced;
}
