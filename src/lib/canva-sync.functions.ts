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

/** Public (no sign-in): when the pictures on the Bowl pages last changed. Dates only —
 *  no design names, counts, problems or Canva calls. */
export const getCanvaSyncStamp = createServerFn({ method: "GET" })
  .handler(async () => {
    const { publicSyncStamp } = await import("@/lib/canva-sync.server");
    return publicSyncStamp();
  });

/** When the site last checked Canva and what the last update run did. */
export const getCanvaSyncLastRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { lastRunSummary } = await import("@/lib/canva-sync.server");
    return lastRunSummary();
  });

/** Per design: last Canva edit (from the latest check) vs the site's saved picture date. No Canva calls. */
export const listCanvaSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { canvaSyncTargets } = await import("@/lib/canva-sync-targets");
    const { SJB_CALENDAR_PICTURE_SAVED_AT } = await import("@/lib/sjb-social-calendar");
    const targets = canvaSyncTargets();
    const { data } = await supabaseAdmin.from("canva_asset_sync").select("design_id, canva_updated_at, synced_at, checked_at, last_error").in("design_id", targets.map((t) => t.id));
    const rows = new Map((data ?? []).map((r) => [r.design_id, r]));
    return targets.map((t) => {
      const r = rows.get(t.id);
      const bundled = SJB_CALENDAR_PICTURE_SAVED_AT[t.id] ?? null;
      const saved = r?.synced_at ?? bundled;
      const edited = r?.canva_updated_at ?? null;
      const status = !edited ? "unchecked" : !saved || new Date(edited) > new Date(saved) ? "needs-update" : "up-to-date";
      return { id: t.id, group: t.group, canvaEditedAt: edited, siteSavedAt: saved, savedBy: r?.synced_at ? "sync" : bundled ? "original" : null, checkedAt: r?.checked_at ?? null, error: r?.last_error ?? null, status } as const;
    });
  });
