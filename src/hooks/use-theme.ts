import { useEffect, useState } from "react";

export type ThemeMode = "cream" | "light" | "dark";
const STORAGE_KEY = "tp:theme-mode";

/**
 * App-wide theme. Persists to localStorage and applies:
 *  - `data-theme="cream|light|dark"` on <html>
 *  - `.dark` class on <html> (so Tailwind `dark:` variants + our overrides fire)
 *
 * Global overrides in styles.css re-map the hardcoded brand hexes
 * (#F5F1EA cream, #03002C ink, etc.) so pages that use arbitrary
 * Tailwind color classes still flip correctly per theme.
 */
export function useTheme(): [ThemeMode, (next: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("cream");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === "cream" || stored === "light" || stored === "dark") setMode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.classList.toggle("dark", mode === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  return [mode, setMode];
}
