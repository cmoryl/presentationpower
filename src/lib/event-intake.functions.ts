import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { blankVenuePlan } from "./venue-plan";
import { EVENT_INTAKE_ITEMS, eventSlug } from "./event-intake";

const eventId = z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/);

export const getEventIntake = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId }).parse(d))
  .handler(async ({ data, context }) => {
    const [intake, research, plan] = await Promise.all([
      context.supabase.from("event_intake_items").select("*").eq("event_id", data.eventId),
      context.supabase
        .from("event_venue_research")
        .select("*")
        .eq("event_id", data.eventId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("venue_plans")
        .select("slug,name,city,venue,dates_label")
        .eq("event_id", data.eventId)
        .maybeSingle(),
    ]);
    if (intake.error) throw new Error(intake.error.message);
    if (research.error) throw new Error(research.error.message);
    return { intake: intake.data ?? [], research: research.data ?? [], plan: plan.data ?? null };
  });

export const listStartedEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("venue_plans")
      .select("slug,event_id,name,city,venue,dates_label,updated_at")
      .neq("event_id", "next")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((e) => e.event_id);
    const intake = ids.length
      ? await context.supabase
          .from("event_intake_items")
          .select("event_id,item_key,status")
          .in("event_id", ids)
      : { data: [], error: null };
    if (intake.error) throw new Error(intake.error.message);
    return { events: data ?? [], intake: intake.data ?? [] };
  });

export const setIntakeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        eventId,
        itemKey: z.enum(EVENT_INTAKE_ITEMS.map((i) => i.key) as [string, ...string[]]),
        status: z.enum(["missing", "received", "scan", "found_online", "not_needed"]),
        note: z.string().max(1000).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("event_intake_items").upsert(
      {
        event_id: data.eventId,
        item_key: data.itemKey,
        status: data.status,
        note: data.note,
        updated_by: context.userId,
      },
      { onConflict: "event_id,item_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setResearchStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["suggested", "confirmed", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_venue_research")
      .update({ status: data.status, confirmed_by: data.status === "confirmed" ? context.userId : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const researchVenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ eventId, venue: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) =>
    (await import("./event-intake.server")).runResearch(context.supabase as never, context.userId, data.eventId, data.venue, data.city),
  );

export const startEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(3).max(120),
        city: z.string().trim().min(2).max(120),
        venue: z.string().trim().min(2).max(160),
        dates: z.string().trim().max(80),
        research: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const id = eventSlug(data.name, data.city);
    if (id.length < 3) throw new Error("Give the event a name and city.");
    // An empty map set waiting on the venue's floor plans — no rooms invented.
    const plan = blankVenuePlan(id, data.name);
    const { error } = await context.supabase.from("venue_plans").upsert(
      {
        slug: id,
        event_id: id,
        name: data.name,
        city: data.city,
        venue: data.venue,
        dates_label: data.dates,
        producer: "",
        surveyed: false,
        survey_source: "",
        survey_date: null,
        caveat: "Waiting on the venue's floor plans — nothing is drawn until they arrive.",
        floors: plan.floors,
        created_by: context.userId,
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(error.message);
    await context.supabase.from("event_intake_items").upsert(
      EVENT_INTAKE_ITEMS.map((i) => ({
        event_id: id,
        item_key: i.key,
        status: "missing",
        updated_by: context.userId,
      })),
      { onConflict: "event_id,item_key", ignoreDuplicates: true },
    );
    let research: { found: number; pagesRead: number; error?: string } | null = null;
    if (data.research) {
      try {
        research = await (await import("./event-intake.server")).runResearch(context.supabase as never, context.userId, id, data.venue, data.city);
      } catch (e) {
        research = { found: 0, pagesRead: 0, error: e instanceof Error ? e.message : "Research failed" };
      }
    }
    return { eventId: id, research };
  });
