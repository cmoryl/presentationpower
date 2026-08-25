// Server boundary for the London signage revision workflow: read the history,
// publish a new revision, restore an older one forward.
//
// History is append-only by design — the table has no update/delete policy, so
// "restore" publishes the old snapshot as a NEW revision and the trail stays
// intact.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LondonRevision } from "@/lib/next-london-revise";

const TABLE = "london_signage_revisions";

type Row = {
  id: string;
  rev: number;
  note: string | null;
  author_id: string | null;
  panels: unknown;
  changes: unknown;
  regen: unknown;
  restored_from: number | null;
  created_at: string;
};

function toRevision(row: Row): LondonRevision {
  return {
    id: row.id,
    rev: row.rev,
    note: row.note,
    authorId: row.author_id,
    panels: (Array.isArray(row.panels) ? row.panels : []) as LondonRevision["panels"],
    changes: (Array.isArray(row.changes) ? row.changes : []) as LondonRevision["changes"],
    regen: (row.regen ?? {}) as LondonRevision["regen"],
    restoredFrom: row.restored_from,
    createdAt: row.created_at,
  };
}

/** Full revision history, newest first. */
export const listLondonRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from(TABLE)
      .select("id, rev, note, author_id, panels, changes, regen, restored_from, created_at")
      .order("rev", { ascending: false })
      .limit(200);
    if (error) throw new Error(`Could not read the revision history: ${error.message}`);
    return { revisions: (data ?? []).map((r) => toRevision(r as Row)) };
  });

const PanelSchema = z.object({
  id: z.string(),
  floor: z.string(),
  room: z.string(),
  proof: z.string(),
  page: z.number(),
  name: z.string(),
  ground: z.string(),
  style: z.string(),
  trimW: z.number(),
  trimH: z.number(),
  bleedW: z.number(),
  bleedH: z.number(),
  bleedEdge: z.number(),
  rasterPx: z.string(),
  rasterPpi: z.number(),
  bandMm: z.number(),
  rasterMb: z.number(),
});

const PublishSchema = z.object({
  note: z.string().max(500).optional(),
  panels: z.array(PanelSchema),
  changes: z.array(z.record(z.string(), z.unknown())),
  regen: z.record(z.string(), z.unknown()),
  restoredFrom: z.number().int().optional(),
});

const ALLOWED_ROLES = ["admin", "brand_lead", "brand_reviewer"] as const;

/**
 * Publish a revision. The next revision number is taken from the current head,
 * and the whole panel snapshot is stored so any revision can be rebuilt later.
 */
export const publishLondonRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PublishSchema.parse(input))
  .handler(async ({ data, context }) => {
    let allowed = false;
    for (const role of ALLOWED_ROLES) {
      const { data: has } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: role,
      });
      if (has) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      throw new Error(
        "Only admins, brand leads and brand reviewers can re-issue the London signage specification.",
      );
    }
    if (data.panels.length === 0) throw new Error("A revision must contain the full panel set.");

    const { data: head } = await context.supabase
      .from(TABLE)
      .select("rev")
      .order("rev", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRev = ((head as { rev?: number } | null)?.rev ?? 0) + 1;

    const { data: row, error } = await context.supabase
      .from(TABLE)
      .insert({
        rev: nextRev,
        note: data.note?.trim() ? data.note.trim() : null,
        author_id: context.userId,
        panels: data.panels as unknown as never,
        changes: data.changes as unknown as never,
        regen: data.regen as unknown as never,
        restored_from: data.restoredFrom ?? null,
      })
      .select("id, rev, note, author_id, panels, changes, regen, restored_from, created_at")
      .single();

    if (error) throw new Error(`Could not publish revision ${nextRev}: ${error.message}`);
    return { revision: toRevision(row as Row) };
  });
