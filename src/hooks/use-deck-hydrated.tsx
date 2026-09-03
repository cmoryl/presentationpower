// Bridges Zustand `persist` rehydration to React render.
// Returns true once localStorage has been merged into the store (client-only).
// During SSR and the first client render before rehydration completes, returns
// false so route components can render a loading state instead of throwing
// notFound() on decks that only live in localStorage.

import { useEffect, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";

export function useDeckHydrated(): boolean {
  // Always false for the first render on BOTH server and client: reading the
  // persisted store in the initializer makes the client's first paint disagree
  // with the SSR HTML and React throws a hydration mismatch. The effect below
  // flips it immediately after mount, so there is no visible delay.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useDeckStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useDeckStore.persist.onFinishHydration(() => setHydrated(true));
    return () => {
      unsub();
    };
  }, []);

  return hydrated;
}

export function DeckHydratingFallback({ label = "Loading deck…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-10 text-sm text-black/50 dark:text-white/50">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
