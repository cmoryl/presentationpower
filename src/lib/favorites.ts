// Shared favorites store.
//
// TRACE (July 2026): the library route has historically stored "pinned
// variants" in localStorage under `library.pinnedVariants.v1`. The UI
// tooltips already call this "Favorites" — so favorites DO exist for
// module variants, per-device (not per-user). This module reuses that
// exact key so the star button in the library and every downstream
// surface (social kit builder, etc.) see the same set. No DB table.
//
// If we later promote favorites to per-user via Supabase, this is the one
// place to change — the hook signature stays stable.

import { useCallback, useEffect, useState } from "react";

export const FAVORITES_KEY = "library.pinnedVariants.v1";

export function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

export function writeFavorites(next: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
  } catch {
    /* quota */
  }
  // Notify other listeners in the same tab.
  try {
    window.dispatchEvent(new CustomEvent("favorites:changed"));
  } catch {
    /* ignore */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setFavorites(readFavorites());
    const sync = () => setFavorites(readFavorites());
    window.addEventListener("favorites:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("favorites:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavorites(next);
      return next;
    });
  }, []);
  return { favorites, toggle } as const;
}
