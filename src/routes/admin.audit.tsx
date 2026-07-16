import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAuditLog } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/audit")({
  component: AuditView,
});

function AuditView() {
  const fn = useServerFn(listAuditLog);
  const q = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fn(), retry: false });
  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Audit log</h2>
      {q.isLoading && <div className="text-sm text-black/50">Loading…</div>}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
        <table className="w-full text-xs">
          <thead className="bg-black/5 text-left uppercase tracking-widest text-black/50">
            <tr><th className="p-2">When</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Meta</th></tr>
          </thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="p-2 text-black/60">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 font-mono text-black/60">{r.actor_user_id?.slice(0, 8) ?? "—"}</td>
                <td className="p-2 font-medium">{r.action}</td>
                <td className="p-2">{r.target_type ? `${r.target_type}:${r.target_id ?? "—"}` : "—"}</td>
                <td className="max-w-[420px] truncate p-2 font-mono text-black/50" title={r.meta}>{r.meta}</td>
              </tr>
            ))}
            {q.data && q.data.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-black/50">No audit events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
