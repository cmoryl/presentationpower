import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

const items = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/ai", label: "AI analytics" },
  { to: "/admin/imagery", label: "Imagery analytics" },
  { to: "/admin/ab", label: "A/B color testing" },
  { to: "/admin/approvals", label: "Knowledgebase" },
  { to: "/admin/audit", label: "Audit log" },
] as const;

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Enterprise console</div>
        <h1 className="mt-3 text-4xl font-semibold">Admin</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Governance, analytics, and experimentation for the TransPerfect Modular system. Admin role required.
        </p>
      </div>
      <nav className="mt-8 flex flex-wrap gap-1 rounded-2xl border border-black/10 bg-white/60 p-1 backdrop-blur">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`rounded-xl px-3.5 py-2 text-sm transition ${
                active ? "bg-[#03002C] text-white shadow" : "text-black/70 hover:bg-black/5"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </AppShell>
  );
}

export function AdminForbidden({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8">
      <h2 className="text-2xl font-semibold text-amber-950">Admin access required</h2>
      <p className="mt-2 text-sm text-amber-900/80">
        {message ?? "This console is limited to accounts with the admin role. Ask a workspace admin to grant access."}
      </p>
    </div>
  );
}

export function isForbidden(err: unknown): boolean {
  return err instanceof Error && /forbidden/i.test(err.message);
}
