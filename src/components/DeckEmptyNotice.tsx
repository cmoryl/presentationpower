// Shown when a deck exists but has no slides yet. Presenting, printing,
// re-flowing to a document or exporting an empty deck all produce an empty
// deliverable, so say so and point back at the editor instead.

import { Link } from "@tanstack/react-router";
import { FilePlus2 } from "lucide-react";

export interface DeckEmptyNoticeProps {
  deckId: string;
  /** What the user tried to do, e.g. "present", "print". */
  action: string;
}

export function DeckEmptyNotice({ deckId, action }: DeckEmptyNoticeProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-10">
      <div className="max-w-md space-y-4 rounded-2xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <FilePlus2 size={22} className="mx-auto text-black/35 dark:text-white/40" aria-hidden />
        <h1 className="text-base font-medium text-black/80 dark:text-white/85">
          This deck has no slides yet
        </h1>
        <p className="text-sm text-black/55 dark:text-white/55">
          There is nothing to {action} until the deck has at least one slide. Add one in the editor
          and come back.
        </p>
        <Link
          to="/decks/$deckId"
          params={{ deckId }}
          className="inline-flex items-center justify-center rounded-xl border border-[#003FC7] px-4 py-2 text-sm font-medium text-[#003FC7]"
        >
          Open the editor
        </Link>
      </div>
    </div>
  );
}
