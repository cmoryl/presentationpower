// Enterprise admin backend server functions.
// Powers /admin dashboard, users & roles, AI usage analytics, imagery analytics,
// A/B color testing, and knowledgebase governance.

import { EMBEDDING_MODEL } from "@/lib/knowledge-scope";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dedupeKnowledge } from "@/lib/knowledge-dedupe";
import { knowledgeDivisionFilter } from "@/lib/knowledge-scope";
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
        data: {
          users: Array<{
            id: string;
            email?: string;
            created_at: string;
            last_sign_in_at: string | null;
          }>;
        };
        error: unknown;
      }>;
      inviteUserByEmail: (
        email: string,
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
      deleteUser: (id: string) => Promise<{ error: { message?: string } | null }>;
    };
  };
};

async function logAudit(
  sbAdmin: SbClient,
  actor: string,
  action: string,
  target_type?: string,
  target_id?: string,
  meta: Record<string, unknown> = {},
) {
  await sbAdmin
    .from("admin_audit_log")
    .insert({ actor_user_id: actor, action, target_type, target_id, meta });
}

// ═════════════════════════════════════════════════════════════════════════
// OVERVIEW DASHBOARD
// ═════════════════════════════════════════════════════════════════════════

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const [ai, imgs, decks, users, kb, exps, oracleKb, brandIntel] = await Promise.all([
      s
        .from("ai_events")
        .select("cost_credits, tokens_in, tokens_out, latency_ms, status, created_at")
        .gte("created_at", from),
      s.from("imagery_events").select("event_type, brand_id, created_at").gte("created_at", from),
      s
        .from("decks")
        .select("id, title, status, brand_mode_id, archetype_id, owner_id, created_at, updated_at")
        .order("updated_at", { ascending: false }),
      s.from("profiles").select("id", { count: "exact", head: true }),
      s.from("knowledge_entries").select("id", { count: "exact", head: true }),
      s.from("ab_experiments").select("id, status"),
      s.from("oracle_knowledge_base").select("id", { count: "exact", head: true }),
      s.from("brand_intelligence").select("id", { count: "exact", head: true }),
    ]);
    const aiRows = (ai.data ?? []) as Array<{
      cost_credits: number;
      tokens_in: number;
      tokens_out: number;
      latency_ms: number;
      status: string;
      created_at: string;
    }>;
    const imgRows = (imgs.data ?? []) as Array<{
      event_type: string;
      created_at: string;
      brand_id: string | null;
    }>;
    const deckRows = (decks.data ?? []) as Array<{
      id: string;
      title: string | null;
      status: string | null;
      brand_mode_id: string | null;
      archetype_id: string | null;
      owner_id: string | null;
      created_at: string;
      updated_at: string;
    }>;
    const expRows = (exps.data ?? []) as Array<{ status: string }>;

    const totalCost = aiRows.reduce((a, r) => a + Number(r.cost_credits ?? 0), 0);
    const totalTokens = aiRows.reduce((a, r) => a + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
    const errors = aiRows.filter((r) => r.status === "error").length;
    const avgLatency = aiRows.length
      ? Math.round(aiRows.reduce((a, r) => a + (r.latency_ms ?? 0), 0) / aiRows.length)
      : 0;

    // Daily buckets for AI + imagery over the last 30d
    const bucket = (rows: Array<{ created_at: string }>) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const d = r.created_at.slice(0, 10);
        m.set(d, (m.get(d) ?? 0) + 1);
      }
      return Array.from(m.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
    };

    // Deck analytics
    const deckSince = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const decksInWindow = deckRows.filter((d) => new Date(d.created_at) >= deckSince);
    const tally = (rows: Array<Record<string, string | null>>, key: string) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = (r[key] ?? "unspecified") || "unspecified";
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return Array.from(m.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    };

    // ── Build surfaces ──────────────────────────────────────────────────
    // The console covers every creation surface, not just decks. Counts run
    // through the service client so admins see org-wide totals rather than
    // whatever RLS exposes to their own account.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;

    const SURFACES: Array<{ key: string; table: string; label: string }> = [
      { key: "decks", table: "decks", label: "Decks" },
      { key: "briefs", table: "briefs", label: "Briefs" },
      { key: "printAssets", table: "print_assets", label: "Print assets" },
      { key: "campaignKits", table: "campaign_kits", label: "Campaign kits" },
      { key: "surfaces", table: "surfaces", label: "Social & email surfaces" },
      { key: "savedModules", table: "saved_modules", label: "Saved modules" },
      { key: "slideModules", table: "slide_modules", label: "Library modules" },
      { key: "importedDecks", table: "imported_decks", label: "Imported decks" },
      { key: "divisionImagery", table: "division_imagery", label: "Division imagery" },
      { key: "clientLogos", table: "client_logos", label: "Client logos" },
      { key: "knowledge", table: "knowledge_entries", label: "Knowledge entries" },
      { key: "translations", table: "deck_translations", label: "Translation jobs" },
    ];

    const surfaceCounts = await Promise.all(
      SURFACES.map(async (sfc) => {
        const [total, recent] = await Promise.all([
          sa.from(sfc.table).select("id", { count: "exact", head: true }),
          sa.from(sfc.table).select("id", { count: "exact", head: true }).gte("created_at", from),
        ]);
        return {
          key: sfc.key,
          label: sfc.label,
          total: (total as { count: number | null }).count ?? 0,
          window: (recent as { count: number | null }).count ?? 0,
        };
      }),
    );

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
        decks: deckRows.length,
        decksInWindow: decksInWindow.length,
        users: users.count ?? 0,
        knowledgeEntries: kb.count ?? 0,
        oracleKnowledge: oracleKb.count ?? 0,
        brandIntelligence: brandIntel.count ?? 0,
        experiments: expRows.length,
        runningExperiments: expRows.filter((r) => r.status === "running").length,
      },
      aiPerDay: bucket(aiRows),
      imageryPerDay: bucket(imgRows),
      decksPerDay: bucket(decksInWindow),
      decksByStatus: tally(deckRows as unknown as Array<Record<string, string | null>>, "status"),
      decksByBrandMode: tally(
        deckRows as unknown as Array<Record<string, string | null>>,
        "brand_mode_id",
      ),
      decksByArchetype: tally(
        deckRows as unknown as Array<Record<string, string | null>>,
        "archetype_id",
      ),
      recentDecks: deckRows.slice(0, 8).map((d) => ({
        id: d.id,
        title: d.title ?? "Untitled deck",
        status: d.status ?? "draft",
        brandMode: d.brand_mode_id ?? "—",
        archetype: d.archetype_id ?? "—",
        updatedAt: d.updated_at,
      })),
      buildSurfaces: surfaceCounts,
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

