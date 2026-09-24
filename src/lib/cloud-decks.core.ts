// Transport-free cloud persistence core for briefs + decks.
// Shared by the `saveDeckToCloud` server fn and the `generate_deck` MCP tool.

import { z } from "zod";
import { pickSlideExtras } from "@/lib/cloud-slide-extras";

// Schemas are deliberately forgiving: a deck assembled in the browser may be
// missing an optional field or carry newer authoring props, and none of that is
// a reason to refuse a save. Unknown keys pass through, missing scalars fall
// back to safe defaults.
const str = (fallback = "") => z.coerce.string().catch(fallback).default(fallback);

export const BriefSchema = z
  .object({
    id: str(),
    createdAt: str(new Date().toISOString()),
    prospect: str(),
    industry: str(),
    meetingObjective: str(),
    audience: str(),
    brandModeId: str(),
    subCompany: z.string().optional(),
    archetypeId: str(),
    lengthTarget: z.coerce.number().catch(8).default(8),
    clientFacts: str(),
  })
  .passthrough();

export const SlideSchema = z
  .object({
    id: str(),
    position: z.coerce.number().catch(0).default(0),
    sectionId: str(),
    variantId: str(),
    layoutId: str(),
    content: z.record(z.string(), z.unknown()).catch({}).default({}),
    changes: z.array(z.unknown()).catch([]).default([]),
    notes: z.string().optional(),
  })
  .passthrough();

export const DeckSchema = z
  .object({
    id: str(),
    createdAt: str(new Date().toISOString()),
    title: str("Untitled deck"),
    briefId: str(),
    brandModeId: str(),
    subCompany: z.string().optional(),
    archetypeId: str(),
    slides: z.array(SlideSchema).catch([]).default([]),
    context: z.record(z.string(), z.unknown()).optional(),
    isTemplate: z.boolean().optional(),
  })
  .passthrough();

export const SaveInput = z.object({
  brief: BriefSchema,
  deck: DeckSchema,
  /**
   * The `updated_at` this editor believes the saved deck carries — captured when
   * it was opened or last saved.
   *
   * Saves used to be last-write-wins: two people (or two tabs) editing the same
   * deck silently overwrote each other, and neither was told. When this is
   * supplied and the saved row has moved on since, the save is refused instead
   * of destroying the other person's work. Omitted = no guard, which is how a
   * brand-new deck and older clients behave.
   */
  baseUpdatedAt: z.string().optional(),
});

export type SaveDeckInput = z.infer<typeof SaveInput>;

/** Raised when the saved deck moved on since this editor opened it. */
export class DeckConflictError extends Error {
  readonly conflict = true;
  constructor(readonly serverUpdatedAt: string) {
    super(
      "Someone else saved changes to this deck after you opened it, so your save was stopped to avoid overwriting their work. Reload the deck to see their version, then re-apply your changes.",
    );
    this.name = "DeckConflictError";
  }
}

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

type QueryResult = { data: unknown; error: { message: string } | null };
interface QueryBuilder extends PromiseLike<QueryResult> {
  upsert: (row: Record<string, unknown> | Record<string, unknown>[]) => QueryBuilder;
  insert: (rows: unknown) => QueryBuilder;
  select: (cols: string) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
}
type MinimalSb = { from: (t: string) => QueryBuilder };

/**
 * Resolve a foreign-key reference: returns the id only when a row with that id
 * actually exists, otherwise null. Locally-authored decks legitimately carry
 * synthetic ids (agent runs, open-canvas, single-module previews) or an empty
 * string, and those must not abort the whole save with an FK violation.
 */
async function existingRefId(sb: MinimalSb, table: string, id: unknown): Promise<string | null> {
  const raw = typeof id === "string" ? id.trim() : "";
  if (!raw) return null;
  const { data, error } = await sb.from(table).select("id").eq("id", raw);
  if (error) return null;
  return Array.isArray(data) && data.length > 0 ? raw : null;
}

/** How close together two saves of the same title count as the same deck. */
export const DUPLICATE_SAVE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Find a deck row this save should land on instead of creating a second one.
 *
 * Generating the same deck twice (agent re-run, a second click on save while the
 * first was still in flight) produced a fresh local id each time, so the
 * deterministic upsert wrote a brand-new row — three near-identical "Meridian
 * Legal Group" decks minutes apart, none of them obviously the real one. A save
 * that matches an untouched draft of the same title by the same owner, made
 * inside the window, updates that draft instead. Anything a human has moved on
 * (in review, approved, renamed, older than the window) is left alone.
 */
export async function findRecentDuplicateDeck(
  sb: MinimalSb,
  userId: string,
  title: string,
  deckUuid: string,
  briefUuid: string,
  now = Date.now(),
): Promise<string | null> {
  const clean = title.trim();
  if (!clean || !briefUuid) return null;
  const { data, error } = await sb
    .from("decks")
    .select("id, title, status, created_at, brief_id")
    .eq("owner_id", userId)
    .eq("title", clean);
  if (error || !Array.isArray(data)) return null;
  const rows = data as Array<{
    id?: string;
    status?: string | null;
    created_at?: string | null;
    brief_id?: string | null;
  }>;
  const candidates = rows
    .filter((r) => typeof r.id === "string" && r.id !== deckUuid)
    // Two different decks can share a title (same prospect, two versions). Only a
    // re-save of the very same brief may land on an existing row; anything else
    // gets its own record rather than overwriting someone's earlier work.
    .filter((r) => r.brief_id === briefUuid)
    .filter((r) => (r.status ?? "draft") === "draft")
    .map((r) => ({ id: r.id as string, at: Date.parse(r.created_at ?? "") }))
    .filter((r) => Number.isFinite(r.at) && now - r.at <= DUPLICATE_SAVE_WINDOW_MS && now - r.at >= 0)
    .sort((a, b) => b.at - a.at);
  return candidates[0]?.id ?? null;
}

/** Upsert a brief + deck + its slides. Owner-scoped through RLS. */
/**
 * The saved deck's current `updated_at`, handed back after every save so the
 * editor can prove on its next save that it is still working from this version.
 */
async function readDeckStamp(sb: MinimalSb, deckUuid: string): Promise<string | null> {
  const { data } = await sb.from("decks").select("updated_at").eq("id", deckUuid);
  const row = Array.isArray(data) ? (data[0] as { updated_at?: string | null }) : undefined;
  return row?.updated_at ?? null;
}

export async function saveDeckToCloudCore(
  supabase: unknown,
  userId: string,
  rawInput: unknown,
): Promise<{ deckUuid: string; briefUuid: string; serverUpdatedAt: string | null }> {
  const data = SaveInput.parse(rawInput);
  const sb = supabase as MinimalSb;
  const briefUuid = toUuid(`brief:${userId}:${data.brief.id}`);
  let deckUuid = toUuid(`deck:${userId}:${data.deck.id}`);

  // Reference columns are FK-checked in the database; unknown/synthetic ids are
  // stored as NULL rather than failing the whole save.
  const briefBrandMode = await existingRefId(sb, "brand_modes", data.brief.brandModeId);
  const deckBrandMode = await existingRefId(sb, "brand_modes", data.deck.brandModeId);
  const deckArchetype = await existingRefId(sb, "narrative_archetypes", data.deck.archetypeId);

  const { error: briefErr } = await sb.from("briefs").upsert({
    id: briefUuid,
    owner_id: userId,
    title: data.brief.prospect || "Untitled brief",
    prospect: data.brief.prospect,
    industry: data.brief.industry,
    meeting_objective: data.brief.meetingObjective,
    audience: data.brief.audience,
    brand_mode_id: briefBrandMode,
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
  // An ordinary content save must not reset the deck's lifecycle status — that
  // silently undid whatever moved it out of draft.
  let { data: existingDeck } = await sb
    .from("decks")
    .select("status, updated_at")
    .eq("id", deckUuid);
  const alreadySaved = Array.isArray(existingDeck) && existingDeck.length > 0;
  if (!alreadySaved) {
    // Land on the draft this is a re-save of rather than stacking up another row.
    const dupId = await findRecentDuplicateDeck(
      sb,
      userId,
      data.deck.title,
      deckUuid,
      briefUuid,
    );
    if (dupId) {
      deckUuid = dupId;
      existingDeck = (await sb.from("decks").select("status, updated_at").eq("id", deckUuid)).data;
    }
  }
  const existingRow = Array.isArray(existingDeck)
    ? (existingDeck[0] as { status?: string | null; updated_at?: string | null } | undefined)
    : undefined;
  const existingStatus = existingRow?.status;
  const keepStatus = existingStatus ?? "draft";

  // Concurrency guard. Refuse rather than overwrite when the saved deck has been
  // written by someone else since this editor read it. Compared as instants, so
  // clock formatting differences can't be mistaken for a conflict.
  const serverStamp = existingRow?.updated_at ?? null;
  if (data.baseUpdatedAt && serverStamp) {
    const base = Date.parse(data.baseUpdatedAt);
    const server = Date.parse(serverStamp);
    // One second of slack absorbs storage rounding; anything beyond it is a
    // genuine write we would be discarding.
    if (Number.isFinite(base) && Number.isFinite(server) && server - base > 1000) {
      throw new DeckConflictError(serverStamp);
    }
  }

  const { error: deckErr } = await sb.from("decks").upsert({
    id: deckUuid,
    owner_id: userId,
    brief_id: briefUuid,
    title: data.deck.title,
    archetype_id: deckArchetype,
    brand_mode_id: deckBrandMode,

    status: keepStatus,
    context: deckContext,
    is_template: data.deck.isTemplate ?? false,
  });

  if (deckErr) throw new Error(deckErr.message);

  // Replace slides — write first, prune after. Deleting up front meant a failed
  // insert left the deck with no slides at all, i.e. a save that destroyed work.
  const { data: existingRows } = await sb.from("deck_slides").select("id").eq("deck_id", deckUuid);
  const existingIds = Array.isArray(existingRows)
    ? (existingRows as { id: string }[]).map((r) => r.id)
    : [];

  if (data.deck.slides.length === 0) {
    // An empty deck overwriting saved slides is almost never what the user meant.
    if (existingIds.length > 0) {
      throw new Error(
        `This copy of the deck has no slides, but ${existingIds.length} slide(s) are saved in the cloud. Nothing was changed — reload the saved deck before saving again.`,
      );
    }
    return { deckUuid, briefUuid, serverUpdatedAt: await readDeckStamp(sb, deckUuid) };
  }

  {
    const rows = data.deck.slides.map((s) => ({
      id: toUuid(`slide:${userId}:${data.deck.id}:${s.id}`),
      deck_id: deckUuid,
      position: s.position,
      section_id: s.sectionId,
      variant_id: s.variantId,
      layout_id: s.layoutId,
      content: {
        ...s.content,
        __localId: s.id,
        __changes: s.changes,
        __extras: pickSlideExtras(s as unknown as Record<string, unknown>),
      },

      notes: s.notes ?? null,
    }));
    // (deck_id, position) is unique, so a reorder or a deleted slide would make
    // the upsert collide with rows still holding the old positions. Park every
    // saved row on a unique negative position first, then write the new order.
    const parked: { id: string; position: number }[] = [];
    {
      const { data: posRows } = await sb
        .from("deck_slides")
        .select("id, position")
        .eq("deck_id", deckUuid);
      const list = Array.isArray(posRows) ? (posRows as { id: string; position: number }[]) : [];
      for (let i = 0; i < list.length; i++) {
        const { error } = await sb
          .from("deck_slides")
          .update({ position: -(i + 1) })
          .eq("id", list[i].id);
        if (error) throw new Error(error.message);
        parked.push(list[i]);
      }
    }

    // Ids are deterministic, so an upsert updates in place instead of colliding.
    const { error: slideErr } = await sb.from("deck_slides").upsert(rows);
    if (slideErr) {
      // Put the saved order back so a failed save changes nothing.
      for (const r of parked) {
        await sb.from("deck_slides").update({ position: r.position }).eq("id", r.id);
      }
      throw new Error(slideErr.message);
    }

    // Only now remove slides the user actually deleted.
    const keep = new Set(rows.map((r) => r.id));
    for (const id of existingIds) {
      if (!keep.has(id)) await sb.from("deck_slides").delete().eq("id", id);
    }
  }

  return { deckUuid, briefUuid, serverUpdatedAt: await readDeckStamp(sb, deckUuid) };
}
