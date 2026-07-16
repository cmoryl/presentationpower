// Enterprise admin backend server functions.
// Powers /admin dashboard, users & roles, AI usage analytics, imagery analytics,
// A/B color testing, and knowledgebase governance.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type SupaCtx = { supabase: unknown; userId: string };

// ── Role gate ─────────────────────────────────────────────────────────────
async function assertAdmin(ctx: SupaCtx) {
  const s = ctx.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin required");
}

type SbClient = {
  from: (t: string) => {
    select: (cols?: string, opts?: { count?: "exact"; head?: boolean }) => any;
    insert: (rows: any) => any;
    update: (row: any) => any;
    delete: () => any;
    upsert: (rows: any, opts?: Record<string, unknown>) => any;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: {
    admin: {
      listUsers: (opts?: { page?: number; perPage?: number }) => Promise<{
        data: { users: Array<{ id: string; email?: string; created_at: string; last_sign_in_at: string | null }> };
        error: unknown;
      }>;
      inviteUserByEmail: (email: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
      deleteUser: (id: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

async function logAudit(sbAdmin: SbClient, actor: string, action: string, target_type?: string, target_id?: string, meta: Record<string, unknown> = {}) {
  await sbAdmin.from("admin_audit_log").insert({ actor_user_id: actor, action, target_type, target_id, meta });
}

// ═════════════════════════════════════════════════════════════════════════
// OVERVIEW DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const [ai, imgs, decks, users, kb, exps] = await Promise.all([
      s.from("ai_events").select("cost_credits, tokens_in, tokens_out, latency_ms, status, created_at").gte("created_at", from),
      s.from("imagery_events").select("event_type, brand_id, created_at").gte("created_at", from),
      s.from("decks").select("id", { count: "exact", head: true }),
      s.from("profiles").select("id", { count: "exact", head: true }),
      s.from("knowledge_entries").select("id", { count: "exact", head: true }),
      s.from("ab_experiments").select("id, status"),
    ]);
    const aiRows = (ai.data ?? []) as Array<{ cost_credits: number; tokens_in: number; tokens_out: number; latency_ms: number; status: string; created_at: string }>;
    const imgRows = (imgs.data ?? []) as Array<{ event_type: string; created_at: string; brand_id: string | null }>;
    const expRows = (exps.data ?? []) as Array<{ status: string }>;

    const totalCost = aiRows.reduce((a, r) => a + Number(r.cost_credits ?? 0), 0);
    const totalTokens = aiRows.reduce((a, r) => a + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
    const errors = aiRows.filter((r) => r.status === "error").length;
    const avgLatency = aiRows.length ? Math.round(aiRows.reduce((a, r) => a + (r.latency_ms ?? 0), 0) / aiRows.length) : 0;

    // Daily buckets for AI + imagery over the last 30d
    const bucket = (rows: Array<{ created_at: string }>) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const d = r.created_at.slice(0, 10);
        m.set(d, (m.get(d) ?? 0) + 1);
      }
      return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    };

    return {
      window: { from, to: now.toISOString(), days: 30 },
      totals: {
        aiCalls: aiRows.length,
        aiCost: Number(totalCost.toFixed(4)),
        aiTokens: totalTokens,
        aiAvgLatencyMs: avgLatency,
        aiErrors: errors,
        imageEvents: imgRows.length,
        imagesGenerated: imgRows.filter((r) => r.event_type === "generate").length,
        decks: decks.count ?? 0,
        users: users.count ?? 0,
        knowledgeEntries: kb.count ?? 0,
        experiments: expRows.length,
        runningExperiments: expRows.filter((r) => r.status === "running").length,
      },
      aiPerDay: bucket(aiRows),
      imageryPerDay: bucket(imgRows),
    };
  });

// ═════════════════════════════════════════════════════════════════════════
// USERS & ROLES
// ═════════════════════════════════════════════════════════════════════════

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;
    const [{ data: authList }, profiles, roles] = await Promise.all([
      sa.auth.admin.listUsers({ page: 1, perPage: 200 }),
      sa.from("profiles").select("id, display_name, updated_at"),
      sa.from("user_roles").select("user_id, role"),
    ]);
    const profileMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of (roles.data ?? []) as Array<{ user_id: string; role: string }>) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return authList.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      display_name: (profileMap.get(u.id) as any)?.display_name ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

