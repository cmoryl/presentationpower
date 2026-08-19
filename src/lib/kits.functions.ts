// Campaign kits — CRUD server functions for saved social/event kits.
//
// Rows are user-scoped (RLS enforces auth.uid() = user_id). The wizard
// calls saveKit at review; /social and /events list them via listMyKits;
// re-opening a saved kit hydrates the wizard through getKit.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";

function toJson(v: unknown): Json {
  return JSON.parse(JSON.stringify(v ?? null)) as Json;
}

type KitRow = Tables<"campaign_kits">;

export type SavedKit = {
  id: string;
  name: string;
  surface: "social" | "event";
  brandId: string;
  mode: "light" | "dark" | "both";
  profileId: string;
  formatIds: string[];
  copy: {
    title?: string;
    summary?: string;
    cta?: string;
    statValue?: string;
    statLabel?: string;
  };
  // JSON-safe. Wizard uses string fields plus speakers/sponsors arrays.
  eventFacts: Record<string, Json>;
  attachEvent: boolean;
  /** NEXT 2026 design mode — renders assets in the NEXT event look. */
  nextDesign: boolean;
  /** NEXT track id (next-brand-guide division), e.g. "city-series". */
  nextTrackId: string;
  createdAt: string;
  updatedAt: string;
};

function rowToKit(r: KitRow): SavedKit {
  return {
    id: r.id,
    name: r.name,
    surface: r.surface as SavedKit["surface"],
    brandId: r.brand_id,
    mode: r.mode as SavedKit["mode"],
    profileId: r.profile_id,
    formatIds: Array.isArray(r.format_ids) ? r.format_ids : [],
    copy: (r.copy as SavedKit["copy"]) ?? {},
    eventFacts: (r.event_facts as Record<string, Json> | null) ?? {},
    attachEvent: !!r.attach_event,
    nextDesign: !!r.next_design,
    nextTrackId: r.next_track_id || "city-series",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─────────────────────────────────────────── list

const ListInput = z.object({
  surface: z.enum(["social", "event"]).optional(),
});

export const listMyKits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ListInput.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<SavedKit[]> => {
    let q = context.supabase
      .from("campaign_kits")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data.surface) q = q.eq("surface", data.surface);
    const { data: rows, error } = await q;
    if (error) {
      // Transient auth/clock-skew errors (e.g. "JWT issued at future") must not
      // blank the page — surface an empty list and let the client retry.
      console.error("[kits] listMyKits failed:", error.message);
      return [];
    }
    return (rows ?? []).map(rowToKit);
  });

// ─────────────────────────────────────────── get one

export const getKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<SavedKit | null> => {
    const { data: row, error } = await context.supabase
      .from("campaign_kits")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message ?? "Failed to load kit");
    return row ? rowToKit(row) : null;
  });

// ─────────────────────────────────────────── save (create or update)

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  surface: z.enum(["social", "event"]),
  brandId: z.string().min(1).max(80),
  mode: z.enum(["light", "dark", "both"]),
  profileId: z.string().min(1).max(80),
  formatIds: z.array(z.string().max(80)).max(50),
  copy: z.object({
    title: z.string().max(400).optional(),
    summary: z.string().max(1200).optional(),
    cta: z.string().max(120).optional(),
    statValue: z.string().max(40).optional(),
    statLabel: z.string().max(120).optional(),
  }),
  eventFacts: z.record(z.string(), z.unknown()).default({}),
  attachEvent: z.boolean().default(false),
  nextDesign: z.boolean().default(false),
  nextTrackId: z.string().min(1).max(80).default("city-series"),
});

export const saveKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SaveInput.parse(raw))
  .handler(async ({ data, context }): Promise<SavedKit> => {
    const payload: TablesInsert<"campaign_kits"> = {
      user_id: context.userId,
      name: data.name,
      surface: data.surface,
      brand_id: data.brandId,
      mode: data.mode,
      profile_id: data.profileId,
      format_ids: data.formatIds,
      copy: toJson(data.copy),
      event_facts: toJson(data.eventFacts),
      attach_event: data.attachEvent,
      next_design: data.nextDesign,
      next_track_id: data.nextTrackId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("campaign_kits")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message ?? "Failed to update kit");
      return rowToKit(row);
    }
    const { data: row, error } = await context.supabase
      .from("campaign_kits")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message ?? "Failed to save kit");
    return rowToKit(row);
  });

// ─────────────────────────────────────────── delete

export const deleteKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaign_kits").delete().eq("id", data.id);
    if (error) throw new Error(error.message ?? "Failed to delete kit");
    return { ok: true as const };
  });
