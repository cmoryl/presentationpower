// Canonical sign-out flow.
//
// Every sign-out path — the user clicking "Sign out", and an expired session
// detected while calling a server function — funnels through here so the
// behaviour is identical:
//
//   1. show a message ("Your session expired…" for involuntary sign-outs),
//   2. stop in-flight queries so they can't 401-storm the cleared session,
//   3. drop cached protected data,
//   4. clear the Supabase session,
//   5. land on the login page (`/auth`) with `next` set to where the user was,
//      via history REPLACE so Back doesn't restore a protected screen.

import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again to continue.";

/** Login route for this app. Single source of truth for sign-out redirects. */
export const LOGIN_PATH = "/auth";

const PUBLIC_NO_LOGIN_PATHS = ["/events/next/london"];

export function isPublicNoLoginPath(pathname: string): boolean {
  return PUBLIC_NO_LOGIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

let signingOut = false;

/** Same-origin path (with query + hash) to return to after signing back in. */
function currentReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  if (!pathname || pathname.startsWith(LOGIN_PATH) || isPublicNoLoginPath(pathname)) return null;
  const path = `${pathname}${search}${hash}`;
  return path.startsWith("/") && !path.startsWith("//") ? path : null;
}

export function loginUrl(opts: { expired?: boolean; next?: string | null } = {}): string {
  const params = new URLSearchParams();
  const next = opts.next === undefined ? currentReturnPath() : opts.next;
  if (next) params.set("next", next);
  if (opts.expired) params.set("expired", "1");
  const qs = params.toString();
  return qs ? `${LOGIN_PATH}?${qs}` : LOGIN_PATH;
}

export interface SignOutOptions {
  /** Query cache to cancel + clear (optional; pass it when available). */
  queryClient?: QueryClient | null;
  /** "expired" shows the session-expired message; "user" is a deliberate sign-out. */
  reason?: "user" | "expired";
  /** Path to return to after signing back in. Defaults to the current location. */
  next?: string | null;
}

/**
 * Signs the user out and redirects to the login page. Safe to call from
 * anywhere (including middleware) and idempotent within a single page life.
 */
export async function signOutAndRedirect(options: SignOutOptions = {}): Promise<void> {
  const { queryClient, reason = "user" } = options;
  if (signingOut) return;
  signingOut = true;

  if (reason === "expired") {
    toast.error("Session expired", { description: SESSION_EXPIRED_MESSAGE });
  } else {
    toast.success("Signed out");
  }

  const next = options.next === undefined ? currentReturnPath() : options.next;

  try {
    await queryClient?.cancelQueries();
  } catch {
    /* ignore */
  }
  try {
    queryClient?.clear();
  } catch {
    /* ignore */
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* already gone — still redirect */
  }

  if (typeof window !== "undefined") {
    if (reason === "expired" && isPublicNoLoginPath(window.location.pathname)) {
      signingOut = false;
      return;
    }
    // Brief pause so the toast is visible before the login page renders it again.
    const target = loginUrl({ expired: reason === "expired", next });
    window.setTimeout(() => window.location.replace(target), reason === "expired" ? 350 : 0);
  }
}

/** Involuntary sign-out triggered by an expired/rejected session. */
export function handleExpiredSession(next?: string | null): void {
  void signOutAndRedirect({ reason: "expired", next });
}
