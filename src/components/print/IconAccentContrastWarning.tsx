/**
 * Inline accessibility warning for the print iconography accent colour.
 * Renders nothing when the accent clears WCAG non-text contrast comfortably.
 */
import { AlertTriangle, Info } from "lucide-react";

import { checkIconAccentContrast } from "@/lib/print-icon-contrast";

export function IconAccentContrastWarning({
  accent,
  background,
  stroke = 1,
  onApplySuggestion,
  className,
}: {
  accent: string | undefined | null;
  background: string;
  stroke?: number;
  onApplySuggestion?: (hex: string) => void;
  className?: string;
}) {
  const result = checkIconAccentContrast(accent, background, stroke);
  if (result.status === "pass") return null;

  const failing = result.status === "fail";
  const Icon = failing ? AlertTriangle : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="icon-accent-contrast-warning"
      data-contrast-status={result.status}
      className={[
        "flex items-start gap-2 rounded-md border px-2.5 py-2 text-[11px] leading-snug",
        failing
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className ?? "",
      ].join(" ")}
    >
      <Icon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="m-0">
          {failing ? "Low icon contrast" : "Borderline icon contrast"} —{" "}
          <span className="font-semibold">{result.ratio}:1</span> against the page (needs{" "}
          {result.required}:1). {result.message.split("—").slice(1).join("—").trim()}
        </p>
        {result.suggestion && onApplySuggestion && (
          <button
            type="button"
            onClick={() => onApplySuggestion(result.suggestion!)}
            className="inline-flex items-center gap-1.5 rounded border border-current/40 px-1.5 py-0.5 font-medium uppercase tracking-wide transition hover:bg-current/10"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm border border-black/20"
              style={{ background: result.suggestion }}
            />
            Use {result.suggestion}
          </button>
        )}
      </div>
    </div>
  );
}
