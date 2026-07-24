// Master analytics server functions.
//
// - logUsageEvents: batched writer used by client `track()` helper.
// - getMasterAnalytics: single-payload dashboard aggregator that powers
//   /admin/analytics. Rolls up usage_events, ai_events, imagery_events,
//   deck_share_views, decks, briefs, print_assets, deck_translations,
//   and ab_events into overview KPIs, trend series, module leaderboards,
//   division breakdowns, power users, funnel, AI cost, and an optional
//   AI-authored executive summary via the Lovable AI Gateway.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SbClient = {
  from: (t: string) => {
    select: (cols?: string, opts?: { count?: "exact"; head?: boolean }) => any;
    insert: (rows: any) => any;
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const s = ctx.supabase as SbClient;
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin required");
}

// ═════════════════════════════════════════════════════════════════════════
// LOG USAGE EVENTS (batched write from client)
// ═════════════════════════════════════════════════════════════════════════

const EventInput = z.object({
  eventType: z.string().min(1).max(80),
  eventCategory: z.string().min(1).max(40),
  divisionId: z.string().max(120).nullable().optional(),
  deckId: z.string().uuid().nullable().optional(),
  slideId: z.string().uuid().nullable().optional(),
  variantId: z.string().max(120).nullable().optional(),
  moduleFamily: z.string().max(120).nullable().optional(),
  surface: z.string().max(200).nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  value: z.number().nullable().optional(),
  props: z.record(z.string(), z.unknown()).optional().default({}),
});

const LogInput = z.object({
  sessionId: z.string().max(80).nullable().optional(),
  userAgent: z.string().max(400).nullable().optional(),
  events: z.array(EventInput).min(1).max(50),
});

export const logUsageEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => LogInput.parse(raw))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as SbClient;
    const rows = data.events.map((e) => ({
      user_id: context.userId,
      session_id: data.sessionId ?? null,
      user_agent: data.userAgent ?? null,
      event_type: e.eventType,
      event_category: e.eventCategory,
      division_id: e.divisionId ?? null,
      deck_id: e.deckId ?? null,
      slide_id: e.slideId ?? null,
      variant_id: e.variantId ?? null,
      module_family: e.moduleFamily ?? null,
      surface: e.surface ?? null,
      duration_ms: e.durationMs ?? null,
      value: e.value ?? null,
      props: e.props ?? {},
    }));
    await s.from("usage_events").insert(rows);
    return { ok: true, count: rows.length };
  });

// ═════════════════════════════════════════════════════════════════════════
// MASTER ANALYTICS AGGREGATOR
// ═════════════════════════════════════════════════════════════════════════

const Filter = z.object({
  days: z.number().int().min(1).max(365).default(30),
  divisionId: z.string().max(120).nullable().optional(),
  aiSummary: z.boolean().optional().default(false),
});

type UsageRow = {
  user_id: string | null; session_id: string | null; event_type: string;
  event_category: string; division_id: string | null; deck_id: string | null;
  slide_id: string | null; variant_id: string | null; module_family: string | null;
  surface: string | null; duration_ms: number | null; value: number | null;
  props: Record<string, unknown> | null; created_at: string;
};
type AiRow = {
  user_id: string | null; brand_id: string | null; surface: string | null; model: string;
  operation: string; status: string; tokens_in: number | null; tokens_out: number | null;
  cost_credits: number | string | null; latency_ms: number | null; created_at: string;
};
type ImgRow = { event_type: string; brand_id: string | null; user_id: string | null; created_at: string };
type DeckRow = { id: string; title: string; owner_id: string; brand_mode_id: string | null; status: string | null; created_at: string; updated_at: string };
type ShareRow = { deck_id: string; slides_viewed: number | null; max_slide_reached: number | null; viewed_at: string; session_key: string | null };
type BriefRow = { id: string; owner_id: string | null; brand_mode_id: string | null; created_at: string };
type PrintRow = { id: string; kind: string; brand_mode_id: string | null; owner_id: string | null; created_at: string; updated_at: string };
type TransRow = { source_lang: string | null; target_lang: string; status: string; created_at: string };
type Profile = { id: string; display_name: string | null };

