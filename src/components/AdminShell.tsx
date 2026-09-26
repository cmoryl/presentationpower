import type React from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect, loginUrl } from "@/lib/sign-out";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";

type SessionInfo = {
  email: string | null;
  userId: string | null;
  roles: string[];
};

function SessionRoleBanner() {
  const queryClient = useQueryClient();
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
    await signOutAndRedirect({ queryClient, reason: "user" });
  }

  const signedIn = !!info?.userId;
  const isAdmin = info?.roles.includes("admin") ?? false;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            loading ? "bg-black/30" : signedIn ? "bg-emerald-500" : "bg-red-500"
          }`}
          aria-hidden
        />
        <span className="font-semibold text-black/85 dark:text-white/85">
          {loading ? "Checking…" : signedIn ? "Signed in" : "Signed out"}
        </span>
      </span>
      {signedIn && (
        <>
          <span className="hidden text-black/20 sm:inline">·</span>
          <span
            className="max-w-[220px] truncate text-black/70 dark:text-white/70"
            title={info?.email ?? undefined}
          >
            {info?.email}
          </span>
          {isAdmin && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              Admin · Master
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="ml-auto rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-black/70 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            Sign out
          </button>
        </>
      )}
      {!signedIn && !loading && (
        <a
          href={loginUrl()}
          className="ml-auto rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-[#0033a3]"
        >
          Sign in
        </a>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-full shrink-0 md:w-64">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <div className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
          Admin console
        </div>
        <nav className="space-y-4">
          {ADMIN_NAV_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40 dark:text-white/45">
                {g.label}
              </div>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = it.exact
                    ? pathname === it.to
                    : pathname === it.to || pathname.startsWith(it.to + "/");
                  return (
                    <Link
                      key={it.to}
                      to={it.to as never}
                      className={`block rounded-lg px-2.5 py-1.5 text-sm transition ${
                        active
                          ? "bg-[#03002C] text-white shadow-sm dark:bg-white/15"
                          : "text-black/75 hover:bg-black/5 dark:text-white/75 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function useAdminEditMode(): boolean {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Deep editors need the full width; the list/listing pages keep the sidebar.
  return /^\/admin\/print-library\/[^/]+/.test(pathname);
}

export function AdminShell() {
  const editMode = useAdminEditMode();
  return (
    <AppShell>
      <div className="mb-4">
        <SessionRoleBanner />
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        {!editMode && <AdminSidebar />}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}

export function AdminForbidden({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8">
      <h2 className="text-2xl font-semibold text-amber-950">Admin access required</h2>
      <p className="mt-2 text-sm text-amber-900/80">
        {message ??
          "This console is limited to accounts with the admin role. Ask a workspace admin to grant access."}
      </p>
    </div>
  );
}

export function isForbidden(err: unknown): boolean {
  return err instanceof Error && /forbidden/i.test(err.message);
}

/**
 * Admin-only wrapper for admin pages that live outside the /admin layout
 * (e.g. full-screen studios). Mirrors the /admin gate: signed-out visitors
 * are sent to sign in, signed-in non-admins see the access notice.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "admin" | "not-admin" | "anon">("loading");
  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (mounted) setState("anon");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (mounted) setState(isAdmin ? "admin" : "not-admin");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (state === "anon") window.location.replace(loginUrl());
  }, [state]);
  if (state === "admin") return <>{children}</>;
  return (
    <AppShell>
      {state === "loading" ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">Checking your access…</p>
      ) : (
        <AdminForbidden message={state === "anon" ? "Redirecting to sign in…" : undefined} />
      )}
    </AppShell>
  );
}
