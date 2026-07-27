import { useEffect, useRef, useState } from "react";
import { CloudOff, CloudUpload, Loader2 } from "lucide-react";
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
import { snapshotDeckVersion } from "@/lib/deck-versions.functions";
import { deckSignature, markDeckSaved } from "@/lib/unsaved-changes";

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
  const markCloudLinked = useDeckStore((s) => s.markCloudLinked);
  const save = useServerFn(saveDeckToCloud);
  const snapshot = useServerFn(snapshotDeckVersion);
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
        title="Sign in to save this deck to your account"
        aria-label="Sign in to save"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:border-black/25 hover:bg-black/[0.04] hover:text-black"
      >
        <CloudOff size={15} />
      </button>
    );
  }
  if (!deck || !brief) return null;

  async function onSave() {
    if (!deck || !brief) return;
    setBusy(true);
    try {
      await save({ data: { deck: deck as Deck, brief: brief as Brief } });
      markDeckSaved(deckId, deckSignature(deck, brief));
      setSavedAt(new Date().toLocaleTimeString());
      markCloudLinked(deckId, true);
      // Snapshot version after successful save (non-blocking on failure).
      try {
        await snapshot({ data: { deckId, changeSummary: "Manual save" } });
      } catch {
        // versioning is best-effort — never break saves
      }
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
      title={busy ? "Saving…" : savedAt ? `Saved ${savedAt}` : "Save to my account"}
      aria-label="Save to my account"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:border-black/25 hover:bg-black/[0.04] hover:text-black disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white"
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
    </button>
  );
}

/**
 * Debounced autosave + status indicator. Only engages once the deck is
 * cloud-linked (i.e. the user has performed at least one successful manual
 * save, or the deck was loaded from cloud). Autosave never creates a version
 * snapshot — snapshots stay on manual save.
 */
export function AutosaveIndicator({ deckId }: { deckId: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const isCloudLinked = useDeckStore((s) => s._cloudLinked[deckId]);
  const markCloudLinked = useDeckStore((s) => s.markCloudLinked);
  const save = useServerFn(saveDeckToCloud);
  const signedIn = useSignedIn();

  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const lastSerialized = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  // Cloud-loaded decks use "cloud-<id>" — treat as pre-linked so autosave
  // engages without waiting for a manual save.
  useEffect(() => {
    if (!isCloudLinked && deckId.startsWith("cloud-")) {
      markCloudLinked(deckId, true);
    }
  }, [deckId, isCloudLinked, markCloudLinked]);

  useEffect(() => {
    if (!deck || !brief) return;
    if (!signedIn || !isCloudLinked) return;
    const serialized = JSON.stringify({ d: deck, b: brief });
    // Skip the very first observation (no user edit has happened yet).
    if (firstRun.current) {
      firstRun.current = false;
      lastSerialized.current = serialized;
      setStatus("saved");
      return;
    }
    if (serialized === lastSerialized.current) return;
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await save({ data: { deck: deck as Deck, brief: brief as Brief } });
        lastSerialized.current = serialized;
        markDeckSaved(deckId, deckSignature(deck, brief));
        setSavedAt(new Date().toLocaleTimeString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [deck, brief, signedIn, isCloudLinked, save]);

  if (!signedIn || !deck || !brief) return null;
  if (!isCloudLinked) return null;

  const label =
    status === "saving"
      ? "Saving…"
      : status === "dirty"
        ? "Unsaved changes"
        : status === "error"
          ? "Save failed — retrying on next edit"
          : savedAt
            ? `Saved · ${savedAt}`
            : "Autosave on";
  const dotClass =
    status === "saving"
      ? "bg-amber-500 animate-pulse"
      : status === "dirty"
        ? "bg-amber-500"
        : status === "error"
          ? "bg-red-500"
          : "bg-emerald-500";

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-black/60"
      title="Autosave keeps this deck synced to your account after every edit."
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
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
        notes?: string | null;
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
          notes: typeof s.notes === "string" ? s.notes : undefined,
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
      useDeckStore.getState().markCloudLinked(localDeckId, true);
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
