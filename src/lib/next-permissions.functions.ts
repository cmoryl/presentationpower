// NEXT division editing permissions.
//
// Admins and brand leads can edit any NEXT division's pillars and agendas.
// Other users can only edit divisions they are explicitly assigned to in
// public.next_division_editors. Server functions enforce this; the UI disables
// save controls when the caller is not authorized.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MANAGING_ROLES = ["admin", "brand_lead"] as const;

export async function canEditNextDivision(
  userId: string,
  divisionId: string,
  supabase: {
    rpc: (name: "has_role", args: { _user_id: string; _role: string }) => Promise<{ data?: boolean | null; error?: Error }>;
    from: (table: "next_division_editors") => {
      select: (cols: string, opts?: { head?: boolean; count?: "exact" }) => {
        eq: (col: string, value: string) => Promise<{ count?: number | null; data?: unknown[]; error?: Error }>;
      };
    };
  },
): Promise<boolean> {
  const [admin, lead, editor] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "brand_lead" }),
    supabase
      .from("next_division_editors")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId)
      .eq("division_id", divisionId),
  ]);
  if (admin.error) throw admin.error;
  if (lead.error) throw lead.error;
  if (editor.error) throw editor.error;
  if (admin.data || lead.data) return true;
  return (editor.count ?? 0) > 0;
}

export const checkNextDivisionEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ divisionId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return canEditNextDivision(context.userId, data.divisionId, context.supabase);
  });

export const listNextDivisionEditors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isLead) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("next_division_editors")
      .select("id, user_id, division_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as {
      id: string;
      user_id: string;
      division_id: string;
      created_at: string;
    }[];
  });

const grantInput = z.object({ userId: z.string().uuid(), divisionId: z.string() });
export const grantNextDivisionEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => grantInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isLead) throw new Error("Forbidden");
    const { error } = await context.supabase.from("next_division_editors").insert({
      user_id: data.userId,
      division_id: data.divisionId,
      created_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

const revokeInput = z.object({ id: z.string().uuid() });
export const revokeNextDivisionEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => revokeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isLead) throw new Error("Forbidden");
    const { error } = await context.supabase.from("next_division_editors").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