const inviteInput = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer", "brand_lead", "user"]).default("user"),
});
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
    await logAudit(sa, context.userId, "user.invite", "user", newId ?? data.email, {
      email: data.email,
      role: data.role,
    });
    return { ok: true, userId: newId };
  });

const roleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer", "brand_lead", "user"]),
  grant: z.boolean(),
});
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => roleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as SbClient;
    if (data.grant) {
      const { error } = await sa
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(String((error as any).message ?? error));
    } else {
      const { error } = await sa
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(String((error as any).message ?? error));
    }
    await logAudit(
      sa,
      context.userId,
      data.grant ? "role.grant" : "role.revoke",
      "user",
      data.userId,
      { role: data.role },
    );
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
    const s = context.supabase as unknown as SbClient;
    const from = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
    let q = s
      .from("ai_events")
      .select("*")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: rows } = await q;
    const list = (rows ?? []) as Array<{
      id: string;
      user_id: string | null;
      brand_id: string | null;
      model: string;
      operation: string;
      status: string;
      tokens_in: number;
      tokens_out: number;
      cost_credits: number;
      latency_ms: number;
      prompt_summary: string | null;
      created_at: string;
      surface: string | null;
    }>;

    const byModel = new Map<
      string,
      { calls: number; cost: number; tokens: number; errors: number }
    >();
    const byBrand = new Map<string, { calls: number; cost: number }>();
    const bySurface = new Map<string, number>();
    const perDay = new Map<string, { calls: number; cost: number }>();
    for (const r of list) {
      const m = byModel.get(r.model) ?? { calls: 0, cost: 0, tokens: 0, errors: 0 };
      m.calls++;
      m.cost += Number(r.cost_credits ?? 0);
      m.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
      if (r.status === "error") m.errors++;
      byModel.set(r.model, m);
      const bId = r.brand_id ?? "—";
      const b = byBrand.get(bId) ?? { calls: 0, cost: 0 };
      b.calls++;
      b.cost += Number(r.cost_credits ?? 0);
      byBrand.set(bId, b);
      const sId = r.surface ?? "other";
      bySurface.set(sId, (bySurface.get(sId) ?? 0) + 1);
      const d = r.created_at.slice(0, 10);
      const day = perDay.get(d) ?? { calls: 0, cost: 0 };
      day.calls++;
      day.cost += Number(r.cost_credits ?? 0);
      perDay.set(d, day);
    }
    return {
      recent: list.slice(0, 200),
      byModel: Array.from(byModel.entries())
        .map(([model, v]) => ({ model, ...v, cost: Number(v.cost.toFixed(4)) }))
        .sort((a, b) => b.calls - a.calls),
      byBrand: Array.from(byBrand.entries())
        .map(([brand, v]) => ({ brand, calls: v.calls, cost: Number(v.cost.toFixed(4)) }))
        .sort((a, b) => b.calls - a.calls),
      bySurface: Array.from(bySurface.entries()).map(([surface, count]) => ({ surface, count })),
      perDay: Array.from(perDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v, cost: Number(v.cost.toFixed(4)) })),
      totals: {
        calls: list.length,
        cost: Number(list.reduce((a, r) => a + Number(r.cost_credits ?? 0), 0).toFixed(4)),
      },
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
    const s = context.supabase as unknown as SbClient;
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
    const s = context.supabase as unknown as SbClient;
    const from = new Date(Date.now() - data.days * 24 * 3600 * 1000).toISOString();
    let q = s
      .from("imagery_events")
      .select("*")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: rows } = await q;
    const list = (rows ?? []) as Array<{
      id: string;
      image_id: string;
      user_id: string | null;
      brand_id: string | null;
      event_type: string;
      prompt: string | null;
      memory_used: boolean;
      created_at: string;
    }>;
    const byBrand = new Map<string, { total: number; generate: number; use: number }>();
    const byImage = new Map<string, { total: number; last: string; prompt: string | null }>();
    const perDay = new Map<string, number>();
    const topPrompts = new Map<string, number>();
    for (const r of list) {
      const b = byBrand.get(r.brand_id ?? "—") ?? { total: 0, generate: 0, use: 0 };
      b.total++;
      if (r.event_type === "generate") b.generate++;
      if (r.event_type === "use") b.use++;
      byBrand.set(r.brand_id ?? "—", b);
      const img = byImage.get(r.image_id) ?? { total: 0, last: r.created_at, prompt: r.prompt };
      img.total++;
      if (r.created_at > img.last) img.last = r.created_at;
      if (r.prompt && !img.prompt) img.prompt = r.prompt;
      byImage.set(r.image_id, img);
      const d = r.created_at.slice(0, 10);
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
      if (r.prompt) topPrompts.set(r.prompt, (topPrompts.get(r.prompt) ?? 0) + 1);
    }
    return {
      totals: {
        events: list.length,
        generations: list.filter((r) => r.event_type === "generate").length,
        uses: list.filter((r) => r.event_type === "use").length,
        memoryHits: list.filter((r) => r.memory_used).length,
      },
      byBrand: Array.from(byBrand.entries())
        .map(([brand, v]) => ({ brand, ...v }))
        .sort((a, b) => b.total - a.total),
      byImage: Array.from(byImage.entries())
        .map(([image_id, v]) => ({ image_id, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 100),
      perDay: Array.from(perDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      topPrompts: Array.from(topPrompts.entries())
        .map(([prompt, count]) => ({ prompt, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25),
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
    const s = context.supabase as unknown as SbClient;
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

// Aggregate imagery event counts scoped to a division. Used by the admin
// imagery curator to annotate each hero card with view/select/download
// signal so curators can spot which assets are actually earning use.
export const getDivisionImageryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        divisionId: z.string().min(1).max(120),
        days: z.number().int().min(1).max(365).optional().default(90),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const from = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await s
      .from("imagery_events")
      .select("image_id, event_type, created_at")
      .eq("brand_id", data.divisionId)
      .gte("created_at", from)
      .limit(20000);
    if (error) throw new Error((error as { message?: string }).message ?? "Query failed");
    const list = (rows ?? []) as Array<{
      image_id: string;
      event_type: string;
      created_at: string;
    }>;
    const byImage = new Map<
      string,
      { view: number; select: number; download: number; total: number; last: string | null }
    >();
    for (const r of list) {
      const cur = byImage.get(r.image_id) ?? {
        view: 0,
        select: 0,
        download: 0,
        total: 0,
        last: null,
      };
      if (r.event_type === "view") cur.view += 1;
      else if (r.event_type === "use" || r.event_type === "select") cur.select += 1;
      else if (r.event_type === "download") cur.download += 1;
      cur.total += 1;
      if (!cur.last || r.created_at > cur.last) cur.last = r.created_at;
      byImage.set(r.image_id, cur);
    }
    return {
      windowDays: data.days,
      totals: {
        view: list.filter((r) => r.event_type === "view").length,
        select: list.filter((r) => r.event_type === "use" || r.event_type === "select").length,
        download: list.filter((r) => r.event_type === "download").length,
      },
      byImage: Object.fromEntries(byImage),
    };
  });

// ═════════════════════════════════════════════════════════════════════════
// A/B COLOR TESTING
// ═════════════════════════════════════════════════════════════════════════

const paletteSchema = z
  .object({
    primary: z.string(),
    accent: z.string(),
    ink: z.string(),
    surface: z.string(),
    secondary: z.string().optional(),
  })
  .passthrough();

const expInput = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  hypothesis: z.string().optional().nullable(),
  primaryMetric: z.enum(["cta_click", "dwell", "conversion", "view"]).default("cta_click"),
  brandId: z.string().optional().nullable(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        palette: paletteSchema,
        isControl: z.boolean().default(false),
        weight: z.number().int().min(1).max(100).default(50),
      }),
    )
    .min(2)
    .max(6),
});
export const createAbExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const { data: exp, error } = await s
      .from("ab_experiments")
      .insert({
        name: data.name,
        description: data.description ?? null,
        hypothesis: data.hypothesis ?? null,
        primary_metric: data.primaryMetric,
        brand_id: data.brandId ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(String((error as any).message ?? error));
    const expId = (exp as { id: string }).id;
    const { error: vErr } = await s.from("ab_variants").insert(
      data.variants.map((v) => ({
        experiment_id: expId,
        name: v.name,
        palette: v.palette,
        is_control: v.isControl,
        weight: v.weight,
      })),
    );
    if (vErr) throw new Error(String((vErr as any).message ?? vErr));
    return { id: expId };
  });

