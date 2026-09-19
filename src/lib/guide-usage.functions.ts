// Counts what a division actually built in — looks and grounds used across
// slides, print and social — so a brand guide can report real work.
//
// Signed-in only, and aggregate only: codes, counts and dates. No titles, no
// owners, no client names ever leave this function.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GuideUsage, GuideUsageLook } from "@/lib/guide-usage";

const input = z.object({ divisionId: z.string().min(1).max(64) });

type Row = { context: unknown; updated_at: string | null; id: string };

function packCode(context: unknown): string | null {
  const id =
    context && typeof context === "object"
      ? ((context as Record<string, unknown>)["stylePackId"] as string | undefined)
      : undefined;
  if (!id) return null;
  const code = id.replace(/^(skin|tpl)-/i, "").toUpperCase();
  return /^[A-Z][0-9]{2}$/.test(code) ? code : code || null;
}

export const getGuideUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data, context }): Promise<GuideUsage> => {
    // Aggregate reporting across everyone's work, so a brand lead sees the
    // division rather than their own drafts. Counts only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: Array<{ table: "decks" | "print_assets" | "surfaces"; surface: keyof GuideUsageLook["surfaces"] }> = [
      { table: "decks", surface: "decks" },
      { table: "print_assets", surface: "print" },
      { table: "surfaces", surface: "social" },
    ];

    const looks = new Map<string, GuideUsageLook>();
    const deckIds: string[] = [];
    let total = 0;
    let brandSystem = 0;
    let lastUsed: string | null = null;

    for (const { table, surface } of tables) {
      const { data: rows, error } = await supabaseAdmin
        .from(table)
        .select("id, context, updated_at")
        .eq("brand_mode_id", data.divisionId)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      for (const row of (rows ?? []) as Row[]) {
        total += 1;
        if (row.updated_at && (!lastUsed || row.updated_at > lastUsed)) lastUsed = row.updated_at;
        const code = packCode(row.context);
        if (!code) {
          brandSystem += 1;
          continue;
        }
        if (table === "decks") deckIds.push(row.id);
        const entry =
          looks.get(code) ??
          ({
            code,
            count: 0,
            surfaces: { decks: 0, print: 0, social: 0 },
            lastUsed: null,
            approved: 0,
            sentBack: 0,
          } satisfies GuideUsageLook);
        entry.count += 1;
        entry.surfaces[surface] += 1;
        if (row.updated_at && (!entry.lastUsed || row.updated_at > entry.lastUsed)) {
          entry.lastUsed = row.updated_at;
        }
        looks.set(code, entry);
      }
    }

    // Reviewer outcomes credited to this division's decks.
    if (deckIds.length) {
      const { data: events } = await supabaseAdmin
        .from("style_reco_events")
        .select("style_code, signal, deck_id")
        .in("deck_id", deckIds.slice(0, 400))
        .limit(2000);
      for (const ev of events ?? []) {
        const code = (ev.style_code ?? "").toUpperCase();
        const entry = code ? looks.get(code) : undefined;
        if (!entry) continue;
        if (ev.signal === "review_approved" || ev.signal === "deck_exported") entry.approved += 1;
        else if (ev.signal === "review_changes_requested") entry.sentBack += 1;
      }
    }

    return {
      divisionId: data.divisionId,
      total,
      brandSystem,
      lastUsed,
      looks: [...looks.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    };
  });
