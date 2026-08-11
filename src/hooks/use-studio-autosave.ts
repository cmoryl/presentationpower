import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Crash / refresh protection for the Slide Studio.
 *
 * Curated sample edits only reach the database when an admin presses
 * "Save sample", so a stray refresh used to throw the work away. This hook
 * mirrors the in-progress draft into localStorage (debounced, browser-only)
 * and — on the next open — surfaces it as an explicit restore offer rather
 * than silently replacing what the server returned. The user decides which
 * version wins, so autosave can never overwrite a published sample by
 * accident.
 */

const PREFIX = "lovable:slide-studio-draft:";
const DEBOUNCE_MS = 700;
/** Drafts older than this are stale enough to be noise, not a rescue. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

type StoredDraft = {
  content: Record<string, unknown>;
  savedAt: string;
};

export type StudioAutosave = {
  /** A recovered draft awaiting the user's decision, if any. */
  pending: StoredDraft | null;
  /** Local timestamp of the most recent mirror write, for the "saved" hint. */
  lastSavedAt: string | null;
  /** Forget the recovered draft without applying it. */
  dismiss: () => void;
  /** Forget everything — call after a successful save or a reset. */
  clear: () => void;
};

function keyFor(scope: string) {
  return `${PREFIX}${scope}`;
}

function readDraft(scope: string): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.content || typeof parsed.content !== "object") return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor(scope));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param scope   Stable identity of what is being edited (variant + brand).
 * @param draft   Current in-memory draft.
 * @param dirty   Only dirty drafts are worth mirroring.
 */
export function useStudioAutosave(
  scope: string,
  draft: Record<string, unknown>,
  dirty: boolean,
): StudioAutosave {
  const [pending, setPending] = useState<StoredDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recovery check runs once per scope, before any mirror write can happen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const found = readDraft(scope);
    setPending(found);
    setLastSavedAt(found?.savedAt ?? null);
  }, [scope]);

  useEffect(() => {
    if (typeof window === "undefined" || !dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        window.localStorage.setItem(
          keyFor(scope),
          JSON.stringify({ content: draft, savedAt } satisfies StoredDraft),
        );
        setLastSavedAt(savedAt);
      } catch {
        /* quota or privacy mode — autosave is best-effort */
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scope, draft, dirty]);

  const dismiss = useCallback(() => setPending(null), []);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      window.localStorage.removeItem(keyFor(scope));
    } catch {
      /* ignore */
    }
    setPending(null);
    setLastSavedAt(null);
  }, [scope]);

  return { pending, lastSavedAt, dismiss, clear };
}