export const listAbExperiments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const [{ data: exps }, { data: variants }, { data: events }] = await Promise.all([
      s.from("ab_experiments").select("*").order("created_at", { ascending: false }),
      s.from("ab_variants").select("*"),
      s.from("ab_events").select("experiment_id, variant_id, event_type, value"),
    ]);
    const variantList = (variants ?? []) as Array<{
      id: string;
      experiment_id: string;
      name: string;
      palette: Record<string, string>;
      is_control: boolean;
      weight: number;
    }>;
    const eventList = (events ?? []) as Array<{
      experiment_id: string;
      variant_id: string;
      event_type: string;
      value: number | null;
    }>;
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
          dwellAvg: (() => {
            const d = evs
              .filter((ev) => ev.event_type === "dwell")
              .map((ev) => Number(ev.value ?? 0));
            return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0;
          })(),
          ctaClicks: evs.filter((ev) => ev.event_type === "cta_click").length,
          conversions: evs.filter((ev) => ev.event_type === "conversion").length,
        };
      });
      return { ...e, variants: stats };
    });
  });

const expActionInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "running", "paused", "ended"]),
});
export const setAbExperimentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expActionInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
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
    const s = context.supabase as unknown as SbClient;
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
    const s = context.supabase as unknown as SbClient;
    const { data: existing } = await s
      .from("ab_assignments")
      .select("variant_id")
      .eq("experiment_id", data.experimentId)
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (existing) return { variantId: (existing as any).variant_id };
    const { data: variants } = await s
      .from("ab_variants")
      .select("id, weight")
      .eq("experiment_id", data.experimentId);
    const list = (variants ?? []) as Array<{ id: string; weight: number }>;
    if (!list.length) throw new Error("Experiment has no variants");
    const total = list.reduce((a, v) => a + (v.weight ?? 1), 0);
    let r = Math.random() * total;
    let chosen = list[0].id;
    for (const v of list) {
      r -= v.weight ?? 1;
      if (r <= 0) {
        chosen = v.id;
        break;
      }
    }
    await s.from("ab_assignments").insert({
      experiment_id: data.experimentId,
      variant_id: chosen,
      session_id: data.sessionId,
      user_id: context.userId,
    });
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
    const s = context.supabase as unknown as SbClient;
    await s.from("ab_events").insert({
      experiment_id: data.experimentId,
      variant_id: data.variantId,
      session_id: data.sessionId,
      user_id: context.userId,
      event_type: data.eventType,
      value: data.value ?? null,
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
    const s = context.supabase as unknown as SbClient;
    const { data } = await s
      .from("admin_audit_log")
      .select("id, actor_user_id, action, target_type, target_id, created_at, meta")
      .order("created_at", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as Array<{
      id: string;
      actor_user_id: string | null;
      action: string;
      target_type: string | null;
      target_id: string | null;
      meta: unknown;
      created_at: string;
    }>;
    return rows.map((r) => ({ ...r, meta: JSON.stringify(r.meta ?? {}) }));
  });

// ═════════════════════════════════════════════════════════════════════════
// ORACLE KNOWLEDGE BASE (imported BrandHub snapshot)
// ═════════════════════════════════════════════════════════════════════════

export const listOracleKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const { data } = await s
      .from("oracle_knowledge_base")
      .select(
        "id, organization_id, title, content, content_type, source_type, category, tags, is_active, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500);
    const rows = (data ?? []) as Array<{
      id: string;
      organization_id: string | null;
      title: string;
      content: string;
      content_type: string;
      source_type: string | null;
      category: string | null;
      tags: string[] | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>;
    // Cross-reference: which have already been unified into knowledge_entries.
    const { data: mirrored } = await s
      .from("knowledge_entries")
      .select("sources")
      .contains("tags", ["oracle-import"]);
    const mirroredIds = new Set<string>();
    for (const r of (mirrored ?? []) as Array<{ sources: string[] }>) {
      for (const src of r.sources ?? []) {
        if (src.startsWith("oracle:")) mirroredIds.add(src.slice("oracle:".length));
      }
    }
    return rows.map((r) => ({ ...r, mirrored_in_kb: mirroredIds.has(r.id) }));
  });

const oracleUpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});
export const updateOracleKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => oracleUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.category !== undefined) patch.category = data.category;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    const { error } = await s.from("oracle_knowledge_base").update(patch).eq("id", data.id);
    if (error) throw new Error(String((error as any).message ?? error));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await logAudit(
      supabaseAdmin as unknown as SbClient,
      context.userId,
      "oracle.update",
      "oracle_knowledge_base",
      data.id,
      patch,
    );
    return { ok: true };
  });

