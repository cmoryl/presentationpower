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

export const enableDeckSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Load — RLS ensures only the owner sees this row.
    const { data: existing, error: readErr } = await supabase
      .from("decks")
      .select("id, owner_id, share_token")
      .eq("id", data.deckId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!existing) throw new Error("Deck not found");
    if (existing.owner_id !== userId) throw new Error("Forbidden");

    let token = existing.share_token as string | null;
    if (!token) {
      token = randomToken(24);
      const { error: upErr } = await supabase
        .from("decks")
        .update({ share_token: token, shared_at: new Date().toISOString() })
        .eq("id", data.deckId);
      if (upErr) throw new Error(upErr.message);
    }
    return { token };
  });

export const disableDeckSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("decks")
      .update({ share_token: null, shared_at: null })
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
      .select("share_token, shared_at")
      .eq("id", data.deckId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { token: (row?.share_token as string | null) ?? null, sharedAt: row?.shared_at ?? null };
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
