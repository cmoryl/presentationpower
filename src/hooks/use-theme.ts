import { useEffect, useState } from "react";

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
  // SSR renders light; the inline boot script in __root already applied the
  // stored theme to <html> before paint, so we sync from the DOM (not storage)
  // on mount and never write storage during hydration.
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const applied =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      document.documentElement.classList.contains("dark")
        ? "dark"
        : readStoredMode();
    console.log("[theme] mount sync", applied);
    if (applied !== mode) setModeState(applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyMode = (next: ThemeMode) => {
    const root = document.documentElement;
    root.setAttribute("data-theme", next);
    root.classList.toggle("dark", next === "dark");
    // Element monogram favicon follows the theme: white-on-ink in dark,
    // ink-on-white in light. Also keep the browser UI chrome in sync.
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-theme-icon]');
    if (icon) icon.href = next === "dark" ? "/favicon-dark.png" : "/favicon-light.png";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = next === "dark" ? "#03002C" : "#FFFFFF";
  };

  useEffect(() => {
    applyMode(mode);
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
    applyMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new CustomEvent("tp:theme-change", { detail: next }));
    } catch {
      /* ignore */
    }
  };

  return [mode, setMode];
}