const oracleDeleteInput = z.object({ id: z.string().uuid() });
export const deleteOracleKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => oracleDeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const { error } = await s.from("oracle_knowledge_base").delete().eq("id", data.id);
    if (error) throw new Error(String((error as any).message ?? error));
    // Also remove any mirrored knowledge_entries row.
    await s
      .from("knowledge_entries")
      .delete()
      .contains("sources", [`oracle:${data.id}`]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await logAudit(
      supabaseAdmin as unknown as SbClient,
      context.userId,
      "oracle.delete",
      "oracle_knowledge_base",
      data.id,
      {},
    );
    return { ok: true };
  });

const oracleSyncInput = z.object({ id: z.string().uuid() });
export const syncOracleToKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => oracleSyncInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;
    const { data: row } = await s
      .from("oracle_knowledge_base")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const src = row as {
      id: string;
      title: string;
      content: string;
      content_type: string;
      tags: string[] | null;
    } | null;
    if (!src) throw new Error("Oracle entry not found");
    // Upsert the mirrored knowledge_entries row (identified by sources marker).
    const { data: existing } = await s
      .from("knowledge_entries")
      .select("id")
      .contains("sources", [`oracle:${src.id}`])
      .maybeSingle();
    const payload = {
      owner_division_id: "global",
      title: src.title,
      body: src.content,
      kind: "note",
      tags: ["oracle-import", `oracle:${src.content_type ?? "text"}`, ...(src.tags ?? [])],
      sources: [`oracle:${src.id}`],
      visibility: "global",
      shared_with_division_ids: [] as string[],
    };
    if (existing) {
      const { error } = await s
        .from("knowledge_entries")
        .update(payload)
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(String((error as any).message ?? error));
    } else {
      const { error } = await s.from("knowledge_entries").insert(payload);
      if (error) throw new Error(String((error as any).message ?? error));
    }
    return { ok: true };
  });

