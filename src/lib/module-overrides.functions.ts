// Master-admin overrides for library modules.
//
// Scope "print" targets `PRINT_SECTION_MODULES` ids (pm-*); scope "deck"
// targets presentation module variant ids (MV-*). Reads are open to any
// signed-in user so the libraries render admin edits; writes are gated by RLS
// (admins only).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.enum(["print", "deck", "library"]);

const patchSchema = z.object({
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  density: z.string().nullable().optional(),
  bestFor: z.array(z.string()).nullable().optional(),
  hidden: z.boolean().optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  // Library-scope only: master edits to a curated print item's metadata and
  // look & feel.
  blurb: z.string().nullable().optional(),
  collection: z.string().nullable().optional(),
  heroUrl: z.string().nullable().optional(),
  look: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const listModuleOverrides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("module_overrides")
      .select("*")
      .order("module_id", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const saveModuleOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ scope, moduleId: z.string().min(2), patch: patchSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const p = data.patch;
    const row: Record<string, unknown> = {
      scope: data.scope,
      module_id: data.moduleId,
      updated_by: context.userId,
    };
    if (p.label !== undefined) row.label = p.label;
    if (p.description !== undefined) row.description = p.description;
    if (p.tags !== undefined) row.tags = p.tags;
    if (p.density !== undefined) row.density = p.density;
    if (p.bestFor !== undefined) row.best_for = p.bestFor;
    if (p.hidden !== undefined) row.hidden = p.hidden;
    if (p.content !== undefined) row.content = p.content;
    if (p.notes !== undefined) row.notes = p.notes;
    if (p.blurb !== undefined) row.blurb = p.blurb;
    if (p.collection !== undefined) row.collection = p.collection;
    if (p.heroUrl !== undefined) row.hero_url = p.heroUrl;
    if (p.look !== undefined) row.look = p.look;

    const { data: saved, error } = await context.supabase
      .from("module_overrides")
      .upsert(row as never, { onConflict: "scope,module_id" })
      .select("*")
      .single();
    if (error) throw error;
    return saved;
  });

export const deleteModuleOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ scope, moduleId: z.string().min(2) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("module_overrides")
      .delete()
      .eq("scope", data.scope)
      .eq("module_id", data.moduleId);
    if (error) throw error;
    return { ok: true };
  });
