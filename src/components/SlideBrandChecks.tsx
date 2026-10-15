import { useMemo } from "react";
import { lintContent } from "@/lib/compliance-check";
import { useApprovedFigures } from "@/hooks/use-approved-figures";
import type { QaIssue } from "@/lib/qa";
import type { DeckSlide } from "@/lib/deck-store";

/**
 * Live brand checks for the slide being edited. Re-runs on every keystroke:
 * banned words and unsourced figures (compliance-check) plus this slide's QA
 * results (contrast, capacity/overflow, safe area, palette). Read-only.
 */
export function SlideBrandChecks({
  slide,
  qa,
  extraBanned = [],
  division,
}: {
  slide: DeckSlide;
  qa: QaIssue[];
  extraBanned?: readonly string[];
  /** Deck brand mode — scopes approved figures, same as the export check. */
  division?: string | null;
}) {
  const approved = useApprovedFigures();
  const rows = useMemo(() => {
    const lint = lintContent(slide.content, extraBanned, "", { approved, division }).map((v) => ({
      key: `${v.kind}-${v.path}-${v.match}`,
      tone: "block" as const,
      text: v.kind === "banned-word" ? `Banned word: “${v.match}”` : `Figure needs a source: ${v.match}`,
    }));
    const own = qa
      .filter((q) => q.slideId === slide.id)
      .map((q) => ({
        key: `${q.code}-${q.message}`,
        tone: q.severity === "block" ? ("block" as const) : ("warn" as const),
        text: q.message,
      }));
    return [...lint, ...own];
  }, [slide.content, slide.id, qa, extraBanned, approved, division]);

  return (
    <section aria-label="Brand checks" aria-live="polite" className="rounded-md border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-black/55">
        <span>Brand checks</span>
        <span className={rows.length ? "text-red-800" : "text-green-800"}>
          {rows.length ? `${rows.length} to fix` : "All clear"}
        </span>
      </div>
      {rows.length > 0 && (
        <ul className="space-y-1.5 text-xs leading-snug">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key} className="flex gap-2">
              <span
                aria-hidden
                className={`mt-1 h-2 w-2 shrink-0 rounded-sm ${r.tone === "block" ? "bg-red-600" : "bg-amber-500"}`}
              />
              <span>{r.text}</span>
            </li>
          ))}
          {rows.length > 12 && <li className="text-black/50">+{rows.length - 12} more</li>}
        </ul>
      )}
    </section>
  );
}