// ═════════════════════════════════════════════════════════════════════════
// CREATION-FLOW HELPERS — signed-in (non-admin) surface for brief.new
// ═════════════════════════════════════════════════════════════════════════

// List running experiments, optionally scoped to a brand id. Used by the
// brief flow so authors can attach a live palette experiment during creation.
const activeExpInput = z.object({ brandId: z.string().nullable().optional() }).default({});
export const listActiveExperiments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => activeExpInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const { data: exps } = await s
      .from("ab_experiments")
      .select("id, name, hypothesis, primary_metric, brand_id, status")
      .eq("status", "running");
    const rows = (exps ?? []) as Array<{
      id: string;
      name: string;
      hypothesis: string | null;
      primary_metric: string;
      brand_id: string | null;
      status: string;
    }>;
    const matches = rows.filter(
      (r) => !data.brandId || r.brand_id === null || r.brand_id === data.brandId,
    );
    if (matches.length === 0)
      return [] as Array<{
        id: string;
        name: string;
        hypothesis: string | null;
        primary_metric: string;
        brand_id: string | null;
        variants: Array<{
          id: string;
          name: string;
          palette: Record<string, string>;
          is_control: boolean;
          weight: number;
        }>;
      }>;
    const { data: variants } = await s
      .from("ab_variants")
      .select("id, experiment_id, name, palette, is_control, weight")
      .in("experiment_id" as any, matches.map((m) => m.id) as any);
    const vList = (variants ?? []) as Array<{
      id: string;
      experiment_id: string;
      name: string;
      palette: Record<string, string>;
      is_control: boolean;
      weight: number;
    }>;
    return matches.map((m) => ({
      id: m.id,
      name: m.name,
      hypothesis: m.hypothesis,
      primary_metric: m.primary_metric,
      brand_id: m.brand_id,
      variants: vList.filter((v) => v.experiment_id === m.id),
    }));
  });