const dayKey = (iso: string) => iso.slice(0, 10);
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) || 0 : 0);

function makeDayBuckets(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export const getMasterAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => Filter.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const s = context.supabase as unknown as SbClient;

    const now = Date.now();
    const from = new Date(now - data.days * 86400_000).toISOString();
    const priorFrom = new Date(now - data.days * 2 * 86400_000).toISOString();

    // Pull each source in parallel (bounded to keep the payload tight).
    const [usageRes, priorUsageRes, aiRes, imgRes, decksRes, sharesRes, briefsRes, printRes, transRes, profilesRes] = await Promise.all([
      s.from("usage_events").select("user_id, session_id, event_type, event_category, division_id, deck_id, slide_id, variant_id, module_family, surface, duration_ms, value, props, created_at").gte("created_at", from).order("created_at", { ascending: false }).limit(20000),
      s.from("usage_events").select("user_id, event_type, event_category, created_at", { count: "exact", head: true }).gte("created_at", priorFrom).lt("created_at", from),
      s.from("ai_events").select("user_id, brand_id, surface, model, operation, status, tokens_in, tokens_out, cost_credits, latency_ms, created_at").gte("created_at", from).order("created_at", { ascending: false }).limit(10000),
      s.from("imagery_events").select("event_type, brand_id, user_id, created_at").gte("created_at", from).limit(10000),
      s.from("decks").select("id, title, owner_id, brand_mode_id, status, created_at, updated_at").order("updated_at", { ascending: false }).limit(2000),
      s.from("deck_share_views").select("deck_id, slides_viewed, max_slide_reached, viewed_at, session_key").gte("viewed_at", from).limit(10000),
      s.from("briefs").select("id, owner_id, brand_mode_id, created_at").gte("created_at", from).limit(5000),
      s.from("print_assets").select("id, kind, brand_mode_id, owner_id, created_at, updated_at").gte("created_at", from).limit(2000),
      s.from("deck_translations").select("source_lang, target_lang, status, created_at").gte("created_at", from).limit(5000),
      s.from("profiles").select("id, display_name").limit(5000),
    ]);

    const usage = ((usageRes as { data?: UsageRow[] }).data ?? []).filter((r) =>
      !data.divisionId || r.division_id === data.divisionId,
    );
    const ai = ((aiRes as { data?: AiRow[] }).data ?? []).filter((r) => !data.divisionId || r.brand_id === data.divisionId);
    const imgs = ((imgRes as { data?: ImgRow[] }).data ?? []).filter((r) => !data.divisionId || r.brand_id === data.divisionId);
    const decks = ((decksRes as { data?: DeckRow[] }).data ?? []).filter((r) => !data.divisionId || r.brand_mode_id === data.divisionId);
    const shares = ((sharesRes as { data?: ShareRow[] }).data ?? []);
    const briefs = ((briefsRes as { data?: BriefRow[] }).data ?? []).filter((r) => !data.divisionId || r.brand_mode_id === data.divisionId);
    const prints = ((printRes as { data?: PrintRow[] }).data ?? []).filter((r) => !data.divisionId || r.brand_mode_id === data.divisionId);
    const trans = ((transRes as { data?: TransRow[] }).data ?? []);
    const profiles = ((profilesRes as { data?: Profile[] }).data ?? []);
    const nameById = new Map(profiles.map((p) => [p.id, p.display_name ?? p.id.slice(0, 8)]));
    const priorTotal = (priorUsageRes as { count?: number }).count ?? 0;

    // Days buckets
    const days = makeDayBuckets(data.days);
    const dayIndex = new Map(days.map((d, i) => [d, i]));
    const zeroSeries = () => days.map(() => 0);

    // ── Overview KPIs ─────────────────────────────────────────────────
    const uniqueUsers = new Set<string>();
    const uniqueSessions = new Set<string>();
    for (const r of usage) {
      if (r.user_id) uniqueUsers.add(r.user_id);
      if (r.session_id) uniqueSessions.add(r.session_id);
    }
    const decksInWindow = decks.filter((d) => d.created_at >= from).length;
    const slidesAdded = usage.filter((r) => r.event_type === "slide.add").length;
    const exports = usage.filter((r) => r.event_category === "export").length;
    const shareViews = shares.length;
    const uniqueShareSessions = new Set(shares.map((v) => v.session_key ?? Math.random().toString())).size;

    // ── Activity trend (events / day) ─────────────────────────────────
    const activitySeries = zeroSeries();
    const usersPerDay: Map<string, Set<string>> = new Map(days.map((d) => [d, new Set()]));
    for (const r of usage) {
      const idx = dayIndex.get(dayKey(r.created_at));
      if (idx == null) continue;
      activitySeries[idx]++;
      if (r.user_id) usersPerDay.get(dayKey(r.created_at))!.add(r.user_id);
    }
    const dauSeries = days.map((d) => usersPerDay.get(d)?.size ?? 0);

    // ── Modules / variants leaderboard ────────────────────────────────
    const variantCounts = new Map<string, { renders: number; adds: number; edits: number; exports: number; division: Map<string, number> }>();
    for (const r of usage) {
      if (!r.variant_id) continue;
      const entry = variantCounts.get(r.variant_id) ?? { renders: 0, adds: 0, edits: 0, exports: 0, division: new Map<string, number>() };
      if (r.event_type === "variant.render") entry.renders++;
      if (r.event_type === "slide.add") entry.adds++;
      if (r.event_type === "slide.edit") entry.edits++;
      if (r.event_category === "export") entry.exports++;
      if (r.division_id) entry.division.set(r.division_id, (entry.division.get(r.division_id) ?? 0) + 1);
      variantCounts.set(r.variant_id, entry);
    }
    const topVariants = Array.from(variantCounts.entries())
      .map(([variant_id, v]) => ({
        variant_id,
        uses: v.adds + v.edits + v.renders,
        adds: v.adds,
        edits: v.edits,
        exports: v.exports,
        topDivision: Array.from(v.division.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 25);

    // ── Module family leaderboard ────────────────────────────────────
    const familyCounts = new Map<string, number>();
    for (const r of usage) if (r.module_family) familyCounts.set(r.module_family, (familyCounts.get(r.module_family) ?? 0) + 1);
    const topFamilies = Array.from(familyCounts.entries()).map(([family, count]) => ({ family, count })).sort((a, b) => b.count - a.count).slice(0, 20);

    // ── Division breakdown ────────────────────────────────────────────
    const divisionAgg = new Map<string, { events: number; decks: number; users: Set<string>; ai: number; exports: number }>();
    for (const r of usage) {
      const key = r.division_id ?? "—";
      const entry = divisionAgg.get(key) ?? { events: 0, decks: 0, users: new Set(), ai: 0, exports: 0 };
      entry.events++;
      if (r.user_id) entry.users.add(r.user_id);
      if (r.event_category === "export") entry.exports++;
      divisionAgg.set(key, entry);
    }
    for (const d of decks) {
      const key = d.brand_mode_id ?? "—";
      const e = divisionAgg.get(key) ?? { events: 0, decks: 0, users: new Set(), ai: 0, exports: 0 };
      e.decks++;
      divisionAgg.set(key, e);
    }
    for (const r of ai) {
      const key = r.brand_id ?? "—";
      const e = divisionAgg.get(key) ?? { events: 0, decks: 0, users: new Set(), ai: 0, exports: 0 };
      e.ai++;
      divisionAgg.set(key, e);
    }
    const divisions = Array.from(divisionAgg.entries())
      .map(([division_id, v]) => ({ division_id, events: v.events, decks: v.decks, activeUsers: v.users.size, aiCalls: v.ai, exports: v.exports }))
      .sort((a, b) => b.events + b.decks - (a.events + a.decks))
      .slice(0, 30);

    // ── Power users leaderboard ───────────────────────────────────────
    const userAgg = new Map<string, { events: number; decks: number; ai: number; exports: number; lastSeen: string }>();
    for (const r of usage) {
      if (!r.user_id) continue;
      const e = userAgg.get(r.user_id) ?? { events: 0, decks: 0, ai: 0, exports: 0, lastSeen: r.created_at };
      e.events++;
      if (r.event_type === "deck.create") e.decks++;
      if (r.event_category === "export") e.exports++;
      if (r.created_at > e.lastSeen) e.lastSeen = r.created_at;
      userAgg.set(r.user_id, e);
    }
    for (const r of ai) {
      if (!r.user_id) continue;
      const e = userAgg.get(r.user_id) ?? { events: 0, decks: 0, ai: 0, exports: 0, lastSeen: r.created_at };
      e.ai++;
      userAgg.set(r.user_id, e);
    }
    const powerUsers = Array.from(userAgg.entries())
      .map(([user_id, v]) => ({ user_id, name: nameById.get(user_id) ?? user_id.slice(0, 8), ...v }))
      .sort((a, b) => b.events + b.ai * 2 + b.exports * 3 + b.decks * 5 - (a.events + a.ai * 2 + a.exports * 3 + a.decks * 5))
      .slice(0, 20);

    // ── AI cost & performance ─────────────────────────────────────────
    let aiCost = 0, aiTokensIn = 0, aiTokensOut = 0, aiErrors = 0, aiLatSum = 0, aiLatN = 0;
    const aiPerDay = zeroSeries();
    const aiCostPerDay = zeroSeries();
    const aiByModel = new Map<string, { calls: number; cost: number; err: number }>();
    const aiByOp = new Map<string, number>();
    for (const r of ai) {
      const c = num(r.cost_credits);
      aiCost += c;
      aiTokensIn += r.tokens_in ?? 0;
      aiTokensOut += r.tokens_out ?? 0;
      if (r.status !== "success") aiErrors++;
      if (r.latency_ms) { aiLatSum += r.latency_ms; aiLatN++; }
      const idx = dayIndex.get(dayKey(r.created_at));
      if (idx != null) { aiPerDay[idx]++; aiCostPerDay[idx] += c; }
      const m = aiByModel.get(r.model) ?? { calls: 0, cost: 0, err: 0 };
      m.calls++; m.cost += c; if (r.status !== "success") m.err++;
      aiByModel.set(r.model, m);
      aiByOp.set(r.operation, (aiByOp.get(r.operation) ?? 0) + 1);
    }

    // ── Funnel (brief → deck → export → share) ────────────────────────
    const funnel = {
      briefs: briefs.length,
      decksCreated: decksInWindow,
      decksExported: usage.filter((r) => r.event_type === "deck.export").length,
      shareViews,
      uniqueShareSessions,
    };

    // ── Share engagement per deck ─────────────────────────────────────
    const shareByDeck = new Map<string, { views: number; maxSlide: number; sessions: Set<string> }>();
    for (const v of shares) {
      const e = shareByDeck.get(v.deck_id) ?? { views: 0, maxSlide: 0, sessions: new Set() };
      e.views++;
      if (v.max_slide_reached && v.max_slide_reached > e.maxSlide) e.maxSlide = v.max_slide_reached;
      if (v.session_key) e.sessions.add(v.session_key);
      shareByDeck.set(v.deck_id, e);
    }
    const deckTitleById = new Map(decks.map((d) => [d.id, d.title]));
    const topSharedDecks = Array.from(shareByDeck.entries())
      .map(([deck_id, v]) => ({ deck_id, title: deckTitleById.get(deck_id) ?? deck_id.slice(0, 8), views: v.views, uniqueViewers: v.sessions.size, maxSlide: v.maxSlide }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    // ── Print & translation snapshots ─────────────────────────────────
    const printByKind = new Map<string, number>();
    for (const p of prints) printByKind.set(p.kind, (printByKind.get(p.kind) ?? 0) + 1);
    const transByStatus = new Map<string, number>();
    for (const t of trans) transByStatus.set(t.status, (transByStatus.get(t.status) ?? 0) + 1);
    const transByTarget = new Map<string, number>();
    for (const t of trans) transByTarget.set(t.target_lang, (transByTarget.get(t.target_lang) ?? 0) + 1);

    // ── Imagery snapshot ─────────────────────────────────────────────
    let imgGen = 0, imgUse = 0;
    for (const r of imgs) { if (r.event_type === "generate") imgGen++; if (r.event_type === "use") imgUse++; }

    // ── WoW delta ─────────────────────────────────────────────────────
    const currentTotal = usage.length;
    const deltaPct = priorTotal > 0 ? Math.round(((currentTotal - priorTotal) / priorTotal) * 100) : null;

    // ── Optional AI-authored executive summary ─────────────────────────
    let aiSummary: string | null = null;
    if (data.aiSummary && process.env.LOVABLE_API_KEY) {
      try {
        const bullets = {
          windowDays: data.days,
          totalEvents: currentTotal,
          priorEvents: priorTotal,
          deltaPct,
          activeUsers: uniqueUsers.size,
          activeSessions: uniqueSessions.size,
          decksCreated: decksInWindow,
          slidesAdded,
          exports,
          shareViews,
          uniqueShareSessions,
          aiCallsTotal: ai.length,
          aiCostCredits: Number(aiCost.toFixed(2)),
          aiErrorRate: ai.length ? Number(((aiErrors / ai.length) * 100).toFixed(1)) : 0,
          topVariants: topVariants.slice(0, 5).map((v) => `${v.variant_id}(${v.uses})`),
          topDivisions: divisions.slice(0, 5).map((d) => `${d.division_id}(${d.events})`),
          topPowerUsers: powerUsers.slice(0, 5).map((u) => `${u.name}(${u.events})`),
          topSharedDecks: topSharedDecks.slice(0, 3).map((d) => `${d.title}(${d.views})`),
          funnel,
        };
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are a senior analytics strategist for a modular presentation platform used by 30+ divisions of TransPerfect. Given a compact JSON of usage metrics for a window, produce a crisp executive summary in 4-6 bullets. Call out: (1) health/momentum, (2) power divisions/users, (3) module winners & laggards, (4) AI cost efficiency and error rate, (5) one specific opportunity or risk with a next action. Be concrete and use numbers. Do not add filler.",
              },
              { role: "user", content: JSON.stringify(bullets) },
            ],
          }),
        });
        if (resp.ok) {
          const j = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
          aiSummary = j.choices?.[0]?.message?.content ?? null;
        }
      } catch {
        aiSummary = null;
      }
    }

    return {
      window: { days: data.days, from, to: new Date(now).toISOString() },
      overview: {
        totalEvents: currentTotal,
        priorTotal,
        deltaPct,
        activeUsers: uniqueUsers.size,
        activeSessions: uniqueSessions.size,
        decksCreated: decksInWindow,
        slidesAdded,
        exports,
        shareViews,
        uniqueShareSessions,
        aiCalls: ai.length,
        aiCost: Number(aiCost.toFixed(2)),
        aiTokensIn,
        aiTokensOut,
        aiErrorRate: ai.length ? Number(((aiErrors / ai.length) * 100).toFixed(1)) : 0,
        aiAvgLatencyMs: aiLatN ? Math.round(aiLatSum / aiLatN) : 0,
        imageryGenerations: imgGen,
        imageryUses: imgUse,
        translationsStarted: trans.length,
        printAssetsCreated: prints.length,
      },
      series: {
        days,
        activity: activitySeries,
        dau: dauSeries,
        aiCalls: aiPerDay,
        aiCost: aiCostPerDay.map((n) => Number(n.toFixed(2))),
      },
      topVariants,
      topFamilies,
      divisions,
      powerUsers,
      topSharedDecks,
      ai: {
        byModel: Array.from(aiByModel.entries()).map(([model, v]) => ({ model, calls: v.calls, cost: Number(v.cost.toFixed(2)), errors: v.err })).sort((a, b) => b.calls - a.calls),
        byOperation: Array.from(aiByOp.entries()).map(([operation, count]) => ({ operation, count })).sort((a, b) => b.count - a.count).slice(0, 20),
      },
      print: {
        byKind: Array.from(printByKind.entries()).map(([kind, count]) => ({ kind, count })),
      },
      translation: {
        byStatus: Array.from(transByStatus.entries()).map(([status, count]) => ({ status, count })),
        topTargets: Array.from(transByTarget.entries()).map(([lang, count]) => ({ lang, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      },
      funnel,
      aiSummary,
    };
  });

export type MasterAnalytics = Awaited<ReturnType<typeof getMasterAnalytics>>;
