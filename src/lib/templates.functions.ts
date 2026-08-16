// -----------------------------------------------------------------------------
// TEMPLATE AUTHORING — server functions.
//
// Reads are public (published templates + background overrides) so present and
// share surfaces paint correctly for signed-out viewers. Every write is admin
// only: the handler verifies `has_role(auth.uid(), 'admin')` through the
// caller's own client before touching a row, and RLS enforces the same rule.
// -----------------------------------------------------------------------------

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CustomTemplate } from "./custom-templates";
import type { TemplateBackgroundOverride } from "./template-registry";

const TemplateInput = z.object({
  id: z.string().uuid().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(80),
  reference: z.string().trim().max(120).default(""),
  description: z.string().trim().max(400).default(""),
  bestFit: z.string().trim().max(200).default(""),
  mode: z.enum(["light", "dark"]),
  palette: z.array(z.string().trim().min(3).max(32)).length(5),
  typography: z.string().trim().max(120).default(""),
  surfaceNote: z.string().trim().max(120).default(""),
  imagery: z.string().trim().max(120).default(""),
  density: z.string().trim().max(24).default("Medium"),
  baseSkinCode: z.string().trim().max(8).optional().nullable(),
  spec: z.string().trim().max(200).default(""),
  status: z.enum(["draft", "published"]).default("draft"),
  notes: z.string().trim().max(2000).default(""),
});

const OverrideInput = z.object({
  skinCode: z.string().trim().min(2).max(12),
  scene: z.string().trim().min(1).max(24),
  intensity: z.number().min(0).max(2).default(1),
  tint: z.string().trim().max(32).optional().nullable(),
  tintStrength: z.number().min(0).max(1).default(0),
  sceneSwap: z.string().trim().max(24).optional().nullable(),
  imageUrl: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(400).default(""),
});

type Row = Record<string, unknown>;

function toTemplate(r: Row): CustomTemplate {
  return {
    id: String(r.id),
    code: String(r.code).toUpperCase(),
    name: String(r.name),
    reference: String(r.reference ?? ""),
    description: String(r.description ?? ""),
    bestFit: String(r.best_fit ?? ""),
    mode: r.mode === "dark" ? "dark" : "light",
    palette: (r.palette as string[]) ?? [],
    typography: String(r.typography ?? ""),
    surfaceNote: String(r.surface_note ?? ""),
    imagery: String(r.imagery ?? ""),
    density: String(r.density ?? "Medium"),
    baseSkinCode: (r.base_skin_code as string | null) ?? null,
    spec: String(r.spec ?? ""),
    status: r.status === "published" ? "published" : "draft",
    notes: String(r.notes ?? ""),
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  };
}

function toOverride(r: Row): TemplateBackgroundOverride {
  return {
    skinCode: String(r.skin_code).toUpperCase(),
    scene: String(r.scene),
    intensity: Number(r.intensity ?? 1),
    tint: (r.tint as string | null) ?? null,
    tintStrength: Number(r.tint_strength ?? 0),
    sceneSwap: (r.scene_swap as string | null) ?? null,
    imageUrl: (r.image_url as string | null) ?? null,
    note: String(r.note ?? ""),
  };
}

async function assertAdmin(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admin access required.");
}

/**
 * Public catalog read — published templates plus every background override.
 * Both tables allow anonymous reads, so the browser client is used directly
 * from `loadTemplateRegistry()`; nothing here needs a privileged key.
 */
export const PUBLIC_TEMPLATE_TABLES = {
  templates: "custom_templates",
  overrides: "template_background_overrides",
} as const;

export { toTemplate as parseTemplateRow, toOverride as parseOverrideRow };


/** Admin read — drafts included. */
export const listAllTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ templates: CustomTemplate[]; overrides: TemplateBackgroundOverride[] }> => {
      await assertAdmin(context.supabase as never, context.userId);
      const [tpl, ovr] = await Promise.all([
        context.supabase.from("custom_templates").select("*").order("code"),
        context.supabase.from("template_background_overrides").select("*").order("skin_code"),
      ]);
      if (tpl.error) throw new Error(tpl.error.message);
      return {
        templates: ((tpl.data as Row[]) ?? []).map(toTemplate),
        overrides: ((ovr.data as Row[]) ?? []).map(toOverride),
      };
    },
  );

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TemplateInput.parse(input))
  .handler(async ({ data, context }): Promise<CustomTemplate> => {
    await assertAdmin(context.supabase as never, context.userId);
    const payload = {
      code: data.code.toUpperCase(),
      name: data.name,
      reference: data.reference,
      description: data.description,
      best_fit: data.bestFit,
      mode: data.mode,
      palette: data.palette,
      typography: data.typography,
      surface_note: data.surfaceNote,
      imagery: data.imagery,
      density: data.density,
      base_skin_code: data.baseSkinCode ? data.baseSkinCode.toUpperCase() : null,
      spec: data.spec,
      status: data.status,
      notes: data.notes,
      created_by: context.userId,
    };
    const q = data.id
      ? context.supabase.from("custom_templates").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("custom_templates").insert(payload).select("*").single();
    const { data: row, error } = await q;
    if (error) {
      if (/duplicate key/i.test(error.message)) {
        throw new Error(`Template code ${payload.code} is already in use.`);
      }
      throw new Error(error.message);
    }
    return toTemplate(row as Row);
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("custom_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveBackgroundOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OverrideInput.parse(input))
  .handler(async ({ data, context }): Promise<TemplateBackgroundOverride> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data: row, error } = await context.supabase
      .from("template_background_overrides")
      .upsert(
        {
          skin_code: data.skinCode.toUpperCase(),
          scene: data.scene,
          intensity: data.intensity,
          tint: data.tint || null,
          tint_strength: data.tintStrength,
          scene_swap: data.sceneSwap || null,
          image_url: data.imageUrl || null,
          note: data.note,
          created_by: context.userId,
        },
        { onConflict: "skin_code,scene" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toOverride(row as Row);
  });

export const deleteBackgroundOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ skinCode: z.string().min(2), scene: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("template_background_overrides")
      .delete()
      .eq("skin_code", data.skinCode.toUpperCase())
      .eq("scene", data.scene);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
