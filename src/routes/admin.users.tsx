import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAdminUsers, inviteAdminUser, setUserRole, deleteAdminUser } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

const ROLES = ["admin", "editor", "brand_lead", "viewer", "user"] as const;
type Role = (typeof ROLES)[number];

export const Route = createFileRoute("/admin/users")({
  component: UsersView,
});

function UsersView() {
  const listFn = useServerFn(listAdminUsers);
  const inviteFn = useServerFn(inviteAdminUser);
  const roleFn = useServerFn(setUserRole);
  const delFn = useServerFn(deleteAdminUser);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn(), retry: false });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [msg, setMsg] = useState<string | null>(null);

  const inviteM = useMutation({
    mutationFn: (input: { email: string; role: Role }) => inviteFn({ data: input }),
    onSuccess: () => { setEmail(""); setMsg("Invite sent."); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: Error) => setMsg(e.message),
  });
  const roleM = useMutation({
    mutationFn: (input: { userId: string; role: Role; grant: boolean }) => roleFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  const delM = useMutation({
    mutationFn: (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold">Invite a user</h2>
        <p className="mt-1 text-sm text-black/60">They will receive an email invitation and be assigned the selected role.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className="min-w-[280px] flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => inviteM.mutate({ email, role })}
            disabled={!email || inviteM.isPending}
            className="rounded-lg bg-[#03002C] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {inviteM.isPending ? "Inviting…" : "Send invite"}
          </button>
        </div>
        {msg && <div className="mt-3 text-sm text-black/70">{msg}</div>}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">All users</h2>
          <span className="text-sm text-black/50">{q.data?.length ?? 0}</span>
        </div>
        {q.isLoading && <div className="text-sm text-black/50">Loading…</div>}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs uppercase tracking-widest text-black/50">
              <tr><th className="p-3">User</th><th className="p-3">Roles</th><th className="p-3">Last sign-in</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {q.data?.map((u) => (
                <tr key={u.id} className="border-t border-black/5 align-top">
                  <td className="p-3">
                    <div className="font-medium">{u.display_name ?? u.email}</div>
                    <div className="text-xs text-black/50">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => roleM.mutate({ userId: u.id, role: r, grant: !has })}
                            className={`rounded-full border px-2.5 py-1 text-xs transition ${has ? "border-[#03002C] bg-[#03002C] text-white" : "border-black/20 bg-white text-black/60 hover:bg-black/5"}`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-black/60">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => { if (confirm(`Delete ${u.email}? This cannot be undone.`)) delM.mutate(u.id); }}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
