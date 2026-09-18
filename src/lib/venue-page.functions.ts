// Venue pages — saved for the whole crew, one record per event location.
//
// Thin server declarations only: the shape and every derived line live in
// src/lib/venue-page.ts so the guide, the exports and the tests share them.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeVenuePage, type VenuePage } from "@/lib/venue-page";

const hoursSchema = z.object({
  id: z.string(),
  label: z.string().max(160).default(""),
  hours: z.string().max(240).default(""),
  note: z.string().max(400).default(""),
});

const travelSchema = z.object({
  id: z.string(),
  label: z.string().max(160).default(""),
  body: z.string().max(600).default(""),
});

const venueSchema = z.object({
  slug: z.string().min(2).max(60),
  eventId: z.string().max(40).default("next"),
  city: z.string().max(120).default(""),
  venue: z.string().max(160).default(""),
  address: z.string().max(400).default(""),
  postcode: z.string().max(40).default(""),
  country: z.string().max(120).default(""),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  mapZoom: z.number().int().min(2).max(19).default(15),
  mapNote: z.string().max(600).default(""),
  directionsUrl: z.string().max(600).default(""),
  openingTimes: z.array(hoursSchema).max(24).default([]),
  travel: z.array(travelSchema).max(12).default([]),
  photoId: z.string().max(60).default(""),
  photoPath: z.string().max(400).default(""),
  photoCredit: z.string().max(240).default(""),
  wifi: z.string().max(240).default(""),
  supportEmail: z.string().max(240).default(""),
  siteUrl: z.string().max(240).default(""),
  notes: z.string().max(2000).default(""),
});

export const listVenuePages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("event_venue_pages")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { venues: (data ?? []).map((row) => normalizeVenuePage(row)) as VenuePage[] };
  });

export const saveVenuePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => venueSchema.parse(data))
  .handler(async ({ data, context }) => {
    const row = {
      slug: data.slug,
      event_id: data.eventId,
      city: data.city,
      venue: data.venue,
      address: data.address,
      postcode: data.postcode,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
      map_zoom: data.mapZoom,
      map_note: data.mapNote,
      directions_url: data.directionsUrl,
      opening_times: data.openingTimes,
      travel: data.travel,
      photo_id: data.photoId,
      photo_path: data.photoPath,
      photo_credit: data.photoCredit,
      wifi: data.wifi,
      support_email: data.supportEmail,
      site_url: data.siteUrl,
      notes: data.notes,
      created_by: context.userId,
    };
    const { data: saved, error } = await context.supabase
      .from("event_venue_pages")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { venue: normalizeVenuePage(saved) };
  });

export const deleteVenuePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(2) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_venue_pages")
      .delete()
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Look an address up so the map can be placed. Returns nothing rather than a
 * guess when the address is not found — a wrong pin on a delegate guide is
 * worse than an empty one.
 */
export const findVenuePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ query: z.string().min(3).max(300) }).parse(data),
  )
  .handler(async ({ data }) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(data.query)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TransPerfect Element event guide builder (next@transperfect.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Address lookup failed [${res.status}]: ${await res.text()}`);
    }
    const rows = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const hit = rows[0];
    const lat = hit?.lat ? Number(hit.lat) : NaN;
    const lng = hit?.lon ? Number(hit.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { found: false as const };
    }
    return { found: true as const, lat, lng, label: hit?.display_name ?? "" };
  });
