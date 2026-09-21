// Pre-flight brand health badge + drawer.
//
// Presentational only: the score comes from `scanBrandHealth`, which measures
// the surfaces already on screen. It never redraws or replaces a background.

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";

import { brandHealthCheckLabel, type BrandHealthReport } from "@/lib/brand-health";
import { scanBrandHealth } from "@/lib/brand-health-scan";
import { getBrandGuideForDivision, MASTER_TRANSPERFECT_GUIDE } from "@/lib/brand-guides";

export type BrandHealthBadgeProps = {
  /** Returns the rendered surfaces to measure, in display order. */
  getRoots: () => HTMLElement[];
  /** Brand-mode id, so the check reads that division's guide. */
  divisionId?: string | null;
  /** Optional per-surface labels, e.g. `Slide 03`. */
  labels?: string[];
  /** What is being checked, shown in the drawer heading. */
  surfaceLabel?: string;
  className?: string;
};

const TONE: Record<BrandHealthReport["grade"], { chip: string; dot: string; word: string }> = {
  pass: { chip: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500", word: "Ready" },
  review: { chip: "bg-amber-50 text-amber-800", dot: "bg-amber-500", word: "Worth a look" },
  blocked: { chip: "bg-rose-50 text-rose-800", dot: "bg-rose-500", word: "Fix before export" },
};

export function BrandHealthBadge({
  getRoots,
  divisionId,
  labels,
  surfaceLabel = "this deck",
  className,
}: BrandHealthBadgeProps) {
  const [report, setReport] = useState<BrandHealthReport | null>(null);
  const [open, setOpen] = useState(false);

  const run = useCallback(() => {
    const roots = getRoots().filter(Boolean);
    if (!roots.length) {
      setReport(null);
      return;
    }
    const guide = divisionId
      ? (getBrandGuideForDivision(divisionId) ?? MASTER_TRANSPERFECT_GUIDE)
      : MASTER_TRANSPERFECT_GUIDE;
    setReport(scanBrandHealth(roots, guide, labels));
  }, [divisionId, getRoots, labels]);

  // First pass once the surface has painted, then on every drawer open.
  useEffect(() => {
    const t = window.setTimeout(run, 600);
    return () => window.clearTimeout(t);
  }, [run]);

  const tone = TONE[report?.grade ?? "pass"];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          run();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition hover:brightness-95 ${tone.chip} ${className ?? ""}`}
        aria-label="Brand health pre-flight"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
        Brand health {report && report.sampled > 0 ? `${report.score}/100` : "—"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close brand health"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-black/[0.07] bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  Pre-flight
                </div>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight">Brand health</h2>
                <p className="mt-1 text-xs text-black/55">
                  {!report
                    ? `Nothing rendered to check on ${surfaceLabel} yet.`
                    : report.sampled === 0
                      ? `No readable text found on ${surfaceLabel} — nothing was measured, so this is not a pass.`
                      : `${report.score}/100 · ${tone.word} · ${report.sampled} text runs on ${surfaceLabel}, checked against ${report.guideTitle}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-black/50 transition hover:bg-black/[0.05] hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              {report && report.sampled > 0 ? (
                <>
                  <div className="flex gap-2 text-[11px]">
                    <span className="rounded-full bg-rose-50 px-2 py-1 font-medium text-rose-800">
                      {report.failures} to fix
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-800">
                      {report.warnings} warning{report.warnings === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-800">
                      {report.passed.length} clean
                    </span>
                  </div>

                  {report.findings.length > 0 ? (
                    <ul className="space-y-2">
                      {report.findings.map((f) => (
                        <li
                          key={f.id}
                          className="rounded-2xl border border-black/[0.07] p-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              size={14}
                              className={
                                f.severity === "fail" ? "text-rose-600" : "text-amber-600"
                              }
                              aria-hidden
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">
                              {brandHealthCheckLabel(f.check)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13px] text-black/80">{f.detail}</p>
                          {f.text ? (
                            <p className="mt-1 truncate text-[11px] text-black/45">“{f.text}”</p>
                          ) : null}
                          {f.fix ? (
                            <p className="mt-1.5 text-[12px] font-medium text-primary">{f.fix}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
                      <ShieldCheck size={15} aria-hidden /> Nothing to flag — every check passed.
                    </p>
                  )}

                  {report.passed.length > 0 ? (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                        Passed
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {report.passed.map((p) => (
                          <li
                            key={p.check}
                            className="flex items-center gap-2 text-[13px] text-black/70"
                          >
                            <Check size={14} className="text-emerald-600" aria-hidden />
                            {p.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={run}
                    className="w-full rounded-full border border-black/[0.12] px-4 py-2 text-[13px] font-medium transition hover:bg-black/[0.04]"
                  >
                    Check again
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] text-black/60">
                    Open the surface you want checked, then run this again — an empty check is never
                    reported as a clean one.
                  </p>
                  <button
                    type="button"
                    onClick={run}
                    className="w-full rounded-full border border-black/[0.12] px-4 py-2 text-[13px] font-medium transition hover:bg-black/[0.04]"
                  >
                    Check again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
