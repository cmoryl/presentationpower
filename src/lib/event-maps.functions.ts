import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventId = z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/);
const floorKey = z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/);
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const shape = z.object({
  d: z.string().max(200_000),
  fill: z.string().max(20).optional(),
  stroke: z.string().max(20).optional(),
  w: z.number().optional(),
});
const label = z.object({
  text: z.string().max(200),
  x: z.number(),
  y: z.number(),
  size: z.number(),
  angle: z.number().optional(),
});

export const listEventMapFloors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId }).parse(d))
  .handler(async ({ data, context }) => {
    const [floors, plan, link] = await Promise.all([
      context.supabase
        .from("event_map_floors")
        .select("*")
        .eq("event_id", data.eventId)
        .order("position", { ascending: true }),
      context.supabase
        .from("venue_plans")
        .select("name,city,venue,dates_label")
        .eq("event_id", data.eventId)
        .maybeSingle(),
      context.supabase
        .from("event_venues")
        .select("venue_id, venues(slug,name,city)")
        .eq("event_id", data.eventId)
        .maybeSingle(),
    ]);
    if (floors.error) throw new Error(floors.error.message);
    const own = floors.data ?? [];
    // Venue floors come first; the event's own colours and uses sit on top.
    let merged: typeof own = own.filter((r) => r.w != null && r.h != null);
    if (link.data?.venue_id) {
      const vf = await context.supabase
        .from("venue_floors")
        .select("id,floor_key,marker,title,position,source_kind,source_name,w,h,shapes,labels")
        .eq("venue_id", link.data.venue_id)
        .order("position");
      if (vf.error) throw new Error(vf.error.message);
      const fromVenue = (vf.data ?? []).map((f) => {
        const o = own.find((r) => r.venue_floor_id === f.id || r.floor_key === f.floor_key);
        return {
          ...(o ?? {}),
          ...f,
          id: o?.id ?? f.id,
          event_id: data.eventId,
          venue_floor_id: f.id,
          room_colours: o?.room_colours ?? {},
          room_uses: o?.room_uses ?? {},
        } as (typeof own)[number];
      });
      const keys = new Set(fromVenue.map((f) => f.floor_key));
      merged = [...fromVenue, ...merged.filter((r) => !keys.has(r.floor_key))];
    }
    return {
      floors: merged,
      plan: plan.data ?? null,
      venue: (link.data?.venues as { slug: string; name: string; city: string } | null) ?? null,
    };
  });

export const saveEventMapFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId,
        floorKey,
        marker: z.string().trim().max(6),
        title: z.string().trim().min(1).max(80),
        position: z.number().int().min(0).max(99),
        sourceKind: z.enum(["vector", "scan"]),
        sourceName: z.string().max(200).nullable(),
        w: z.number().positive(),
        h: z.number().positive(),
        shapes: z.array(shape).max(20_000),
        labels: z.array(label).max(2_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("event_map_floors").upsert(
      {
        event_id: data.eventId,
        floor_key: data.floorKey,
        marker: data.marker,
        title: data.title,
        position: data.position,
        source_kind: data.sourceKind,
        source_name: data.sourceName,
        w: data.w,
        h: data.h,
        shapes: data.shapes,
        labels: data.labels,
        created_by: context.userId,
        updated_by: context.userId,
      },
      { onConflict: "event_id,floor_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateEventMapRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId,
        floorKey,
        roomColours: z.record(z.string().max(200), hex).refine((r) => Object.keys(r).length <= 500),
        roomUses: z.record(z.string().max(200), z.string().max(200)).refine((r) => Object.keys(r).length <= 500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const updated = await context.supabase
      .from("event_map_floors")
      .update({ room_colours: data.roomColours, room_uses: data.roomUses, updated_by: context.userId })
      .eq("event_id", data.eventId)
      .eq("floor_key", data.floorKey)
      .select("id");
    if (updated.error) throw new Error(updated.error.message);
    if ((updated.data ?? []).length > 0) return { ok: true };
    // Venue-library floor with no event row yet: store the event's colours on
    // top of the venue floor without copying its drawing.
    const link = await context.supabase.from("event_venues").select("venue_id").eq("event_id", data.eventId).maybeSingle();
    const vf = link.data
      ? await context.supabase.from("venue_floors").select("id,marker,title,position").eq("venue_id", link.data.venue_id).eq("floor_key", data.floorKey).maybeSingle()
      : null;
    if (!vf?.data) throw new Error("That floor isn't saved for this event yet.");
    const { error } = await context.supabase.from("event_map_floors").insert({
      event_id: data.eventId,
      floor_key: data.floorKey,
      venue_floor_id: vf.data.id,
      marker: vf.data.marker,
      title: vf.data.title,
      position: vf.data.position,
      room_colours: data.roomColours,
      room_uses: data.roomUses,
      created_by: context.userId,
      updated_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEventMapFloor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId, floorKey }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_map_floors")
      .delete()
      .eq("event_id", data.eventId)
      .eq("floor_key", data.floorKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
