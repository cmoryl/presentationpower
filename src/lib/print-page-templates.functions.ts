// PRINT PAGE TEMPLATES
// ---------------------------------------------------------------------------
// A "page template" is a named, reusable capture of a print piece: its section
// stack (`content.modules[]`) plus the layout / typography snapshot it was
// authored under. Personal captures are `private`; master admins can publish a
// capture as `shared` so it appears alongside the curated `pm-*` modules in
// /library/print/modules.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ScopeEnum = z.enum(["private", "shared"]);

const SaveInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  scope: ScopeEnum.default("private"),
  kind: z.string().min(1).default("case-study"),
  divisionId: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  sections: z.array(z.record(z.string(), z.unknown())).default([]),
  layout: z.record(z.string(), z.unknown()).default({}),
  thumbnailUrl: z.string().optional().nullable(),
  sourceAssetId: z.string().uuid().optional().nullable(),
  sourceLibraryItemId: z.string().optional().nullable(),
});

export const savePrintPageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.scope === "shared") {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Only admins can publish shared page templates.");
    }
    const { data: row, error } = await supabase
      .from("print_page_templates")
      .insert({
        owner_id: userId,
        title: data.title,
        description: data.description ?? null,
        scope: data.scope,
        kind: data.kind,
        division_id: data.divisionId ?? null,
        tags: data.tags,
        sections: data.sections as never,
        layout: data.layout as never,
        thumbnail_url: data.thumbnailUrl ?? null,
        source_asset_id: data.sourceAssetId ?? null,
        source_library_item_id: data.sourceLibraryItemId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPrintPageTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("print_page_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    scope: ScopeEnum.optional(),
    kind: z.string().optional(),
    divisionId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    sections: z.array(z.record(z.string(), z.unknown())).optional(),
    layout: z.record(z.string(), z.unknown()).optional(),
    thumbnailUrl: z.string().nullable().optional(),
    hidden: z.boolean().optional(),
  }),
});

export const updatePrintPageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => UpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const p = data.patch;
    if (p.scope === "shared") {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Only admins can publish shared page templates.");
    }
    const db: Record<string, unknown> = {};
    if (p.title !== undefined) db.title = p.title;
    if (p.description !== undefined) db.description = p.description;
    if (p.scope !== undefined) db.scope = p.scope;
    if (p.kind !== undefined) db.kind = p.kind;
    if (p.divisionId !== undefined) db.division_id = p.divisionId;
    if (p.tags !== undefined) db.tags = p.tags;
    if (p.sections !== undefined) db.sections = p.sections;
    if (p.layout !== undefined) db.layout = p.layout;
    if (p.thumbnailUrl !== undefined) db.thumbnail_url = p.thumbnailUrl;
    if (p.hidden !== undefined) db.hidden = p.hidden;
    const { data: row, error } = await supabase
      .from("print_page_templates")
      .update(db as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePrintPageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("print_page_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** True when the caller may publish / manage shared page templates. */
export const canPublishPageTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: Boolean(data) };
  });
