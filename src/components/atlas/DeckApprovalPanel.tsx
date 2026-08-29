// Deck approval workflow for the Systems panel: a materialised division run is
// submitted for brand review (carrying its stage-vs-spec checks as evidence),
// a reviewer approves or sends it back, and approved runs appear in the live
// division decks list below.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  decideApproval,
  getApprovalState,
  listApprovedActivity,
  type ApprovalCheck,
} from "@/lib/brand-approvals.functions";
import { ApprovalGate } from "@/components/approvals/ApprovalGate";
import type { DeckWalkReport } from "@/lib/division-deck-run";

/** Turn the deck walk into reviewer-readable evidence. */
export function checksFromWalk(walk: DeckWalkReport): ApprovalCheck[] {
  const checks: ApprovalCheck[] = [
    {
      id: "walk-summary",
      label: `${walk.passCount}/${walk.slides.length} deck slides match ${walk.divisionName}'s spec`,
      severity: walk.passCount === walk.slides.length ? "info" : "warning",
      detail: `${walk.lightPackId} light / ${walk.darkPackId} dark · recipe ${walk.recipe ?? "none"}`,
    },
  ];
  for (const s of walk.slides.filter((s) => !s.ok).slice(0, 40)) {
    checks.push({
      id: `slide-${s.position + 1}-${s.variantId}`,
      label: `Slide ${s.position + 1} · ${s.variantId}`,
      severity: "blocking",
      detail: s.problems.join("; ").slice(0, 1000) || "off spec",
    });
  }
  if (walk.addedByQa > 0)
    checks.push({
      id: "qa-added",
      label: `${walk.addedByQa} sheet(s) added by the QA auto-fixer`,
      severity: "warning",
      detail: "Overflow was continued onto new sheets rather than shrunk.",
    });
  if (walk.droppedFromPlan > 0)
    checks.push({
      id: "plan-dropped",
      label: `${walk.droppedFromPlan} planned winner(s) replaced on deck creation`,
      severity: "warning",
      detail: "A brand-preferred variant took the position.",
    });
  return checks;
}

export function DeckApprovalPanel({ walk, ink }: { walk: DeckWalkReport; ink: string }) {
  const stateFn = useServerFn(getApprovalState);
  const decideFn = useServerFn(decideApproval);
  const activityFn = useServerFn(listApprovedActivity);
  const qc = useQueryClient();

  const checks = useMemo(() => checksFromWalk(walk), [walk]);
  const stateKey = ["approval-state", "deck", walk.deckId] as const;

  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => stateFn({ data: { subjectType: "deck" as const, subjectId: walk.deckId } }),
    retry: false,
  });

  const approved = useQuery({
    queryKey: ["approval-activity", "deck"],
    queryFn: () => activityFn(),
    retry: false,
  });

  const decide = useMutation({
    mutationFn: (status: "approved" | "changes_requested") => {
      const id = state.data?.request?.id;
      if (!id) throw new Error("Submit the run for review first");
      return decideFn({ data: { id, status } });
    },
    onSuccess: (_r, status) => {
      void qc.invalidateQueries({ queryKey: stateKey });
      void qc.invalidateQueries({ queryKey: ["approval-timeline"] });
      void qc.invalidateQueries({ queryKey: ["approval-activity", "deck"] });
      toast.success(
        status === "approved"
          ? "Approved into the live division decks"
          : "Sent back to the run owner",
      );
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("Forbidden")
          ? "Reviewer role required to decide"
          : e.message.includes("Unauthorized")
            ? "Sign in to review this run"
            : e.message,
      ),
  });

  const request = state.data?.request ?? null;
  const isReviewer = approved.data?.isReviewer ?? false;
  const liveDecks = (approved.data?.items ?? []).filter((i) => i.subject_type === "deck");

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <h3 className="text-base font-semibold" style={{ color: ink }}>
        Deck approval — {walk.divisionName}
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-black/60">
        Submit this materialised run for brand review with its stage-vs-spec evidence attached. A
        reviewer approves it into the live division decks, or sends it back with a note.
      </p>

      <div className="mt-4">
        <ApprovalGate
          subjectType="deck"
          subjectId={walk.deckId}
          title={`${walk.divisionName} — ${walk.title}`}
          subjectPath={`/decks/${walk.deckId}`}
          checks={checks}
          summary={walk.findings.join(" ")}
        />
      </div>

      {isReviewer && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!request || decide.isPending || request.status === "approved"}
            onClick={() => decide.mutate("approved")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: ink }}
          >
            {request?.status === "approved" ? "Approved" : "Approve into live division decks"}
          </button>
          <button
            type="button"
            disabled={!request || decide.isPending}
            onClick={() => decide.mutate("changes_requested")}
            className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: `${ink}33`, color: ink }}
          >
            Request changes
          </button>
          {!request && (
            <span className="text-xs text-black/50">Submit the run before deciding.</span>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-black/10 pt-4">
        <div className="text-xs uppercase tracking-widest text-black/45">Live division decks</div>
        {approved.isError && (
          <p className="mt-2 text-sm text-black/55">Sign in to see approved division decks.</p>
        )}
        {!approved.isError && liveDecks.length === 0 && (
          <p className="mt-2 text-sm text-black/55">
            Nothing approved yet — the first approved run lands here.
          </p>
        )}
        {liveDecks.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm text-black/70">
            {liveDecks.slice(0, 12).map((d) => (
              <li key={d.subject_id} className="flex flex-wrap items-baseline gap-2">
                <Link
                  to="/decks/$deckId"
                  params={{ deckId: d.subject_id }}
                  className="font-medium underline decoration-black/20"
                >
                  {d.title}
                </Link>
                <span className="text-xs text-black/45">
                  approved {d.decided_at ? new Date(d.decided_at).toLocaleString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
