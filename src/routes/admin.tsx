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
  const [state, setState] = useState<"loading" | "authed" | "anon">("loading");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState(data.session ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "authed" : "anon");
    });
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
    return (
      <AppShell>
        <AdminForbidden message="You must be signed in with an admin account to access this console." />
      </AppShell>
    );
  }
  return <AdminShell />;
}
