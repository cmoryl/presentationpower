// Module review queue — Module Studio submissions waiting for a reviewer.
// Rendered as the "Modules" tab on /approvals.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decideModuleReview, listModuleReviewQueue } from "@/lib/custom-modules.functions";

type Tab = "pending" | "changes_requested" | "approved";
const TAB_LABEL: Record<Tab, string> = {
  pending: "Waiting for review",
  changes_requested: "Sent back",
  approved: "Approved",
};

export function ModuleReviewQueue() {
  const listFn = useServerFn(listModuleReviewQueue);
  const [tab, setTab] = useState<Tab>("pending");
  const q = useQuery({ queryKey: ["module-review-queue"], queryFn: () => listFn() });

  const err = q.error as Error | null;
  if (err) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-muted p-6 text-sm">
        {err.message.includes("Forbidden")
          ? "Module review is limited to admins and brand reviewers."
          : `Could not load the module queue: ${err.message}`}
      </div>
    );
  }

  const rows = q.data?.rows ?? [];
  const people = q.data?.people ?? {};
  const me = q.data?.me;
  const visible = rows.filter((r) => r.review_status === tab);

  return (
    <section className="space-y-4">
      <div role="tablist" aria-label="Module review status" className="flex flex-wrap gap-2 border-b border-border">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              tab === t
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]} ({rows.filter((r) => r.review_status === t).length})
          </button>
        ))}
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading modules…</p>}
      {!q.isLoading && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
          {tab === "pending"
            ? "No modules are waiting. Authors send modules here with “Submit for review” in Module Studio."
            : "Nothing here yet."}
        </p>
      )}
      {visible.map((r) => (
        <ModuleRow
          key={r.id}
          row={r}
          author={r.created_by ? (people[r.created_by] ?? "Member") : "Unknown"}
          reviewer={r.reviewer_id ? (people[r.reviewer_id] ?? "Member") : null}
          own={r.created_by === me}
        />
      ))}
    </section>
  );
}

type Row = Awaited<ReturnType<typeof listModuleReviewQueue>>["rows"][number];

function ModuleRow({
  row,
  author,
  reviewer,
  own,
}: {
  row: Row;
  author: string;
  reviewer: string | null;
  own: boolean;
}) {
  const decideFn = useServerFn(decideModuleReview);
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const decide = useMutation({
    mutationFn: (decision: "approved" | "changes_requested") =>
      decideFn({ data: { id: row.id, decision, notes: notes || undefined } }),
    onSuccess: (_d, decision) => {
      toast.success(decision === "approved" ? "Approved and published" : "Sent back to the author");
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["module-review-queue"] });
      void qc.invalidateQueries({ queryKey: ["custom-modules"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save the decision"),
  });
  const noteId = `module-note-${row.id}`;

  return (
    <article className="rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{row.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">{row.module_key}</span>
      </div>
      {row.description && <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        By {author}
        {row.submitted_at && ` · submitted ${new Date(row.submitted_at).toLocaleString()}`}
        {reviewer && row.reviewed_at && ` · decided by ${reviewer} ${new Date(row.reviewed_at).toLocaleString()}`}
      </p>
      {row.review_notes && (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">Reviewer note: {row.review_notes}</p>
      )}

      {row.review_status === "pending" &&
        (own ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This is your module — another reviewer has to decide it.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <label htmlFor={noteId} className="text-xs font-medium">
              Note for the author (required when sending back)
            </label>
            <textarea
              id={noteId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={decide.isPending}
                onClick={() => decide.mutate("approved")}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Approve and publish
              </button>
              <button
                type="button"
                disabled={decide.isPending || !notes.trim()}
                onClick={() => decide.mutate("changes_requested")}
                className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Send back
              </button>
            </div>
          </div>
        ))}
    </article>
  );
}
