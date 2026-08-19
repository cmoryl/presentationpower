import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, AdminForbidden } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · TransPerfect Element" }] }),
  component: AdminGate,
});

function AdminGate() {
  const [state, setState] = useState<"loading" | "admin" | "not-admin" | "anon">("loading");

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (mounted) setState("anon");
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!mounted) return;
      setState(isAdmin ? "admin" : "not-admin");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <AppShell>
        <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading the admin console…</span>
          <div className="h-11 rounded-2xl bg-black/5 dark:bg-white/10" />
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="h-[420px] w-full shrink-0 rounded-2xl bg-black/5 md:w-64 dark:bg-white/10" />
            <div className="min-w-0 flex-1 space-y-4">
              <div className="h-32 rounded-2xl bg-black/5 dark:bg-white/10" />
              <div className="h-64 rounded-2xl bg-black/5 dark:bg-white/10" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (state === "anon") {
    if (typeof window !== "undefined") window.location.replace("/auth");
    return (
      <AppShell>
        <AdminForbidden message="Redirecting to sign in…" />
      </AppShell>
    );
  }
  if (state === "not-admin") {
    return (
      <AppShell>
        <AdminForbidden message="Admin access required. Contact a workspace administrator." />
      </AppShell>
    );
  }
  return <AdminShell />;
}
