// Smart Canva → app picture sync. Only designs edited in Canva after their last
// saved picture are exported, so unchanged designs never spend the export allowance.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { accessToken, designUpdatedAt, exportDesign } from "@/lib/canva.server";
import { hasAiLabel, isPng, stripJpegMetadata, stripPngMetadata } from "@/lib/strip-image-metadata";
import { canvaSyncTarget, canvaSyncTargets } from "@/lib/canva-sync-targets";
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
  return pool(ids, 2, async (id) => {
    try {
      const edited = await designUpdatedAt(token, id);
      if (edited == null) return { id, changed: false, canvaUpdatedAt: null, error: "Not found in the shared Canva account" };
      const base = synced.get(id) ?? SJB_CALENDAR_PICTURE_SAVED_AT[id] ?? null;
      const baseMs = base ? new Date(base).getTime() : 0;
      await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, canva_updated_at: new Date(edited).toISOString(), checked_at: new Date().toISOString(), last_error: null });
      return { id, changed: edited > baseMs, canvaUpdatedAt: new Date(edited).toISOString() };
    } catch (e) {
      return { id, changed: false, canvaUpdatedAt: null, error: (e as Error).message };
    }
  });
}

export type SyncResult =
  | { id: string; ok: true; bytes: number; previousBytes: number | null; previousSyncedAt: string | null; canvaUpdatedAt: string | null; syncedAt: string; verified: string[] }
  | { id: string; ok: false; error: string };

export async function syncDesigns(ids: string[]): Promise<SyncResult[]> {
  const token = await accessToken();
  const { data: rows } = await supabaseAdmin.from("canva_asset_sync").select("design_id, synced_at, bytes, canva_updated_at").in("design_id", ids);
  const prev = new Map((rows ?? []).map((r) => [r.design_id, r]));
  return pool(ids, 2, async (id): Promise<SyncResult> => {
    try {
      const t = canvaSyncTarget(id) ?? { format: "jpg" as const, allPages: false };
      const raws = await exportDesign(token, id, t.format, t.allPages);
      if (!raws.length) throw new Error("Canva export returned no pages");
      const now = new Date().toISOString();
      const stamp = Date.now();
      const paths: string[] = [];
      let total = 0;
      for (const [n, raw] of raws.entries()) {
        const clean = t.format === "png" ? stripPngMetadata(raw) : stripJpegMetadata(raw);
        if (hasAiLabel(clean)) throw new Error("Hidden AI labels could not be removed; picture not published");
        const path = `${id}/${stamp}-p${n + 1}.${t.format}`;
        const up = await supabaseAdmin.storage.from("canva-sync").upload(path, clean, { contentType: t.format === "png" ? "image/png" : "image/jpeg", upsert: false });
        if (up.error) throw new Error(up.error.message);
        // Verify the stored copy before making it live.
        const back = await supabaseAdmin.storage.from("canva-sync").download(path);
        if (back.error || !back.data) throw new Error("Saved-copy verification failed: could not read it back");
        const b = new Uint8Array(await back.data.arrayBuffer());
        if (b.length !== clean.length) throw new Error("Saved-copy verification failed: size mismatch");
        if (t.format === "png" ? !isPng(b) : b[0] !== 0xff || b[1] !== 0xd8) throw new Error(`Saved-copy verification failed: not a ${t.format.toUpperCase()} picture`);
        if (hasAiLabel(b)) throw new Error("Hidden AI labels could not be removed; picture not published");
        paths.push(path); total += clean.length;
      }
      const clean = { length: total };
      const path = paths[0]!;
      const p = prev.get(id);
      const { error } = await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, synced_at: now, storage_path: path, page_paths: paths, format: t.format, bytes: clean.length, last_error: null, checked_at: now });
      if (error) throw new Error(error.message);
      return { id, ok: true, bytes: clean.length, previousBytes: p?.bytes ?? null, previousSyncedAt: p?.synced_at ?? null, canvaUpdatedAt: p?.canva_updated_at ?? null, syncedAt: now,
        verified: [`${paths.length} page${paths.length > 1 ? "s" : ""} read back intact`, `Valid ${t.format.toUpperCase()} picture${paths.length > 1 ? "s" : ""}`, "No hidden AI labels"] };
    } catch (e) {
      const msg = (e as Error).message;
      await supabaseAdmin.from("canva_asset_sync").upsert({ design_id: id, last_error: msg, checked_at: new Date().toISOString() });
      return { id, ok: false, error: msg };
    }
  });
}

