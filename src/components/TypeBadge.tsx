import { useEffect, useRef, useState } from "react";
import { auditAndFixTypography, type TypeReport } from "@/lib/wcag";

/**
 * Compact type-scale diagnostic chip: shows the smallest body px and the
 * headline/body ratio for the audited slide. Runs the (non-destructive) type
 * fix pass, then reports final measurements. Only rendered in A/B mode.
 */
export function TypeBadge({
  targetRef,
  compact = true,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  compact?: boolean;
}) {
  const [report, setReport] = useState<TypeReport | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const id = ++runId.current;
    const timers = [500, 1200].map((delay) =>
      window.setTimeout(() => {
        if (id !== runId.current) return;
        try {
          setReport(auditAndFixTypography(el));
        } catch {
          /* ignore */
        }
      }, delay),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [targetRef]);

  if (!report || report.sampled === 0) return null;
  const warn = report.minBodyPx > 0 && report.minBodyPx < 14;
  const tone = warn
    ? "bg-amber-400/90 text-amber-950 ring-amber-100"
    : "bg-slate-900/85 text-white ring-white/30";

  return (
    <div
      className={`pointer-events-auto absolute ${compact ? "bottom-1.5 left-1.5" : "bottom-3 left-3"} z-10 flex items-center gap-1`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest shadow ring-1 backdrop-blur ${tone}`}
        title={`Min body ${report.minBodyPx}px · Max ${report.maxHeadlinePx}px · Ratio ${report.ratio}× · ${report.bumped} bumped`}
      >
        Aa · {report.minBodyPx}px · {report.ratio}×
      </span>
    </div>
  );
}
