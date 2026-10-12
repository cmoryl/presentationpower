import { useEffect, useState } from "react";
import { confirmSignedOut, loginUrl } from "@/lib/sign-out";

export type SignInStatus = "checking" | "signed-in" | "signed-out";

/** Sends signed-out visitors to the login page, returning here after sign-in. Returns the check's status so pages can explain what's happening. */
export function useRequireSignIn(): SignInStatus {
  const [status, setStatus] = useState<SignInStatus>("checking");
  useEffect(() => {
    let live = true;
    void confirmSignedOut().then((out) => {
      if (!live) return;
      if (!out) setStatus("signed-in");
      else {
        setStatus("signed-out");
        window.setTimeout(() => window.location.replace(loginUrl()), 350);
      }
    });
    return () => { live = false; };
  }, []);
  return status;
}