/** Public (no sign-in): ask Canva whether the pictures shown here are current.
 *  Reads edit times only — no exports, so the daily download allowance is untouched.
 *  One check at a time site-wide: a visitor's click claims the gate for this long. */
export const PUBLIC_CHECK_COOLDOWN_MIN = 15;

async function releaseCheckGate() {
  await supabaseAdmin.from("canva_check_gate").update({ locked_at: "2000-01-01T00:00:00Z" }).eq("id", 1);
}

export async function publicCheck(): Promise<import("@/lib/canva-sync-messages").PublicCheckResult> {
  const cutoff = new Date(Date.now() - PUBLIC_CHECK_COOLDOWN_MIN * 60_000).toISOString();
  // Atomic claim: whoever wins the row update is the only check allowed in this window.
  const { data: claim, error: claimError } = await supabaseAdmin
    .from("canva_check_gate")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", 1)
    .lt("locked_at", cutoff)
    .select();
  if (claimError || !claim?.length) {
    const { data: g } = await supabaseAdmin.from("canva_check_gate").select("locked_at").eq("id", 1).maybeSingle();
    const next = (g?.locked_at ? new Date(g.locked_at).getTime() : 0) + PUBLIC_CHECK_COOLDOWN_MIN * 60_000;
    return { ok: false, reason: "throttled", waitSeconds: Math.max(0, Math.ceil((next - Date.now()) / 1000)) };
  }
  const ids = canvaSyncTargets().map((t) => t.id);
  let results;
  try {
    results = await checkDesigns(ids);
  } catch (e) {
    await releaseCheckGate();
    return { ok: false, reason: "error", message: (e as Error).message };
  }
  if (!results.length) {
    await releaseCheckGate();
    return { ok: false, reason: "error", message: "No designs to check" };
  }
  const errs = results.filter((r) => r.error);
  if (errs.length === results.length) {
    // A failed check must not lock visitors out for the cooldown window.
    await releaseCheckGate();
    return { ok: false, reason: "error", message: errs[0]!.error! };
  }
  const { data: c } = await supabaseAdmin
    .from("canva_asset_sync")
    .select("checked_at")
    .in("design_id", ids)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { ok: true, needsUpdate: results.filter((r) => r.changed).length, checked: results.length, lastCheckedAt: c?.checked_at ?? null };
}

// ── Background sync ──────────────────────────────────────────────────────────
// Runs daily (and on demand). Re-checks designs not checked for ~20h, then exports a
// capped number of changed ones, so a big Canva edit day spreads over several days
// without anyone clicking. Stops early when Canva's export allowance runs out.

export const BG_CHECK_PER_RUN = 120;
export const BG_SYNC_PER_RUN = 25;

export function pendingIds(rows: { design_id: string; canva_updated_at: string | null; synced_at: string | null }[], bundled: Record<string, string>) {
  return rows.filter((r) => {
    if (!r.canva_updated_at) return false;
    const base = r.synced_at ?? bundled[r.design_id] ?? null;
    return !base || new Date(r.canva_updated_at).getTime() > new Date(base).getTime();
  }).map((r) => r.design_id);
}

const isLimit = (m: string) => /\[429\]|rate limit|quota|limit/i.test(m);

