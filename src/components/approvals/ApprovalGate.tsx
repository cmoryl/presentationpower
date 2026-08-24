// Export-side face of the brand approval workflow: shows the current sign-off
// state for an asset and lets the owner send it (or re-send it) for review with
// a snapshot of the automated checks.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getApprovalState,
  requestApproval,
  type ApprovalCheck,
  type ApprovalSubjectType,
} from "@/lib/brand-approvals.functions";
import { ApprovalTimeline } from "@/components/approvals/ApprovalTimeline";

export type ApprovalGateProps = {
  subjectType: ApprovalSubjectType;
  subjectId: string;
  title: string;
  /** In-app path a reviewer can open to see the asset. */
  subjectPath?: string;
  checks?: ApprovalCheck[];
  summary?: string;
};

const STATE_COPY: Record<string, { label: string; tone: string; hint: string }> = {
  approved: {
    label: "Brand approved",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
    hint: "Cleared for export and sharing.",
  },
  pending: {
    label: "Awaiting brand review",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    hint: "A reviewer has this in the queue.",
  },
  changes_requested: {
    label: "Changes requested",
    tone: "border-red-300 bg-red-50 text-red-900",
    hint: "Address the reviewer note, then re-submit.",
  },
};

export function ApprovalGate(props: ApprovalGateProps) {
  const stateFn = useServerFn(getApprovalState);
  const requestFn = useServerFn(requestApproval);
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const key = ["approval-state", props.subjectType, props.subjectId] as const;
  const state = useQuery({
    queryKey: key,
    queryFn: () =>
      stateFn({ data: { subjectType: props.subjectType, subjectId: props.subjectId } }),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
      requestFn({
        data: {
          subjectType: props.subjectType,
          subjectId: props.subjectId,
          title: props.title,
          subjectPath: props.subjectPath,
          summary: note.trim() || props.summary,
          checks: props.checks ?? [],
          priority: (props.checks ?? []).some((c) => c.severity === "blocking")
            ? "high"
            : "normal",
        },
      }),
    onSuccess: () => {
      setNote("");
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["approval-queue"] });
      void qc.invalidateQueries({ queryKey: ["approval-timeline"] });
      toast.success("Sent for brand review");
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("Unauthorized") ? "Sign in to request approval" : e.message,
      ),
  });

  const request = state.data?.request ?? null;
  const copy = request ? STATE_COPY[request.status] : null;

  return (
    <div className="rounded-2xl border border-foreground/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Brand &amp; compliance
          </div>
          {copy ? (
            <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${copy.tone}`}>
              {copy.label}
            </div>
          ) : (
            <p className="mt-2 text-sm text-foreground/60">
              Not submitted for review yet — optional, but recommended before you share externally.
            </p>
          )}
          {copy && <p className="mt-2 text-xs text-foreground/60">{copy.hint}</p>}
          {request?.decision_note && (
            <p className="mt-2 rounded-xl bg-foreground/5 px-3 py-2 text-xs text-foreground/70">
              Reviewer note: {request.decision_note}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/approvals"
            className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs hover:bg-foreground/5"
          >
            Open queue
          </Link>
          <button
            type="button"
            disabled={submit.isPending || request?.status === "pending"}
            onClick={() => submit.mutate()}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-40"
          >
            {request?.status === "pending"
              ? "In review"
              : request
                ? "Re-submit for review"
                : "Send for brand review"}
          </button>
        </div>
      </div>
      {request?.status !== "pending" && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for the reviewer…"
          aria-label="Note for the reviewer"
          className="mt-3 w-full rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-sm"
        />
      )}
      <ApprovalTimeline subjectType={props.subjectType} subjectId={props.subjectId} />
    </div>
  );
}
