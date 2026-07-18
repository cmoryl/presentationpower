import { useEffect, useRef, useState } from "react";
import {
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
  /** When true, run audit and render badge. */
  enabled: boolean;
  /** Compact placement inside preview card. */
  compact?: boolean;
};

/**
 * Non-interactive WCAG contrast badge that scans the rendered slide DOM,
 * computes the lowest text/background contrast ratio, classifies it against
 * WCAG 2.1, and lets a reviewer approve or reject the pairing per (variant × mode).
 */
export function WcagBadge({ variantId, mode, targetRef, enabled, compact = false }: Props) {
  const [report, setReport] = useState<WcagReport | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const el = targetRef.current;
    if (!el) return;
    const id = ++runId.current;
    // Delay to let VariantRenderer paint and fonts settle.
    const t = window.setTimeout(() => {
      if (id !== runId.current) return;
      try {
        setReport(auditNode(el));
      } catch {
        /* ignore */
      }
    }, 260);
    return () => window.clearTimeout(t);
  }, [enabled, targetRef, mode, variantId]);

  useEffect(() => {
    if (!enabled) return;
    const all = loadApprovals();
    setApproval(all[`${variantId}::${mode}`] ?? null);
  }, [enabled, variantId, mode]);

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
