import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listApprovalRequests,
  listApprovalComments,
  postApprovalComment,
  resolveApprovalComment,
  decideApproval,
  bulkDecideApprovals,
  type ApprovalCheck,
  type ApprovalRequestRow,
} from "@/lib/brand-approvals.functions";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import { ApprovalAnalyticsPanel } from "@/components/approvals/ApprovalAnalyticsPanel";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Brand approval queue · TransPerfect Element" },
      {
        name: "description",
        content:
          "Review, comment on and approve brand and compliance checks for decks, print, social and event assets before they are exported.",
      },
      { property: "og:title", content: "Brand approval queue · TransPerfect Element" },
      {
        property: "og:description",
        content: "Reviewer workspace for brand and compliance sign-off before export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalQueuePage,
});

type Tab = "pending" | "changes_requested" | "approved";

const SUBJECT_LABEL: Record<string, string> = {
  deck: "Deck",
  print: "Print",
  social: "Social",
  event: "Event",
  kit: "Campaign kit",
};

function relative(ts: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function ApprovalQueuePage() {
  const listFn = useServerFn(listApprovalRequests);
  const decideFn = useServerFn(decideApproval);
  const bulkFn = useServerFn(bulkDecideApprovals);
  const qc = useQueryClient();
  const { persona } = useWorkspacePersona();

  const [tab, setTab] = useState<Tab>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  const queue = useQuery({
    queryKey: ["approval-queue"],
    queryFn: () => listFn({ data: {} }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["approval-queue"] });
    void qc.invalidateQueries({ queryKey: ["approval-comments"] });
  };

  const decide = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "changes_requested" | "pending" }) =>
      decideFn({ data: { ...input, note: note.trim() || undefined } }),
    onSuccess: (_r, input) => {
      setNote("");
      invalidate();
      toast.success(
        input.status === "approved"
          ? "Approved — cleared for export"
          : input.status === "changes_requested"
            ? "Changes requested"
            : "Reopened for review",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: (status: "approved" | "changes_requested") =>
      bulkFn({ data: { ids: Array.from(selected), status, note: note.trim() || undefined } }),
    onSuccess: (r) => {
      setSelected(new Set());
      setNote("");
      invalidate();
      toast.success(`${r.count} item${r.count === 1 ? "" : "s"} updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (queue.data?.requests ?? []) as ApprovalRequestRow[];
  const people = queue.data?.people ?? {};
  const commentCounts = queue.data?.commentCounts ?? {};
  const isReviewer = queue.data?.isReviewer ?? false;

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      changes_requested: rows.filter((r) => r.status === "changes_requested").length,
      approved: rows.filter((r) => r.status === "approved").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.status !== tab) return false;
      if (typeFilter !== "all" && r.subject_type !== typeFilter) return false;
      if (!q) return true;
      return `${r.title} ${r.summary ?? ""} ${SUBJECT_LABEL[r.subject_type] ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, tab, typeFilter, search]);

  const blockingCount = (checks: ApprovalCheck[] | null) =>
    (checks ?? []).filter((c) => c.severity === "blocking").length;

  const error = queue.error as Error | null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-foreground/50">Governance</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Brand approval queue
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/60">
          Brand and compliance sign-off before anything is exported or shared. Review the automated
          checks, talk it through in the thread, then approve or send it back.
          {persona === "sales" && " Your own submissions appear here with their current state."}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting review" value={counts.pending} tone="bg-foreground text-background" />
        <Stat
          label="Changes requested"
          value={counts.changes_requested}
          tone="bg-amber-100 text-amber-900"
        />
        <Stat label="Approved" value={counts.approved} tone="bg-emerald-100 text-emerald-900" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or summary…"
          aria-label="Search approval requests"
          className="w-full rounded-full border border-foreground/15 bg-background px-4 py-2 text-sm focus:border-foreground/40 focus:outline-none"
        />
        <select
          aria-label="Asset type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-full border border-foreground/15 bg-background px-4 py-2 text-sm"
        >
          <option value="all">All asset types</option>
          {Object.entries(SUBJECT_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-foreground/10">
        {(["pending", "changes_requested", "approved"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "true" : undefined}
            className={`-mb-px rounded-t-lg px-4 py-2 text-sm ${
              tab === t
                ? "border-b-2 border-foreground font-medium"
                : "text-foreground/55 hover:text-foreground"
            }`}
          >
            {t === "pending"
              ? "Awaiting review"
              : t === "changes_requested"
                ? "Changes requested"
                : "Approved"}
            <span className="ml-2 text-xs text-foreground/40">{counts[t]}</span>
          </button>
        ))}
      </div>

      {isReviewer && <ApprovalAnalyticsPanel />}

      {isReviewer && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3 text-sm">
          <span className="text-foreground/60">{selected.size} selected</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional decision note…"
            aria-label="Decision note"
            className="min-w-48 flex-1 rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate("approved")}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Approve selected
          </button>
          <button
            type="button"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate("changes_requested")}
            className="rounded-full border border-foreground/20 px-4 py-1.5 text-xs font-medium hover:bg-foreground/5 disabled:opacity-40"
          >
            Request changes
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
          {error.message.includes("Unauthorized")
            ? "Sign in to see the approval queue."
            : error.message}
        </div>
      )}

      {queue.isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-foreground/5" />
          ))}
        </div>
      )}

      {!queue.isLoading && !error && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/60">
          Nothing here.{" "}
          {tab === "pending"
            ? "Items sent for brand review will land in this tab."
            : "Switch tabs to see other states."}
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((r) => {
          const open = openId === r.id;
          const blocking = blockingCount(r.checks);
          return (
            <li
              key={r.id}
              className="rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start gap-3">
                {isReviewer && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.title}`}
                    className="mt-1.5"
                    checked={selected.has(r.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        return next;
                      })
                    }
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-medium uppercase tracking-wide text-foreground/60">
                      {SUBJECT_LABEL[r.subject_type] ?? r.subject_type}
                    </span>
                    {r.priority === "high" && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900">
                        High priority
                      </span>
                    )}
                    {blocking > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900">
                        {blocking} blocking check{blocking === 1 ? "" : "s"}
                      </span>
                    )}
                    <span className="text-foreground/45">
                      {people[r.requested_by] ?? "Member"} · {relative(r.created_at)}
                    </span>
                    {commentCounts[r.id] ? (
                      <span className="text-foreground/45">{commentCounts[r.id]} comments</span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-medium">{r.title}</h2>
                  {r.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/60">{r.summary}</p>
                  )}
                  {r.decision_note && (
                    <p className="mt-2 rounded-xl bg-foreground/5 px-3 py-2 text-xs text-foreground/70">
                      Reviewer note: {r.decision_note}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.subject_path && (
                    <a
                      href={r.subject_path}
                      className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs hover:bg-foreground/5"
                    >
                      Open asset
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : r.id)}
                    className="rounded-full border border-foreground/20 px-3 py-1.5 text-xs hover:bg-foreground/5"
                  >
                    {open ? "Hide review" : "Review"}
                  </button>
                </div>
              </div>

              {open && (
                <div className="mt-5 grid gap-6 border-t border-foreground/10 pt-5 lg:grid-cols-2">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                      Brand &amp; compliance checks
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {(r.checks ?? []).length === 0 && (
                        <li className="text-sm text-foreground/55">
                          No automated checks were attached to this submission.
                        </li>
                      )}
                      {(r.checks ?? []).map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-foreground/10 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                c.severity === "blocking"
                                  ? "bg-red-500"
                                  : c.severity === "warning"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              aria-hidden
                            />
                            <span className="font-medium">{c.label}</span>
                            <span className="ml-auto text-xs uppercase tracking-wide text-foreground/45">
                              {c.severity}
                            </span>
                          </div>
                          {c.detail && (
                            <p className="mt-1 text-xs text-foreground/60">{c.detail}</p>
                          )}
                        </li>
                      ))}
                    </ul>

                    {isReviewer && (
                      <div className="mt-5 space-y-3">
                        <label
                          className="block text-xs font-medium text-foreground/60"
                          htmlFor={`note-${r.id}`}
                        >
                          Decision note
                        </label>
                        <textarea
                          id={`note-${r.id}`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                          placeholder="What has to change, or why this is cleared…"
                          className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: r.id, status: "approved" })}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            Approve for export
                          </button>
                          <button
                            type="button"
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ id: r.id, status: "changes_requested" })
                            }
                            className="rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium hover:bg-foreground/5 disabled:opacity-40"
                          >
                            Request changes
                          </button>
                          {r.status !== "pending" && (
                            <button
                              type="button"
                              disabled={decide.isPending}
                              onClick={() => decide.mutate({ id: r.id, status: "pending" })}
                              className="rounded-full border border-foreground/20 px-4 py-2 text-xs hover:bg-foreground/5 disabled:opacity-40"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  <CommentThread requestId={r.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl px-5 py-4 ${tone}`}>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] opacity-70">{label}</div>
    </div>
  );
}

