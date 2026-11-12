import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ids = (i: { ids: string[] }) => {
  if (!Array.isArray(i.ids) || i.ids.length === 0 || i.ids.length > 40) throw new Error("Send 1–40 designs at a time");
  for (const id of i.ids) if (!/^D[A-Za-z0-9_-]{10}$/.test(id)) throw new Error(`Bad design id ${id}`);
  return { ids: i.ids };
};

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only admins can sync pictures from Canva.");
}

/** Reads Canva edit times only — no exports. */
export const checkCanvaUpdates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(ids)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { checkDesigns } = await import("@/lib/canva-sync.server");
    return checkDesigns(data.ids);
  });

/** Exports, cleans and publishes only the designs passed in. */
export const syncCanvaDesigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ids: string[] }) => { const v = ids(i); if (v.ids.length > 10) throw new Error("Update up to 10 designs at a time"); return v; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { syncDesigns } = await import("@/lib/canva-sync.server");
    return syncDesigns(data.ids);
  });

/** Connection + sync health for Admin → Canva connection. */
export const getCanvaSyncHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { syncHealth } = await import("@/lib/canva-sync.server");
    return syncHealth();
  });

/** Runs the same capped job the daily schedule runs. */
export const runCanvaBackgroundSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { runBackgroundSync } = await import("@/lib/canva-sync.server");
    return runBackgroundSync("manual");
  });
