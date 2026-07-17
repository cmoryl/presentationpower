import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useDeckStore, type Deck, type Brief, type DeckSlide } from "@/lib/deck-store";
import {
  saveDeckToCloud,
  listMyCloudDecks,
  loadCloudDeck,
  deleteCloudDeck,
} from "@/lib/cloud-decks.functions";

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return signedIn;
}

export function SaveToCloudButton({ deckId }: { deckId: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const save = useServerFn(saveDeckToCloud);
  const signedIn = useSignedIn();
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const navigate = useNavigate();

  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <button
        type="button"
        onClick={() => navigate({ to: "/auth" })}
        className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black/30"
        title="Sign in to save this deck to your account"
      >
        Sign in to save
      </button>
    );
  }
  if (!deck || !brief) return null;

  async function onSave() {
    if (!deck || !brief) return;
    setBusy(true);
    try {
      await save({ data: { deck: deck as Deck, brief: brief as Brief } });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={busy}
      className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black hover:border-black/30 disabled:opacity-60"
    >
      {busy ? "Saving…" : savedAt ? `Saved ${savedAt}` : "Save to my account"}
    </button>
  );
}

type CloudDeckRow = {
  id: string;
  title: string;
  updated_at: string | null;
  created_at: string | null;
  brand_mode_id: string | null;
};

export function MyCloudDecks() {
  const signedIn = useSignedIn();
  const list = useServerFn(listMyCloudDecks);
  const load = useServerFn(loadCloudDeck);
  const del = useServerFn(deleteCloudDeck);
  const hydrate = useDeckStore((s) => s.hydrate);
  const localDecks = useDeckStore((s) => s.decks);
  const navigate = useNavigate();
  const [rows, setRows] = useState<CloudDeckRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    list().then((r) => setRows(r as CloudDeckRow[])).catch(() => setRows([]));
  }, [signedIn, list]);

  if (!signedIn) return null;

  async function onLoad(deckId: string) {
    setBusy(deckId);
    try {
      const res = await load({ data: { deckId } });
      const d = res.deck as {
        id: string;
        title: string;
        archetype_id: string | null;
        brand_mode_id: string | null;
        created_at: string | null;
      };
      const b = (res.brief ?? null) as null | {
        id: string;
        prospect: string | null;
        industry: string | null;
        meeting_objective: string | null;
        audience: string | null;
        brand_mode_id: string | null;
        sub_company: string | null;
        length_target: number | null;
        known_facts: string | null;
        inputs: unknown;
        created_at: string | null;
      };

      // Prefer the original local Brief shape stored in `inputs` when present.
      const storedBrief =
        b && b.inputs && typeof b.inputs === "object" ? (b.inputs as Partial<Brief>) : null;

      const briefLocal: Brief = {
        id: storedBrief?.id || `cloud-brief-${b?.id ?? d.id}`,
        createdAt: storedBrief?.createdAt || b?.created_at || new Date().toISOString(),
        prospect: storedBrief?.prospect ?? b?.prospect ?? "",
        industry: storedBrief?.industry ?? b?.industry ?? "",
        meetingObjective: storedBrief?.meetingObjective ?? b?.meeting_objective ?? "",
        audience: storedBrief?.audience ?? b?.audience ?? "",
        brandModeId: storedBrief?.brandModeId ?? b?.brand_mode_id ?? d.brand_mode_id ?? "enterprise",
        subCompany: storedBrief?.subCompany ?? b?.sub_company ?? undefined,
        archetypeId: storedBrief?.archetypeId ?? d.archetype_id ?? "",
        lengthTarget: storedBrief?.lengthTarget ?? b?.length_target ?? 8,
        clientFacts: storedBrief?.clientFacts ?? b?.known_facts ?? "",
      };

      const rawSlides = (res.slides ?? []) as Array<{
        id: string;
        position: number;
        section_id: string;
        variant_id: string;
        layout_id: string;
        content: Record<string, unknown> | null;
      }>;

      const slides: DeckSlide[] = rawSlides.map((s, i) => {
        const c = (s.content ?? {}) as Record<string, unknown> & {
          __localId?: string;
          __changes?: unknown[];
        };
        const { __localId, __changes, ...content } = c;
        return {
          id: typeof __localId === "string" ? __localId : s.id,
          position: s.position ?? i,
          sectionId: s.section_id,
          variantId: s.variant_id,
          layoutId: s.layout_id,
          content,
          changes: Array.isArray(__changes) ? (__changes as DeckSlide["changes"]) : [],
        };
      });

      // Use a stable local id so re-loading the same cloud deck reuses the same slot.
      const localDeckId = `cloud-${d.id}`;
      const deckContext = (d as unknown as { context?: Record<string, unknown> }).context;
      const contextSubCompany =
        deckContext && typeof deckContext === "object" && typeof deckContext.subCompany === "string"
          ? deckContext.subCompany
          : undefined;
      const deckLocal: Deck = {
        id: localDeckId,
        createdAt: d.created_at || new Date().toISOString(),
        title: d.title,
        briefId: briefLocal.id,
        brandModeId: briefLocal.brandModeId,
        subCompany: contextSubCompany ?? briefLocal.subCompany,
        archetypeId: briefLocal.archetypeId,
        slides,
        context: (deckContext && typeof deckContext === "object" ? deckContext : undefined) as Deck["context"],
      };

      hydrate({ brief: briefLocal, deck: deckLocal });
      navigate({ to: "/decks/$deckId", params: { deckId: localDeckId } });
    } catch (e) {
      alert(`Load failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(deckId: string, title: string) {
    if (!confirm(`Delete "${title}" from your account? This cannot be undone.`)) return;
    setBusy(deckId);
    try {
      await del({ data: { deckId } });
      setRows((rs) => (rs ?? []).filter((r) => r.id !== deckId));
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-14">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">My saved presentations</h2>
        <span className="text-xs uppercase tracking-widest text-black/50">
          Synced to your account
        </span>
      </div>
      {rows === null ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-black/50">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-black/60">
          You haven't saved any decks yet. Open a deck and click <b>Save to my account</b>.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rows.map((r) => {
            const localId = `cloud-${r.id}`;
            const alreadyLoaded = !!localDecks[localId];
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white p-5"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{r.title}</div>
                  <div className="mt-1 text-xs text-black/50">
                    Updated {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onLoad(r.id)}
                    disabled={busy === r.id}
                    className="rounded-full bg-[#0B2A4A] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {busy === r.id ? "Loading…" : alreadyLoaded ? "Open" : "Load & edit"}
                  </button>
                  <button
                    onClick={() => onDelete(r.id, r.title)}
                    disabled={busy === r.id}
                    className="rounded-full border border-black/15 px-3 py-2 text-xs text-black/60 hover:text-black"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
