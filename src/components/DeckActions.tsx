import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Bookmark, Loader2 } from "lucide-react";
import { useDeckStore, type Deck, type Brief } from "@/lib/deck-store";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import { saveDeckToCloud, setDeckTemplateFlag as setTemplateFn } from "@/lib/cloud-decks.functions";

export function DuplicateDeckButton({ deckId }: { deckId: string }) {
  const duplicateDeck = useDeckStore((s) => s.duplicateDeck);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        const id = duplicateDeck(deckId);
        if (id) navigate({ to: "/decks/$deckId", params: { deckId: id } });
      }}
      title="Duplicate deck"
      aria-label="Duplicate deck"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:border-black/25 hover:bg-black/[0.04] hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white"
    >
      <Copy size={14} />
    </button>
  );
}

export function TemplateToggleButton({ deckId }: { deckId: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const setLocalFlag = useDeckStore((s) => s.setDeckTemplateFlag);
  const save = useServerFn(saveDeckToCloud);
  const setFlag = useServerFn(setTemplateFn);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!deck) return null;
  const isTemplate = !!deck.isTemplate;

  async function onToggle() {
    if (!deck || !brief) return;
    const next = !isTemplate;
    setLocalFlag(deckId, next);
    if (!userId) return; // local-only until signed in / saved to cloud
    setBusy(true);
    try {
      const nextDeck: Deck = { ...deck, isTemplate: next };
      await save({ data: { deck: nextDeck, brief: brief as Brief } });
      const cloudId = deckCloudId(userId, deck.id);
      await setFlag({ data: { deckId: cloudId, isTemplate: next } });
    } catch {
      setLocalFlag(deckId, !next); // revert
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      title={isTemplate ? "Unmark as team template" : "Share as team template"}
      aria-label={isTemplate ? "Unmark as team template" : "Share as team template"}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:opacity-60 " +
        (isTemplate
          ? "border-[#003FC7]/40 bg-[#003FC7]/10 text-[#003FC7] hover:bg-[#003FC7]/15 dark:border-[#A1FBF9]/30 dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]"
          : "border-black/10 bg-white text-black/70 hover:border-black/25 hover:bg-black/[0.04] hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white")
      }
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Bookmark size={14} className={isTemplate ? "fill-current" : ""} />
      )}
    </button>
  );
}
