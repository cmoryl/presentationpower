import { useEffect, useRef, useState } from "react";

export type ThemeMode = "light" | "dark";
const STORAGE_KEY = "tp:theme-mode";

/**
 * App-wide theme. Persists to localStorage and applies:
 *  - `data-theme="light|dark"` on <html>
 *  - `.dark` class on <html> (so Tailwind `dark:` variants + our overrides fire)
 *
 * Global overrides in styles.css re-map the hardcoded brand hexes
 * (#F5F1EA cream, #03002C ink, etc.) so pages that use arbitrary
 * Tailwind color classes still flip correctly per theme.
 */
function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "light";
}

export function useTheme(): [ThemeMode, (next: ThemeMode) => void] {
  // SSR-safe: start on light during server render, then sync from localStorage
  // on the first client effect. Reading in useState would hydration-mismatch;
  // instead we hydrate to the stored value once and let multiple useTheme
  // instances agree on the same value before any write occurs.
  const [mode, setModeState] = useState<ThemeMode>("light");
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStoredMode();
    if (stored !== mode) setModeState(stored);
  }, [mode]);

  useEffect(() => {
    if (!hydrated.current) return; // don't overwrite storage before hydration
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.classList.toggle("dark", mode === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // Cross-instance sync: when one useTheme setter fires, other instances
  // pick it up via a custom event so their local state stays consistent.
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail;
      if (next && next !== mode) setModeState(next);
    };
    window.addEventListener("tp:theme-change", onChange as EventListener);
    return () => window.removeEventListener("tp:theme-change", onChange as EventListener);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent("tp:theme-change", { detail: next }));
    } catch {
      /* ignore */
    }
  };

  return [mode, setMode];
}
