import { AdminLoading } from "@/components/admin/AdminPage";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listPendingModules,
  listRecentReviewed,
  listExpiringSoon,
  listModuleAudit,
  approveModule,
  rejectModule,
  requestChanges,
  bulkApproveModules,
  findDuplicates,
} from "@/lib/modules.functions";
import { useTaxonomy } from "@/hooks/use-taxonomy";
import { byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({ meta: [{ title: "Approvals · TransPerfect Modular" }] }),
  component: ApprovalsView,
});

const SLA_HOURS = 48;

function hoursSince(ts: string | null | undefined): number | null {
  if (!ts) return null;
  return Math.max(0, (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60));
}

function slaBadge(hours: number | null) {
  if (hours == null) return { label: "no submit time", tone: "bg-black/5 text-black/60" };
  if (hours > SLA_HOURS) return { label: `${Math.round(hours)}h · SLA breach`, tone: "bg-red-100 text-red-900" };
  if (hours > SLA_HOURS * 0.6) return { label: `${Math.round(hours)}h · due soon`, tone: "bg-amber-100 text-amber-900" };
  return { label: `${Math.round(hours)}h in queue`, tone: "bg-emerald-100 text-emerald-900" };
}

type PendingRow = Awaited<ReturnType<typeof listPendingModules>>[number];
type ReviewedRow = Awaited<ReturnType<typeof listRecentReviewed>>[number];
type ExpiringRow = Awaited<ReturnType<typeof listExpiringSoon>>[number];

type Tab = "pending" | "changes" | "expiring" | "reviewed";

