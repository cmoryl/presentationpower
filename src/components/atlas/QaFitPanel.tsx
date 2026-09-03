import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { runQa } from "@/lib/qa";
import {
  applyFitTuning,
  clearFitTuning,
  planFitTuning,
  summarizeQa,
  type FitTune,
} from "@/lib/qa-fit-tune";
import { applyAiCopyFit, collectCopyFitTasks } from "@/lib/qa-ai-fix";

/**
 * QA fix panel for a materialised division run. Drives the run's flagged
 * issues to zero in three honest passes:
 *   1. deterministic auto-fix (structure: overflow, donors, contrast)
 *   2. per-slide fit tuning (give long copy real room on that sheet only)
 *   3. AI copy-fit (rewrite to the cap) for anything still over
 * Nothing is deleted and nothing is invented; each pass reports what it did.
 */
export function QaFitPanel({ deckId, ink }: { deckId: string; ink: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const applyQaFixes = useDeckStore((s) => s.applyQaFixes);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const counts = useMemo(() => (deck ? summarizeQa(deck) : null), [deck]);
  const issues = useMemo(() => (deck ? runQa(deck.slides, deck.brandModeId) : []), [deck]);
  const tunes = useMemo(() => (deck ? planFitTuning(deck) : []), [deck]);

  const bySlide = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const i of issues) {
      if (!map.has(i.slideId)) map.set(i.slideId, []);
      map.get(i.slideId)!.push(`${i.severity === "block" ? "⛔" : "⚠"} ${i.message}`);
    }
    return map;
  }, [issues]);

  if (!deck || !counts) return null;
  const total = counts.block + counts.warn;
  const note = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8));

  async function driveToZero() {
    setBusy("all");
    try {
      const before = summarizeQa(useDeckStore.getState().decks[deckId]!);
      const report = applyQaFixes(deckId, { includeWarnings: true });
      note(
        `Auto-fix: ${report?.fixes.length ?? 0} structural fix${
          (report?.fixes.length ?? 0) === 1 ? "" : "es"
        } applied.`,
      );

      let current = useDeckStore.getState().decks[deckId]!;
      const plan = planFitTuning(current);
      if (plan.length > 0) {
        applyFitTuning(deckId, plan);
        note(`Fit tuning: ${plan.length} slide(s) re-typed so the long copy fits its sheet.`);
        current = useDeckStore.getState().decks[deckId]!;
      }

      if (collectCopyFitTasks(current).length > 0) {
        const applied = await applyAiCopyFit(deckId, current);
        note(`AI copy-fit: ${applied} field(s) rewritten to their character cap.`);
        current = useDeckStore.getState().decks[deckId]!;
      }

      const after = summarizeQa(current);
      const left = after.block + after.warn;
      note(`${before.block + before.warn} issue(s) → ${left}.`);
      if (left === 0) toast.success("QA is clean — every slide passes its gates.");
      else
        toast.info(`${left} issue(s) still need a human decision`, {
          description: "They are listed per slide below with the gate that flagged them.",
        });
    } catch (err) {
      toast.error("QA fix pass failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold" style={{ color: ink }}>
          QA fix — {deck.title}
        </h3>
        <div className="flex items-center gap-3 text-sm text-black/60">
          <span>
            {counts.block} blocking · {counts.warn} warnings · {counts.copyLength} copy-length
          </span>
          <button
            type="button"
            onClick={() => void driveToZero()}
            disabled={busy !== null || total === 0}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: ink }}
          >
            {busy ? "Fixing…" : total === 0 ? "Nothing to fix" : "Drive QA to zero"}
          </button>
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-xs text-black/50">
        Pass 1 fixes structure, pass 2 tunes the sheet (type scale, words-per-block budget and fill
        bias for that slide only), pass 3 rewrites copy to its cap. No copy is deleted or invented.
      </p>

      {log.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-black/65">
          {log.map((line, i) => (
            <li key={`${line}-${i}`}>• {line}</li>
          ))}
        </ul>
      )}

      {tunes.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="uppercase tracking-widest text-black/45">
              <tr>
                <th className="py-1.5 pr-3">#</th>
                <th className="py-1.5 pr-3">Module</th>
                <th className="py-1.5 pr-3">Overrun</th>
                <th className="py-1.5 pr-3">Tune</th>
                <th className="py-1.5">Apply</th>
              </tr>
            </thead>
            <tbody className="text-black/65">
              {tunes.map((t: FitTune) => (
                <tr key={t.slideId} className="border-t border-black/10 align-top">
                  <td className="py-2 pr-3 font-mono">{t.position + 1}</td>
                  <td className="py-2 pr-3 font-mono">{t.variantId}</td>
                  <td className="py-2 pr-3">×{t.ratio.toFixed(2)}</td>
                  <td className="py-2 pr-3">
                    {[
                      t.typeScale.display ? `display ${t.typeScale.display}px` : null,
                      t.typeScale.body ? `body ${t.typeScale.body}px` : null,
                      `words ${t.density.wordsPerBlock}`,
                      `fill ${t.fillBias}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <div className="mt-1 text-black/45">{t.reasons.join(" · ")}</div>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          applyFitTuning(deckId, [t]);
                          note(`Slide ${t.position + 1} tuned to fit.`);
                        }}
                        className="rounded-lg border px-2 py-1 font-medium"
                        style={{ borderColor: `${ink}33`, color: ink }}
                      >
                        Tune
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearFitTuning(deckId, t.slideId);
                          note(`Slide ${t.position + 1} handed back to the library.`);
                        }}
                        className="rounded-lg border border-black/15 px-2 py-1 text-black/55"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <ul className="mt-4 space-y-2 text-xs text-black/60">
          {deck.slides
            .filter((s) => bySlide.has(s.id))
            .map((s) => (
              <li key={s.id}>
                <span className="font-mono">
                  {s.position + 1}. {s.variantId}
                </span>{" "}
                — {bySlide.get(s.id)!.join("; ")}
              </li>
            ))}
        </ul>
      )}
      {total === 0 && (
        <p className="mt-4 text-sm text-[#1B6B3A]">Every slide in this deck passes its QA gates.</p>
      )}
    </div>
  );
}