// Retrieve Oracle + KB snippets relevant to the brief. Keyword scored against
// title / content / tags. Returns compact snippets suitable for prompt context.
const kbInput = z.object({
  industry: z.string().default(""),
  audience: z.string().default(""),
  meetingObjective: z.string().default(""),
  clientFacts: z.string().default(""),
  brandName: z.string().optional().nullable(),
  // BRAND_MODES id (e.g. "bm-tp-legal"). This is what brand_asset_chunks.division_id
  // is populated with — use it directly instead of slugifying brandName.
  divisionId: z.string().optional().nullable(),
  brandTags: z.array(z.string()).default([]),
  limit: z.number().int().min(1).max(12).default(6),
});

// Resolve a brand_asset_chunks.division_id filter value from the brief context.
// Prefer explicit divisionId; otherwise try to match brandName against the
// brand guide registry (title -> divisionId). Returns null when unresolved so
// the vector search runs unfiltered rather than silently filtered-to-nothing.
async function resolveDivisionFilter(
  brandName: string | null | undefined,
  divisionId: string | null | undefined,
): Promise<string | null> {
  if (divisionId && divisionId.trim()) return divisionId.trim();
  if (!brandName) return null;
  try {
    const { BRAND_GUIDES } = await import("@/lib/brand-guides");
    const needle = brandName.trim().toLowerCase();
    const hit = BRAND_GUIDES.find(
      (g) => g.title.toLowerCase() === needle || g.slug === needle.replace(/\s+/g, "-"),
    );
    return hit?.divisionId && hit.divisionId !== "master" ? hit.divisionId : null;
  } catch {
    return null;
  }
}
export const retrieveKnowledgeForBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => kbInput.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<
      Array<{
        id: string;
        source: "oracle" | "kb" | "asset" | "brand-intel";
        title: string;
        tags: string[];
        snippet: string;
      }>
    > => {
      const s = context.supabase as unknown as SbClient;
      // Shared by the keyword pass below and the vector pass further down, so
      // a division-locked brief can't pull another division's private facts in
      // through the keyword path.
      const filterDivision = await resolveDivisionFilter(data.brandName, data.divisionId);
      let entriesQuery = s
        .from("knowledge_entries")
        .select("id, title, body, tags")
        // Ordered + generous cap so the keyword pass sees the whole KB, and
        // expired entries are excluded (see ai-rag.functions.ts for rationale).
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (filterDivision) {
        entriesQuery = entriesQuery.or(knowledgeDivisionFilter(filterDivision));
      }
      const [{ data: oracle }, { data: entries }, { data: brandIntel }] = await Promise.all([
        s
          .from("oracle_knowledge_base")
          .select("id, title, content, category, tags")
          .eq("is_active", true)
          .limit(200),
        entriesQuery,
        s
          .from("brand_intelligence")
          .select(
            "id, entity_type, entity_id, brand_summary, market_position, competitive_advantages",
          ),
      ]);
      // `kb` first so the editable knowledge_entries copy wins dedup against
      // its mirrored oracle_knowledge_base twin.
      const haystack: Array<{
        id: string;
        title: string;
        body: string;
        tags: string[];
        source: "oracle" | "kb" | "brand-intel";
      }> = dedupeKnowledge([
        ...(
          (entries ?? []) as Array<{
            id: string;
            title: string;
            body: string;
            tags: string[] | null;
          }>
        ).map((r) => ({
          id: `kb:${r.id}`,
          title: r.title,
          body: r.body ?? "",
          tags: r.tags ?? [],
          source: "kb" as const,
        })),
        ...(
          (oracle ?? []) as Array<{
            id: string;
            title: string;
            content: string;
            category: string | null;
            tags: string[] | null;
          }>
        ).map((r) => ({
          id: `oracle:${r.id}`,
          title: r.title,
          body: r.content ?? "",
          tags: [...(r.tags ?? []), r.category ?? ""].filter(Boolean),
          source: "oracle" as const,
        })),
        ...(
          (brandIntel ?? []) as Array<{
            id: string;
            entity_type: string;
            entity_id: string;
            brand_summary: string | null;
            market_position: string | null;
            competitive_advantages: any;
          }>
        ).map((r) => ({
          id: `bi:${r.id}`,
          title: `Brand intelligence: ${r.entity_type}`,
          body: [
            r.brand_summary,
            r.market_position,
            Array.isArray(r.competitive_advantages) ? r.competitive_advantages.join(" · ") : "",
          ]
            .filter(Boolean)
            .join(" — "),
          tags: [r.entity_type, r.entity_id].filter(Boolean),
          source: "brand-intel" as const,
        })),
      ]);
      // Tokenize brief + brand context.
      const bag = [
        data.industry,
        data.audience,
        data.meetingObjective,
        data.clientFacts,
        data.brandName ?? "",
        ...data.brandTags,
      ]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3);
      const tokenSet = new Set(bag);
      const scored = haystack
        .map((h) => {
          const hay = `${h.title} ${h.body} ${h.tags.join(" ")}`.toLowerCase();
          let score = 0;
          for (const t of tokenSet) if (hay.includes(t)) score += 1;
          for (const bt of data.brandTags)
            if (h.tags.some((tg) => tg.toLowerCase().includes(bt.toLowerCase()))) score += 2;
          return { ...h, score };
        })
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, data.limit - 3));

      // Vector search over brand_asset_chunks (PDFs/brochures) using the brief context.
      const assetSnippets: Array<{
        id: string;
        source: "asset";
        title: string;
        tags: string[];
        snippet: string;
      }> = [];
      const apiKey = process.env.LOVABLE_API_KEY;
      const query = [
        data.industry,
        data.audience,
        data.meetingObjective,
        data.clientFacts,
        data.brandName ?? "",
        ...data.brandTags,
      ]
        .join(" ")
        .trim();
      if (apiKey && query.length > 6) {
        try {
          const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: EMBEDDING_MODEL,
              input: [query.slice(0, 4000)],
            }),
          });
          if (eRes.ok) {
            const eJson = (await eRes.json()) as { data?: Array<{ embedding: number[] }> };
            const vec = eJson.data?.[0]?.embedding;
            if (vec) {
              // filterDivision resolved once at the top of the handler.
              const embeddingLiteral = `[${vec.join(",")}]`;
              const { data: chunks } = await s.rpc("match_brand_chunks", {
                query_embedding: embeddingLiteral,
                match_count: 3,
                filter_division: filterDivision,
              });
              let chunkRows = (chunks ?? []) as Array<{
                id: string;
                asset_id: string;
                content: string;
                tags: string[];
                similarity: number;
              }>;
              // Fallback: if a division filter was applied but returned nothing,
              // re-run once unfiltered so briefs still get RAG context when the
              // requested division has no ingested assets (or the divisionId
              // doesn't line up with what's actually stored on chunks).
              if (chunkRows.length === 0 && filterDivision) {
                const { data: unfiltered } = await s.rpc("match_brand_chunks", {
                  query_embedding: embeddingLiteral,
                  match_count: 3,
                  filter_division: null,
                });
                chunkRows = (unfiltered ?? []) as typeof chunkRows;
              }
              // Resolve asset titles
              if (chunkRows.length) {
                const { data: assets } = await s
                  .from("brand_assets")
                  .select("id, title")
                  .in("id" as any, chunkRows.map((c) => c.asset_id) as any);
                const titleMap = new Map<string, string>();
                for (const a of (assets ?? []) as Array<{ id: string; title: string }>)
                  titleMap.set(a.id, a.title);
                for (const c of chunkRows) {
                  assetSnippets.push({
                    id: `asset:${c.id}`,
                    source: "asset",
                    title: titleMap.get(c.asset_id) ?? "Brand asset",
                    tags: c.tags,
                    snippet: (c.content ?? "").slice(0, 480).replace(/\s+/g, " ").trim(),
                  });
                }
              }
            }
          }
        } catch {
          // Silent: RAG is optional enrichment; keyword scoring still returned.
        }
      }

      const combined = [
        ...scored.map((s2) => ({
          id: s2.id,
          source: s2.source,
          title: s2.title,
          tags: s2.tags,
          snippet: (s2.body ?? "").slice(0, 480).replace(/\s+/g, " ").trim(),
        })),
        ...assetSnippets,
      ];
      return combined.slice(0, data.limit);
    },
  );

