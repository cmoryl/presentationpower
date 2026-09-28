import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loginUrl } from "@/lib/sign-out";

export type SignInStatus = "checking" | "signed-in" | "signed-out";

/** Sends signed-out visitors to the login page, returning here after sign-in. Returns the check's status so pages can explain what's happening. */
export function useRequireSignIn(): SignInStatus {
  const [status, setStatus] = useState<SignInStatus>("checking");
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data.session) setStatus("signed-in");
      else {
        setStatus("signed-out");
        window.setTimeout(() => window.location.replace(loginUrl()), 900);
      }
    });
    return () => { live = false; };
  }, []);
  return status;
}
