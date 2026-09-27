// Admin usage report: who built what, with which tools, over a chosen period.
// Admin-only. Counts come straight from the records each tool writes; a source
// that recorded nothing is reported as a gap rather than hidden.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const USAGE_SOURCES = [
  { key: "decks", label: "Decks", table: "decks", user: "owner_id", time: "created_at" },
  { key: "print", label: "Print pieces", table: "print_assets", user: "owner_id", time: "created_at" },
  { key: "social", label: "Social pieces", table: "surfaces", user: "owner_id", time: "created_at" },
  { key: "kits", label: "Campaign kits", table: "campaign_kits", user: "user_id", time: "created_at" },
  { key: "modules", label: "Custom modules", table: "custom_modules", user: "created_by", time: "created_at" },
  { key: "saved", label: "Saved modules", table: "saved_modules", user: "owner_id", time: "created_at" },
  { key: "kiosks", label: "Kiosk edits", table: "kiosk_layer_edits", user: "updated_by", time: "updated_at" },
  { key: "approvalsSent", label: "Approvals sent", table: "approval_requests", user: "requested_by", time: "created_at" },
  { key: "approvalsDecided", label: "Approvals decided", table: "approval_requests", user: "decided_by", time: "updated_at" },
  { key: "exports", label: "Deck exports", table: "usage_events", user: "user_id", time: "created_at", filter: ["event_type", "deck.export"] },
  { key: "ai", label: "AI requests", table: "ai_events", user: "user_id", time: "created_at" },
  { key: "imagery", label: "Image uses", table: "imagery_events", user: "user_id", time: "created_at" },
] as const;

export type UsageKey = (typeof USAGE_SOURCES)[number]["key"];

export type UsagePerson = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  lastSignIn: string | null;
  lastActive: string | null;
  counts: Record<UsageKey, number>;
  total: number;
};

export type UsageReport = {
  days: number;
  since: string;
  sources: Array<{ key: UsageKey; label: string; total: number; unattributed: number }>;
  people: UsagePerson[];
  byRole: Array<{ role: string; people: number; active: number; counts: Record<UsageKey, number> }>;
  perDay: Array<{ day: string; count: number }>;
};

const emptyCounts = () =>
  Object.fromEntries(USAGE_SOURCES.map((s) => [s.key, 0])) as Record<UsageKey, number>;

export const getUsageReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ days: z.number().int().min(1).max(730) }).parse(raw))
  .handler(async ({ data, context }): Promise<UsageReport> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = supabaseAdmin as any;
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [{ data: authList }, profiles, roles] = await Promise.all([
      sa.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      sa.from("profiles").select("id, display_name"),
      sa.from("user_roles").select("user_id, role"),
    ]);

    const people = new Map<string, UsagePerson>();
    const names = new Map<string, string | null>(
      ((profiles.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name]),
    );
    const roleMap = new Map<string, string[]>();
    for (const r of (roles.data ?? []) as Array<{ user_id: string; role: string }>) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }
    for (const u of (authList?.users ?? []) as Array<{ id: string; email?: string; last_sign_in_at: string | null }>) {
      people.set(u.id, {
        id: u.id,
        email: u.email ?? "",
        name: names.get(u.id) ?? null,
        roles: roleMap.get(u.id) ?? [],
        lastSignIn: u.last_sign_in_at,
        lastActive: null,
        counts: emptyCounts(),
        total: 0,
      });
    }

    const perDay = new Map<string, number>();
    const sources: UsageReport["sources"] = [];

    await Promise.all(
      USAGE_SOURCES.map(async (s) => {
        let q = sa.from(s.table).select(`${s.user}, ${s.time}`).gte(s.time, since).limit(20000);
        if ("filter" in s) q = q.eq(s.filter[0], s.filter[1]);
        const { data: rows, error } = await q;
        let total = 0;
        let unattributed = 0;
        if (!error) {
          for (const row of (rows ?? []) as Array<Record<string, string | null>>) {
            const uid = row[s.user];
            const at = row[s.time];
            total += 1;
            if (at) perDay.set(at.slice(0, 10), (perDay.get(at.slice(0, 10)) ?? 0) + 1);
            const p = uid ? people.get(uid) : undefined;
            if (!p) {
              unattributed += 1;
              continue;
            }
            p.counts[s.key] += 1;
            p.total += 1;
            if (at && (!p.lastActive || at > p.lastActive)) p.lastActive = at;
          }
        } else {
          console.error("[usage-report]", s.table, error.message);
        }
        sources.push({ key: s.key, label: s.label, total, unattributed });
      }),
    );

    sources.sort(
      (a, b) => USAGE_SOURCES.findIndex((s) => s.key === a.key) - USAGE_SOURCES.findIndex((s) => s.key === b.key),
    );

    const list = [...people.values()].sort((a, b) => b.total - a.total || a.email.localeCompare(b.email));
    const roleAgg = new Map<string, UsageReport["byRole"][number]>();
    for (const p of list) {
      for (const role of p.roles.length ? p.roles : ["no role"]) {
        const r = roleAgg.get(role) ?? { role, people: 0, active: 0, counts: emptyCounts() };
        r.people += 1;
        if (p.total > 0) r.active += 1;
        for (const k of Object.keys(p.counts) as UsageKey[]) r.counts[k] += p.counts[k];
        roleAgg.set(role, r);
      }
    }

    const days: UsageReport["perDay"] = [];
    for (let i = Math.min(data.days, 90) - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      days.push({ day: d, count: perDay.get(d) ?? 0 });
    }

    return {
      days: data.days,
      since,
      sources,
      people: list,
      byRole: [...roleAgg.values()].sort((a, b) => b.people - a.people),
      perDay: days,
    };
  });
