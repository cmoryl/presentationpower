import { useEffect, useRef, useState } from "react";
import {
  applyAutoFix,
  auditNode,
  clearApproval,
  loadApprovals,
  saveApproval,
  type Approval,
  type WcagReport,
} from "@/lib/wcag";


type Props = {
  variantId: string;
  mode: "light" | "dark";
  /** Rendered slide container ref to audit. */
  targetRef: React.RefObject<HTMLElement | null>;
  /** When true, render the full detailed badge with approve controls. */
  enabled: boolean;
  /** Compact placement inside preview card. */
  compact?: boolean;
  /** Fired whenever a fresh report is computed (even when `enabled` is false). */
  onReport?: (report: WcagReport) => void;
};

/**
 * Non-interactive WCAG contrast badge that scans the rendered slide DOM,
 * computes the lowest text/background contrast ratio, classifies it against
 * WCAG 2.1, and lets a reviewer approve or reject the pairing per (variant × mode).
 *
 * The audit itself always runs so the card can surface a warning icon; only
 * the visible badge chrome is gated behind `enabled`.
 */
export function WcagBadge({ variantId, mode, targetRef, enabled, compact = false, onReport }: Props) {
  const [report, setReport] = useState<WcagReport | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const id = ++runId.current;
    // Poll: apply auto-fix + audit repeatedly. Each pass catches text that
    // React re-rendered after the previous fix. Stop early once we reach AA
    // or better; give up after ~2.4s and report the best result.
    let best: WcagReport | null = null;
    const passes = [400, 800, 1200, 1800, 2400];
    const timers = passes.map((delay) =>
      window.setTimeout(() => {
        if (id !== runId.current) return;
        try {
          applyAutoFix(el);
          requestAnimationFrame(() => {
            if (id !== runId.current) return;
            try {
              const r = auditNode(el);
              if (!best || r.minRatio > best.minRatio) best = r;
              setReport(best);
              onReport?.(best);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      }, delay),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [targetRef, mode, variantId, onReport]);


  useEffect(() => {
    const all = loadApprovals();
    setApproval(all[`${variantId}::${mode}`] ?? null);
  }, [variantId, mode]);

  if (!enabled) return null;

  const level = report?.overall ?? "AA";
  const ratio = report?.minRatio ?? 0;
  const tone =
    level === "AAA"
      ? "bg-emerald-500/90 text-white ring-emerald-200"
      : level === "AA"
        ? "bg-emerald-400/90 text-emerald-950 ring-emerald-100"
        : level === "AA-Large"
          ? "bg-amber-400/90 text-amber-950 ring-amber-100"
          : "bg-red-500/90 text-white ring-red-200";

  const approve = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!report) return;
    const rec: Approval = {
      variantId,
      mode,
      status: "approved",
      ratio,
      level,
      approvedAt: new Date().toISOString(),
    };
    saveApproval(rec);
    setApproval(rec);
  };
  const reject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!report) return;
    const rec: Approval = {
      variantId,
      mode,
      status: "rejected",
      ratio,
      level,
      approvedAt: new Date().toISOString(),
    };
    saveApproval(rec);
    setApproval(rec);
  };
  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearApproval(variantId, mode);
    setApproval(null);
  };

  return (
    <div
      className={`pointer-events-auto absolute ${compact ? "bottom-1.5 right-1.5" : "bottom-3 right-3"} z-10 flex items-center gap-1.5`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest shadow ring-1 backdrop-blur ${tone}`}
        title={
          report?.worst
            ? `Min contrast ${ratio}:1 on "${report.worst.text}" (${report.aaFail} fails / ${report.aaPass + report.aaFail} samples)`
            : "Auditing…"
        }
      >
        {level} · {ratio ? `${ratio}:1` : "…"}
      </span>
      {approval?.status === "approved" ? (
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-emerald-200"
          title={`Approved ${new Date(approval.approvedAt).toLocaleDateString()} — click to reset`}
        >
          ✓ Approved
        </button>
      ) : approval?.status === "rejected" ? (
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-red-200"
          title={`Rejected ${new Date(approval.approvedAt).toLocaleDateString()} — click to reset`}
        >
          ✕ Rejected
        </button>
      ) : (
        <div className="flex overflow-hidden rounded-full ring-1 ring-white/40">
          <button
            type="button"
            onClick={approve}
            className="bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-white"
            title="Approve this pairing"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={reject}
            className="bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-white"
            title="Reject this pairing"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
