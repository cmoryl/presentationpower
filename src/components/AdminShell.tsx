import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

type SessionInfo = {
  email: string | null;
  userId: string | null;
  roles: string[];
};

function SessionRoleIndicator() {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (mounted) {
          setInfo({ email: null, userId: null, roles: [] });
          setLoading(false);
        }
        return;
      }
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!mounted) return;
      setInfo({
        email: user.email ?? null,
        userId: user.id,
        roles: (roleRows ?? []).map((r: { role: string }) => r.role),
      });
      setLoading(false);
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.replace("/auth");
  }

  const signedIn = !!info?.userId;
  const isAdmin = info?.roles.includes("admin");

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
      <span className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            loading ? "bg-black/30" : signedIn ? "bg-emerald-500" : "bg-red-500"
          }`}
          aria-hidden
        />
        <span className="font-medium text-black/80">
          {loading ? "Checking session…" : signedIn ? "Signed in" : "Signed out"}
        </span>
      </span>
      {signedIn && (
        <>
          <span className="text-sm text-black/60">{info?.email}</span>
          <span className="flex flex-wrap gap-1">
            {(info?.roles.length ? info.roles : ["no role"]).map((r) => (
              <span
                key={r}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  r === "admin"
                    ? "bg-[#003FC7] text-white"
                    : r === "no role"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-black/10 text-black/70"
                }`}
              >
                {r}
              </span>
            ))}
          </span>
          {isAdmin && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
              Master access
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="ml-auto rounded-lg border border-black/10 px-3 py-1 text-xs font-medium text-black/70 hover:bg-black/5"
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

const items: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/ai", label: "AI analytics" },
  { to: "/admin/imagery", label: "Imagery analytics" },
  { to: "/admin/ab", label: "A/B color testing" },
  { to: "/admin/approvals", label: "Knowledgebase" },
  { to: "/admin/audit", label: "Audit log" },
];


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
