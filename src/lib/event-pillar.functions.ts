import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canEditNextDivision } from "./next-permissions.functions";


// Saved event pillar sign files. Each row is a live, re-editable pillar setup
// that can be re-opened and re-exported for print at any time. RLS scopes
// every row to its owner.

const configSchema = z
  .object({
    kind: z.string(),
    divisionId: z.string(),
    styleId: z.string(),
    headline: z.string().default(""),
    arrow: z.enum(["right", "left", "up", "down"]).default("right"),
    showLockup: z.boolean().default(true),
    face: z.enum(["dark", "light"]).default("dark"),
    verticalHeadline: z.boolean().default(true),
    headlineSize: z.number(),
    headlineColor: z.string().default(""),
    lockupScale: z.number().default(1),
    headlineOffset: z.number().default(0),
    sizeId: z.enum(["thin", "slim", "standard", "wide", "wrap", "custom"]).default("standard"),
    trimW: z.number(),
    trimH: z.number(),
    subheadline: z.string().default(""),
    subheadlineSize: z.number().default(34),
    qrData: z.string().default(""),
    qrSize: z.number().default(180),
    qrCaption: z.string().default(""),
    qrCaptionFont: z.enum(["bold-caps", "bold", "regular"]).default("bold-caps"),
    qrCaptionSize: z.number().default(0),
    qrCaptionAlign: z.enum(["left", "center", "right"]).default("center"),
    qrCaptionPad: z.number().default(14),
    qrTransparent: z.boolean().default(false),
    eventLabel: z.string().default(""),
  })
  .passthrough();

const versionInput = z.object({
  name: z.string().min(2).max(160),
  eventLabel: z.string().max(160).default(""),
  scope: z.string().max(60).default("events"),
  notes: z.string().max(2000).default(""),
  config: configSchema,
});

export const listPillarFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("event_pillar_versions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const savePillarFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => versionInput.parse(data))
  .handler(async ({ data, context }) => {
    const divisionId = data.config.divisionId;
    const allowed = await canEditNextDivision(context.userId, divisionId, context.supabase as never);
    if (!allowed) throw new Error("You are not authorized to edit pillars for this division");
    const { data: row, error } = await context.supabase
      .from("event_pillar_versions")
      .insert({
        name: data.name,
        event_label: data.eventLabel,
        scope: data.scope,
        notes: data.notes,
        config: data.config as never,
        division_id: divisionId,
        user_id: context.userId,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updatePillarFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    versionInput.partial().extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: findError } = await context.supabase
      .from("event_pillar_versions")
      .select("user_id, division_id, config")
      .eq("id", data.id)
      .single();
    if (findError) throw findError;
    const isOwner = existing.user_id === context.userId;
    const existingConfig = (existing.config ?? {}) as { divisionId?: string };
    const divisionId = data.config?.divisionId ?? existingConfig.divisionId ?? existing.division_id;
    const allowed =
      isOwner || (await canEditNextDivision(context.userId, divisionId, context.supabase as never));
    if (!allowed) throw new Error("You are not authorized to edit pillars for this division");
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.eventLabel !== undefined) patch.event_label = data.eventLabel;
    if (data.scope !== undefined) patch.scope = data.scope;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.config !== undefined) {
      patch.config = data.config;
      patch.division_id = data.config.divisionId;
    }
    const { data: row, error } = await context.supabase
      .from("event_pillar_versions")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deletePillarFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing, error: findError } = await context.supabase
      .from("event_pillar_versions")
      .select("user_id, division_id")
      .eq("id", data.id)
      .single();
    if (findError) throw findError;
    const isOwner = existing.user_id === context.userId;
    const allowed =
      isOwner || (await canEditNextDivision(context.userId, existing.division_id, context.supabase as never));
    if (!allowed) throw new Error("You are not authorized to delete this pillar file");
    const { error } = await context.supabase
      .from("event_pillar_versions")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