function ApprovalsView() {
  const listPending = useServerFn(listPendingModules);
  const listReviewed = useServerFn(listRecentReviewed);
  const listExpiring = useServerFn(listExpiringSoon);
  const bulkApproveFn = useServerFn(bulkApproveModules);
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState<string>("all");

  const pending = useQuery({ queryKey: ["approvals", "pending"], queryFn: () => listPending() });
  const recent = useQuery({ queryKey: ["approvals", "recent"], queryFn: () => listReviewed() });
  const expiring = useQuery({ queryKey: ["approvals", "expiring"], queryFn: () => listExpiring() });

  const forbidden = (pending.error as Error | null)?.message?.includes("Forbidden");

  const pendingRows = (pending.data ?? []) as PendingRow[];
  const inPending = pendingRows.filter((r) => r.approval_status === "pending" || r.approval_status === "draft");
  const inChanges = pendingRows.filter((r) => r.approval_status === "changes-requested");

  const variantOptions = useMemo(() => {
    const s = new Set<string>();
    pendingRows.forEach((r) => r.variant_id && s.add(r.variant_id));
    return Array.from(s).sort();
  }, [pendingRows]);

  const filterRows = (rows: PendingRow[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (variantFilter !== "all" && r.variant_id !== variantFilter) return false;
      if (!q) return true;
      const hay = `${r.title ?? ""} ${r.variant_id ?? ""} ${r.brand_mode_id ?? ""} ${JSON.stringify(r.content ?? "")}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const currentRows = tab === "pending" ? filterRows(inPending) : tab === "changes" ? filterRows(inChanges) : [];

  const slaBreaches = inPending.filter((r) => (hoursSince(r.submitted_at) ?? 0) > SLA_HOURS).length;
  const avgAge = inPending.length
    ? Math.round(
        inPending.reduce((s, r) => s + (hoursSince(r.submitted_at) ?? 0), 0) / inPending.length,
      )
    : 0;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["approvals", "pending"] });
    qc.invalidateQueries({ queryKey: ["approvals", "recent"] });
    qc.invalidateQueries({ queryKey: ["approvals", "expiring"] });
  };

  const bulkApprove = useMutation({
    mutationFn: () => bulkApproveFn({ data: { moduleIds: Array.from(selected) } }),
    onSuccess: () => {
      setSelected(new Set());
      invalidateAll();
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => {
    if (currentRows.every((r) => selected.has(r.id)) && currentRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentRows.map((r) => r.id)));
    }
  };

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

  const counts = {
    pending: inPending.length,
    changes: inChanges.length,
    expiring: expiring.data?.length ?? 0,
    reviewed: recent.data?.length ?? 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Governance</div>
        <h2 className="mt-3 text-3xl font-semibold">Approvals command center</h2>
        <p className="mt-3 max-w-2xl text-black/60">
          The gate between contributor drafts and the shipped module library. Knowledge lookups live in the{" "}
          <span className="font-medium text-black/80">Knowledge browser</span> and{" "}
          <span className="font-medium text-black/80">Oracle KB</span> — this queue is for reviewer decisions only.
          Every action is written to the audit trail.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={counts.pending} accent="bg-black text-white" />
        <StatCard label="Changes requested" value={counts.changes} accent="bg-amber-100 text-amber-900" />
        <StatCard label="SLA breaches (>48h)" value={slaBreaches} accent={slaBreaches ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-900"} />
        <StatCard label="Avg age in queue" value={`${avgAge}h`} accent="bg-black/5 text-black/70" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, content, variant, brand mode…"
          className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm focus:border-black/40 focus:outline-none"
        />
        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm"
        >
          <option value="all">All variants</option>
          {variantOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-black/10">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")} label="Pending" count={counts.pending} />
        <TabButton active={tab === "changes"} onClick={() => setTab("changes")} label="Changes requested" count={counts.changes} />
        <TabButton active={tab === "expiring"} onClick={() => setTab("expiring")} label="Expiring soon" count={counts.expiring} />
        <TabButton active={tab === "reviewed"} onClick={() => setTab("reviewed")} label="Recently reviewed" count={counts.reviewed} />
      </div>

      {(tab === "pending" || tab === "changes") && (
        <section className="space-y-3">
          {currentRows.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentRows.length > 0 && currentRows.every((r) => selected.has(r.id))}
                  onChange={selectAllVisible}
                />
                <span className="text-black/60">
                  {selected.size > 0 ? `${selected.size} selected` : "Select all visible"}
                </span>
              </label>
              <button
                type="button"
                disabled={selected.size === 0 || bulkApprove.isPending}
                onClick={() => bulkApprove.mutate()}
                className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {bulkApprove.isPending ? "Approving…" : `Approve ${selected.size || ""}`.trim()}
              </button>
            </div>
          )}
          {pending.isLoading && <AdminLoading />}
          {!pending.isLoading && currentRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-black/60">
              Queue is empty.
            </div>
          )}
          {currentRows.map((row) => (
            <PendingCard
              key={row.id}
              row={row}
              selected={selected.has(row.id)}
              onToggle={() => toggle(row.id)}
              onAfterAction={invalidateAll}
            />
          ))}
        </section>
      )}

      {tab === "expiring" && <ExpiringList rows={(expiring.data ?? []) as ExpiringRow[]} loading={expiring.isLoading} />}

      {tab === "reviewed" && (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          {recent.data?.map((r, i) => (
            <ReviewedRowView key={r.id} row={r} first={i === 0} />
          ))}
          {recent.data && recent.data.length === 0 && (
            <div className="p-6 text-sm text-black/60">Nothing reviewed yet.</div>
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-black/50">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-3 py-1 text-lg font-semibold tabular-nums ${accent}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
        active ? "border-black font-medium text-black" : "border-transparent text-black/50 hover:text-black/80"
      }`}
    >
      {label}
      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-black text-white" : "bg-black/5 text-black/60"}`}>
        {count}
      </span>
    </button>
  );
}

