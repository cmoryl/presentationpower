// Server functions for the slide-module approval workflow, expired-content
// flags, related-slide graph, and duplicate detection.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Canonical, stable JSON stringifier for content-hash comparability.
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k])).join(",") + "}";
}

// Cheap non-crypto hash (djb2 xor) — 32-bit hex. Uniqueness is per-brand-mode
// + variant + normalized content shape; collisions are acceptable at this
// scale and callers can confirm before merging.
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function computeContentHash(variantId: string, brandModeId: string | null, content: unknown): string {
  const norm = stableStringify(content ?? {}).toLowerCase().replace(/\s+/g, " ").trim();
  return djb2(`${variantId}|${brandModeId ?? ""}|${norm}`);
}

// ── Reviewer role gate ────────────────────────────────────────────────────
async function assertReviewer(ctx: { supabase: Awaited<ReturnType<typeof requireSupabaseAuth>>; userId: string }) {
  const s = ctx.supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
  const [admin, reviewer] = await Promise.all([
    s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    s.rpc("has_role", { _user_id: ctx.userId, _role: "brand_reviewer" }),
  ]);
  if (!admin.data && !reviewer.data) {
    throw new Error("Forbidden: requires admin or brand_reviewer");
  }
}

// ── Approval queue ────────────────────────────────────────────────────────
export const listPendingModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    const { data, error } = await context.supabase
      .from("slide_modules")
      .select("id, title, variant_id, layout_id, brand_mode_id, tags, content, approval_status, submitted_at, expires_at, reviewer_id, review_notes, updated_at, owner_id")
      .in("approval_status", ["pending", "draft", "changes-requested"])
      .order("submitted_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  });

export const listRecentReviewed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    const { data, error } = await context.supabase
      .from("slide_modules")
      .select("id, title, variant_id, approval_status, approved_at, reviewer_id, review_notes, expires_at")
      .in("approval_status", ["approved", "rejected"])
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  });

// ── Submit / approve / reject ─────────────────────────────────────────────
export const submitForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("slide_modules")
      .update({ approval_status: "pending", submitted_at: new Date().toISOString() })
      .eq("id", data.moduleId);
    if (error) throw error;
    return { ok: true };
  });

export const approveModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleId: string; notes?: string; expiresAt?: string | null }) => data)
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    const { error } = await context.supabase
      .from("slide_modules")
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        reviewer_id: context.userId,
        review_notes: data.notes ?? null,
        expires_at: data.expiresAt ?? null,
      })
      .eq("id", data.moduleId);
    if (error) throw error;
    return { ok: true };
  });

export const rejectModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleId: string; notes: string }) => data)
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    const { error } = await context.supabase
      .from("slide_modules")
      .update({
        approval_status: "rejected",
        reviewer_id: context.userId,
        review_notes: data.notes,
      })
      .eq("id", data.moduleId);
    if (error) throw error;
    return { ok: true };
  });

export const requestChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleId: string; notes: string }) => data)
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    const { error } = await context.supabase
      .from("slide_modules")
      .update({
        approval_status: "changes-requested",
        reviewer_id: context.userId,
        review_notes: data.notes,
      })
      .eq("id", data.moduleId);
    if (error) throw error;
    return { ok: true };
  });

// ── Duplicate detection ────────────────────────────────────────────────────
// Recompute + persist content_hash for a module, then return any other
// modules that share it (excluding self).
export const findDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("slide_modules")
      .select("id, variant_id, brand_mode_id, content, content_hash")
      .eq("id", data.moduleId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return [];
    const hash = computeContentHash(row.variant_id, row.brand_mode_id, row.content);
    if (hash !== row.content_hash) {
      await context.supabase.from("slide_modules").update({ content_hash: hash }).eq("id", row.id);
    }
    const { data: dupes, error: dupeErr } = await context.supabase
      .from("slide_modules")
      .select("id, title, variant_id, brand_mode_id, approval_status, expires_at, updated_at")
      .eq("content_hash", hash)
      .neq("id", row.id)
      .limit(10);
    if (dupeErr) throw dupeErr;
    return dupes ?? [];
  });

// ── Expiration + freshness lookups ─────────────────────────────────────────
// Returns per-module flags (expired, expiring-soon, approval status) for
// every source_module_id passed in. Used by the deck editor to badge slides.
export const getModuleFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { moduleIds: string[] }) => data)
  .handler(async ({ data, context }) => {
    if (data.moduleIds.length === 0) return [] as Array<{
      id: string;
      approval_status: string;
      expires_at: string | null;
      expired: boolean;
      expiring_soon: boolean;
    }>;
    const { data: rows, error } = await context.supabase
      .from("slide_modules")
      .select("id, approval_status, expires_at")
      .in("id", data.moduleIds);
    if (error) throw error;
    const now = Date.now();
    const soon = now + 1000 * 60 * 60 * 24 * 30; // 30 days
    return (rows ?? []).map((r) => {
      const t = r.expires_at ? new Date(r.expires_at).getTime() : null;
      return {
        id: r.id,
        approval_status: r.approval_status,
        expires_at: r.expires_at,
        expired: t !== null && t < now,
        expiring_soon: t !== null && t >= now && t < soon,
      };
    });
  });
