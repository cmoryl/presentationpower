import { Check, Loader2, TriangleAlert, Circle } from "lucide-react";

export type GenJobStatus = "pending" | "running" | "done" | "error";

export type GenJob = {
  id: string;
  label: string;
  /** Short line describing what's happening / what happened. */
  detail?: string;
  status: GenJobStatus;
};

function StatusIcon({ status }: { status: GenJobStatus }) {
  if (status === "running")
    return <Loader2 className="size-4 animate-spin text-[#003FC7]" aria-hidden />;
  if (status === "done") return <Check className="size-4 text-emerald-600" aria-hidden />;
  if (status === "error") return <TriangleAlert className="size-4 text-rose-600" aria-hidden />;
  return <Circle className="size-4 text-black/20" aria-hidden />;
}

const STATUS_TEXT: Record<GenJobStatus, string> = {
  pending: "Queued",
  running: "Generating…",
  done: "Ready",
  error: "Failed",
};

/**
 * Live, per-asset generation status. Renders a single overall progress bar plus
 * one row per requested artifact so the user can see exactly what is queued,
 * in-flight, finished or failed while the master set is being produced.
 */
export function GenerationProgress({
  jobs,
  title = "Generating your assets",
}: {
  jobs: GenJob[];
  title?: string;
}) {
  if (!jobs.length) return null;

  const done = jobs.filter((j) => j.status === "done").length;
  const failed = jobs.filter((j) => j.status === "error").length;
  const settled = done + failed;
  const pct = Math.round((settled / jobs.length) * 100);
  const running = jobs.find((j) => j.status === "running");
  const allSettled = settled === jobs.length;

  return (
    <section
      aria-label="Generation progress"
      className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(0,63,199,0.5)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#003FC7]">
          {allSettled ? (failed ? "Finished with issues" : "All assets ready") : title}
        </div>
        <div className="font-mono text-[11px] text-black/50" aria-hidden>
          {settled}/{jobs.length} · {pct}%
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            failed && allSettled ? "bg-rose-500" : "bg-[#003FC7]"
          }`}
          style={{ width: `${Math.max(pct, running ? 6 : 0)}%` }}
        />
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {running
          ? `${running.label}: generating. ${settled} of ${jobs.length} complete.`
          : `${settled} of ${jobs.length} assets complete.`}
      </div>

      <ul className="mt-4 divide-y divide-black/[0.06]">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 shrink-0">
              <StatusIcon status={job.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium ${
                  job.status === "pending" ? "text-black/45" : "text-[#03002C]"
                }`}
              >
                {job.label}
              </div>
              {job.detail ? (
                <div
                  className={`mt-0.5 truncate text-xs ${
                    job.status === "error" ? "text-rose-600" : "text-black/50"
                  }`}
                >
                  {job.detail}
                </div>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                job.status === "done"
                  ? "bg-emerald-50 text-emerald-700"
                  : job.status === "error"
                    ? "bg-rose-50 text-rose-700"
                    : job.status === "running"
                      ? "bg-[#003FC7]/10 text-[#003FC7]"
                      : "bg-black/[0.04] text-black/45"
              }`}
            >
              {STATUS_TEXT[job.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
