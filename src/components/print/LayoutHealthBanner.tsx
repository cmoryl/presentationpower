/**
 * Layout health banner for the print editor. Reads a CapacityReport from
 * src/lib/print-capacity.ts and renders an inline status card with issue
 * details plus actionable one-click compactions (reduce hero, swap module
 * variant, etc.). All logic lives in the capacity analyzer; this component
 * is a dumb view over the report shape.
 */

import type { CapacityReport, CapacitySuggestion } from "@/lib/print-capacity";
import { AlertTriangle, CheckCircle2, XOctagon, Wand2 } from "lucide-react";

type Props = {
  report: CapacityReport;
  onApplySuggestion?: (s: CapacitySuggestion) => void;
};

export function LayoutHealthBanner({ report, onApplySuggestion }: Props) {
  const pct = Math.min(100, Math.round(report.fill * 100));
  const tone =
    report.level === "block"
      ? {
          border: "border-red-400/50",
          bg: "bg-red-50 dark:bg-red-500/10",
          fg: "text-red-700 dark:text-red-300",
          bar: "bg-red-500",
          Icon: XOctagon,
          label: "Layout will overflow",
        }
      : report.level === "warn"
        ? {
            border: "border-amber-400/50",
            bg: "bg-amber-50 dark:bg-amber-500/10",
            fg: "text-amber-800 dark:text-amber-200",
            bar: "bg-amber-500",
            Icon: AlertTriangle,
            label: "Layout is tight",
          }
        : {
            border: "border-emerald-400/40",
            bg: "bg-emerald-50/70 dark:bg-emerald-500/10",
            fg: "text-emerald-800 dark:text-emerald-200",
            bar: "bg-emerald-500",
            Icon: CheckCircle2,
            label: "Layout fits",
          };
  const Icon = tone.Icon;
  const blocking = report.issues.filter((i) => i.level === "block");
  const warnings = report.issues.filter((i) => i.level === "warn");
  // Hero-cost split for the meter — a tiny amber stripe visualizes how much
  // of the base budget the hero band has absorbed.
  const heroFrac =
    report.baseBudget > 0
      ? Math.max(0, Math.min(1, report.heroCostDelta / report.baseBudget))
      : 0;
  const heroPct = Math.round(heroFrac * 100);

  return (
    <div
      data-testid="layout-health"
      data-level={report.level}
      className={`rounded-xl border ${tone.border} ${tone.bg} px-3 py-2.5`}
    >
      <div className={`flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-widest ${tone.fg}`}>
        <span className="inline-flex items-center gap-1.5">
          <Icon size={13} /> {tone.label}
        </span>
        <span className="tabular-nums">
          {report.used.toFixed(1)} / {report.budget.toFixed(1)} pu
          {report.heroCostDelta > 0.05 && (
            <span className="ml-1 opacity-70">(hero {report.heroCostDelta.toFixed(1)})</span>
          )}
        </span>
      </div>
      <div className="mt-1.5 relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        {/* Hero stripe — sits at the tail of the bar to signal reserved-for-hero space */}
        {heroFrac > 0 && (
          <div
            className="absolute inset-y-0 right-0 bg-black/25 dark:bg-white/25"
            style={{ width: `${heroPct}%` }}
            aria-hidden
          />
        )}
        <div
          className={`relative h-full ${tone.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {blocking.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] leading-snug text-red-700 dark:text-red-300">
          {blocking.map((i, k) => (
            <li key={k}>• {i.message}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="mt-1 space-y-1 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
          {warnings.map((i, k) => (
            <li key={k}>• {i.message}</li>
          ))}
        </ul>
      )}
      {report.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.suggestions.map((s, k) => (
            <button
              key={k}
              type="button"
              onClick={() => onApplySuggestion?.(s)}
              disabled={!onApplySuggestion}
              className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-default disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/85"
              title={s.message}
              data-testid={`capacity-suggestion-${s.kind}`}
            >
              <Wand2 size={11} />
              {s.message}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
