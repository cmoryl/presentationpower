import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loginUrl } from "@/lib/sign-out";

/** Sends signed-out visitors to the login page, returning here after sign-in. */
export function useRequireSignIn() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.replace(loginUrl());
    });
  }, []);
}
