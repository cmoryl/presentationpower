import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reactive Supabase session user id. `undefined` = still resolving, `null` = signed out. */
export function useSessionUser() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
