import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SaveInput, saveDeckToCloudCore } from "@/lib/cloud-decks.core";

export { toUuid } from "@/lib/cloud-decks.core";

export const saveDeckToCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SaveInput.parse(raw))
  .handler(async ({ data, context }) =>
    saveDeckToCloudCore(context.supabase, context.userId, data),
  );

export const listMyCloudDecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("decks")
      .select(
        "id, title, brand_mode_id, archetype_id, updated_at, created_at, brief_id, is_template, review_status",
      )
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setDeckTemplateFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ deckId: z.string().uuid(), isTemplate: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("decks")
      .update({ is_template: data.isTemplate })
      .eq("id", data.deckId)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTeamTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("decks")
      .select("id, title, brand_mode_id, archetype_id, updated_at")
      .eq("is_template", true)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0)
      return [] as Array<{
        id: string;
        title: string;
        brand_mode_id: string;
        archetype_id: string;
        updated_at: string | null;
        slide_count: number;
      }>;
    const ids = data.map((d) => d.id);
    const { data: counts } = await supabase
      .from("deck_slides")
      .select("deck_id")
      .in("deck_id", ids);
    const bucket = new Map<string, number>();
    (counts ?? []).forEach((r) =>
      bucket.set(r.deck_id as string, (bucket.get(r.deck_id as string) ?? 0) + 1),
    );
    return data.map((d) => ({ ...d, slide_count: bucket.get(d.id) ?? 0 }));
  });

export const getTemplateDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: payload, error } = await supabase.rpc("get_template_deck", {
      _deck_id: data.deckId,
    });
    if (error) throw new Error(error.message);
    return { deck: (payload as unknown) ?? null };
  });

export const loadCloudDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: deck, error: dErr } = await supabase
      .from("decks")
      .select("*")
      .eq("id", data.deckId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!deck) throw new Error("Deck not found");
    const brief = deck.brief_id
      ? (await supabase.from("briefs").select("*").eq("id", deck.brief_id).maybeSingle()).data
      : null;

    const { data: slides, error: sErr } = await supabase
      .from("deck_slides")
      .select("*")
      .eq("deck_id", data.deckId)
      .order("position", { ascending: true });
    if (sErr) throw new Error(sErr.message);
    return { deck, brief, slides: slides ?? [] };
  });

export const deleteCloudDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(data.deckId)) {
      // Local-only deck id — nothing to delete in the cloud.
      return { ok: true, skipped: true as const };
    }
    const { supabase } = context;
    await supabase.from("deck_slides").delete().eq("deck_id", data.deckId);
    const { error } = await supabase.from("decks").delete().eq("id", data.deckId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
