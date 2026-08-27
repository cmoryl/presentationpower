import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canEditNextDivision } from "./next-permissions.functions";


// Saved NEXT division agenda files. Each row is a live, re-editable agenda that
// can be re-opened and re-exported for print at any time. RLS scopes every row
// to its owner.

const sessionSchema = z.object({
  time: z.string().default(""),
  title: z.string().default(""),
  detail: z.string().default(""),
  track: z.string().default(""),
  muted: z.boolean().default(false),
});

const configSchema = z
  .object({
    divisionId: z.string(),
    face: z.enum(["dark", "light"]).default("dark"),
    styleId: z.string(),
    sizeId: z.enum(["a4", "a3", "a2", "a1", "custom"]).default("a2"),
    trimW: z.number(),
    trimH: z.number(),
    showLockup: z.boolean().default(true),
    lockupScale: z.number().default(1),
    eyebrow: z.string().default("AGENDA"),
    title: z.string().default(""),
    meta: z.string().default(""),
    titleColor: z.string().default(""),
    sessions: z.array(sessionSchema).max(60).default([]),
    days: z
      .array(
        z.object({
          label: z.string().default(""),
          meta: z.string().default(""),
          sessions: z.array(sessionSchema).max(60).default([]),
        }),
      )
      .max(14)
      .optional(),
    rowsPerPage: z.number().min(0).max(40).optional(),

    footnote: z.string().default(""),
    qrData: z.string().default(""),
    qrSize: z.number().default(48),
    qrCaption: z.string().default(""),
    eventLabel: z.string().default(""),
  })
  .passthrough();

const versionInput = z.object({
  name: z.string().min(2).max(160),
  eventLabel: z.string().max(160).default(""),
  divisionId: z.string().max(60).default(""),
  notes: z.string().max(2000).default(""),
  config: configSchema,
});

export const listAgendaFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("next_agenda_versions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveAgendaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => versionInput.parse(data))
  .handler(async ({ data, context }) => {
    const allowed = await canEditNextDivision(context.userId, data.divisionId, context.supabase as never);
    if (!allowed) throw new Error("You are not authorized to edit agendas for this division");
    const { data: row, error } = await context.supabase
      .from("next_agenda_versions")
      .insert({
        name: data.name,
        event_label: data.eventLabel,
        division_id: data.divisionId,
        notes: data.notes,
        config: data.config as never,
        user_id: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateAgendaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    versionInput.partial().extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: findError } = await context.supabase
      .from("next_agenda_versions")
      .select("user_id, division_id")
      .eq("id", data.id)
      .single();
    if (findError) throw findError;
    const isOwner = existing.user_id === context.userId;
    const divisionId = data.divisionId ?? existing.division_id;
    const allowed =
      isOwner || (await canEditNextDivision(context.userId, divisionId, context.supabase as never));
    if (!allowed) throw new Error("You are not authorized to edit agendas for this division");
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.eventLabel !== undefined) patch.event_label = data.eventLabel;
    if (data.divisionId !== undefined) patch.division_id = data.divisionId;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.config !== undefined) patch.config = data.config;
    const { data: row, error } = await context.supabase
      .from("next_agenda_versions")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAgendaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: existing, error: findError } = await context.supabase
      .from("next_agenda_versions")
      .select("user_id, division_id")
      .eq("id", data.id)
      .single();
    if (findError) throw findError;
    const isOwner = existing.user_id === context.userId;
    const allowed =
      isOwner || (await canEditNextDivision(context.userId, existing.division_id, context.supabase as never));
    if (!allowed) throw new Error("You are not authorized to delete this agenda file");
    const { error } = await context.supabase.from("next_agenda_versions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
