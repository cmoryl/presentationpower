// NEXT division editing permissions.
//
// Admins and brand reviewers can edit any NEXT division's pillars and agendas.
// Other users can only edit divisions they are explicitly assigned to in
// public.next_division_editors. Server functions enforce this; the UI disables
// save controls when the caller is not authorized.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export async function canEditNextDivision(
  userId: string,
  divisionId: string,
  supabase: unknown,
): Promise<boolean> {
  if (!divisionId) return false;
  const sb = supabase as {
    rpc: (name: string, args: { _user_id: string; _role: string }) => Promise<{ data?: boolean | null; error?: Error }>;
    from: (table: string) => {
      select: (cols: string, opts?: { head?: boolean; count?: "exact" }) => {
        eq: (col: string, value: string) => { eq: (col: string, value: string) => Promise<{ count?: number | null; data?: unknown[]; error?: Error }> };
        single: () => Promise<{ data?: unknown; error?: Error }>;
      };
    };
  };

  const [admin, reviewer, lead, editor] = await Promise.all([
    sb.rpc("has_role", { _user_id: userId, _role: "admin" }),
    sb.rpc("has_role", { _user_id: userId, _role: "brand_reviewer" }),
    sb.rpc("has_role", { _user_id: userId, _role: "brand_lead" }),
    sb
      .from("next_division_editors")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId)
      .eq("division_id", divisionId),
  ]);
  if (admin.error) throw admin.error;
  if (reviewer.error) throw reviewer.error;
  if (lead.error) throw lead.error;
  if (editor.error) throw editor.error;
  if (admin.data || reviewer.data || lead.data) return true;
  return (editor.count ?? 0) > 0;
}

export const checkNextDivisionEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ divisionId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return canEditNextDivision(context.userId, data.divisionId, context.supabase);
  });

export const listNextDivisionEditors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isReviewer } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_reviewer" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isReviewer && !isLead) throw new Error("Forbidden");
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
  .validator((data: unknown) => grantInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isReviewer } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_reviewer" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isReviewer && !isLead) throw new Error("Forbidden");
    const { error } = await context.supabase.from("next_division_editors").insert({
      user_id: data.userId,
      division_id: data.divisionId,
    });
    if (error) throw error;
    return { ok: true };
  });

const revokeInput = z.object({ id: z.string().uuid() });
export const revokeNextDivisionEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => revokeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: isReviewer } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_reviewer" });
    const { data: isLead } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "brand_lead" });
    if (!isAdmin && !isReviewer && !isLead) throw new Error("Forbidden");
    const { error } = await context.supabase.from("next_division_editors").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