function CommentThread({ requestId }: { requestId: string }) {
  const listFn = useServerFn(listApprovalComments);
  const postFn = useServerFn(postApprovalComment);
  const resolveFn = useServerFn(resolveApprovalComment);
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const thread = useQuery({
    queryKey: ["approval-comments", requestId],
    queryFn: () => listFn({ data: { requestId } }),
  });

  const post = useMutation({
    mutationFn: () => postFn({ data: { requestId, body } }),
    onSuccess: () => {
      setBody("");
      void qc.invalidateQueries({ queryKey: ["approval-comments", requestId] });
      void qc.invalidateQueries({ queryKey: ["approval-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: (input: { id: string; resolved: boolean }) => resolveFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval-comments", requestId] }),
  });

  const comments = thread.data?.comments ?? [];
  const people = thread.data?.people ?? {};

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
        Review thread
      </h3>
      <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {thread.isLoading && <li className="h-12 animate-pulse rounded-xl bg-foreground/5" />}
        {!thread.isLoading && comments.length === 0 && (
          <li className="text-sm text-foreground/55">No comments yet.</li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border px-3 py-2 text-sm ${
              c.resolved
                ? "border-emerald-200 bg-emerald-50/60 text-foreground/60"
                : "border-foreground/10"
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="font-medium text-foreground/70">
                {people[c.author_id] ?? "Member"}
              </span>
              <span>{relative(c.created_at)}</span>
              <button
                type="button"
                onClick={() => resolve.mutate({ id: c.id, resolved: !c.resolved })}
                className="ml-auto rounded-full border border-foreground/15 px-2 py-0.5 hover:bg-foreground/5"
              >
                {c.resolved ? "Unresolve" : "Resolve"}
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) post.mutate();
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim() || post.isPending}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-40"
        >
          Comment
        </button>
      </form>
    </section>
  );
}