function PendingCard({
  row,
  selected,
  onToggle,
  onAfterAction,
}: {
  row: PendingRow;
  selected: boolean;
  onToggle: () => void;
  onAfterAction: () => void;
}) {
  const { moduleVariants, moduleFamilies, brandModes } = useTaxonomy();
  const variant = byId(moduleVariants, row.variant_id);
  const family = variant ? byId(moduleFamilies, variant.familyId) : undefined;
  const brand = row.brand_mode_id ? byId(brandModes, row.brand_mode_id) : undefined;

  const approveFn = useServerFn(approveModule);
  const rejectFn = useServerFn(rejectModule);
  const changesFn = useServerFn(requestChanges);
  const dupeFn = useServerFn(findDuplicates);
  const auditFn = useServerFn(listModuleAudit);

  const [notes, setNotes] = useState("");
  const [expires, setExpires] = useState<string>("");
  const [dupes, setDupes] = useState<Awaited<ReturnType<typeof findDuplicates>> | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const audit = useQuery({
    queryKey: ["module-audit", row.id],
    queryFn: () => auditFn({ data: { moduleId: row.id } }),
    enabled: showAudit,
  });

  const approve = useMutation({
    mutationFn: () => approveFn({ data: { moduleId: row.id, notes: notes || undefined, expiresAt: expires || null } }),
    onSuccess: onAfterAction,
  });
  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { moduleId: row.id, notes } }),
    onSuccess: onAfterAction,
  });
  const changes = useMutation({
    mutationFn: () => changesFn({ data: { moduleId: row.id, notes } }),
    onSuccess: onAfterAction,
  });
  const scan = useMutation({
    mutationFn: () => dupeFn({ data: { moduleId: row.id } }),
    onSuccess: (d) => setDupes(d),
  });

  const expired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
  const content = (row.content ?? {}) as Record<string, unknown>;
  const preview = String(content.title ?? content.headline ?? content.insight ?? row.title ?? "(no title)");

  return (
    <div className={`rounded-2xl border p-5 ${selected ? "border-black/40 bg-black/[0.02]" : "border-black/10 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <input type="checkbox" className="mt-1.5" checked={selected} onChange={onToggle} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
              <span className="rounded-full bg-black/5 px-2 py-0.5 font-mono">{row.approval_status}</span>
              <span className="font-mono">{row.variant_id}</span>
              {family && <span>· {family.name}</span>}
              {brand && <span>· {brand.name}</span>}
              {(() => {
                const b = slaBadge(hoursSince(row.submitted_at));
                return <span className={`rounded-full px-2 py-0.5 font-medium ${b.tone}`}>{b.label}</span>;
              })()}
              {expired && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900">expired</span>
              )}
            </div>
            <div className="mt-1 truncate text-lg font-medium">{preview}</div>
            <div className="mt-0.5 text-xs text-black/40">
              Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "—"}
              {row.review_notes && (
                <span className="ml-2 italic text-black/50">· last note: "{row.review_notes}"</span>
              )}
            </div>
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
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="ml-auto rounded-full px-3 py-1.5 text-xs text-black/50 hover:text-black"
        >
          {showAudit ? "Hide history" : "View history"}
        </button>
      </div>

      {showAudit && (
        <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs">
          {audit.isLoading && <div className="text-black/50">Loading history…</div>}
          {audit.data && audit.data.length === 0 && <div className="text-black/50">No history yet.</div>}
          <ul className="space-y-1.5">
            {audit.data?.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2">
                <span className="font-mono text-black/80">{e.action.replace("module.", "")}</span>
                <span className="text-black/40">·</span>
                <span className="text-black/60">{new Date(e.created_at).toLocaleString()}</span>
                {e.meta && "notes" in e.meta && e.meta.notes && (
                  <span className="truncate italic text-black/60">"{String(e.meta.notes)}"</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExpiringList({ rows, loading }: { rows: ExpiringRow[]; loading: boolean }) {
  const now = Date.now();
  const sorted = useMemo(() => rows.slice().sort((a, b) => {
    const ta = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
    const tb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
    return ta - tb;
  }), [rows]);

  if (loading) return <AdminLoading />;
  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-black/60">
        Nothing expires in the next 30 days.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      {sorted.map((r, i) => {
        const t = r.expires_at ? new Date(r.expires_at).getTime() : 0;
        const expired = t < now;
        const days = Math.max(0, Math.round((t - now) / (1000 * 60 * 60 * 24)));
        return (
          <div
            key={r.id}
            className={`grid grid-cols-[1fr_8rem_8rem] items-center gap-3 px-5 py-3 text-sm ${
              i === 0 ? "" : "border-t border-black/5"
            }`}
          >
            <span className="truncate">{r.title ?? r.id.slice(0, 8)}</span>
            <span className="font-mono text-xs text-black/50">{r.variant_id}</span>
            <span className={`text-right text-xs ${expired ? "font-medium text-red-700" : "text-amber-700"}`}>
              {expired ? "expired" : `in ${days}d`}
            </span>
          </div>
        );
      })}
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
      <span className="truncate">
        {row.title ?? row.id.slice(0, 8)}
        {row.review_notes && <span className="ml-2 text-xs italic text-black/40">"{row.review_notes}"</span>}
      </span>
      <span className="font-mono text-xs text-black/50">{row.variant_id}</span>
      <span className="text-xs text-black/50">
        {row.approved_at ? new Date(row.approved_at).toLocaleDateString() : ""}
      </span>
    </div>
  );
}
