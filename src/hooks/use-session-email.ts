import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Reactive signed-in email. `undefined` = still resolving, `null` = signed out. */
export function useSessionEmail() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return email;
}
