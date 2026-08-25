// Analytics panel for the brand approval queue: average time in each review
// state plus a bottleneck read-out by asset type.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getApprovalAnalytics,
  type ApprovalStateStat,
  type ApprovalTypeStat,
} from "@/lib/approval-analytics.functions";

const SUBJECT_LABEL: Record<string, string> = {
  deck: "Decks",
  print: "Print",
  social: "Social",
  event: "Event",
  kit: "Campaign kits",
};

const WINDOWS = [30, 90, 365] as const;

function dur(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function StateCard({ stat }: { stat: ApprovalStateStat }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/50">
        {stat.label}
      </p>
      <p className="mt-2 text-2xl font-medium tabular-nums">{dur(stat.avgHours)}</p>
      <p className="text-xs text-foreground/50">
        average across {stat.items} item{stat.items === 1 ? "" : "s"}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-foreground/10 pt-3 text-xs">
        <div>
          <dt className="text-foreground/45">Median</dt>
          <dd className="tabular-nums">{dur(stat.medianHours)}</dd>
        </div>
        <div>
          <dt className="text-foreground/45">P90</dt>
          <dd className="tabular-nums">{dur(stat.p90Hours)}</dd>
        </div>
        <div>
          <dt className="text-foreground/45">Oldest</dt>
          <dd className="tabular-nums">{dur(stat.oldestHours)}</dd>
        </div>
      </dl>
    </div>
  );
}

function TypeRow({ t, max }: { t: ApprovalTypeStat; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((t.avgWaitHours / max) * 100)) : 2;
  return (
    <tr className="border-t border-foreground/10">
      <th scope="row" className="py-2.5 pr-3 text-left font-medium">
        {SUBJECT_LABEL[t.subjectType] ?? t.subjectType}
      </th>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 rounded-full bg-primary/70"
            style={{ width: `${pct}%`, minWidth: 6, maxWidth: 140 }}
            aria-hidden
          />
          <span className="tabular-nums text-foreground/70">{dur(t.avgWaitHours)}</span>
        </div>
      </td>
      <td className="py-2.5 pr-3 tabular-nums text-foreground/70">{dur(t.avgDecisionHours)}</td>
      <td className="py-2.5 pr-3 tabular-nums text-foreground/70">{t.open}</td>
      <td className="py-2.5 pr-3 tabular-nums text-foreground/70">{t.firstPassRate}%</td>
      <td className="py-2.5 tabular-nums text-foreground/70">{t.reworkRate}%</td>
    </tr>
  );
}

export function ApprovalAnalyticsPanel() {
  const analyticsFn = useServerFn(getApprovalAnalytics);
  const [windowDays, setWindowDays] = useState<number>(90);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["approval-analytics", windowDays],
    queryFn: () => analyticsFn({ data: { windowDays } }),
  });

  const data = q.data;

  return (
    <section
      aria-labelledby="approval-analytics-heading"
      className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 sm:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2
            id="approval-analytics-heading"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50"
          >
            Review analytics
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {data
              ? `${data.totals.submitted} submitted in the last ${data.windowDays} days · ${data.totals.open} open · ${data.totals.throughputPerWeek} decisions / week`
              : "Time in each state and where the queue backs up."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex rounded-full border border-foreground/15 p-0.5"
            role="group"
            aria-label="Time window"
          >
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={windowDays === w}
                onClick={() => setWindowDays(w)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  windowDays === w ? "bg-foreground text-background" : "text-foreground/60"
                }`}
              >
                {w === 365 ? "1y" : `${w}d`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs hover:bg-foreground/5"
          >
            {open ? "Hide detail" : "Show detail"}
          </button>
        </div>
      </div>

      {q.isLoading && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-foreground/5" />
          ))}
        </div>
      )}

      {q.error && (
        <p className="mt-4 text-sm text-foreground/60">
          {String(q.error.message).includes("Unauthorized")
            ? "Sign in to see review analytics."
            : "Review analytics are unavailable right now."}
        </p>
      )}

      {data && data.totals.submitted === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center text-sm text-foreground/55">
          No submissions in this window yet — timings appear once items go through review.
        </p>
      )}

      {data && data.totals.submitted > 0 && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {data.states.map((s) => (
              <StateCard key={s.state} stat={s} />
            ))}
          </div>

          {data.bottlenecks.length > 0 && (
            <ul className="mt-4 space-y-2">
              {data.bottlenecks.map((b) => (
                <li
                  key={b.subjectType}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    Bottleneck
                  </span>
                  <span className="font-medium">
                    {SUBJECT_LABEL[b.subjectType] ?? b.subjectType}
                  </span>
                  <span className="min-w-0 text-amber-900/80">
                    {b.bottleneckReason || `${b.open} open, ${dur(b.avgWaitHours)} average wait`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {open && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">
                  Average approval timings and rework rates by asset type
                </caption>
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-foreground/45">
                    <th scope="col" className="pb-2 pr-3 text-left font-medium">
                      Asset type
                    </th>
                    <th scope="col" className="pb-2 pr-3 text-left font-medium">
                      Avg open wait
                    </th>
                    <th scope="col" className="pb-2 pr-3 text-left font-medium">
                      Avg to decision
                    </th>
                    <th scope="col" className="pb-2 pr-3 text-left font-medium">
                      Open
                    </th>
                    <th scope="col" className="pb-2 pr-3 text-left font-medium">
                      First pass
                    </th>
                    <th scope="col" className="pb-2 text-left font-medium">
                      Rework
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.types.map((t) => (
                    <TypeRow
                      key={t.subjectType}
                      t={t}
                      max={Math.max(...data.types.map((x) => x.avgWaitHours), 1)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
