import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Comments ----------

const PostInput = z.object({
  deckId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  slideIndex: z.number().int().nonnegative().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const postDeckComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PostInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("deck_comments")
      .insert({
        deck_id: data.deckId,
        author_id: userId,
        body: data.body.trim(),
        slide_index: data.slideIndex ?? null,
        parent_id: data.parentId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listDeckComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("deck_comments")
      .select("id, deck_id, author_id, parent_id, slide_index, body, resolved, created_at, updated_at")
      .eq("deck_id", data.deckId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
    let profiles: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", authorIds);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }
    return { comments: rows ?? [], authors: profiles };
  });

export const updateDeckComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        body: z.string().min(1).max(4000).optional(),
        resolved: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: { body?: string; resolved?: boolean } = {};
    if (data.body !== undefined) patch.body = data.body.trim();
    if (data.resolved !== undefined) patch.resolved = data.resolved;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("deck_comments").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDeckComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("deck_comments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Review workflow ----------

const ReviewStatus = z.enum(["draft", "in_review", "approved", "changes_requested"]);

export const getDeckReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: deck, error } = await supabase
      .from("decks")
      .select("id, owner_id, review_status, reviewed_by, reviewed_at, review_note")
      .eq("id", data.deckId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deck) return { found: false as const };
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return {
      found: true as const,
      deck,
      isOwner: deck.owner_id === userId,
      isAdmin: !!adminRow,
    };
  });

export const setDeckReviewStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        deckId: z.string().uuid(),
        status: ReviewStatus,
        note: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch deck to enforce transition rules in-code (RLS also guards writes).
    const { data: deck, error: dErr } = await supabase
      .from("decks")
      .select("id, owner_id, review_status")
      .eq("id", data.deckId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!deck) throw new Error("Deck not found");

    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;
    const isOwner = deck.owner_id === userId;

    // Transition rules
    const next = data.status;
    if (next === "in_review" && !isOwner && !isAdmin) throw new Error("Only the owner or an admin can submit for review");
    if ((next === "approved" || next === "changes_requested") && !isAdmin)
      throw new Error("Only an admin can approve or request changes");
    if (next === "draft" && !isOwner && !isAdmin) throw new Error("Only the owner can move back to draft");

    const patch: {
      review_status: "draft" | "in_review" | "approved" | "changes_requested";
      review_note: string | null;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
    } = {
      review_status: next,
      review_note: data.note ?? null,
    };
    if (next === "approved" || next === "changes_requested") {
      patch.reviewed_by = userId;
      patch.reviewed_at = new Date().toISOString();
    } else if (next === "draft") {
      patch.reviewed_by = null;
      patch.reviewed_at = null;
    }

    const { error } = await supabase.from("decks").update(patch).eq("id", data.deckId);
    if (error) throw new Error(error.message);

    // If a note was included on approve/changes_requested, post it as a deck-level comment for the trail
    if (data.note && (next === "approved" || next === "changes_requested")) {
      await supabase.from("deck_comments").insert({
        deck_id: data.deckId,
        author_id: userId,
        body: `[${next === "approved" ? "Approved" : "Changes requested"}] ${data.note}`,
        slide_index: null,
      });
    }

    return { ok: true, status: next };
  });
