// Audit timeline for an item's brand/compliance review: every state change,
// reviewer action and decision note in order, shown on export surfaces.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  listApprovalTimeline,
  type ApprovalSubjectType,
  type ApprovalTimelineEvent,
} from "@/lib/brand-approvals.functions";

const KIND_COPY: Record<string, { label: string; dot: string }> = {
  submitted: { label: "Sent for brand review", dot: "bg-sky-500" },
  resubmitted: { label: "Re-submitted for review", dot: "bg-sky-500" },
  approved: { label: "Approved", dot: "bg-emerald-500" },
  changes_requested: { label: "Changes requested", dot: "bg-red-500" },
  reopened: { label: "Reopened", dot: "bg-amber-500" },
  comment: { label: "Comment added", dot: "bg-foreground/40" },
};

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function checkSummary(meta: ApprovalTimelineEvent["meta"]) {
  if (!meta) return null;
  const blocking = Number(meta.blocking ?? 0);
  const warnings = Number(meta.warnings ?? 0);
  if (!blocking && !warnings) return null;
  return [
    blocking ? `${blocking} blocking check${blocking === 1 ? "" : "s"}` : null,
    warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ApprovalTimeline(props: {
  subjectType: ApprovalSubjectType;
  subjectId: string;
  /** Bumped by the parent after a submit so the log refetches. */
  refreshKey?: number | string;
}) {
  const timelineFn = useServerFn(listApprovalTimeline);
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["approval-timeline", props.subjectType, props.subjectId, props.refreshKey ?? 0],
    queryFn: () =>
      timelineFn({ data: { subjectType: props.subjectType, subjectId: props.subjectId } }),
    retry: false,
  });

  const events = q.data?.events ?? [];
  const people = q.data?.people ?? {};
  const hasHistory = events.length > 0;

  return (
    <div className="mt-4 border-t border-foreground/10 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
          Audit timeline
        </span>
        <span className="shrink-0 text-xs text-foreground/60">
          {q.isLoading
            ? "Loading…"
            : hasHistory
              ? `${events.length} event${events.length === 1 ? "" : "s"}`
              : "No history yet"}
          <span aria-hidden className="ml-2">
            {open ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {q.isError && (
            <p className="text-xs text-foreground/60">
              Sign in as the owner or a reviewer to see the review history.
            </p>
          )}
          {!q.isError && !hasHistory && !q.isLoading && (
            <p className="text-xs text-foreground/60">
              Nothing recorded yet — the log starts the first time this item is sent for review.
            </p>
          )}
          {hasHistory && (
            <ol className="space-y-3">
              {events.map((e) => {
                const copy = KIND_COPY[e.kind] ?? {
                  label: e.kind,
                  dot: "bg-foreground/40",
                };
                const checks = checkSummary(e.meta);
                const actor = e.actor_id ? (people[e.actor_id] ?? "Member") : "System";
                return (
                  <li key={e.id} className="relative pl-5">
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1.5 h-2 w-2 rounded-full ${copy.dot}`}
                    />
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="break-words text-sm font-medium leading-snug">{copy.label}</span>
                      <span className="min-w-0 truncate text-xs text-foreground/60">
                        by {actor}
                      </span>
                      <span className="shrink-0 text-xs text-foreground/45">
                        {when(e.created_at)}
                      </span>
                    </div>
                    {e.from_status && e.to_status && e.from_status !== e.to_status && (
                      <div className="mt-0.5 text-xs text-foreground/55">
                        {e.from_status.replace(/_/g, " ")} → {e.to_status.replace(/_/g, " ")}
                      </div>
                    )}
                    {checks && <div className="mt-0.5 text-xs text-foreground/55">{checks}</div>}
                    {e.note && (
                      <p className="mt-1.5 whitespace-pre-wrap break-words rounded-xl bg-foreground/5 px-3 py-2 text-xs leading-relaxed text-foreground/75">
                        {e.note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
