import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Saved event booklets. One row holds everything a printed booklet needs — the
// cover copy, which venue floors print, the chart pages and a snapshot of the
// agenda — so an event can be re-opened, edited and reused in a later year.
// Rows are readable by every signed-in colleague; only the owner or an admin
// can change or remove one.

const chartSchema = z.object({
  id: z.string().max(60),
  kind: z.string().max(60),
  title: z.string().max(200).default(""),
  subtitle: z.string().max(300).default(""),
});

const configSchema = z
  .object({
    sizeId: z.string().max(40),
    includeCover: z.boolean().default(true),
    includeAgenda: z.boolean().default(true),
    includeMap: z.boolean().default(true),
    mapFloors: z.array(z.string().max(60)).max(20).default([]),
    charts: z.array(chartSchema).max(20).default([]),
    cover: z
      .object({
        eyebrow: z.string().max(200).default(""),
        title: z.string().max(300).default(""),
        subtitle: z.string().max(400).default(""),
        footnote: z.string().max(400).default(""),
      })
      .passthrough(),
  })
  .passthrough();

const bookletInput = z.object({
  name: z.string().min(2).max(160),
  eventId: z.string().max(60).default("next"),
  city: z.string().max(60).default("london"),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().max(2000).default(""),
  config: configSchema,
  /** A snapshot of the agenda so the booklet travels without its source file. */
  agenda: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const listEventBooklets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("event_booklets")
      .select("*")
      .order("year", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveEventBooklet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => bookletInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_booklets")
      .insert({
        name: data.name,
        event_id: data.eventId,
        city: data.city,
        year: data.year,
        size_id: data.config.sizeId,
        notes: data.notes,
        config: data.config as never,
        agenda: (data.agenda ?? null) as never,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateEventBooklet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    bookletInput.partial().extend({ id: z.string().uuid() }).parse(data),
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
    if (data.agenda !== undefined) patch.agenda = data.agenda;
    // RLS decides whether this caller owns the row (or is an admin); an empty
    // result means the update was refused rather than silently applied.
    const { data: rows, error } = await context.supabase
      .from("event_booklets")
      .update(patch as never)
      .eq("id", data.id)
      .select("*");
    if (error) throw error;
    if (!rows?.length) throw new Error("You are not allowed to change this saved booklet");
    return rows[0];
  });

export const deleteEventBooklet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_booklets")
      .delete()
      .eq("id", data.id)
      .select("id");
    if (error) throw error;
    if (!rows?.length) throw new Error("You are not allowed to remove this saved booklet");
    return { ok: true };
  });
