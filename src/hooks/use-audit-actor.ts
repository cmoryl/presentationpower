import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setDeckAuditActor } from "@/lib/deck-store";

/**
 * Registers the signed-in user as the ambient actor for deck audit entries
 * (module layout/variant swaps). Mount once per editing surface.
 */
export function useAuditActor() {
  useEffect(() => {
    let active = true;
    const apply = (user: { id: string; email?: string | null } | null) => {
      if (!active) return;
      setDeckAuditActor(
        user
          ? { id: user.id, label: user.email ?? user.id.slice(0, 8) }
          : { id: null, label: "Signed out" },
      );
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      apply(session?.user ?? null),
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
}
