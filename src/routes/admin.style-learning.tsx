/**
 * GOVERNED EXPANSION REVIEW.
 *
 * Adaptive learning may re-order recommendations inside a capped band, but it
 * can never add a skin, change a palette rule or rewrite industry DNA. When
 * behaviour repeatedly diverges from the approved recipe DNA it lands here as a
 * PENDING candidate for a human to approve, defer or reject.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLoading } from "@/components/admin/AdminPage";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import {
  listExpansionCandidates,
  reviewExpansionCandidate,
  scanExpansionCandidates,
} from "@/lib/style-learning.functions";
import { LEARNING_LIMITS } from "@/lib/style-learning";

export const Route = createFileRoute("/admin/style-learning")({
  component: StyleLearningView,
  head: () => ({
    meta: [
      { title: "Style learning governance | OnDeck admin" },
      {
        name: "description",
        content:
          "Review adaptive style-learning candidates before any change to the approved OnDeck visual languages, palettes or industry DNA.",
      },
      { property: "og:title", content: "Style learning governance" },
      {
        property: "og:description",
        content: "Approve, defer or reject learned style-expansion candidates. Catalog changes stay human-approved.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Candidate = {
  id: string;
  profile_key: string;
  title: string;
  recipe_id: string | null;
  objective: string | null;
  audience: string | null;
  style_codes: string[];
  observations: number;
  evidence: Record<string, unknown> | null;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
};

function StyleLearningView() {
  const listFn = useServerFn(listExpansionCandidates);
  const scanFn = useServerFn(scanExpansionCandidates);
  const reviewFn = useServerFn(reviewExpansionCandidate);
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["admin", "style-learning"],
    queryFn: () => listFn(),
    retry: false,
  });

  const scanM = useMutation({
    mutationFn: () => scanFn({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "style-learning"] }),
  });

  const reviewM = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected" | "deferred"; note: string }) =>
      reviewFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "style-learning"] }),
  });

  if (q.isLoading) return <AdminLoading />;
  if (isForbidden(q.error)) return <AdminForbidden />;

  const rows = (q.data ?? []) as Candidate[];
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[#03002C] dark:text-white">
          Style learning governance
        </h1>
        <p className="max-w-2xl text-sm text-[#03002C]/60 dark:text-white/60">
          Recommendations learn from usage — selections, exports, reuse and overrides — but the learned
          nudge is capped at {LEARNING_LIMITS.totalCap} points, far below the industry-DNA prior of 100.
          The approved 28 visual languages, their palettes and the recipe DNA change only here, by
          explicit approval.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <button
          type="button"
          onClick={() => scanM.mutate()}
          disabled={scanM.isPending}
          className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {scanM.isPending ? "Scanning…" : "Scan usage for candidates"}
        </button>
        <span className="text-xs text-[#03002C]/55 dark:text-white/55">
          {pending.length} pending · {rows.length} total · threshold{" "}
          {LEARNING_LIMITS.expansionThreshold} positive signals per profile
        </span>
        {scanM.data && (
          <span className="text-xs text-[#03002C]/45 dark:text-white/45">
            Scanned {scanM.data.scanned} profiles, filed {scanM.data.filed}.
          </span>
        )}
      </div>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-[#03002C]/50 dark:border-white/10 dark:text-white/50">
          No candidates yet. Learning stays in cold start and every ranking comes from the approved
          catalog rules alone.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="space-y-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  r.status === "approved"
                    ? "bg-[#A6FA87]/30 text-[#03002C]"
                    : r.status === "rejected"
                      ? "bg-[#E53D2E]/15 text-[#E53D2E]"
                      : r.status === "deferred"
                        ? "bg-[#FFEB66]/30 text-[#03002C]"
                        : "bg-[#003FC7]/10 text-[#003FC7]"
                }`}
              >
                {r.status}
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium text-[#03002C] dark:text-white">
                {r.title}
              </p>
              <span className="text-xs tabular-nums text-[#03002C]/45 dark:text-white/45">
                {r.observations} signals
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-[#03002C]/50 dark:text-white/50">
              <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                profile {r.profile_key}
              </span>
              {r.style_codes.map((c) => (
                <span key={c} className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                  {c}
                </span>
              ))}
            </div>

            {r.evidence && (
              <details className="text-xs text-[#03002C]/55 dark:text-white/55">
                <summary className="cursor-pointer">Evidence</summary>
                <pre className="mt-1 overflow-x-auto rounded bg-black/5 p-2 text-[10px] dark:bg-white/10">
                  {JSON.stringify(r.evidence, null, 2)}
                </pre>
              </details>
            )}

            {r.status === "pending" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Review note (recorded with the decision)"
                  aria-label={`Review note for ${r.title}`}
                  className="min-w-[12rem] flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-xs outline-none focus:border-[#003FC7] dark:border-white/10 dark:bg-transparent dark:text-white"
                />
                {(["approved", "deferred", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => reviewM.mutate({ id: r.id, status: s, note: notes[r.id] ?? "" })}
                    disabled={reviewM.isPending}
                    className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15 dark:text-white"
                  >
                    {s === "approved" ? "Approve for versioning" : s === "deferred" ? "Defer" : "Reject"}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#03002C]/50 dark:text-white/50">
                {r.review_note || "No note"} ·{" "}
                {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "unreviewed"}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-[#03002C]/45 dark:text-white/45">
        Approving a candidate records the decision only. Catalog metadata, palettes and industry DNA
        are versioned separately and never rewritten by learning.
      </p>
    </div>
  );
}