const inviteInput = z.object({ email: z.string().email(), role: z.enum(["admin", "editor", "viewer", "brand_lead", "user"]).default("user") });
export const inviteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;
    const { data: inv, error } = await sa.auth.admin.inviteUserByEmail(data.email);
    if (error) throw new Error(error.message ?? "Invite failed");
    const newId = (inv as { user?: { id: string } })?.user?.id;
    if (newId && data.role) {
      await sa.from("user_roles").insert({ user_id: newId, role: data.role });
    }
    await logAudit(sa, context.userId, "user.invite", "user", newId ?? data.email, { email: data.email, role: data.role });
    return { ok: true, userId: newId };
  });

const roleInput = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "editor", "viewer", "brand_lead", "user"]), grant: z.boolean() });
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => roleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;
    if (data.grant) {
      const { error } = await sa.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(String((error as any).message ?? error));
    } else {
      const { error } = await sa.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
      if (error) throw new Error(String((error as any).message ?? error));
    }
    await logAudit(sa, context.userId, data.grant ? "role.grant" : "role.revoke", "user", data.userId, { role: data.role });
    return { ok: true };
  });

const delUserInput = z.object({ userId: z.string().uuid() });
export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => delUserInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;
    const { error } = await sa.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message ?? "Delete failed");
    await logAudit(sa, context.userId, "user.delete", "user", data.userId, {});
    return { ok: true };
  });

// ═════════════════════════════════════════════════════════════════════════
// AI ANALYTICS
// ═════════════════════════════════════════════════════════════════════════

const aiFilter = z.object({
  days: z.number().int().min(1).max(90).default(30),
  brandId: z.string().optional(),
});
export const getAiAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => aiFilter.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const from = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
    let q = s.from("ai_events").select("*").gte("created_at", from).order("created_at", { ascending: false }).limit(5000);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: rows } = await q;
    const list = (rows ?? []) as Array<{
      id: string; user_id: string | null; brand_id: string | null; model: string; operation: string;
      status: string; tokens_in: number; tokens_out: number; cost_credits: number; latency_ms: number;
      prompt_summary: string | null; created_at: string; surface: string | null;
    }>;

    const byModel = new Map<string, { calls: number; cost: number; tokens: number; errors: number }>();
    const byBrand = new Map<string, { calls: number; cost: number }>();
    const bySurface = new Map<string, number>();
    const perDay = new Map<string, { calls: number; cost: number }>();
    for (const r of list) {
      const m = byModel.get(r.model) ?? { calls: 0, cost: 0, tokens: 0, errors: 0 };
      m.calls++; m.cost += Number(r.cost_credits ?? 0); m.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
      if (r.status === "error") m.errors++;
      byModel.set(r.model, m);
      const bId = r.brand_id ?? "—";
      const b = byBrand.get(bId) ?? { calls: 0, cost: 0 }; b.calls++; b.cost += Number(r.cost_credits ?? 0); byBrand.set(bId, b);
      const sId = r.surface ?? "other"; bySurface.set(sId, (bySurface.get(sId) ?? 0) + 1);
      const d = r.created_at.slice(0, 10);
      const day = perDay.get(d) ?? { calls: 0, cost: 0 }; day.calls++; day.cost += Number(r.cost_credits ?? 0); perDay.set(d, day);
    }
    return {
      recent: list.slice(0, 200),
      byModel: Array.from(byModel.entries()).map(([model, v]) => ({ model, ...v, cost: Number(v.cost.toFixed(4)) })).sort((a, b) => b.calls - a.calls),
      byBrand: Array.from(byBrand.entries()).map(([brand, v]) => ({ brand, calls: v.calls, cost: Number(v.cost.toFixed(4)) })).sort((a, b) => b.calls - a.calls),
      bySurface: Array.from(bySurface.entries()).map(([surface, count]) => ({ surface, count })),
      perDay: Array.from(perDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v, cost: Number(v.cost.toFixed(4)) })),
      totals: { calls: list.length, cost: Number(list.reduce((a, r) => a + Number(r.cost_credits ?? 0), 0).toFixed(4)) },
    };
  });

const logAiInput = z.object({
  brandId: z.string().optional().nullable(),
  surface: z.string().optional().nullable(),
  model: z.string(),
  operation: z.string(),
  status: z.enum(["success", "error", "blocked"]),
  tokensIn: z.number().int().optional().default(0),
  tokensOut: z.number().int().optional().default(0),
  costCredits: z.number().optional().default(0),
  latencyMs: z.number().int().optional().default(0),
  promptSummary: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});
