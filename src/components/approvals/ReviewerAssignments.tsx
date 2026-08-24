// Per-item reviewer assignment + individual decision tracking.
//
// Reviewers pick named admin/marketing people for an approval item; each one
// records their own approve / send-back decision here. When every assignee
// approves, the request itself rolls up to approved.
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  assignApprovalReviewer,
  listApprovalAssignees,
  listAssignableReviewers,
  recordAssigneeDecision,
  unassignApprovalReviewer,
  ASSIGNEE_LANES,
  type AssigneeLane,
} from "@/lib/approval-assignees.functions";

const LANE_LABEL: Record<string, string> = {
  brand: "Brand",
  marketing: "Marketing",
  compliance: "Compliance",
  admin: "Admin",
};

const DECISION_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-900",
  changes_requested: "bg-amber-100 text-amber-900",
  pending: "bg-foreground/5 text-foreground/60",
};

const DECISION_LABEL: Record<string, string> = {
  approved: "Approved",
  changes_requested: "Changes requested",
  pending: "Waiting",
};

export function ReviewerAssignments({
  requestId,
  isReviewer,
}: {
  requestId: string;
  isReviewer: boolean;
}) {
  const listFn = useServerFn(listApprovalAssignees);
  const peopleFn = useServerFn(listAssignableReviewers);
  const assignFn = useServerFn(assignApprovalReviewer);
  const unassignFn = useServerFn(unassignApprovalReviewer);
  const decideFn = useServerFn(recordAssigneeDecision);
  const qc = useQueryClient();

  const [pick, setPick] = useState("");
  const [lane, setLane] = useState<AssigneeLane>("brand");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const assigned = useQuery({
    queryKey: ["approval-assignees", requestId],
    queryFn: () => listFn({ data: { requestIds: [requestId] } }),
  });

  const roster = useQuery({
    queryKey: ["assignable-reviewers"],
    queryFn: () => peopleFn(),
    enabled: isReviewer,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["approval-assignees", requestId] });
    void qc.invalidateQueries({ queryKey: ["approval-queue"] });
  };

  const assign = useMutation({
    mutationFn: () => assignFn({ data: { requestId, assigneeId: pick, lane } }),
    onSuccess: () => {
      setPick("");
      invalidate();
      toast.success("Reviewer assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassign = useMutation({
    mutationFn: (id: string) => unassignFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Assignment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: (input: {
      id: string;
      decision: "approved" | "changes_requested" | "pending";
    }) => decideFn({ data: { ...input, note: notes[input.id]?.trim() || undefined } }),
    onSuccess: (r) => {
      invalidate();
      toast.success(
        r.rolledUpTo === "approved"
          ? "All reviewers approved — item cleared for export"
          : r.rolledUpTo === "changes_requested"
            ? "Recorded — item sent back for changes"
            : "Your decision was recorded",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = assigned.data?.assignees ?? [];
  const people = assigned.data?.people ?? {};
  const me = assigned.data?.userId ?? "";

  const options = useMemo(() => {
    const taken = new Set(rows.map((r) => r.assignee_id));
    return (roster.data?.reviewers ?? []).filter((p) => !taken.has(p.id));
  }, [roster.data, rows]);

  const done = rows.filter((r) => r.decision === "approved").length;

  return (
    <section className="rounded-2xl border border-foreground/10 p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
          Assigned reviewers
        </h3>
        <span className="shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] tabular-nums text-foreground/60">
          {done}/{rows.length || 0} approved
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {assigned.isLoading && <li className="h-12 animate-pulse rounded-xl bg-foreground/5" />}
        {!assigned.isLoading && rows.length === 0 && (
          <li className="text-sm text-foreground/55">
            No named reviewers yet — anyone with the reviewer role can decide.
          </li>
        )}
        {rows.map((r) => {
          const mine = r.assignee_id === me;
          return (
            <li key={r.id} className="rounded-xl border border-foreground/10 px-3 py-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {people[r.assignee_id] ?? "Member"}
                    {mine && <span className="ml-2 text-xs text-foreground/45">you</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide text-foreground/45">
                    {LANE_LABEL[r.lane] ?? r.lane}
                    {r.decided_at ? ` · decided ${new Date(r.decided_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      DECISION_STYLE[r.decision] ?? DECISION_STYLE.pending
                    }`}
                  >
                    {DECISION_LABEL[r.decision] ?? r.decision}
                  </span>
                  {isReviewer && (
                    <button
                      type="button"
                      onClick={() => unassign.mutate(r.id)}
                      className="rounded-full border border-foreground/15 px-2 py-0.5 text-[11px] hover:bg-foreground/5"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {r.decision_note && (
                <p className="mt-2 whitespace-pre-wrap text-xs text-foreground/60">
                  {r.decision_note}
                </p>
              )}

              {(mine || isReviewer) && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Optional note with this decision…"
                    aria-label={`Decision note for ${people[r.assignee_id] ?? "reviewer"}`}
                    className="min-w-0 rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-xs"
                  />
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, decision: "changes_requested" })}
                      className="rounded-full border border-foreground/20 px-3 py-1.5 text-[11px] font-medium hover:bg-foreground/5 disabled:opacity-40"
                    >
                      Send back
                    </button>
                    {r.decision !== "pending" && (
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: r.id, decision: "pending" })}
                        className="rounded-full border border-foreground/15 px-3 py-1.5 text-[11px] hover:bg-foreground/5 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isReviewer && (
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (pick) assign.mutate();
          }}
        >
          <select
            value={pick}
            onChange={(e) => {
              const id = e.target.value;
              setPick(id);
              const match = (roster.data?.reviewers ?? []).find((p) => p.id === id);
              if (match) setLane(match.lane);
            }}
            aria-label="Reviewer to assign"
            className="min-w-0 rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-xs"
          >
            <option value="">Add a reviewer…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={lane}
            onChange={(e) => setLane(e.target.value as AssigneeLane)}
            aria-label="Review lane"
            className="rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-xs"
          >
            {ASSIGNEE_LANES.map((l) => (
              <option key={l} value={l}>
                {LANE_LABEL[l]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!pick || assign.isPending}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-40"
          >
            Assign
          </button>
        </form>
      )}
    </section>
  );
}
