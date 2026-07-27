import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DeckAnalyticsSummary = {
  totalDecks: number;
  sharedDecks: number;
  totalViews: number;
  uniqueViewers: number;
  topDecks: Array<{
    deckId: string;
    title: string;
    views: number;
    uniqueViewers: number;
    lastViewedAt: string | null;
    shareToken: string | null;
    updatedAt: string;
  }>;
  /** Same shape as topDecks but includes every owned deck, unsliced. */
  deckStats: Array<{
    deckId: string;
    title: string;
    views: number;
    uniqueViewers: number;
    lastViewedAt: string | null;
    shareToken: string | null;
    updatedAt: string;
  }>;
  trend: Array<{ date: string; views: number }>; // last 30 days
};

export const getLibraryAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeckAnalyticsSummary> => {
    const { supabase, userId } = context;

    const { data: decks, error: dErr } = await supabase
      .from("decks")
      .select("id, title, share_token, updated_at")
      .eq("owner_id", userId);
    if (dErr) throw new Error(dErr.message);
    const deckRows = decks ?? [];
    const deckIds = deckRows.map((d) => d.id);

    if (deckIds.length === 0) {
      return {
        totalDecks: 0,
        sharedDecks: 0,
        totalViews: 0,
        uniqueViewers: 0,
        topDecks: [],
        deckStats: [],
        trend: [],
      };
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: views, error: vErr } = await supabase
      .from("deck_share_views")
      .select("deck_id, session_key, viewed_at")
      .in("deck_id", deckIds)
      .order("viewed_at", { ascending: false })
      .limit(5000);
    if (vErr) throw new Error(vErr.message);
    const viewRows = views ?? [];

    const byDeck = new Map<string, { views: number; sessions: Set<string>; last: string | null }>();
    for (const v of viewRows) {
      const b = byDeck.get(v.deck_id) ?? { views: 0, sessions: new Set<string>(), last: null };
      b.views += 1;
      if (v.session_key) b.sessions.add(v.session_key);
      if (!b.last || (v.viewed_at && v.viewed_at > b.last)) b.last = v.viewed_at;
      byDeck.set(v.deck_id, b);
    }

    const deckStatsAll = deckRows
      .map((d) => {
        const b = byDeck.get(d.id);
        return {
          deckId: d.id,
          title: d.title,
          views: b?.views ?? 0,
          uniqueViewers: b?.sessions.size ?? 0,
          lastViewedAt: b?.last ?? null,
          shareToken: (d.share_token as string | null) ?? null,
          updatedAt: d.updated_at,
        };
      })
      .sort((a, b) => b.views - a.views || b.updatedAt.localeCompare(a.updatedAt));
    const topDecks = deckStatsAll.slice(0, 10);

    // Trend: last 30 days
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dayMap.set(d, 0);
    }
    for (const v of viewRows) {
      if (!v.viewed_at || v.viewed_at < since) continue;
      const key = v.viewed_at.slice(0, 10);
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
    const trend = Array.from(dayMap.entries()).map(([date, views]) => ({ date, views }));

    const allSessions = new Set<string>();
    for (const v of viewRows) if (v.session_key) allSessions.add(v.session_key);

    return {
      totalDecks: deckRows.length,
      sharedDecks: deckRows.filter((d) => d.share_token).length,
      totalViews: viewRows.length,
      uniqueViewers: allSessions.size,
      topDecks,
      deckStats: deckStatsAll,
      trend,
    };
  });
