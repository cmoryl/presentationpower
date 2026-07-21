import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, AdminForbidden } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · TransPerfect Modular" }] }),
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
        <div className="text-sm text-black/50">Loading admin…</div>
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
