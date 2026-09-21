// Reading and saving floor-map edits for everyone.
//
// Reads are public: print vendors and crew open the maps without signing in and
// must see the same edited plans. Saving is limited to the people allowed to
// edit venue records.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeQeiiMapEdits, type QeiiMapEdits } from "@/lib/qeii-map-edits";

export type QeiiFloorEditRecord = {
  floorId: string;
  edits: QeiiMapEdits;
  updatedAt: string | null;
};

const editsSchema = z.object({
  rooms: z.record(z.string(), z.unknown()).default({}),
  colours: z.record(z.string(), z.unknown()).default({}),
  keyLabels: z.record(z.string(), z.unknown()).default({}),
});

export const listVenueMapEdits = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ venueSlug: z.string().min(2).max(80) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_PUBLISHABLE_KEY']!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await supabase
      .from("venue_map_edits")
      .select("floor_id, edits, updated_at")
      .eq("venue_slug", data.venueSlug);
    if (error) throw new Error(error.message);
    const floors: QeiiFloorEditRecord[] = (rows ?? []).map((row) => ({
      floorId: String(row.floor_id),
      edits: sanitizeQeiiMapEdits(row.edits),
      updatedAt: (row.updated_at as string | null) ?? null,
    }));
    return { floors };
  });

export const saveVenueMapEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        venueSlug: z.string().min(2).max(80),
        floorId: z.string().min(1).max(60),
        edits: editsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const clean = sanitizeQeiiMapEdits(data.edits);
    const { data: saved, error } = await context.supabase
      .from("venue_map_edits")
      .upsert(
        {
          venue_slug: data.venueSlug,
          floor_id: data.floorId,
          edits: clean,
          updated_by: context.userId,
        },
        { onConflict: "venue_slug,floor_id" },
      )
      .select("floor_id, edits, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      floor: {
        floorId: String(saved.floor_id),
        edits: sanitizeQeiiMapEdits(saved.edits),
        updatedAt: (saved.updated_at as string | null) ?? null,
      } satisfies QeiiFloorEditRecord,
    };
  });

export const resetVenueMapEdits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ venueSlug: z.string().min(2), floorId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("venue_map_edits")
      .delete()
      .eq("venue_slug", data.venueSlug)
      .eq("floor_id", data.floorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
