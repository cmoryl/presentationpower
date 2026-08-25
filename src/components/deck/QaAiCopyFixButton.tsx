import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { applyAiCopyFit, collectCopyFitTasks } from "@/lib/qa-ai-fix";

/**
 * AI pass for the QA warnings the deterministic auto-fix can't resolve:
 * copy that only fits by being rephrased (titles / item bodies over the
 * variant's char cap). Runs the deterministic engine first, then rewrites
 * whatever is still over cap — meaning preserved, nothing deleted.
 */
export function QaAiCopyFixButton({ deckId }: { deckId: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const store = useDeckStore.getState();
          // 1. Deterministic pass first — overflow splits, donor fills, accent
          //    deepening, brand-variant swaps.
          store.applyQaFixes(deckId, { includeWarnings: true });
          // 2. AI rewrite for copy that is still over its char cap.
          const deck = useDeckStore.getState().decks[deckId];
          if (!deck) return;
          const pending = collectCopyFitTasks(deck).length;
          if (pending === 0) {
            toast.success("QA gates resolved", {
              description: "No copy needed rewriting after the auto-fix pass.",
            });
            return;
          }
          const applied = await applyAiCopyFit(deckId, deck);
          toast.success(`AI rewrote ${applied} field${applied === 1 ? "" : "s"} to fit`, {
            description:
              "Titles and bodies were shortened to their layout's character limit — meaning kept, nothing cut without a rewrite.",
          });
        } catch (err) {
          toast.error("AI copy fix failed", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-3.5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#03002C] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      AI fix remaining
    </button>
  );
}