// AI-propose palette variants for the current brand. Uses brand tokens as
// seed and returns 3 distinct palette candidates + rationale. Not persisted —
// author can then either save one as a starting point or push to /admin/ab.
const proposePalettesInput = z.object({
  brandName: z.string(),
  brandRole: z.string().optional().nullable(),
  seedPalette: z.record(z.string(), z.string()),
  audience: z.string().default(""),
  objective: z.string().default(""),
  vibe: z.string().default(""), // e.g. "bolder", "trust-forward", "energetic"
});
export const proposeAbPalettes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => proposePalettesInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      variants: Array<{
        name: string;
        rationale: string;
        palette: { primary: string; accent: string; ink: string; surface: string };
      }>;
      error?: string;
    }> => {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) return { variants: [], error: "LOVABLE_API_KEY missing" };
      const system = [
        "You are a brand systems designer at TransPerfect.",
        "Given a seed palette and audience/objective context, propose 3 distinct palette variants for A/B testing on rendered sales decks.",
        "Rules:",
        "- Each variant must remain professional and enterprise-appropriate.",
        "- Primary should carry brand equity; accent is a supporting pop; ink is text; surface is background.",
        "- Return valid 7-char hex codes (#RRGGBB).",
        "- Make the 3 variants meaningfully different from each other so an A/B test can measure lift.",
        "- Include one 'trust-forward' (calm, cool), one 'high-contrast', and one that leans into the requested vibe if any.",
      ].join("\n");
      const user = {
        brand: data.brandName,
        role: data.brandRole,
        seed: data.seedPalette,
        audience: data.audience,
        objective: data.objective,
        vibe: data.vibe,
      };
      const schema = {
        type: "object",
        additionalProperties: false,
        required: ["variants"],
        properties: {
          variants: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "rationale", "palette"],
              properties: {
                name: { type: "string" },
                rationale: { type: "string" },
                palette: {
                  type: "object",
                  additionalProperties: false,
                  required: ["primary", "accent", "ink", "surface"],
                  properties: {
                    primary: { type: "string" },
                    accent: { type: "string" },
                    ink: { type: "string" },
                    surface: { type: "string" },
                  },
                },
              },
            },
          },
        },
      };
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: system },
              { role: "user", content: JSON.stringify(user) },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "return_palette_variants",
                  description: "Return palette variants for A/B",
                  parameters: schema,
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "return_palette_variants" } },
          }),
        });
        if (!res.ok) return { variants: [], error: `AI gateway ${res.status}` };
        const json = (await res.json()) as {
          choices?: Array<{
            message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
          }>;
        };
        const argStr = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!argStr) return { variants: [], error: "AI returned no tool call" };
        const parsed = z
          .object({
            variants: z
              .array(
                z.object({
                  name: z.string(),
                  rationale: z.string(),
                  palette: z.object({
                    primary: z.string(),
                    accent: z.string(),
                    ink: z.string(),
                    surface: z.string(),
                  }),
                }),
              )
              .min(1)
              .max(5),
          })
          .safeParse(JSON.parse(argStr));
        if (!parsed.success) return { variants: [], error: "AI output invalid" };
        return { variants: parsed.data.variants };
      } catch (e) {
        return { variants: [], error: (e as Error).message };
      }
    },
  );
