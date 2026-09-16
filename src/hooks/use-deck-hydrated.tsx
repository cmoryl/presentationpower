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

export function DeckHydratingFallback({
  label = "Loading deck…",
  hint = "This takes a few seconds the first time — your slides open in the browser.",
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
        <span
          aria-hidden
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-black/30 border-t-transparent dark:border-white/40 dark:border-t-transparent"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-black/75 dark:text-white/75">{label}</span>
          <span className="block text-xs text-black/45 dark:text-white/45">{hint}</span>
        </span>
      </div>
      {/* Shape of the editor underneath, so the wait reads as "nearly there". */}
      <div className="animate-pulse flex flex-col gap-6 lg:flex-row">
        <div className="h-[420px] w-full shrink-0 rounded-2xl bg-black/5 lg:w-56 dark:bg-white/10" />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="aspect-video w-full rounded-2xl bg-black/5 dark:bg-white/10" />
          <div className="h-24 rounded-2xl bg-black/5 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
