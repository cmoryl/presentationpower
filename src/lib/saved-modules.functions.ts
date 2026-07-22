import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const savedModuleInput = z.object({
  variantId: z.string(),
  saveKind: z.enum(["populated", "template"]).default("populated"),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  content: z.record(z.string(), z.unknown()).default({}),
  brandMode: z.string().optional().nullable(),
  subCompany: z.string().optional().nullable(),
  divisionId: z.string().optional().nullable(),
  backdrop: z.record(z.string(), z.unknown()).optional().nullable(),
  role: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  thumbnailUrl: z.string().optional().nullable(),
  sourceDeckId: z.string().uuid().optional().nullable(),
  sourceSlideId: z.string().uuid().optional().nullable(),
});

export const saveModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => savedModuleInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("saved_modules")
      .insert({
        owner_id: userId,
        variant_id: data.variantId,
        save_kind: data.saveKind,
        title: data.title,
        description: data.description ?? null,
        content: data.content as never,
        brand_mode: data.brandMode ?? null,
        sub_company: data.subCompany ?? null,
        division_id: data.divisionId ?? null,
        backdrop: (data.backdrop ?? null) as never,
        role: data.role ?? null,
        tags: data.tags,
        thumbnail_url: data.thumbnailUrl ?? null,
        source_deck_id: data.sourceDeckId ?? null,
        source_slide_id: data.sourceSlideId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listMyModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_modules")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const deleteSavedModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_modules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateSavedModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: savedModuleInput.partial(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const p = data.patch;
    const dbPatch: Record<string, unknown> = {};
    if (p.title !== undefined) dbPatch.title = p.title;
    if (p.description !== undefined) dbPatch.description = p.description;
    if (p.content !== undefined) dbPatch.content = p.content;
    if (p.brandMode !== undefined) dbPatch.brand_mode = p.brandMode;
    if (p.subCompany !== undefined) dbPatch.sub_company = p.subCompany;
    if (p.divisionId !== undefined) dbPatch.division_id = p.divisionId;
    if (p.backdrop !== undefined) dbPatch.backdrop = p.backdrop;
    if (p.role !== undefined) dbPatch.role = p.role;
    if (p.tags !== undefined) dbPatch.tags = p.tags;
    if (p.thumbnailUrl !== undefined) dbPatch.thumbnail_url = p.thumbnailUrl;
    if (p.saveKind !== undefined) dbPatch.save_kind = p.saveKind;
    const { data: row, error } = await context.supabase
      .from("saved_modules")
      .update(dbPatch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });
