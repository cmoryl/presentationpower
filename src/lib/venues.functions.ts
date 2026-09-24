// Venue library — a venue is saved once with its floors; every event held there
// reads those floors and keeps its own room colours and uses on top.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slug = z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/);
const eventId = z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/);
const floorKey = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/);
const shape = z.object({ d: z.string().max(200_000), fill: z.string().max(20).optional(), stroke: z.string().max(20).optional(), w: z.number().optional() });
const label = z.object({ text: z.string().max(200), x: z.number(), y: z.number(), size: z.number(), angle: z.number().optional() });

export const listVenues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [v, f, e] = await Promise.all([
      context.supabase.from("venues").select("id,slug,name,city,country,address,source_note").order("name"),
      context.supabase.from("venue_floors").select("venue_id,source_kind"),
      context.supabase.from("event_venues").select("event_id,venue_id"),
    ]);
    if (v.error) throw new Error(v.error.message);
    return (v.data ?? []).map((row) => {
      const floors = (f.data ?? []).filter((x) => x.venue_id === row.id);
      return {
        ...row,
        floorCount: floors.length,
        scans: floors.filter((x) => x.source_kind === "scan").length,
        events: (e.data ?? []).filter((x) => x.venue_id === row.id).map((x) => x.event_id),
      };
    });
  });

export const getVenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ data, context }) => {
    const v = await context.supabase.from("venues").select("*").eq("slug", data.slug).maybeSingle();
    if (v.error) throw new Error(v.error.message);
    if (!v.data) return null;
    const [floors, events] = await Promise.all([
      context.supabase.from("venue_floors").select("id,floor_key,marker,title,position,source_kind,source_name,w,h,off_plan_labels,labels").eq("venue_id", v.data.id).order("position"),
      context.supabase.from("event_venues").select("event_id").eq("venue_id", v.data.id),
    ]);
    if (floors.error) throw new Error(floors.error.message);
    return {
      venue: v.data,
      floors: (floors.data ?? []).map(({ labels, ...f }) => ({ ...f, roomCount: Array.isArray(labels) ? labels.length : 0 })),
      events: (events.data ?? []).map((x) => x.event_id),
    };
  });

/** Full drawn floors for one venue (used by the London loader). */
export const getVenueFloors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug }).parse(d))
  .handler(async ({ data, context }) => {
    const v = await context.supabase.from("venues").select("id").eq("slug", data.slug).maybeSingle();
    if (v.error) throw new Error(v.error.message);
    if (!v.data) return [];
    const r = await context.supabase.from("venue_floors").select("floor_key,marker,title,position,source_kind,w,h,shapes,labels").eq("venue_id", v.data.id).order("position");
    if (r.error) throw new Error(r.error.message);
    return r.data ?? [];
  });

export const saveVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug, name: z.string().trim().min(2).max(120), city: z.string().trim().max(80), country: z.string().trim().max(80),
      address: z.string().trim().max(240), timezone: z.string().trim().max(60), sourceNote: z.string().trim().max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("venues").upsert(
      { slug: data.slug, name: data.name, city: data.city, country: data.country, address: data.address, timezone: data.timezone, source_note: data.sourceNote, created_by: context.userId },
      { onConflict: "slug" },
    ).select("id,slug").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveVenueFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      slug, floorKey, marker: z.string().trim().max(6), title: z.string().trim().min(1).max(80), position: z.number().int().min(0).max(99),
      sourceKind: z.enum(["vector", "scan"]), sourceName: z.string().max(200).nullable(), w: z.number().positive(), h: z.number().positive(),
      shapes: z.array(shape).max(20_000), labels: z.array(label).max(2_000), offPlanLabels: z.array(z.string().max(80)).max(50).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const v = await context.supabase.from("venues").select("id").eq("slug", data.slug).single();
    if (v.error) throw new Error(v.error.message);
    const { error } = await context.supabase.from("venue_floors").upsert(
      { venue_id: v.data.id, floor_key: data.floorKey, marker: data.marker, title: data.title, position: data.position, source_kind: data.sourceKind,
        source_name: data.sourceName, w: data.w, h: data.h, shapes: data.shapes, labels: data.labels, off_plan_labels: data.offPlanLabels, updated_by: context.userId },
      { onConflict: "venue_id,floor_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateVenueFloorMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), marker: z.string().trim().max(6), title: z.string().trim().min(1).max(80), position: z.number().int().min(0).max(99), offPlanLabels: z.array(z.string().trim().max(80)).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("venue_floors")
      .update({ marker: data.marker, title: data.title, position: data.position, off_plan_labels: data.offPlanLabels, updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVenueFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("venue_floors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const linkEventVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId, slug }).parse(d))
  .handler(async ({ data, context }) => {
    const v = await context.supabase.from("venues").select("id").eq("slug", data.slug).single();
    if (v.error) throw new Error(v.error.message);
    const { error } = await context.supabase.from("event_venues").upsert({ event_id: data.eventId, venue_id: v.data.id, created_by: context.userId }, { onConflict: "event_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Copies the QEII Centre floors bundled with the build into the venue library.
 *  Admin/venue-editor action; RLS enforces who may write. Existing floors are kept. */
export const importBundledQeiiFloors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { QEII_FLOOR_VECTORS } = await import("@/lib/next-london-qeii-vectors");
    const { QEII_REVIEWER_SPLITS } = await import("@/lib/next-london-qeii-reviewer-splits");
    const v = await context.supabase.from("venues").select("id").eq("slug", "qeii-centre").single();
    if (v.error) throw new Error(v.error.message);
    const rows = QEII_FLOOR_VECTORS.map((f, i) => ({
      venue_id: v.data.id, floor_key: f.id, marker: f.marker, title: f.title, position: i,
      source_kind: f.kind === "vector" ? "vector" : "scan", source_name: `Canva venue sheet p${f.page}`,
      w: f.w, h: f.h, shapes: f.shapes, labels: f.labels,
      off_plan_labels: ["catering lift", "catering", "void"],
      splits: QEII_REVIEWER_SPLITS.filter((s) => s.sheetId === f.id),
      updated_by: context.userId,
    }));
    const { error } = await context.supabase.from("venue_floors").upsert(rows as never, { onConflict: "venue_id,floor_key", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { floors: rows.length };
  });
