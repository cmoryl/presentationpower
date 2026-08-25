// Admin role management — lets admins grant/revoke any combination of
// app_role values for a team member. The caller's admin role is verified via
// has_role() through the *user* client before the privileged client writes.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const APP_ROLES = [
  "admin",
  "brand_reviewer",
  "brand_lead",
  "content_owner",
  "editor",
  "sales",
  "viewer",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  brand_reviewer: "Brand reviewer",
  brand_lead: "Brand lead",
  content_owner: "Content owner",
  editor: "Editor",
  sales: "Sales",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full access — every dashboard, admin tools, role management.",
  brand_reviewer: "Admin dashboard + approval reviews.",
  brand_lead: "MarOps dashboard — campaigns, brand assets, reviews.",
  content_owner: "MarOps dashboard — create and manage content.",
  editor: "MarOps dashboard — edit approved content.",
  sales: "Sales dashboard — create from approved templates only.",
  viewer: "Sales dashboard — view and present approved assets.",
};

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; roles: string[] }) => {
    if (!input || typeof input.userId !== "string" || !Array.isArray(input.roles)) {
      throw new Error("userId and roles[] are required");
    }
    const roles = input.roles.filter((r): r is AppRole =>
      (APP_ROLES as readonly string[]).includes(r),
    );
    return { userId: input.userId, roles };
  })
  .handler(async ({ data, context }) => {
    // 1. Verify caller is an admin through the user client (RLS as the user).
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin required");

    // 2. Safety: an admin cannot remove their own admin role (lockout guard).
    if (data.userId === context.userId && !data.roles.includes("admin")) {
      throw new Error("You cannot remove your own admin role.");
    }

    // 3. Replace the member's roles via the privileged client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delError) throw new Error(delError.message);

    if (data.roles.length > 0) {
      const rows = data.roles.map((role) => ({ user_id: data.userId, role }));
      const { error: insError } = await supabaseAdmin.from("user_roles").insert(rows);
      if (insError) throw new Error(insError.message);
    }

    // 4. Audit trail.
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: context.userId,
      action: "user_roles.set",
      target_type: "user",
      target_id: data.userId,
      meta: { roles: data.roles },
    });

    return { ok: true as const, userId: data.userId, roles: data.roles };
  });
