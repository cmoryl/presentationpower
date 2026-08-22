// Admin-only banner shown inside the deck editor when the open deck is a *live
// demo* edit. Publishing writes the current deck back to the demo page every
// visitor sees; resetting drops the override so the authored build returns.

import { useMemo } from "react";
import { toast } from "sonner";
import { Globe2, RotateCcw, UploadCloud } from "lucide-react";

import { useIsAdmin } from "@/hooks/use-is-admin";
import { useDeckStore, type Deck, type Brief } from "@/lib/deck-store";
import {
  useDemoOverride,
  usePublishDemoOverride,
  useResetDemoOverride,
} from "@/lib/demo-overrides";

/** Serialize a deck (+ its brief) into a loss-free snapshot payload. */
export function deckSnapshotPayload(deck: Deck, brief?: Brief): Record<string, unknown> {
  return {
    version: 1,
    title: deck.title,
    brandModeId: deck.brandModeId,
    archetypeId: deck.archetypeId,
    subCompany: deck.subCompany ?? null,
    context: (deck.context as unknown as Record<string, unknown>) ?? null,
    clientLogo: deck.clientLogo ?? null,
    slides: deck.slides
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(({ id: _id, changes: _changes, ...rest }) => rest),
    brief: brief
      ? {
          prospect: brief.prospect,
          industry: brief.industry,
          audience: brief.audience,
          meetingObjective: brief.meetingObjective,
          lengthTarget: brief.lengthTarget,
          clientFacts: brief.clientFacts,
        }
      : null,
  };
}

export function LiveDemoDeckBar({ deckId }: { deckId: string }) {
  const isAdmin = useIsAdmin();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const link = deck?.context?.liveDemo ?? null;

  const publish = usePublishDemoOverride();
  const reset = useResetDemoOverride();
  const { override } = useDemoOverride(
    link?.kind ?? "deck",
    link?.demoId ?? "",
    link?.divisionKey ?? "",
  );

  const updated = useMemo(
    () => (override?.updatedAt ? new Date(override.updatedAt).toLocaleString() : null),
    [override?.updatedAt],
  );

  if (!isAdmin || !deck || !link) return null;

  async function onPublish() {
    try {
      await publish.mutateAsync({
        demoKind: "deck",
        demoId: link!.demoId,
        divisionKey: link!.divisionKey,
        payload: deckSnapshotPayload(deck!, brief),
        label: deck!.title,
      });
      toast.success("Live demo updated — every visitor now sees this version");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish this demo");
    }
  }

  async function onReset() {
    try {
      await reset.mutateAsync({
        demoKind: "deck",
        demoId: link!.demoId,
        divisionKey: link!.divisionKey,
      });
      toast.success("Demo reset to the authored build");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset this demo");
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#003FC7]/25 bg-[#003FC7]/[0.06] px-4 py-3">
      <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#003FC7]">
        <Globe2 size={14} /> Live demo
      </span>
      <p className="min-w-0 flex-1 text-[12px] text-black/65 dark:text-white/65">
        Editing the demo everyone sees{link.label ? ` · ${link.label}` : ""}.
        {updated ? ` Published ${updated}.` : " Not published yet — the authored build is live."}
      </p>
      <button
        type="button"
        onClick={() => void onPublish()}
        disabled={publish.isPending}
        className="inline-flex min-h-[38px] items-center gap-2 rounded-full bg-[#003FC7] px-4 text-[13px] font-semibold text-white transition hover:bg-[#003FC7]/90 disabled:opacity-60"
      >
        <UploadCloud size={14} />
        {publish.isPending ? "Publishing…" : "Publish to live demo"}
      </button>
      {override ? (
        <button
          type="button"
          onClick={() => void onReset()}
          disabled={reset.isPending}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-black/15 px-4 text-[13px] font-medium transition hover:border-black/35 disabled:opacity-60 dark:border-white/20 dark:hover:border-white/40"
        >
          <RotateCcw size={14} />
          Reset to authored
        </button>
      ) : null}
    </div>
  );
}
