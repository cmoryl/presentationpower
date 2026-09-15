// Venue plans and their signed-off pin positions, saved for the whole crew.
//
// Corrections used to live in one browser's storage, so an install position was
// only true on the laptop that made it. These functions move both halves into
// the build: the venue's own floor record, and every sign's real position at
// that venue, with who confirmed it and when.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeVenuePins, normalizeVenuePlan, type VenuePlanRecord } from "@/lib/venue-plan";

const zoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rooms: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const floorSchema = z.object({
  floor: z.string(),
  label: z.string(),
  w: z.number(),
  h: z.number(),
  orientation: z.string(),
  zones: z.array(zoneSchema).default([]),
  entries: z.array(z.object({ label: z.string(), x: z.number(), y: z.number() })).default([]),
});

const planSchema = z.object({
  slug: z.string().min(2).max(60),
  eventId: z.string().default("next"),
  name: z.string().min(1).max(160),
  city: z.string().max(120).default(""),
  venue: z.string().max(160).default(""),
  datesLabel: z.string().max(120).default(""),
  producer: z.string().max(160).default(""),
  surveyed: z.boolean().default(false),
  surveySource: z.string().max(400).default(""),
  surveyDate: z.string().nullable().default(null),
  caveat: z.string().max(600).default(""),
  floors: z.array(floorSchema).max(12).default([]),
});

export const listVenuePlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("venue_plans")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { plans: (data ?? []).map((row) => normalizeVenuePlan(row)) as VenuePlanRecord[] };
  });

export const saveVenuePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const row = {
      slug: data.slug,
      event_id: data.eventId,
      name: data.name,
      city: data.city,
      venue: data.venue,
      dates_label: data.datesLabel,
      producer: data.producer,
      surveyed: data.surveyed,
      survey_source: data.surveySource,
      survey_date: data.surveyDate || null,
      caveat: data.caveat,
      floors: data.floors,
      created_by: context.userId,
    };
    const { data: saved, error } = await context.supabase
      .from("venue_plans")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { plan: normalizeVenuePlan(saved) };
  });

export const deleteVenuePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("venue_plans")
      .delete()
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVenuePins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ venueSlug: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("venue_pins")
      .select("*")
      .eq("venue_slug", data.venueSlug);
    if (error) throw new Error(error.message);
    return { pins: normalizeVenuePins(rows ?? []) };
  });

const pinSchema = z.object({
  venueSlug: z.string().min(2),
  floor: z.string().min(1),
  assetId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  face: z.string().optional(),
  confirmed: z.boolean().default(false),
  note: z.string().max(400).default(""),
});

export const saveVenuePins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ pins: z.array(pinSchema).min(1).max(600) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const rows = data.pins.map((p) => ({
      venue_slug: p.venueSlug,
      floor: p.floor,
      asset_id: p.assetId,
      x: p.x,
      y: p.y,
      face: p.face ?? null,
      confirmed: p.confirmed,
      confirmed_by: p.confirmed ? context.userId : null,
      confirmed_at: p.confirmed ? now : null,
      note: p.note,
      created_by: context.userId,
    }));
    const { data: saved, error } = await context.supabase
      .from("venue_pins")
      .upsert(rows, { onConflict: "venue_slug,asset_id" })
      .select("*");
    if (error) throw new Error(error.message);
    return { pins: normalizeVenuePins(saved ?? []) };
  });

export const clearVenuePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ venueSlug: z.string(), assetId: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("venue_pins")
      .delete()
      .eq("venue_slug", data.venueSlug)
      .eq("asset_id", data.assetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
