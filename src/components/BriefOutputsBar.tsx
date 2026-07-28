import { Link } from "@tanstack/react-router";
import { FileText, Layers, Megaphone, CalendarDays } from "lucide-react";

export type BriefOutputsMasterSet = {
  eventPlaybookId?: string | null;
  socialPlaybookId?: string | null;
  printAssetIds?: string[];
  printAssets?: Array<{ id: string; kind: string; title: string }>;
  brandDivisionId?: string | null;
};

type Props = {
  /** Deck produced by the same brief (omit when the deck itself is unknown). */
  deckId?: string | null;
  deckTitle?: string | null;
  masterSet?: BriefOutputsMasterSet | null;
  /** Which artifact the user is currently editing — rendered as "You're here". */
  active: { kind: "deck" | "print" | "event" | "social"; id?: string };
};

const chip =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition";
const idle =
  "border-black/10 bg-white text-black/70 hover:border-[#003FC7]/40 hover:text-[#003FC7]";
const here = "border-[#003FC7]/30 bg-[#003FC7]/[0.07] text-[#003FC7] cursor-default";

function kindLabel(kind: string) {
  return kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Cross-links every artifact a single brief produced (deck + print + event +
 * social) so finishing one never dead-ends the user.
 */
export function BriefOutputsBar({ deckId, deckTitle, masterSet, active }: Props) {
  const prints = [
    ...(masterSet?.printAssets ??
      (masterSet?.printAssetIds ?? []).map((id) => ({
        id,
        kind: "print",
        title: "Print asset",
      }))),
  ];
  // The artifact currently open always appears, even when the deck's stored
  // master set predates it (or lives on another device).
  if (active.kind === "print" && active.id && !prints.some((p) => p.id === active.id)) {
    prints.push({ id: active.id, kind: "print", title: "This document" });
  }

  const hasSiblings =
    Boolean(deckId) || prints.length > 0 || masterSet?.eventPlaybookId || masterSet?.socialPlaybookId;
  if (!hasSiblings) return null;

  // Nothing to cross-link to: only the artifact already open.
  const total =
    (deckId ? 1 : 0) +
    prints.length +
    (masterSet?.eventPlaybookId ? 1 : 0) +
    (masterSet?.socialPlaybookId ? 1 : 0);
  if (total < 2 && !(deckId && active.kind !== "deck")) return null;

  return (
    <nav
      aria-label="Other assets from this brief"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/[0.07] bg-white/70 px-3 py-2.5 backdrop-blur"
    >
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
        From this brief
      </span>

      {deckId ? (
        active.kind === "deck" ? (
          <span className={`${chip} ${here}`}>
            <Layers size={14} strokeWidth={1.75} />
            {deckTitle ?? "Presentation"}
            <span className="text-[10px] uppercase tracking-wide opacity-70">You're here</span>
          </span>
        ) : (
          <Link to="/decks/$deckId" params={{ deckId }} className={`${chip} ${idle}`}>
            <Layers size={14} strokeWidth={1.75} />
            {deckTitle ?? "Presentation"}
          </Link>
        )
      ) : null}

      {prints.map((p) =>
        active.kind === "print" && active.id === p.id ? (
          <span key={p.id} className={`${chip} ${here}`}>
            <FileText size={14} strokeWidth={1.75} />
            {p.title || kindLabel(p.kind)}
            <span className="text-[10px] uppercase tracking-wide opacity-70">You're here</span>
          </span>
        ) : (
          <Link
            key={p.id}
            to="/asset/$assetId"
            params={{ assetId: p.id }}
            className={`${chip} ${idle}`}
          >
            <FileText size={14} strokeWidth={1.75} />
            {p.title || kindLabel(p.kind)}
          </Link>
        ),
      )}

      {masterSet?.eventPlaybookId ? (
        <Link
          to="/events/demo/$playbookId"
          params={{ playbookId: masterSet.eventPlaybookId }}
          className={`${chip} ${idle}`}
        >
          <CalendarDays size={14} strokeWidth={1.75} />
          Event kit
        </Link>
      ) : null}

      {masterSet?.socialPlaybookId ? (
        <Link
          to="/social/demo/$playbookId"
          params={{ playbookId: masterSet.socialPlaybookId }}
          className={`${chip} ${idle}`}
        >
          <Megaphone size={14} strokeWidth={1.75} />
          Social kit
        </Link>
      ) : null}
    </nav>
  );
}
