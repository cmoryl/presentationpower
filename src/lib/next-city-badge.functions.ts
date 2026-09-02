import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Saved City Series badge print-run versions. Reads are open to signed-in
// users; RLS restricts edits and deletes to the version owner or an admin.

const configSchema = z.object({
  face: z.enum(["dark", "light"]).default("dark"),
  cityLabel: z.string().default(""),
  datesLabel: z.string().default(""),
  venueLabel: z.string().default(""),
  roleLabel: z.string().default("ATTENDEE"),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  jobTitle: z.string().default(""),
  company: z.string().default(""),
  reference: z.string().default(""),
  showAttendee: z.boolean().default(true),
});

const versionInput = z.object({
  name: z.string().min(2).max(120),
  notes: z.string().max(2000).default(""),
  status: z.enum(["draft", "approved", "archived"]).default("draft"),
  config: configSchema,
});

export const listCityBadgeVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("next_city_badge_versions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveCityBadgeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => versionInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("next_city_badge_versions")
      .insert({
        name: data.name,
        notes: data.notes,
        status: data.status,
        face: data.config.face,
        city_label: data.config.cityLabel,
        dates_label: data.config.datesLabel,
        venue_label: data.config.venueLabel,
        role_label: data.config.roleLabel,
        config: data.config,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateCityBadgeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    versionInput.partial().extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string | object> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.status !== undefined) patch.status = data.status;
    if (data.config !== undefined) {
      patch.config = data.config;
      patch.face = data.config.face;
      patch.city_label = data.config.cityLabel;
      patch.dates_label = data.config.datesLabel;
      patch.venue_label = data.config.venueLabel;
      patch.role_label = data.config.roleLabel;
    }
    const { data: row, error } = await context.supabase
      .from("next_city_badge_versions")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteCityBadgeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("next_city_badge_versions")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
