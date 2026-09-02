// Admin broadcast alerts — an admin composes a custom message and it lands in
// the chosen members' notification inbox (and email, when they allow it).
//
// Security: every function re-verifies the caller's admin role through the
// *user* client (has_role) before touching the privileged client. The recipient
// list is resolved server-side from roles/ids; the browser never dictates who
// can be mailed beyond selecting from the real member list.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AlertRecipient = {
  userId: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  lastSignInAt: string | null;
};

type AdminClient = {
  from: (t: string) => {
    select: (cols?: string) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  auth: {
    admin: {
      listUsers: (opts?: { page?: number; perPage?: number }) => Promise<{
        data: {
          users: Array<{ id: string; email?: string; last_sign_in_at: string | null }>;
        };
        error: unknown;
      }>;
    };
  };
};

/** Throws unless the caller holds the admin role. */
async function assertAdmin(context: {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}): Promise<void> {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin required");
}

export const listAlertRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ recipients: AlertRecipient[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as AdminClient;

    const [profiles, roles, usersRes] = await Promise.all([
      sa.from("profiles").select("id, display_name"),
      sa.from("user_roles").select("user_id, role"),
      sa.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const names = new Map<string, string | null>(
      ((profiles.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [
        p.id,
        p.display_name,
      ]),
    );
    const roleMap = new Map<string, string[]>();
    for (const r of (roles.data ?? []) as Array<{ user_id: string; role: string }>) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }

    const recipients: AlertRecipient[] = (usersRes.data?.users ?? []).map((u) => ({
      userId: u.id,
      email: u.email ?? null,
      displayName: names.get(u.id) ?? null,
      roles: roleMap.get(u.id) ?? [],
      lastSignInAt: u.last_sign_in_at ?? null,
    }));

    recipients.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return { recipients };
  });

const sendSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().max(2000).optional(),
  /** Optional in-app deep link, e.g. "/approvals". Same-origin paths only. */
  link: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/"), "Link must be a path starting with /")
    .optional(),
  audience: z.enum(["all", "role", "selected"]),
  /** Used when audience === "role". */
  role: z.string().trim().max(40).optional(),
  /** Used when audience === "selected". */
  userIds: z.array(z.string().uuid()).max(200).optional(),
});

export const sendAdminAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => sendSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ delivered: number }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as AdminClient;

    let targets: string[] = [];
    if (data.audience === "selected") {
      targets = data.userIds ?? [];
    } else if (data.audience === "role") {
      const { data: rows } = await sa.from("user_roles").select("user_id, role");
      targets = ((rows ?? []) as Array<{ user_id: string; role: string }>)
        .filter((r) => r.role === data.role)
        .map((r) => r.user_id);
    } else {
      const usersRes = await sa.auth.admin.listUsers({ page: 1, perPage: 200 });
      targets = (usersRes.data?.users ?? []).map((u) => u.id);
    }

    if (!targets.length) throw new Error("No recipients matched that audience");

    const { notifyUsers } = await import("./notify.server");
    // The sender is intentionally NOT excluded — an admin broadcasting to
    // "everyone" should see the same message land in their own inbox.
    const res = await notifyUsers({
      userIds: targets,
      kind: "admin_alert",
      title: data.title,
      body: data.body?.trim() ? data.body.trim() : null,
      link: data.link?.trim() ? data.link.trim() : null,
      subjectType: "admin_alert",
    });
    return { delivered: res.delivered };
  });
