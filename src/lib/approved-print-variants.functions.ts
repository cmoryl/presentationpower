// Admin-curated approved print variants: publishes a snapshot of any
// `print_assets` row into a division-scoped shelf that authenticated users
// can view, download, and duplicate back into their own drafts.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PrintAssetKind } from "./print-assets.types";

const KindEnum = z.enum(["case-study", "spotlight", "ebrochure", "adaptor-brief"]);
const StatusEnum = z.enum(["draft", "published", "archived"]);

export type ApprovedPrintVariant = {
  id: string;
  template_kind: PrintAssetKind;
  division_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content: any;
  context: any;
  source_asset_id: string | null;
  status: "draft" | "published" | "archived";
  order_index: number;
  download_count: number;
  duplicate_count: number;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// ============== LIST (all — admin & user) ===================================
// Users only see `published`. Admins can pass `includeAll: true` to see everything.
const ListInput = z.object({
  templateKind: KindEnum.optional(),
  divisionId: z.string().optional(),
  includeAll: z.boolean().optional(),
});

export const listApprovedPrintVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("approved_print_variants")
      .select("*")
      .order("order_index")
      .order("published_at", { ascending: false });
    if (data.templateKind) q = q.eq("template_kind", data.templateKind);
    if (data.divisionId) q = q.eq("division_id", data.divisionId);
    if (!data.includeAll) q = q.eq("status", "published");
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as ApprovedPrintVariant[];
  });

// ============== CREATE (admin) ==============================================
const CreateInput = z.object({
  templateKind: KindEnum,
  divisionId: z.string().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  thumbnailUrl: z.string().url().optional(),
  content: z.any(),
  context: z.any().optional(),
  sourceAssetId: z.string().uuid().nullable().optional(),
  status: StatusEnum.optional(),
});

export const createApprovedPrintVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => CreateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const now = new Date().toISOString();
    const status = data.status ?? "published";
    const { data: row, error } = await supabase
      .from("approved_print_variants")
      .insert({
        template_kind: data.templateKind,
        division_id: data.divisionId ?? null,
        title: data.title,
        description: data.description ?? null,
        thumbnail_url: data.thumbnailUrl ?? null,
        content: data.content as never,
        context: (data.context ?? {}) as never,
        source_asset_id: data.sourceAssetId ?? null,
        status,
        published_by: userId,
        published_at: status === "published" ? now : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as ApprovedPrintVariant;
  });

// ============== PUBLISH FROM ASSET =========================================
// Snapshots content + context from an existing print_asset into the shelf.
const PublishFromAssetInput = z.object({
  assetId: z.string().uuid(),
  divisionId: z.string().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const publishAssetToLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => PublishFromAssetInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { data: asset, error: aErr } = await supabase
      .from("print_assets")
      .select("id, kind, title, brand_mode_id, content, context")
      .eq("id", data.assetId)
      .single();
    if (aErr || !asset) throw aErr ?? new Error("Asset not found");

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("approved_print_variants")
      .insert({
        template_kind: asset.kind,
        division_id: data.divisionId ?? asset.brand_mode_id ?? null,
        title: data.title ?? asset.title,
        description: data.description ?? null,
        thumbnail_url: data.thumbnailUrl ?? null,
        content: asset.content as never,
        context: asset.context as never,
        source_asset_id: asset.id,
        status: "published",
        published_by: userId,
        published_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as ApprovedPrintVariant;
  });

// ============== UPDATE (admin) ==============================================
const UpdateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    thumbnailUrl: z.string().url().nullable().optional(),
    divisionId: z.string().nullable().optional(),
    status: StatusEnum.optional(),
    orderIndex: z.number().int().optional(),
  }),
});

export const updateApprovedPrintVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => UpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const patch: any = {};
    if (data.patch.title !== undefined) patch.title = data.patch.title;
    if (data.patch.description !== undefined) patch.description = data.patch.description;
    if (data.patch.thumbnailUrl !== undefined) patch.thumbnail_url = data.patch.thumbnailUrl;
    if (data.patch.divisionId !== undefined) patch.division_id = data.patch.divisionId;
    if (data.patch.orderIndex !== undefined) patch.order_index = data.patch.orderIndex;
    if (data.patch.status !== undefined) {
      patch.status = data.patch.status;
      if (data.patch.status === "published") patch.published_at = new Date().toISOString();
    }
    const { data: row, error } = await supabase
      .from("approved_print_variants")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row as ApprovedPrintVariant;
  });

// ============== DELETE (admin) ==============================================
const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteApprovedPrintVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => DeleteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { error } = await supabase.from("approved_print_variants").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============== DUPLICATE INTO USER DRAFTS ==================================
// Clones an approved variant into the caller's private print_assets table so
// they can edit their own copy.
const DuplicateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
});
export const duplicateApprovedPrintVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => DuplicateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v, error: vErr } = await supabase
      .from("approved_print_variants")
      .select("*")
      .eq("id", data.id)
      .eq("status", "published")
      .single();
    if (vErr || !v) throw vErr ?? new Error("Variant not available");

    const { data: row, error } = await supabase
      .from("print_assets")
      .insert({
        owner_id: userId,
        kind: v.template_kind,
        title: data.title ?? `${v.title} · copy`,
        brand_mode_id: v.division_id,
        content: v.content as never,
        context: v.context as never,
      })
      .select("*")
      .single();
    if (error) throw error;

    // fire-and-forget analytic bump
    await supabase
      .from("approved_print_variants")
      .update({ duplicate_count: (v.duplicate_count ?? 0) + 1 })
      .eq("id", v.id);
    return row;
  });

// ============== ANALYTICS: record download ==================================
const RecordDownloadInput = z.object({ id: z.string().uuid() });
export const recordApprovedVariantDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => RecordDownloadInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: v } = await supabase
      .from("approved_print_variants")
      .select("download_count")
      .eq("id", data.id)
      .single();
    if (!v) return { ok: true };
    await supabase
      .from("approved_print_variants")
      .update({ download_count: (v.download_count ?? 0) + 1 })
      .eq("id", data.id);
    return { ok: true };
  });

// ============== SUGGESTIONS =================================================
export type PrintVariantSuggestion = {
  id: string;
  asset_id: string;
  suggested_by: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

const SuggestInput = z.object({
  assetId: z.string().uuid(),
  note: z.string().max(1000).optional(),
});
export const suggestPrintVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SuggestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("approved_print_suggestions")
      .insert({ asset_id: data.assetId, suggested_by: userId, note: data.note ?? null })
      .select("*")
      .single();
    if (error) throw error;
    return row as PrintVariantSuggestion;
  });

export const listPrintVariantSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("approved_print_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as PrintVariantSuggestion[];
  });

const ReviewInput = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) });
export const reviewPrintVariantSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ReviewInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { data: row, error } = await supabase
      .from("approved_print_suggestions")
      .update({ status: data.status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row as PrintVariantSuggestion;
  });
