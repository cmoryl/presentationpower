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
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const createCustomModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moduleInput.parse(data))
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
  .inputValidator((data: unknown) =>
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
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("custom_modules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
