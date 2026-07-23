/**
 * Layout health banner for the print editor. Reads a CapacityReport from
 * src/lib/print-capacity.ts and renders an inline status card with issue
 * details. Kept dumb — all logic lives in the capacity analyzer.
 */

import type { CapacityReport } from "@/lib/print-capacity";
import { AlertTriangle, CheckCircle2, XOctagon } from "lucide-react";

export function LayoutHealthBanner({ report }: { report: CapacityReport }) {
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
        <span className="tabular-nums">{report.used.toFixed(1)} / {report.budget.toFixed(1)} pu</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className={`h-full ${tone.bar} transition-all`}
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
    </div>
  );
}
