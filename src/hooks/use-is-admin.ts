// Lightweight client-side admin *affordance* check: shows or hides admin-only
// links in shared UI. This is never a security boundary — every admin route and
// server function re-verifies `has_role(auth.uid(), 'admin')` server-side.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (!mounted) return;
      setIsAdmin((data ?? []).length > 0);
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