export async function runBackgroundSync(trigger: "daily" | "manual") {
  const ids = canvaSyncTargets().map((t) => t.id);
  const started = new Date().toISOString();
  let checked = 0, synced = 0, failed = 0, stopped: string | null = null;
  const problems: { id: string | null; error: string }[] = [];
  try {
    const { data: rows0 } = await supabaseAdmin.from("canva_asset_sync").select("design_id, checked_at").in("design_id", ids);
    const lastCheck = new Map((rows0 ?? []).map((r) => [r.design_id, new Date(r.checked_at).getTime()]));
    const cutoff = Date.now() - 20 * 3600_000;
    const due = ids.filter((id) => (lastCheck.get(id) ?? 0) < cutoff).slice(0, BG_CHECK_PER_RUN);
    for (const r of await checkDesigns(due)) { checked++; if (r.error) problems.push({ id: r.id, error: r.error }); }
    const { data: rows } = await supabaseAdmin.from("canva_asset_sync").select("design_id, canva_updated_at, synced_at").in("design_id", ids);
    const pend = pendingIds(rows ?? [], SJB_CALENDAR_PICTURE_SAVED_AT);
    for (let i = 0; i < Math.min(pend.length, BG_SYNC_PER_RUN) && !stopped; i += 5) {
      for (const r of await syncDesigns(pend.slice(i, Math.min(i + 5, BG_SYNC_PER_RUN)))) {
        if (r.ok) synced++;
        else { failed++; problems.push({ id: r.id, error: r.error }); if (isLimit(r.error)) stopped = "Canva's daily download allowance ran out; the rest continue tomorrow."; }
      }
    }
  } catch (e) {
    stopped = (e as Error).message; problems.push({ id: null, error: stopped });
  }
  const { data: after } = await supabaseAdmin.from("canva_asset_sync").select("design_id, canva_updated_at, synced_at").in("design_id", ids);
  const remaining = pendingIds(after ?? [], SJB_CALENDAR_PICTURE_SAVED_AT).length;
  const run = { started_at: started, finished_at: new Date().toISOString(), trigger, checked, synced, failed, remaining, stopped_reason: stopped, problems: problems.slice(0, 50) };
  await supabaseAdmin.from("canva_sync_runs").insert(run);
  return run;
}

/** When Canva was last checked, and what the most recent update run did. */
export async function lastRunSummary(): Promise<import("@/lib/canva-sync-messages").CanvaLastRun> {
  const ids = canvaSyncTargets().map((t) => t.id);
  const [{ data: run }, { data: checked }] = await Promise.all([
    supabaseAdmin.from("canva_sync_runs")
      .select("started_at, finished_at, trigger, checked, synced, failed, remaining, stopped_reason")
      .order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("canva_asset_sync")
      .select("checked_at").in("design_id", ids)
      .order("checked_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    lastCheckedAt: checked?.checked_at ?? null,
    run: run ? {
      startedAt: run.started_at, finishedAt: run.finished_at, trigger: run.trigger,
      checked: run.checked, synced: run.synced, failed: run.failed,
      remaining: run.remaining, stoppedReason: run.stopped_reason,
    } : null,
  };
}

/** Public line: when the pictures shown on the Bowl pages last changed. Dates only. */
export async function publicSyncStamp(): Promise<import("@/lib/canva-sync-messages").CanvaPictureStamp> {
  const ids = canvaSyncTargets().map((t) => t.id);
  const [{ data: synced }, { data: checked }] = await Promise.all([
    supabaseAdmin.from("canva_asset_sync")
      .select("synced_at").in("design_id", ids).order("synced_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("canva_asset_sync")
      .select("checked_at").in("design_id", ids).order("checked_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const canva = synced?.synced_at ?? null;
  const bundled = Object.values(SJB_CALENDAR_PICTURE_SAVED_AT).filter((s): s is string => !!s).sort().pop() ?? null;
  const picturesUpdated = [canva, bundled].filter((s): s is string => !!s).sort().pop() ?? null;
  const source: "canva" | "original" | null =
    canva && (!bundled || new Date(canva) >= new Date(bundled)) ? "canva" : bundled ? "original" : null;
  return { picturesUpdated, source, lastCheckedAt: checked?.checked_at ?? null };
}

export async function syncHealth() {
  const ids = canvaSyncTargets().map((t) => t.id);
  const [{ data: conn }, { data: runs }, { data: rows }] = await Promise.all([
    supabaseAdmin.from("canva_shared_connection").select("updated_at, expires_at, connected_by").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("canva_sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
    supabaseAdmin.from("canva_asset_sync").select("design_id, canva_updated_at, synced_at, last_error, checked_at").in("design_id", ids),
  ]);
  let connectedBy: string | null = null;
  if (conn?.connected_by) {
    const u = await supabaseAdmin.auth.admin.getUserById(conn.connected_by);
    connectedBy = u.data.user?.email ?? null;
  }
  const r = rows ?? [];
  return {
    connected: Boolean(conn), connectedBy, tokenRefreshedAt: conn?.updated_at ?? null, tokenExpiresAt: conn?.expires_at ?? null,
    total: ids.length, neverChecked: ids.length - r.length,
    pending: pendingIds(r, SJB_CALENDAR_PICTURE_SAVED_AT).length,
    withErrors: r.filter((x) => x.last_error).length,
    lastChecked: r.reduce<string | null>((m, x) => (!m || x.checked_at > m ? x.checked_at : m), null),
    runs: runs ?? [],
  };
}
