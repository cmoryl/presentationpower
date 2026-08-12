import { useMemo, useState } from "react";
import {
  formatMs,
  HEAVY_PLATE_BYTES,
  SLOW_SLIDE_MS,
  type ExportTelemetryReport,
} from "@/lib/export-telemetry";

/**
 * Export performance panel: shows where an export spent its time so a slow deck
 * can be diagnosed from the export screen — total wall clock, phase breakdown,
 * per-slide render vs. assembly time, retries, and the ranked bottlenecks.
 */
export function ExportTelemetryPanel({
  report,
  className = "",
}: {
  report: ExportTelemetryReport | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const slowest = useMemo(
    () => (report ? [...report.slides].sort((a, b) => b.totalMs - a.totalMs) : []),
    [report],
  );
  if (!report) return null;

  const totalKb = Math.round(report.totals.plateBytes / 1024);
  const health =
    report.bottlenecks.length === 0
      ? { tone: "text-emerald-800", label: "No bottlenecks detected" }
      : { tone: "text-amber-900", label: `${report.bottlenecks.length} bottleneck(s)` };

  return (
    <section
      className={`no-print rounded-2xl border border-black/10 bg-white/70 p-5 ${className}`}
      aria-label="Export performance"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
            Export performance
          </div>
          <div className="mt-1 text-sm text-black/70">
            {formatMs(report.totalMs)} total · {report.slideCount}{" "}
            {report.slideCount === 1 ? "slide" : "slides"} · {formatMs(report.totals.avgSlideMs)} avg
            per slide · <span className={health.tone}>{health.label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-black/15 px-4 py-2 text-xs font-medium text-black/70 transition hover:border-black/40"
          aria-expanded={open}
        >
          {open ? "Hide details" : "View details"}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Render (plates)" value={formatMs(report.totals.plateMs)} />
        <Metric label="Slide assembly" value={formatMs(report.totals.assemblyMs)} />
        <Metric label="Retries" value={String(report.totals.retries)} />
        <Metric label="Plate payload" value={`${totalKb} KB`} />
      </dl>

      {report.bottlenecks.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {report.bottlenecks.map((b) => (
            <li key={b.slideIndex}>
              <span className="font-mono text-xs text-amber-900/60">Slide {b.slideIndex + 1}</span>{" "}
              {b.variantId ? <span className="text-xs text-amber-900/60">{b.variantId}</span> : null}{" "}
              · {formatMs(b.ms)} — {b.reason}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              Phases
            </div>
            <ul className="mt-2 space-y-2">
              {report.phases.map((ph) => (
                <li key={ph.id} className="text-xs text-black/70">
                  <div className="flex items-center justify-between gap-3">
                    <span>{ph.label}</span>
                    <span className="font-mono text-black/50">
                      {formatMs(ph.ms)} · {ph.pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[#003FC7]"
                      style={{ width: `${Math.min(100, ph.pct)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              Per slide (slowest first)
            </div>
            <table className="mt-2 w-full min-w-[560px] text-left text-xs">
              <thead className="text-black/45">
                <tr>
                  <th className="py-1 pr-3 font-medium">Slide</th>
                  <th className="py-1 pr-3 font-medium">Module</th>
                  <th className="py-1 pr-3 font-medium">Render</th>
                  <th className="py-1 pr-3 font-medium">Assembly</th>
                  <th className="py-1 pr-3 font-medium">Text runs</th>
                  <th className="py-1 pr-3 font-medium">Retries</th>
                  <th className="py-1 pr-3 font-medium">Plate</th>
                </tr>
              </thead>
              <tbody className="text-black/70">
                {slowest.map((s) => {
                  const slow = s.totalMs >= SLOW_SLIDE_MS;
                  const heavy = s.plateBytes >= HEAVY_PLATE_BYTES;
                  return (
                    <tr key={s.slideIndex} className="border-t border-black/5">
                      <td className="py-1.5 pr-3 font-mono">{s.slideIndex + 1}</td>
                      <td className="py-1.5 pr-3 font-mono text-[10px] text-black/50">
                        {s.variantId || "—"}
                      </td>
                      <td className={`py-1.5 pr-3 ${slow ? "font-semibold text-amber-900" : ""}`}>
                        {formatMs(s.plateMs)}
                      </td>
                      <td className="py-1.5 pr-3">{formatMs(s.assemblyMs)}</td>
                      <td className="py-1.5 pr-3">{s.textRuns || "—"}</td>
                      <td className={`py-1.5 pr-3 ${s.retries ? "text-amber-900" : ""}`}>
                        {s.retries || "—"}
                      </td>
                      <td className={`py-1.5 pr-3 ${heavy ? "text-amber-900" : ""}`}>
                        {s.plateBytes ? `${Math.round(s.plateBytes / 1024)} KB` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-black/40">
            Fidelity {report.fidelity} · quality {report.quality} · captured{" "}
            {new Date(report.startedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-black/40">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-[#03002C]">{value}</dd>
    </div>
  );
}
