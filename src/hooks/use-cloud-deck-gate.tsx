/**
 * Shared "open a deck that may only exist in the cloud" gate.
 *
 * The deck editor grew this logic first: a deck the agent just built lives in
 * the database, not in the local store, so navigating straight to it used to
 * 404. Any surface reachable by a deep link — the editor, the export screen —
 * needs the same behaviour, so it lives here once instead of being re-typed.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useDeckStore } from "@/lib/deck-store";
import { useDeckHydrated, DeckHydratingFallback } from "@/hooks/use-deck-hydrated";
import { loadCloudDeck } from "@/lib/cloud-decks.functions";
import { cloudDeckToLocal, type CloudDeckPayload } from "@/lib/cloud-deck-import";
import { DeckImportProgress, DeckImportFailed } from "@/components/DeckImportProgress";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cloudDeckId(deckId: string): string | null {
  if (deckId.startsWith("cloud-")) return deckId.slice("cloud-".length);
  return UUID_RE.test(deckId) ? deckId : null;
}

export type CloudDeckGate =
  | { ready: true; fallback: null }
  | { ready: false; fallback: React.ReactElement }
  /** Not in the store and not a cloud id — the caller should throw notFound(). */
  | { ready: false; fallback: null };

/**
 * @param deckId route param
 * @param loadingLabel shown while the local store rehydrates
 * @param navigateTo route to redirect to when the cloud deck resolves to a
 *   different local id; omit to stay put.
 */
export function useCloudDeckGate(
  deckId: string,
  loadingLabel: string,
  navigateTo?: "/decks/$deckId" | "/decks/$deckId/export",
): CloudDeckGate {
  const hydrated = useDeckHydrated();
  const hasDeck = useDeckStore((s) => Boolean(s.decks[deckId]));
  const navigate = useNavigate();
  const load = useServerFn(loadCloudDeck);
  const hydrateDeck = useDeckStore((s) => s.hydrate);
  const [stage, setStage] = useState<"fetching" | "building" | "opening">("fetching");
  const [failed, setFailed] = useState(false);
  const [imported, setImported] = useState<{ title?: string; slideCount?: number }>({});
  const [attempt, setAttempt] = useState(0);
  const attempted = useRef(-1);

  const cloudId = cloudDeckId(deckId);

  useEffect(() => {
    if (!hydrated || hasDeck || !cloudId || attempted.current === attempt) return;
    attempted.current = attempt;
    setFailed(false);
    setStage("fetching");
    (async () => {
      try {
        const res = await load({ data: { deckId: cloudId } });
        setStage("building");
        const { brief, deck } = cloudDeckToLocal(res as CloudDeckPayload);
        setImported({ title: deck.title, slideCount: deck.slides.length });
        setStage("opening");
        hydrateDeck({ brief, deck });
        useDeckStore.getState().markCloudLinked(deck.id, true);
        if (deck.id !== deckId && navigateTo) {
          void navigate({ to: navigateTo, params: { deckId: deck.id }, replace: true });
        }
      } catch {
        setFailed(true);
      }
    })();
  }, [hydrated, hasDeck, cloudId, deckId, load, hydrateDeck, navigate, navigateTo, attempt]);

  if (!hydrated) return { ready: false, fallback: <DeckHydratingFallback label={loadingLabel} /> };
  if (hasDeck) return { ready: true, fallback: null };
  if (!cloudId) return { ready: false, fallback: null };
  return {
    ready: false,
    fallback: failed ? (
      <DeckImportFailed onRetry={() => setAttempt((a) => a + 1)} />
    ) : (
      <DeckImportProgress
        stage={stage}
        title={imported.title}
        slideCount={imported.slideCount}
      />
    ),
  };
}
