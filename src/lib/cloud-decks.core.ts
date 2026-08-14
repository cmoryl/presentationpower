// Transport-free cloud persistence core for briefs + decks.
// Shared by the `saveDeckToCloud` server fn and the `generate_deck` MCP tool.

import { z } from "zod";

export const BriefSchema = z.object({
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

export const SlideSchema = z.object({
  id: z.string(),
  position: z.number(),
  sectionId: z.string(),
  variantId: z.string(),
  layoutId: z.string(),
  content: z.record(z.string(), z.unknown()),
  changes: z.array(z.any()).default([]),
  notes: z.string().optional(),
});

export const DeckSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  title: z.string(),
  briefId: z.string(),
  brandModeId: z.string(),
  subCompany: z.string().optional(),
  archetypeId: z.string(),
  slides: z.array(SlideSchema),
  context: z.record(z.string(), z.unknown()).optional(),
  isTemplate: z.boolean().optional(),
});

export const SaveInput = z.object({ brief: BriefSchema, deck: DeckSchema });
export type SaveDeckInput = z.infer<typeof SaveInput>;

// A namespace UUID (v5) — deterministic mapping from nanoid local id → uuid.
const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Deterministic uuid v5-ish via djb2 hash; a stable key scoped to this user's
 * rows (uniqueness enforced by owner_id + id upsert).
 */
export function toUuid(local: string): string {
  let h1 = 0x811c9dc5,
    h2 = 0x1b873593;
  for (let i = 0; i < local.length; i++) {
    h1 = Math.imul(h1 ^ local.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 ^ local.charCodeAt(local.length - 1 - i), 2246822519) >>> 0;
  }
  for (let i = 0; i < NS.length; i++) {
    h1 = Math.imul(h1 ^ NS.charCodeAt(i), 16777619) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"))
    .repeat(2)
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

type MinimalSb = { from: (t: string) => any };

/** Upsert a brief + deck + its slides. Owner-scoped through RLS. */
export async function saveDeckToCloudCore(
  supabase: unknown,
  userId: string,
  rawInput: unknown,
): Promise<{ deckUuid: string; briefUuid: string }> {
  const data = SaveInput.parse(rawInput);
  const sb = supabase as MinimalSb;
  const briefUuid = toUuid(`brief:${userId}:${data.brief.id}`);
  const deckUuid = toUuid(`deck:${userId}:${data.deck.id}`);

  const { error: briefErr } = await sb.from("briefs").upsert({
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
    inputs: data.brief,
  });
  if (briefErr) throw new Error(briefErr.message);

  const deckContext = {
    ...(data.deck.context ?? {}),
    ...(data.deck.subCompany ? { subCompany: data.deck.subCompany } : {}),
  };
  const { error: deckErr } = await sb.from("decks").upsert({
    id: deckUuid,
    owner_id: userId,
    brief_id: briefUuid,
    title: data.deck.title,
    archetype_id: data.deck.archetypeId,
    brand_mode_id: data.deck.brandModeId,
    status: "draft",
    context: deckContext,
    is_template: data.deck.isTemplate ?? false,
  });
  if (deckErr) throw new Error(deckErr.message);

  // Replace slides.
  await sb.from("deck_slides").delete().eq("deck_id", deckUuid);
  if (data.deck.slides.length > 0) {
    const rows = data.deck.slides.map((s) => ({
      id: toUuid(`slide:${userId}:${data.deck.id}:${s.id}`),
      deck_id: deckUuid,
      position: s.position,
      section_id: s.sectionId,
      variant_id: s.variantId,
      layout_id: s.layoutId,
      content: { ...s.content, __localId: s.id, __changes: s.changes },
      notes: s.notes ?? null,
    }));
    const { error: slideErr } = await sb.from("deck_slides").insert(rows);
    if (slideErr) throw new Error(slideErr.message);
  }

  return { deckUuid, briefUuid };
}
