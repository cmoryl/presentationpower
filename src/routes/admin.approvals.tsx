import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  listPendingModules,
  listRecentReviewed,
  approveModule,
  rejectModule,
  requestChanges,
  findDuplicates,
} from "@/lib/modules.functions";
import { useTaxonomy } from "@/hooks/use-taxonomy";
import { byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({ meta: [{ title: "Approvals · TransPerfect Modular" }] }),
  component: ApprovalsView,
});

type PendingRow = Awaited<ReturnType<typeof listPendingModules>>[number];
type ReviewedRow = Awaited<ReturnType<typeof listRecentReviewed>>[number];

function ApprovalsView() {
  const listPending = useServerFn(listPendingModules);
  const listReviewed = useServerFn(listRecentReviewed);
  const pending = useQuery({ queryKey: ["approvals", "pending"], queryFn: () => listPending() });
  const recent = useQuery({ queryKey: ["approvals", "recent"], queryFn: () => listReviewed() });

  const forbidden = (pending.error as Error | null)?.message?.includes("Forbidden");

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8">
        <h1 className="text-2xl font-semibold">Reviewer access required</h1>
        <p className="mt-2 text-sm text-black/70">
          This queue is limited to accounts with the <span className="font-mono">admin</span> or{" "}
          <span className="font-mono">brand_reviewer</span> role. Ask a workspace admin to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Governance</div>
        <h2 className="mt-3 text-3xl font-semibold">Knowledgebase & approvals</h2>
        <p className="mt-3 max-w-2xl text-black/60">
          Review, approve, or reject slide modules submitted to the library. Approved modules become available to the
          assembler and library search. Rejected modules stay with their owner with your notes attached.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-xl font-semibold">Pending review</h3>
          <span className="text-sm text-black/50">{pending.data?.length ?? 0}</span>
        </div>
        {pending.isLoading && <div className="text-sm text-black/50">Loading…</div>}
        {pending.data && pending.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-black/60">
            Queue is empty — no modules waiting for review.
          </div>
        )}
        <div className="space-y-3">
          {pending.data?.map((row) => (
            <PendingCard key={row.id} row={row} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-xl font-semibold">Recently reviewed</h3>
          <span className="text-sm text-black/50">{recent.data?.length ?? 0}</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          {recent.data?.map((r, i) => (
            <ReviewedRowView key={r.id} row={r} first={i === 0} />
          ))}
          {recent.data && recent.data.length === 0 && (
            <div className="p-6 text-sm text-black/60">Nothing reviewed yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}


function PendingCard({ row }: { row: PendingRow }) {
  const { moduleVariants, moduleFamilies, brandModes } = useTaxonomy();
  const variant = byId(moduleVariants, row.variant_id);
  const family = variant ? byId(moduleFamilies, variant.familyId) : undefined;
  const brand = row.brand_mode_id ? byId(brandModes, row.brand_mode_id) : undefined;

  const qc = useQueryClient();
  const approveFn = useServerFn(approveModule);
  const rejectFn = useServerFn(rejectModule);
  const changesFn = useServerFn(requestChanges);
  const dupeFn = useServerFn(findDuplicates);

  const [notes, setNotes] = useState("");
  const [expires, setExpires] = useState<string>("");
  const [dupes, setDupes] = useState<Awaited<ReturnType<typeof findDuplicates>> | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["approvals", "pending"] });
    qc.invalidateQueries({ queryKey: ["approvals", "recent"] });
  };
  const approve = useMutation({
    mutationFn: () => approveFn({ data: { moduleId: row.id, notes: notes || undefined, expiresAt: expires || null } }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { moduleId: row.id, notes } }),
    onSuccess: invalidate,
  });
  const changes = useMutation({
    mutationFn: () => changesFn({ data: { moduleId: row.id, notes } }),
    onSuccess: invalidate,
  });
  const scan = useMutation({
    mutationFn: () => dupeFn({ data: { moduleId: row.id } }),
    onSuccess: (d) => setDupes(d),
  });

  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  const content = (row.content ?? {}) as Record<string, unknown>;
  const preview = String(content.title ?? content.headline ?? content.insight ?? row.title ?? "(no title)");

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
            <span className="rounded-full bg-black/5 px-2 py-0.5 font-mono">{row.approval_status}</span>
            <span className="font-mono">{row.variant_id}</span>
            {family && <span>· {family.name}</span>}
            {brand && <span>· {brand.name}</span>}
            {expired && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900">expired</span>
            )}
          </div>
          <div className="mt-1 truncate text-lg font-medium">{preview}</div>
          <div className="mt-0.5 text-xs text-black/40">
            Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs hover:border-black/40 disabled:opacity-50"
        >
          {scan.isPending ? "Scanning…" : dupes ? `${dupes.length} match${dupes.length === 1 ? "" : "es"}` : "Scan for duplicates"}
        </button>
      </div>

      {dupes && dupes.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-medium">Duplicate content detected in {dupes.length} other module{dupes.length === 1 ? "" : "s"}:</div>
          <ul className="mt-1 space-y-0.5">
            {dupes.slice(0, 5).map((d) => (
              <li key={d.id} className="font-mono">
                {d.title ?? d.id.slice(0, 8)} · {d.approval_status}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_11rem]">
        <textarea
          placeholder="Reviewer notes (required for reject / changes)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
        />
        <label className="flex flex-col gap-1 text-xs text-black/60">
          Expires
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => approve.mutate()}
          disabled={approve.isPending}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {approve.isPending ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => notes && changes.mutate()}
          disabled={!notes || changes.isPending}
          title={!notes ? "Notes required" : ""}
          className="rounded-full border border-black/15 px-4 py-2 text-sm hover:border-black/40 disabled:opacity-50"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => notes && reject.mutate()}
          disabled={!notes || reject.isPending}
          title={!notes ? "Notes required" : ""}
          className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function ReviewedRowView({ row, first }: { row: ReviewedRow; first: boolean }) {
  return (
    <div className={`grid grid-cols-[6rem_1fr_9rem_auto] items-center gap-3 px-5 py-3 text-sm ${first ? "" : "border-t border-black/5"}`}>
      <span
        className={`rounded-full px-2 py-0.5 text-center text-xs font-medium ${
          row.approval_status === "approved" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
        }`}
      >
        {row.approval_status}
      </span>
      <span className="truncate">{row.title ?? row.id.slice(0, 8)}</span>
      <span className="font-mono text-xs text-black/50">{row.variant_id}</span>
      <span className="text-xs text-black/50">
        {row.approved_at ? new Date(row.approved_at).toLocaleDateString() : ""}
      </span>
    </div>
  );
}
