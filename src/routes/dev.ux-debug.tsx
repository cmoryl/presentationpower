/**
 * Debugging Workflow report — prioritized usability checklist built from a
 * recorded session (steps, toggles, preview states, friction signals).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { uxRecorder } from "@/lib/ux-debug/recorder";
import { analyzeSession, reportToMarkdown } from "@/lib/ux-debug/analyze";
import type { UxIssue, UxSession, UxSeverity } from "@/lib/ux-debug/types";

export const Route = createFileRoute("/dev/ux-debug")({
  head: () => ({
    meta: [
      { title: "Debugging Workflow · Session usability report" },
      {
        name: "description",
        content:
          "Record a real user session — steps, toggles, and preview states — and get a prioritized checklist of usability issues to fix.",
      },
      { property: "og:title", content: "Debugging Workflow · Session usability report" },
      {
        property: "og:description",
        content:
          "Session recording plus heuristic scoring: rage clicks, dead clicks, backtracking, stalls, and failed requests ranked by priority.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UxDebugReportPage,
});

const SEVERITY_STYLE: Record<UxSeverity, string> = {
  critical: "bg-[#E53D2E] text-white",
  high: "bg-[#FF9B70] text-[#03002C]",
  medium: "bg-[#FFEB66] text-[#03002C]",
  low: "bg-[#E0E8F5] text-[#03002C]",
};

const DONE_KEY = "tp.uxdebug.done.v1";

function useDoneMap() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "{}") as Record<string, boolean>);
    } catch {
      setDone({});
    }
  }, []);
  const toggle = (key: string) => {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem(DONE_KEY, JSON.stringify(next));
      return next;
    });
  };
  return { done, toggle };
}

function UxDebugReportPage() {
  const [sessions, setSessions] = useState<UxSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const { done, toggle } = useDoneMap();

  const refresh = () => {
    const live = uxRecorder.current();
    const list = [...(live ? [live] : []), ...uxRecorder.sessions()];
    setSessions(list);
    setActiveId((prev) => (prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? null)));
  };

  useEffect(() => {
    refresh();
    return uxRecorder.subscribe(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = sessions.find((s) => s.id === activeId) ?? null;
  const report = useMemo(() => (session ? analyzeSession(session) : null), [session]);

  const copyMarkdown = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(reportToMarkdown(report));
    toast.success("Checklist copied as markdown");
  };

  const downloadJson = () => {
    if (!session || !report) return;
    const blob = new Blob([JSON.stringify({ session, report }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ux-session-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-[11px] uppercase tracking-[0.28em] text-black/45">
          Debugging workflow
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#03002C]">
          Session usability report.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/60">
          Turn on the recorder dock (⌘/Ctrl+⇧+U, or append{" "}
          <code className="rounded bg-black/5 px-1">?uxdebug=1</code> to any URL), walk a real task
          end to end, then stop the recording. Every step, toggle and preview state is scored into
          the prioritized checklist below.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              uxRecorder.setEnabled(true);
              uxRecorder.start();
              toast.success("Recording — walk through the flow, then stop from the dock");
            }}
            className="rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:bg-[#003FC7]/90"
          >
            Start a new recording
          </button>
          <button
            type="button"
            onClick={() => {
              uxRecorder.stop();
              refresh();
            }}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Stop &amp; analyze
          </button>
          <button
            type="button"
            onClick={copyMarkdown}
            disabled={!report}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40"
          >
            Copy checklist
          </button>
          <button
            type="button"
            onClick={downloadJson}
            disabled={!report}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40"
          >
            Download JSON
          </button>
          {sessions.length ? (
            <button
              type="button"
              onClick={() => {
                uxRecorder.clearSessions();
                refresh();
              }}
              className="rounded-full px-3 py-2 text-xs text-black/50 hover:bg-black/5"
            >
              Clear history
            </button>
          ) : null}
        </div>

        {sessions.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {sessions.map((s) => {
              const isLive = !s.endedAt;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    s.id === activeId
                      ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                      : "border-black/15 text-black/60 hover:bg-black/5"
                  }`}
                >
                  {isLive ? "● " : ""}
                  {s.label} · {s.steps.length} steps
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/55">
            No sessions recorded yet. Start a recording, use the app normally, then come back here.
          </div>
        )}

        {report && session ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <Stat label="Health score" value={`${report.healthScore}/100`} />
              <Stat label="Duration" value={`${Math.round(report.durationMs / 1000)}s`} />
              <Stat label="Steps" value={String(report.stepCount)} />
              <Stat label="Issues" value={String(report.issues.length)} />
            </div>

            <h2 className="mt-10 text-lg font-semibold text-[#03002C]">Prioritized checklist</h2>
            <p className="mt-1 text-xs text-black/50">
              Ordered by severity × frequency. Tick items as you fix them — progress is saved
              locally.
            </p>

            <ol className="mt-4 space-y-3">
              {report.issues.map((issue, idx) => (
                <IssueRow
                  key={issue.id}
                  index={idx + 1}
                  issue={issue}
                  done={Boolean(done[issue.id])}
                  onToggle={() => toggle(issue.id)}
                />
              ))}
              {!report.issues.length ? (
                <li className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/60">
                  No friction detected in this session — the flow completed without rage clicks,
                  dead clicks, stalls, backtracking or failed requests.
                </li>
              ) : null}
            </ol>

            <button
              type="button"
              onClick={() => setShowTimeline((v) => !v)}
              className="mt-8 rounded-full border border-black/15 px-4 py-2 text-xs font-medium hover:bg-black/5"
              aria-expanded={showTimeline}
            >
              {showTimeline ? "Hide" : "Show"} step timeline ({session.steps.length})
            </button>

            {showTimeline ? (
              <div className="mt-3 max-h-[420px] overflow-auto rounded-2xl border border-black/10 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#F2F2F2] text-black/55">
                    <tr>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Kind</th>
                      <th className="px-3 py-2 font-medium">Label</th>
                      <th className="px-3 py-2 font-medium">Route</th>
                      <th className="px-3 py-2 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.steps.map((s) => (
                      <tr key={s.id} className="border-t border-black/5">
                        <td className="whitespace-nowrap px-3 py-1.5 text-black/50">
                          {new Date(s.t).toLocaleTimeString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 font-medium">{s.kind}</td>
                        <td className="px-3 py-1.5">{s.label}</td>
                        <td className="px-3 py-1.5 text-black/50">{s.route}</td>
                        <td className="px-3 py-1.5 text-black/50">{s.detail ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#03002C]">{value}</div>
    </div>
  );
}

function IssueRow({
  index,
  issue,
  done,
  onToggle,
}: {
  index: number;
  issue: UxIssue;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`rounded-2xl border bg-white p-4 transition ${
        done ? "border-black/5 opacity-60" : "border-black/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`Mark "${issue.title}" as addressed`}
          className="mt-1 h-4 w-4 accent-[#003FC7]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLE[issue.severity]}`}
            >
              {issue.severity}
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-black/45">
              {issue.category}
            </span>
            <span className="text-[10px] text-black/40">
              {issue.occurrences}× · priority {issue.priority}
            </span>
          </div>
          <h3
            className={`mt-1.5 text-sm font-semibold text-[#03002C] ${done ? "line-through" : ""}`}
          >
            {index}. {issue.title}
          </h3>
          <p className="mt-1 text-xs text-black/45">{issue.area}</p>
          <p className="mt-2 text-xs leading-relaxed text-black/70">
            <span className="font-medium">Fix:</span> {issue.recommendation}
          </p>
          {issue.evidence.length ? (
            <ul className="mt-2 space-y-0.5">
              {issue.evidence.map((e) => (
                <li key={e} className="text-[11px] text-black/45">
                  · {e}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}
