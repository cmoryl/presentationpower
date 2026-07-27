import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const surfaceKind = z.enum(["deck", "brochure", "onepager", "social", "email"]);

const upsertSurfaceInput = z.object({
  id: z.string().uuid().optional(),
  kind: surfaceKind,
  format: z.string(),
  title: z.string().min(1),
  brandModeId: z.string().optional().nullable(),
  archetypeId: z.string().optional().nullable(),
  subCompany: z.string().optional().nullable(),
  context: z.record(z.string(), z.unknown()).default({}),
  modules: z.array(z.record(z.string(), z.unknown())).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
  isTemplate: z.boolean().default(false),
  thumbnailUrl: z.string().optional().nullable(),
  sourceDeckId: z.string().uuid().optional().nullable(),
});

export const upsertSurface = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertSurfaceInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      owner_id: userId,
      kind: data.kind,
      format: data.format,
      title: data.title,
      brand_mode_id: data.brandModeId ?? null,
      archetype_id: data.archetypeId ?? null,
      sub_company: data.subCompany ?? null,
      context: data.context as never,
      modules: data.modules as never,
      meta: data.meta as never,
      is_template: data.isTemplate,
      thumbnail_url: data.thumbnailUrl ?? null,
      source_deck_id: data.sourceDeckId ?? null,
    };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("surfaces")
        .update(payload as never)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const { data: row, error } = await supabase
      .from("surfaces")
      .insert(payload as never)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listSurfaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("surfaces")
      .select(
        "id, kind, format, title, brand_mode_id, sub_company, is_template, thumbnail_url, updated_at, created_at",
      )
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getSurface = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("surfaces")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSurface = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("surfaces").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const snapshotSurface = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        surfaceId: z.string().uuid(),
        label: z.string().optional(),
        snapshot: z.record(z.string(), z.unknown()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("surface_versions")
      .insert({
        surface_id: data.surfaceId,
        owner_id: context.userId,
        label: data.label ?? null,
        snapshot: data.snapshot as never,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });
