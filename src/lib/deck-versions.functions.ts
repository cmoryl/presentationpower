import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deckCloudId } from "@/lib/deck-uuid";

// Snapshot a deck. Accepts either the local deck id (nanoid) or a cloud UUID.
// Reads current persisted deck + slides + brief and inserts a version row.
// Retention: keep last 50 total per deck; also keep everything from last 7 days.

const RETENTION_MAX = 50;

async function resolveDeckUuid(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  deckIdInput: string,
): Promise<string | null> {
  // If it already looks like a uuid and the row exists, use it.
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    deckIdInput,
  );
  if (uuidLike) {
    const { data } = await supabase.from("decks").select("id").eq("id", deckIdInput).maybeSingle();
    if (data) return data.id;
  }
  // Try cloud-<uuid> form used when loading remote decks locally.
  if (deckIdInput.startsWith("cloud-")) {
    const rest = deckIdInput.slice("cloud-".length);
    const { data } = await supabase.from("decks").select("id").eq("id", rest).maybeSingle();
    if (data) return data.id;
  }
  // Derive deterministic uuid from local id (matches saveDeckToCloud mapping).
  const derived = deckCloudId(userId, deckIdInput);
  const { data } = await supabase.from("decks").select("id").eq("id", derived).maybeSingle();
  return data?.id ?? null;
}

async function pruneVersions(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  deckUuid: string,
) {
  // Keep everything from the last 7 days OR last RETENTION_MAX rows, whichever
  // is larger. Delete the rest.
  const { data: rows } = await supabase
    .from("deck_versions")
    .select("id, created_at")
    .eq("deck_id", deckUuid)
    .order("created_at", { ascending: false });
  if (!rows) return;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const keep = new Set<string>();
  rows.forEach((r, i) => {
    const ts = r.created_at ? new Date(r.created_at as string).getTime() : 0;
    if (i < RETENTION_MAX || ts >= sevenDaysAgo) keep.add(r.id as string);
  });
  const drop = rows.filter((r) => !keep.has(r.id as string)).map((r) => r.id as string);
  if (drop.length > 0) {
    await supabase.from("deck_versions").delete().in("id", drop);
  }
}

export const snapshotDeckVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        deckId: z.string(),
        changeSummary: z.string().max(280).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const deckUuid = await resolveDeckUuid(supabase, userId, data.deckId);
    if (!deckUuid) return { ok: false as const, skipped: true as const, reason: "not-in-cloud" };

    const { data: deck, error: deckErr } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckUuid)
      .maybeSingle();
    if (deckErr || !deck) throw new Error(deckErr?.message ?? "Deck not found");

    const { data: slides, error: slidesErr } = await supabase
      .from("deck_slides")
      .select("*")
      .eq("deck_id", deckUuid)
      .order("position", { ascending: true });
    if (slidesErr) throw new Error(slidesErr.message);

    const { data: brief } = deck.brief_id
      ? await supabase.from("briefs").select("*").eq("id", deck.brief_id).maybeSingle()
      : { data: null };

    // Compute next version number.
    const { data: last } = await supabase
      .from("deck_versions")
      .select("version_number")
      .eq("deck_id", deckUuid)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNum = (last?.version_number ?? 0) + 1;

    const snapshot = {
      deck,
      slides: slides ?? [],
      brief,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("deck_versions")
      .insert({
        deck_id: deckUuid,
        version_number: nextNum,
        snapshot: snapshot as never,
        change_summary: data.changeSummary ?? null,
        created_by: userId,
      })
      .select("id, version_number, created_at")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Fire-and-forget prune (awaited but tolerant to errors).
    try {
      await pruneVersions(supabase, deckUuid);
    } catch {
      // non-fatal
    }

    return { ok: true, versionId: inserted.id, versionNumber: inserted.version_number };
  });

export const listDeckVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const deckUuid = await resolveDeckUuid(supabase, userId, data.deckId);
    if (!deckUuid)
      return [] as Array<{
        id: string;
        version_number: number;
        change_summary: string | null;
        created_at: string;
        created_by: string | null;
      }>;
    const { data: rows, error } = await supabase
      .from("deck_versions")
      .select("id, version_number, change_summary, created_at, created_by")
      .eq("deck_id", deckUuid)
      .order("version_number", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getDeckVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ versionId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("deck_versions")
      .select("*")
      .eq("id", data.versionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Version not found");
    return row;
  });

export const restoreDeckVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ versionId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: version, error } = await supabase
      .from("deck_versions")
      .select("*")
      .eq("id", data.versionId)
      .maybeSingle();
    if (error || !version) throw new Error(error?.message ?? "Version not found");

    const snapshot = version.snapshot as {
      deck: {
        id: string;
        title: string;
        brand_mode_id: string;
        archetype_id: string | null;
        context: unknown;
      };
      slides: Array<{
        position: number;
        section_id: string;
        variant_id: string;
        layout_id: string;
        content: Record<string, unknown> | null;
        notes: string | null;
      }>;
    };
    const deckUuid = version.deck_id as string;

    // First, snapshot the current state as a "pre-restore" checkpoint so the
    // restore is itself undoable.
    const { data: lastCurrent } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckUuid)
      .maybeSingle();
    const { data: currentSlides } = await supabase
      .from("deck_slides")
      .select("*")
      .eq("deck_id", deckUuid)
      .order("position", { ascending: true });
    const { data: lastNum } = await supabase
      .from("deck_versions")
      .select("version_number")
      .eq("deck_id", deckUuid)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const preNum = (lastNum?.version_number ?? 0) + 1;
    await supabase.from("deck_versions").insert({
      deck_id: deckUuid,
      version_number: preNum,
      snapshot: { deck: lastCurrent, slides: currentSlides ?? [], brief: null } as never,
      change_summary: `Auto-checkpoint before restoring v${version.version_number}`,
      created_by: userId,
    });

    // Update deck fields the snapshot carries.
    await supabase
      .from("decks")
      .update({
        title: snapshot.deck.title,
        brand_mode_id: snapshot.deck.brand_mode_id,
        archetype_id: snapshot.deck.archetype_id,
        context: (snapshot.deck.context ?? null) as never,
      })
      .eq("id", deckUuid);

    // Replace slides.
    await supabase.from("deck_slides").delete().eq("deck_id", deckUuid);
    if (snapshot.slides.length > 0) {
      const rows = snapshot.slides.map((s) => ({
        deck_id: deckUuid,
        position: s.position,
        section_id: s.section_id,
        variant_id: s.variant_id,
        layout_id: s.layout_id,
        content: (s.content ?? {}) as never,
        notes: s.notes ?? null,
      }));
      const { error: sErr } = await supabase.from("deck_slides").insert(rows);
      if (sErr) throw new Error(sErr.message);
    }

    // Post-restore version entry.
    const { data: nextNum } = await supabase
      .from("deck_versions")
      .select("version_number")
      .eq("deck_id", deckUuid)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase.from("deck_versions").insert({
      deck_id: deckUuid,
      version_number: (nextNum?.version_number ?? 0) + 1,
      snapshot: snapshot as never,
      change_summary: `Restored from v${version.version_number}`,
      created_by: userId,
    });

    return { ok: true, deckUuid };
  });
