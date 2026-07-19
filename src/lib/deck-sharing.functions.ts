import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function randomToken(bytes = 24): string {
  // Web crypto is available in the Worker runtime.
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const enableInput = z.object({
  deckId: z.string().uuid(),
  expiresAt: z.string().datetime().nullable().optional(),
  regenerate: z.boolean().optional(),
});

export const enableDeckSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => enableInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: readErr } = await supabase
      .from("decks")
      .select("id, owner_id, share_token")
      .eq("id", data.deckId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!existing) throw new Error("Deck not found");
    if (existing.owner_id !== userId) throw new Error("Forbidden");

    let token = existing.share_token as string | null;
    const needsNew = !token || data.regenerate === true;
    if (needsNew) token = randomToken(24);

    const patch: Record<string, unknown> = {
      share_token: token,
      shared_at: new Date().toISOString(),
    };
    if (data.expiresAt !== undefined) patch.share_expires_at = data.expiresAt;

    const { error: upErr } = await supabase
      .from("decks")
      // Types file not yet regenerated with share_expires_at column.
      .update(patch as never)
      .eq("id", data.deckId);
    if (upErr) throw new Error(upErr.message);
    return { token: token as string };
  });

export const setDeckShareExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      deckId: z.string().uuid(),
      expiresAt: z.string().datetime().nullable(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("decks")
      .update({ share_expires_at: data.expiresAt } as never)
      .eq("id", data.deckId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disableDeckSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("decks")
      .update({ share_token: null, shared_at: null, share_expires_at: null } as never)
      .eq("id", data.deckId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDeckShareStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("decks")
      .select("share_token, shared_at, share_expires_at" as never)
      .eq("id", data.deckId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const r = (row ?? null) as { share_token: string | null; shared_at: string | null; share_expires_at: string | null } | null;
    const token = r?.share_token ?? null;
    const expiresAt = r?.share_expires_at ?? null;
    const expired = !!(expiresAt && new Date(expiresAt).getTime() <= Date.now());
    return { token, sharedAt: r?.shared_at ?? null, expiresAt, expired };
  });

// Public — no auth middleware. Calls SECURITY DEFINER RPC that only returns
// data when the token matches.
export const getSharedDeck = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ token: z.string().min(16).max(128) }).parse(raw))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: payload, error } = await supabasePublic.rpc("get_shared_deck", { _token: data.token });
    if (error) throw new Error(error.message);
    return { deck: (payload as unknown) ?? null };
  });

// Public — records/updates a share view. Never throws to the caller.
export const recordShareView = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({
        token: z.string().min(16).max(128),
        sessionKey: z.string().min(1).max(64),
        slidesViewed: z.number().int().min(0).max(10000).optional(),
        maxSlide: z.number().int().min(0).max(10000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    try {
      const url = process.env.SUPABASE_URL!;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
      const supabasePublic = createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
              h.delete("Authorization");
            }
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      await supabasePublic.rpc("record_share_view", {
        _token: data.token,
        _session_key: data.sessionKey,
        _slides_viewed: data.slidesViewed ?? 0,
        _max_slide: data.maxSlide ?? 0,
      });
    } catch {
      // swallow
    }
    return { ok: true };
  });

export const getShareAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership check via RLS: this will return no rows if not owner.
    const { data: deck } = await supabase
      .from("decks")
      .select("id, owner_id")
      .eq("id", data.deckId)
      .maybeSingle();
    if (!deck || deck.owner_id !== userId) {
      return { totalViews: 0, uniqueSessions: 0, lastViewedAt: null as string | null, avgMaxSlide: 0 };
    }
    const { data: rows, error } = await supabase
      .from("deck_share_views")
      .select("session_key, viewed_at, max_slide_reached")
      .eq("deck_id", data.deckId)
      .order("viewed_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const sessions = new Set<string>();
    let sumMax = 0;
    let n = 0;
    for (const r of list) {
      if (r.session_key) sessions.add(r.session_key);
      if (typeof r.max_slide_reached === "number") {
        sumMax += r.max_slide_reached;
        n += 1;
      }
    }
    return {
      totalViews: list.length,
      uniqueSessions: sessions.size,
      lastViewedAt: list[0]?.viewed_at ?? null,
      avgMaxSlide: n > 0 ? Math.round((sumMax / n) * 10) / 10 : 0,
    };
  });
