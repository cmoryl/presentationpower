import { createServerFn } from "@tanstack/react-start";

/**
 * Shared team login.
 *
 * The whole team uses one password (stored server-side as TEAM_ACCESS_PASSWORD).
 * The server validates it, makes sure the shared account exists with admin
 * access, signs in on the server, and hands back a session for the browser.
 * The password itself never ships to the client bundle.
 */

export const TEAM_ACCOUNT_EMAIL = "team@presentationpower.app";

function timingSafeEqual(a: string, b: string): boolean {
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

export const teamSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    const password = typeof data?.password === "string" ? data.password : "";
    if (!password) throw new Error("Password is required");
    return { password };
  })
  .handler(async ({ data }) => {
    const expected = process.env.TEAM_ACCESS_PASSWORD;
    if (!expected) {
      throw new Error("Team access is not configured yet.");
    }
    if (!timingSafeEqual(data.password, expected)) {
      return { ok: false as const, error: "Incorrect team password." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    // 1. Find or create the shared account, keeping its password in sync
    //    with the current TEAM_ACCESS_PASSWORD value.
    let userId: string | null = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === TEAM_ACCOUNT_EMAIL,
    );

    if (existing) {
      userId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: expected,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: TEAM_ACCOUNT_EMAIL,
        password: expected,
        email_confirm: true,
        user_metadata: { display_name: "Team" },
      });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? "Could not create the team account.");
      }
      userId = created.user.id;
    }

    // 2. Profile + full admin role for the shared account.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, display_name: "Team" }, { onConflict: "id" });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    // 3. Sign in server-side and return the session for the browser.
    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email: TEAM_ACCOUNT_EMAIL,
      password: expected,
    });
    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message ?? "Could not start the team session.");
    }

    return {
      ok: true as const,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
