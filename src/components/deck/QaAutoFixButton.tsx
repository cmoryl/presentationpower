import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { summarizeQaFixes, type QaFixReport } from "@/lib/qa-autofix";

/**
 * One-click QA repair. Never destructive: overflow items are carried onto real
 * continuation slides, empty required fields are filled from content already on
 * the slide (siblings / imported text / notes), long copy shrinks the rendered
 * type scale, accents are deepened to pass WCAG. Anything that would need
 * invented or deleted copy is reported back instead of being "fixed".
 */
export function QaAutoFixButton({
  deckId,
  includeWarnings = true,
  label,
  tone = "dark",
  onFixed,
}: {
  deckId: string;
  includeWarnings?: boolean;
  label?: string;
  tone?: "dark" | "danger" | "warn";
  onFixed?: (report: QaFixReport) => void;
}) {
  const applyQaFixes = useDeckStore((s) => s.applyQaFixes);
  const [busy, setBusy] = useState(false);

  const skin =
    tone === "danger"
      ? "bg-red-900 text-white hover:bg-red-800"
      : tone === "warn"
        ? "bg-amber-900 text-white hover:bg-amber-800"
        : "bg-[#03002C] text-white hover:bg-[#003FC7]";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        try {
          const report = applyQaFixes(deckId, { includeWarnings });
          if (!report) return;
          if (!report.changed) {
            toast.info("Nothing could be auto-fixed without changing your content", {
              description:
                report.unresolved.length > 0
                  ? `${report.unresolved.length} item(s) need a human decision — see the list.`
                  : undefined,
            });
            return;
          }
          const carried = report.fixes.filter((f) => f.kind === "split-overflow");
          toast.success(summarizeQaFixes(report), {
            description:
              carried.length > 0
                ? "Overflow content became new continuation slides, so it presents and exports — nothing is parked in the editor only."
                : report.fixes[0]?.detail,
          });
          onFixed?.(report);
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-widest transition disabled:opacity-60 ${skin}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
      {label ?? (includeWarnings ? "Auto-fix all" : "Auto-fix blocking")}
    </button>
  );
}
