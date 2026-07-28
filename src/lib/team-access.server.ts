// Brute-force throttling for the shared team login.
//
// `teamSignIn` is by definition unauthenticated and guards a single shared
// password that grants full admin access, so it is the most attackable surface
// in the app. Every attempt is logged against a hashed client key (IP +
// user-agent) and repeated failures inside a short window are refused.

import { getRequest } from "@tanstack/react-start/server";

/** Failures allowed per client key inside WINDOW_MINUTES before lockout. */
const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;

/** Stable, non-reversible identifier for the caller (we never store raw IPs). */
export async function clientKeyFromRequest(): Promise<string> {
  let raw = "unknown";
  try {
    const request = getRequest();
    const h = request?.headers;
    if (h) {
      const ip =
        h.get("cf-connecting-ip") ??
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        "unknown";
      raw = `${ip}|${h.get("user-agent") ?? ""}`;
    }
  } catch {
    // No request context (e.g. during prerender) — fall through to "unknown".
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/**
 * Returns how many minutes the caller must wait, or null when they may try.
 * Failures never block the login flow itself — if the log is unavailable we
 * allow the attempt rather than locking the whole team out.
 */
export async function checkTeamLoginThrottle(
  admin: Admin,
  clientKey: string,
): Promise<number | null> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from("team_access_attempts")
    .select("created_at")
    .eq("client_key", clientKey)
    .eq("succeeded", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error || !data || data.length < MAX_FAILURES) return null;

  const oldest = new Date(data[0].created_at).getTime();
  const unlocksAt = oldest + WINDOW_MINUTES * 60_000;
  return Math.max(1, Math.ceil((unlocksAt - Date.now()) / 60_000));
}

export async function recordTeamLoginAttempt(
  admin: Admin,
  clientKey: string,
  succeeded: boolean,
): Promise<void> {
  try {
    await admin.from("team_access_attempts").insert({ client_key: clientKey, succeeded });
    if (succeeded) {
      // A correct password clears the client's failure history.
      await admin
        .from("team_access_attempts")
        .delete()
        .eq("client_key", clientKey)
        .eq("succeeded", false);
    }
  } catch {
    // Logging must never break sign-in.
  }
}

/** Constant-time string comparison for the shared password. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}
