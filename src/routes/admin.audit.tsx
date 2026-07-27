import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAuditLog } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminPageHeader, AdminLoading } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/audit")({
  component: AuditView,
});

type Row = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: string;
};

const CATEGORIES = [
  { id: "all", label: "All events", match: () => true },
  { id: "module", label: "Modules", match: (a: string) => a.startsWith("module.") },
  { id: "user", label: "Users", match: (a: string) => a.startsWith("user.") },
  { id: "role", label: "Roles", match: (a: string) => a.startsWith("role.") },
] as const;

function AuditView() {
  const fn = useServerFn(listAuditLog);
  const q = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fn(), retry: false });
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [search, setSearch] = useState("");

  const rows = (q.data ?? []) as Row[];
  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category)!;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!cat.match(r.action)) return false;
      if (!s) return true;
      return (
        r.action.toLowerCase().includes(s) ||
        (r.target_id ?? "").toLowerCase().includes(s) ||
        (r.actor_user_id ?? "").toLowerCase().includes(s) ||
        r.meta.toLowerCase().includes(s)
      );
    });
  }, [rows, category, search]);

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <section className="space-y-4">
      <AdminPageHeader
        eyebrow="Governance"
        title="Audit log"
        description="Every admin, role, and module change — actor, target, and meta."
        actions={
          <span className="text-xs text-black/50">
            {filtered.length} of {rows.length} events
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => {
          const count = c.id === "all" ? rows.length : rows.filter((r) => c.match(r.action)).length;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                active ? "bg-black text-white" : "bg-black/5 text-black/70 hover:bg-black/10"
              }`}
            >
              {c.label}
              <span className={`ml-1.5 ${active ? "text-white/60" : "text-black/40"}`}>
                {count}
              </span>
            </button>
          );
        })}
        <input
          type="search"
          placeholder="Search action, target, actor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-64 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs"
        />
      </div>

      {q.isLoading && <AdminLoading />}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
        <table className="w-full text-xs">
          <thead className="bg-black/5 text-left uppercase tracking-widest text-black/50">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Actor</th>
              <th className="p-2">Action</th>
              <th className="p-2">Target</th>
              <th className="p-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="p-2 text-black/60">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 font-mono text-black/60">
                  {r.actor_user_id?.slice(0, 8) ?? "—"}
                </td>
                <td className="p-2 font-medium">{r.action}</td>
                <td className="p-2 font-mono text-black/60">
                  {r.target_type ? `${r.target_type}:${r.target_id?.slice(0, 8) ?? "—"}` : "—"}
                </td>
                <td className="max-w-[420px] truncate p-2 font-mono text-black/50" title={r.meta}>
                  {r.meta}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-black/50">
                  {rows.length === 0 ? "No audit events yet." : "No events match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
