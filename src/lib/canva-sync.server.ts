// Smart Canva → app picture sync. Only designs edited in Canva after their last
// saved picture are exported, so unchanged designs never spend the export allowance.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { accessToken, designUpdatedAt, exportDesignJpg } from "@/lib/canva.server";
import { hasAiLabel, stripJpegMetadata } from "@/lib/strip-image-metadata";
import { SJB_CALENDAR_PICTURE_SAVED_AT } from "@/lib/sjb-social-calendar";

export type SyncCheck = { id: string; changed: boolean; canvaUpdatedAt: string | null; error?: string };

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!); }
  }));
  return out;
}

export async function checkDesigns(ids: string[]): Promise<SyncCheck[]> {
  const token = await accessToken();
  const { data: rows } = await supabaseAdmin.from("canva_asset_sync").select("design_id, synced_at").in("design_id", ids);
  const synced = new Map((rows ?? []).map((r) => [r.design_id, r.synced_at]));
  return pool(ids, 4, async (id) => {
    try {
      const edited = await designUpdatedAt(token, id);
      if (edited == null) return { id, changed: false, canvaUpdatedAt: null, error: "Not found in the shared Canva account" };
      const base = synced.get(id) ?? SJB_CALENDAR_PICTURE_SAVED_AT[id] ?? null;
      const baseMs = base ? new Date(base).getTime() : 0;
      await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, canva_updated_at: new Date(edited).toISOString(), checked_at: new Date().toISOString() });
      return { id, changed: edited > baseMs, canvaUpdatedAt: new Date(edited).toISOString() };
    } catch (e) {
      return { id, changed: false, canvaUpdatedAt: null, error: (e as Error).message };
    }
  });
}

export async function syncDesigns(ids: string[]) {
  const token = await accessToken();
  return pool(ids, 2, async (id) => {
    try {
      const raw = await exportDesignJpg(token, id);
      const clean = stripJpegMetadata(raw);
      if (hasAiLabel(clean)) throw new Error("Hidden AI labels could not be removed; picture not published");
      const now = new Date().toISOString();
      const path = `${id}/${Date.now()}.jpg`;
      const up = await supabaseAdmin.storage.from("canva-sync").upload(path, clean, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, synced_at: now, storage_path: path, bytes: clean.length, last_error: null, checked_at: now });
      if (error) throw new Error(error.message);
      return { id, ok: true as const };
    } catch (e) {
      const msg = (e as Error).message;
      await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, last_error: msg, checked_at: new Date().toISOString() });
      return { id, ok: false as const, error: msg };
    }
  });
}
