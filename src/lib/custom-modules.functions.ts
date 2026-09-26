import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Writes are gated by RLS (admins only); reads return published modules for
// everyone signed in and drafts as well for admins.

const moduleInput = z.object({
  moduleKey: z.string().min(3),
  name: z.string().min(3),
  description: z.string().default(""),
  baseVariantId: z.string().min(1),
  familyId: z.string().default("MF-08"),
  sectionId: z.string().optional().nullable(),
  brandMode: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  content: z.record(z.string(), z.unknown()).default({}),
  canvasBlocks: z.array(z.record(z.string(), z.unknown())).default([]),
  notes: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const listCustomModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("custom_modules")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listPublishedCustomModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("custom_modules")
      .select("*")
      .eq("status", "published")
      .eq("review_status", "approved")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createCustomModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => moduleInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("custom_modules")
      .insert({
        module_key: data.moduleKey,
        name: data.name,
        description: data.description,
        base_variant_id: data.baseVariantId,
        family_id: data.familyId,
        section_id: data.sectionId ?? null,
        brand_mode: data.brandMode ?? null,
        tags: data.tags,
        content: data.content as never,
        canvas_blocks: data.canvasBlocks as never,
        notes: data.notes ?? null,
        thumbnail_url: data.thumbnailUrl ?? null,
        status: data.status,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateCustomModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid(), patch: moduleInput.partial() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const p = data.patch;
    const db: Record<string, unknown> = {};
    if (p.moduleKey !== undefined) db.module_key = p.moduleKey;
    if (p.name !== undefined) db.name = p.name;
    if (p.description !== undefined) db.description = p.description;
    if (p.baseVariantId !== undefined) db.base_variant_id = p.baseVariantId;
    if (p.familyId !== undefined) db.family_id = p.familyId;
    if (p.sectionId !== undefined) db.section_id = p.sectionId;
    if (p.brandMode !== undefined) db.brand_mode = p.brandMode;
    if (p.tags !== undefined) db.tags = p.tags;
    if (p.content !== undefined) db.content = p.content;
    if (p.canvasBlocks !== undefined) db.canvas_blocks = p.canvasBlocks;
    if (p.notes !== undefined) db.notes = p.notes;
    if (p.thumbnailUrl !== undefined) db.thumbnail_url = p.thumbnailUrl;
    if (p.status !== undefined) db.status = p.status;
    // Any saved edit takes the module back to draft: the approved version was
    // the one a reviewer saw, so a changed module has to be reviewed again.
    if (p.status === "draft") {
      db.review_status = "draft";
      db.reviewer_id = null;
      db.reviewed_at = null;
    }
    const { data: row, error } = await context.supabase
      .from("custom_modules")
      .update(db as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteCustomModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("custom_modules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ── Module review ─────────────────────────────────────────────────────────
// draft → pending (submitted) → approved (published) | changes_requested.
// Admins and brand reviewers decide; nobody decides their own module except an
// admin using the logged "publish now" override. The database trigger
// `guard_custom_module_review` enforces the role rule and "approved before
// published" independently of this code.

async function reviewerFlags(ctx: { supabase: unknown; userId: string }) {
  const s = ctx.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const [admin, reviewer] = await Promise.all([
    s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    s.rpc("has_role", { _user_id: ctx.userId, _role: "brand_reviewer" }),
  ]);
  return { isAdmin: !!admin.data, isReviewer: !!admin.data || !!reviewer.data };
}

async function auditModule(actor: string, action: string, id: string, meta: Record<string, unknown> = {}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actor,
      action,
      target_type: "custom_module",
      target_id: id,
      meta: meta as never,
    });
  } catch {
    // Audit failure never blocks the review action itself.
  }
}

export const submitModuleForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error: readErr } = await context.supabase
      .from("custom_modules")
      .select("id, review_status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!row) throw new Error("Module not found");
    if (row.review_status === "pending") throw new Error("This module is already waiting for review.");
    if (row.review_status === "approved") {
      throw new Error("This module is already approved. Save a change to send a new version.");
    }
    const { error } = await context.supabase
      .from("custom_modules")
      .update({ review_status: "pending", submitted_at: new Date().toISOString(), status: "draft" })
      .eq("id", data.id);
    if (error) throw error;
    await auditModule(context.userId, "module.submit", data.id);
    return { ok: true };
  });

export const listModuleReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isReviewer } = await reviewerFlags(context);
    if (!isReviewer) throw new Error("Forbidden: requires admin or brand_reviewer");
    const { data, error } = await context.supabase
      .from("custom_modules")
      .select(
        "id, name, module_key, description, base_variant_id, brand_mode, tags, review_status, status, submitted_at, reviewed_at, reviewer_id, review_notes, created_by, updated_at, thumbnail_url",
      )
      .in("review_status", ["pending", "changes_requested", "approved"])
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .limit(300);
    if (error) throw error;
    const rows = data ?? [];
    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.created_by, r.reviewer_id].filter(Boolean) as string[])),
    );
    let people: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase.rpc("display_names", { _ids: ids });
      people = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }
    return { rows, people, me: context.userId };
  });

export const decideModuleReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "changes_requested"]),
        notes: z.string().max(2000).optional(),
        /** Admin-only: publish without a second reviewer. Logged. */
        override: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, isReviewer } = await reviewerFlags(context);
    if (!isReviewer) throw new Error("Only admins and brand reviewers can decide a module review.");
    const { data: row, error: readErr } = await context.supabase
      .from("custom_modules")
      .select("id, created_by, review_status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!row) throw new Error("Module not found");

    const override = !!data.override;
    if (override && (!isAdmin || data.decision !== "approved")) {
      throw new Error("Only an admin can publish without review.");
    }
    if (!override) {
      if (row.created_by === context.userId) {
        throw new Error("You cannot review your own module. Ask another reviewer.");
      }
      if (row.review_status !== "pending") {
        throw new Error("This module is not waiting for review.");
      }
    }
    if (data.decision === "changes_requested" && !data.notes?.trim()) {
      throw new Error("Add a note so the author knows what to change.");
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("custom_modules")
      .update({
        review_status: data.decision,
        status: data.decision === "approved" ? "published" : "draft",
        reviewer_id: context.userId,
        reviewed_at: now,
        review_notes: data.notes?.trim() || (override ? "Published by an admin without review" : null),
        ...(override && !row.review_status.match(/pending/) ? { submitted_at: now } : {}),
      })
      .eq("id", data.id);
    if (error) throw error;
    await auditModule(
      context.userId,
      override ? "module.publish_override" : `module.${data.decision}`,
      data.id,
      { notes: data.notes ?? null },
    );
    return { ok: true };
  });
