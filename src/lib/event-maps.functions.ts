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
    const [floors, plan] = await Promise.all([
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
    ]);
    if (floors.error) throw new Error(floors.error.message);
    return { floors: floors.data ?? [], plan: plan.data ?? null };
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
    const { error } = await context.supabase
      .from("event_map_floors")
      .update({ room_colours: data.roomColours, room_uses: data.roomUses, updated_by: context.userId })
      .eq("event_id", data.eventId)
      .eq("floor_key", data.floorKey);
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
