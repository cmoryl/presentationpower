import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Minimal shapes — briefs/decks/deck_slides tables already have owner-scoped RLS.
const BriefSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  prospect: z.string(),
  industry: z.string(),
  meetingObjective: z.string(),
  audience: z.string(),
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  archetypeId: z.string(),
  lengthTarget: z.number(),
  clientFacts: z.string(),
});

const SlideSchema = z.object({
  id: z.string(),
  position: z.number(),
  sectionId: z.string(),
  variantId: z.string(),
  layoutId: z.string(),
  content: z.record(z.string(), z.unknown()),
  changes: z.array(z.any()).default([]),
});

const DeckSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  title: z.string(),
  briefId: z.string(),
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  archetypeId: z.string(),
  slides: z.array(SlideSchema),
  context: z.record(z.string(), z.unknown()).optional(),
});


const SaveInput = z.object({ brief: BriefSchema, deck: DeckSchema });

// A namespace UUID (v5) — deterministic mapping from nanoid local id → uuid.
const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function toUuid(local: string): string {
  // Simple deterministic uuid v5-ish via djb2 hash; good enough as a stable key
  // scoped to this user's rows (uniqueness enforced by owner_id + id upsert).
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let i = 0; i < local.length; i++) {
    h1 = Math.imul(h1 ^ local.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 ^ local.charCodeAt(local.length - 1 - i), 2246822519) >>> 0;
  }
  for (let i = 0; i < NS.length; i++) {
    h1 = Math.imul(h1 ^ NS.charCodeAt(i), 16777619) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(2).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export const saveDeckToCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const briefUuid = toUuid(`brief:${userId}:${data.brief.id}`);
    const deckUuid = toUuid(`deck:${userId}:${data.deck.id}`);

    const { error: briefErr } = await supabase.from("briefs").upsert({
      id: briefUuid,
      owner_id: userId,
      title: data.brief.prospect || "Untitled brief",
      prospect: data.brief.prospect,
      industry: data.brief.industry,
      meeting_objective: data.brief.meetingObjective,
      audience: data.brief.audience,
      brand_mode_id: data.brief.brandModeId,
      sub_company: data.brief.subCompany,
      length_target: data.brief.lengthTarget,
      known_facts: data.brief.clientFacts,
      inputs: data.brief as never,
    });

    if (briefErr) throw new Error(briefErr.message);

    const deckContext = {
      ...(data.deck.context ?? {}),
      ...(data.deck.subCompany ? { subCompany: data.deck.subCompany } : {}),
    };
    const { error: deckErr } = await supabase.from("decks").upsert({
      id: deckUuid,
      owner_id: userId,
      brief_id: briefUuid,
      title: data.deck.title,
      archetype_id: data.deck.archetypeId,
      brand_mode_id: data.deck.brandModeId,
      status: "draft",
      context: deckContext as never,
    });
    if (deckErr) throw new Error(deckErr.message);

    // Replace slides.
    await supabase.from("deck_slides").delete().eq("deck_id", deckUuid);
    if (data.deck.slides.length > 0) {
      const rows = data.deck.slides.map((s) => ({
        id: toUuid(`slide:${userId}:${data.deck.id}:${s.id}`),
        deck_id: deckUuid,
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        content: { ...s.content, __localId: s.id, __changes: s.changes } as never,
      }));
      const { error: slideErr } = await supabase.from("deck_slides").insert(rows);
      if (slideErr) throw new Error(slideErr.message);
    }

    return { deckUuid, briefUuid };
  });

export const listMyCloudDecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("decks")
      .select("id, title, brand_mode_id, archetype_id, updated_at, created_at, brief_id")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
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
    const { supabase } = context;
    await supabase.from("deck_slides").delete().eq("deck_id", data.deckId);
    const { error } = await supabase.from("decks").delete().eq("id", data.deckId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
