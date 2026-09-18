import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Saved delegate guides, one row per event location. Every save also writes a
// numbered snapshot, so a guide can be rolled back to any earlier state.
// Rows are readable by every signed-in colleague; only the owner or an admin
// can change or remove one.

const configSchema = z
  .object({
    sizeId: z.string().max(40),
    location: z.record(z.string(), z.unknown()),
    blocks: z.array(z.record(z.string(), z.unknown())).max(60),
  })
  .passthrough();

const guideInput = z.object({
  name: z.string().min(2).max(160),
  eventId: z.string().max(60).default("next"),
  city: z.string().max(60).default(""),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().max(2000).default(""),
  config: configSchema,
});

export const listEventGuides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("event_guides")
      .select("*")
      .order("year", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveEventGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => guideInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_guides")
      .insert({
        name: data.name,
        event_id: data.eventId,
        city: data.city,
        year: data.year,
        size_id: data.config.sizeId,
        notes: data.notes,
        config: data.config as never,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    await context.supabase.from("event_guide_versions").insert({
      guide_id: row.id,
      rev: 1,
      note: "First save",
      config: data.config as never,
      created_by: context.userId,
    });
    return row;
  });

export const updateEventGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    guideInput
      .partial()
      .extend({ id: z.string().uuid(), versionNote: z.string().max(300).optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.eventId !== undefined) patch.event_id = data.eventId;
    if (data.city !== undefined) patch.city = data.city;
    if (data.year !== undefined) patch.year = data.year;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.config !== undefined) {
      patch.config = data.config;
      patch.size_id = data.config.sizeId;
    }
    // RLS decides whether this caller owns the row; an empty result means the
    // update was refused rather than silently applied.
    const { data: rows, error } = await context.supabase
      .from("event_guides")
      .update(patch as never)
      .eq("id", data.id)
      .select("*");
    if (error) throw error;
    if (!rows?.length) throw new Error("You are not allowed to change this saved guide");

    if (data.config !== undefined) {
      const { data: last } = await context.supabase
        .from("event_guide_versions")
        .select("rev")
        .eq("guide_id", data.id)
        .order("rev", { ascending: false })
        .limit(1);
      const rev = (last?.[0]?.rev ?? 0) + 1;
      await context.supabase.from("event_guide_versions").insert({
        guide_id: data.id,
        rev,
        note: data.versionNote ?? "",
        config: data.config as never,
        created_by: context.userId,
      });
    }
    return rows[0];
  });

export const listEventGuideVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ guideId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_guide_versions")
      .select("id, rev, note, config, created_at")
      .eq("guide_id", data.guideId)
      .order("rev", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

export const deleteEventGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_guides")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("You are not allowed to remove this saved guide");
    return { ok: true };
  });
