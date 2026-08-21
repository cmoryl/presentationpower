// Client-side auth attacher for server functions.
//
// Replaces the generated `attachSupabaseAuth`. That middleware read the cached
// session and attached whatever token it found — so an expired (or not-yet-
// hydrated) session produced a bare RPC and the backend answered
// "Unauthorized: No authorization header provided", surfaced to users as a
// raw error toast.
//
// This version:
//   1. refreshes the session when the access token is expired / about to be,
//   2. waits briefly for a session that is still hydrating from storage,
//   3. retries the call once after a forced refresh when the server still
//      rejects it as unauthorized,
//   4. turns a genuinely signed-out state into a readable message.

import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SESSION_EXPIRED_MESSAGE, handleExpiredSession } from "@/lib/sign-out";

const SKEW_SECONDS = 60;

function isUnauthorized(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ((error as { message?: string } | null)?.message ?? "");
  return /unauthor|401|no authorization header/i.test(msg);
}

async function currentToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt && expiresAt - SKEW_SECONDS <= Math.floor(Date.now() / 1000)) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? session.access_token ?? null;
  }
  return session.access_token ?? null;
}

async function tokenWithHydrationGrace(): Promise<string | null> {
  const first = await currentToken();
  if (first) return first;
  // Storage-backed sessions can land a tick after the first render.
  await new Promise((r) => setTimeout(r, 250));
  return currentToken();
}

export const attachAuthWithRefresh = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await tokenWithHydrationGrace();
    try {
      return await next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      const { data } = await supabase.auth.refreshSession();
      const fresh = data.session?.access_token;
      if (fresh) {
        return await next({ headers: { Authorization: `Bearer ${fresh}` } });
      }
      // No refreshable session left: run the canonical sign-out flow (message
      // + cache teardown + redirect to the login page).
      handleExpiredSession();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
  },
);
