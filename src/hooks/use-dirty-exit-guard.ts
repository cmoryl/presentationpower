import { useEffect } from "react";

/**
 * Shared "you have unsaved work" guard for every editing surface that keeps a
 * local draft (canvas studios, print master editors, sample studio).
 *
 * The deck editor has a richer, router-aware guard of its own
 * (`use-unsaved-deck-guard`), which also autosaves to the cloud. Surfaces that
 * only save on an explicit press had no protection at all, so a stray reload or
 * tab close silently threw the edit away. This hook is the minimum shared
 * contract: while the draft is dirty, the browser asks before unloading.
 */
export function useDirtyExitGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers still key off the return value.
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
