import { useEffect, useState } from "react";

const STORAGE_KEY = "tp:contrast-boost";

/**
 * Auto-adjust readability mode. Persists across sessions in localStorage and
 * toggles the `.contrast-boost` class on <html> so every glass surface
 * (nav, cards, modals) thickens up together — no per-component wiring.
 *
 * Reads storage in useEffect (post-hydration) so SSR + CSR markup match; the
 * `.contrast-boost` class is applied to <html>, which is outside React's
 * hydration diff and therefore safe to mutate.
 */
export function useContrastBoost(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setEnabled(true);
    } catch {
      /* storage unavailable — stay off */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("contrast-boost", enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [enabled]);

  return [enabled, setEnabled];
}