export const logAiEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => logAiInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as SbClient;
    await s.from("ai_events").insert({
      user_id: context.userId,
      brand_id: data.brandId ?? null,
      surface: data.surface ?? null,
      model: data.model,
      operation: data.operation,
      status: data.status,
      tokens_in: data.tokensIn,
      tokens_out: data.tokensOut,
      cost_credits: data.costCredits,
      latency_ms: data.latencyMs,
      prompt_summary: data.promptSummary ?? null,
      error_message: data.errorMessage ?? null,
    });
    return { ok: true };
  });

// ═════════════════════════════════════════════════════════════════════════
// IMAGERY ANALYTICS
// ═════════════════════════════════════════════════════════════════════════

export const getImageryAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => aiFilter.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const from = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
    let q = s.from("imagery_events").select("*").gte("created_at", from).order("created_at", { ascending: false }).limit(5000);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: rows } = await q;
    const list = (rows ?? []) as Array<{
      id: string; image_id: string; user_id: string | null; brand_id: string | null;
      event_type: string; prompt: string | null; memory_used: boolean; created_at: string;
    }>;
    const byBrand = new Map<string, { total: number; generate: number; use: number }>();
    const byImage = new Map<string, { total: number; last: string; prompt: string | null }>();
    const perDay = new Map<string, number>();
    const topPrompts = new Map<string, number>();
    for (const r of list) {
      const b = byBrand.get(r.brand_id ?? "—") ?? { total: 0, generate: 0, use: 0 };
      b.total++; if (r.event_type === "generate") b.generate++; if (r.event_type === "use") b.use++;
      byBrand.set(r.brand_id ?? "—", b);
      const img = byImage.get(r.image_id) ?? { total: 0, last: r.created_at, prompt: r.prompt };
      img.total++; if (r.created_at > img.last) img.last = r.created_at;
      if (r.prompt && !img.prompt) img.prompt = r.prompt;
      byImage.set(r.image_id, img);
      const d = r.created_at.slice(0, 10); perDay.set(d, (perDay.get(d) ?? 0) + 1);
      if (r.prompt) topPrompts.set(r.prompt, (topPrompts.get(r.prompt) ?? 0) + 1);
    }
    return {
      totals: {
        events: list.length,
        generations: list.filter((r) => r.event_type === "generate").length,
        uses: list.filter((r) => r.event_type === "use").length,
        memoryHits: list.filter((r) => r.memory_used).length,
      },
      byBrand: Array.from(byBrand.entries()).map(([brand, v]) => ({ brand, ...v })).sort((a, b) => b.total - a.total),
      byImage: Array.from(byImage.entries()).map(([image_id, v]) => ({ image_id, ...v })).sort((a, b) => b.total - a.total).slice(0, 100),
      perDay: Array.from(perDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      topPrompts: Array.from(topPrompts.entries()).map(([prompt, count]) => ({ prompt, count })).sort((a, b) => b.count - a.count).slice(0, 25),
      recent: list.slice(0, 200),
    };
  });

const logImgInput = z.object({
  imageId: z.string(),
  brandId: z.string().optional().nullable(),
  eventType: z.enum(["generate", "view", "use", "download", "delete"]),
  prompt: z.string().optional().nullable(),
  memoryUsed: z.boolean().optional().default(false),
});
export const logImageryEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => logImgInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as SbClient;
    await s.from("imagery_events").insert({
      user_id: context.userId,
      image_id: data.imageId,
      brand_id: data.brandId ?? null,
      event_type: data.eventType,
      prompt: data.prompt ?? null,
      memory_used: data.memoryUsed,
    });
    return { ok: true };
  });

// ═════════════════════════════════════════════════════════════════════════
// A/B COLOR TESTING
// ═════════════════════════════════════════════════════════════════════════

const paletteSchema = z.object({
  primary: z.string(),
  accent: z.string(),
  ink: z.string(),
  surface: z.string(),
  secondary: z.string().optional(),
}).passthrough();

const expInput = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  hypothesis: z.string().optional().nullable(),
  primaryMetric: z.enum(["cta_click", "dwell", "conversion", "view"]).default("cta_click"),
  brandId: z.string().optional().nullable(),
  variants: z.array(z.object({
    name: z.string().min(1),
    palette: paletteSchema,
    isControl: z.boolean().default(false),
    weight: z.number().int().min(1).max(100).default(50),
  })).min(2).max(6),
});
export const createAbExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const { data: exp, error } = await s.from("ab_experiments").insert({
      name: data.name, description: data.description ?? null, hypothesis: data.hypothesis ?? null,
      primary_metric: data.primaryMetric, brand_id: data.brandId ?? null, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(String((error as any).message ?? error));
    const expId = (exp as { id: string }).id;
    const { error: vErr } = await s.from("ab_variants").insert(data.variants.map((v) => ({
      experiment_id: expId, name: v.name, palette: v.palette, is_control: v.isControl, weight: v.weight,
    })));
    if (vErr) throw new Error(String((vErr as any).message ?? vErr));
    return { id: expId };
  });

export const listAbExperiments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const [{ data: exps }, { data: variants }, { data: events }] = await Promise.all([
      s.from("ab_experiments").select("*").order("created_at", { ascending: false }),
      s.from("ab_variants").select("*"),
      s.from("ab_events").select("experiment_id, variant_id, event_type, value"),
    ]);
    const variantList = (variants ?? []) as Array<{ id: string; experiment_id: string; name: string; palette: Record<string, string>; is_control: boolean; weight: number }>;
    const eventList = (events ?? []) as Array<{ experiment_id: string; variant_id: string; event_type: string; value: number | null }>;
    return (exps ?? []).map((e: any) => {
      const vs = variantList.filter((v) => v.experiment_id === e.id);
      const stats = vs.map((v) => {
        const evs = eventList.filter((ev) => ev.variant_id === v.id);
        return {
          variantId: v.id,
          name: v.name,
          isControl: v.is_control,
          palette: v.palette,
          weight: v.weight,
          views: evs.filter((ev) => ev.event_type === "view").length,
          dwellAvg: (() => { const d = evs.filter((ev) => ev.event_type === "dwell").map((ev) => Number(ev.value ?? 0)); return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0; })(),
          ctaClicks: evs.filter((ev) => ev.event_type === "cta_click").length,
          conversions: evs.filter((ev) => ev.event_type === "conversion").length,
        };
      });
      return { ...e, variants: stats };
    });
  });

const expActionInput = z.object({ id: z.string().uuid(), status: z.enum(["draft", "running", "paused", "ended"]) });
export const setAbExperimentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expActionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "running") patch.started_at = new Date().toISOString();
    if (data.status === "ended") patch.ended_at = new Date().toISOString();
    const { error } = await s.from("ab_experiments").update(patch).eq("id", data.id);
    if (error) throw new Error(String((error as any).message ?? error));
    return { ok: true };
  });

const delExpInput = z.object({ id: z.string().uuid() });
export const deleteAbExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => delExpInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const { error } = await s.from("ab_experiments").delete().eq("id", data.id);
    if (error) throw new Error(String((error as any).message ?? error));
    return { ok: true };
  });

// Public assignment / event logging — any signed-in session can call these.
const assignInput = z.object({ experimentId: z.string().uuid(), sessionId: z.string().min(4) });
export const abAssign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assignInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as SbClient;
    const { data: existing } = await s.from("ab_assignments").select("variant_id").eq("experiment_id", data.experimentId).eq("session_id", data.sessionId).maybeSingle();
    if (existing) return { variantId: (existing as any).variant_id };
    const { data: variants } = await s.from("ab_variants").select("id, weight").eq("experiment_id", data.experimentId);
    const list = (variants ?? []) as Array<{ id: string; weight: number }>;
    if (!list.length) throw new Error("Experiment has no variants");
    const total = list.reduce((a, v) => a + (v.weight ?? 1), 0);
    let r = Math.random() * total;
    let chosen = list[0].id;
    for (const v of list) { r -= v.weight ?? 1; if (r <= 0) { chosen = v.id; break; } }
    await s.from("ab_assignments").insert({ experiment_id: data.experimentId, variant_id: chosen, session_id: data.sessionId, user_id: context.userId });
    return { variantId: chosen };
  });

const abEventInput = z.object({
  experimentId: z.string().uuid(),
  variantId: z.string().uuid(),
  sessionId: z.string().min(4),
  eventType: z.enum(["view", "dwell", "cta_click", "conversion"]),
  value: z.number().optional().nullable(),
});
export const abLogEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => abEventInput.parse(input))
  .handler(async ({ data, context }) => {
    const s = context.supabase as SbClient;
    await s.from("ab_events").insert({
      experiment_id: data.experimentId, variant_id: data.variantId, session_id: data.sessionId,
      user_id: context.userId, event_type: data.eventType, value: data.value ?? null,
    });
    return { ok: true };
  });

// ═════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═════════════════════════════════════════════════════════════════════════

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as SbClient;
    const { data } = await s.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
    return (data ?? []) as Array<{ id: string; actor_user_id: string | null; action: string; target_type: string | null; target_id: string | null; meta: Record<string, unknown>; created_at: string }>;
  });
