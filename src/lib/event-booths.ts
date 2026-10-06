// Shared booth registry: one list (table `event_booths`) that pairs our London
// source booths with BoothHub's 3D slugs. The bundled map in `sf-kiosk-3d.ts`
// is the offline fallback, so cards still link when the backend is unreachable.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SF_BOOTH_FALLBACK, sfKiosk3dUrl } from "@/lib/sf-kiosk-3d";

export type EventBooth = {
  id: string | null;
  sourceBoothId: string;
  slug: string;
  name: string;
  hasTv: boolean;
  published3d: boolean;
};

export type BoothArt = { face: "front" | "left" | "right"; url: string; revision: string };

export const SF_EVENT = "next-sf";

export function fallbackBooths(): EventBooth[] {
  return SF_BOOTH_FALLBACK.map((b) => ({ id: null, ...b, published3d: false }));
}

/** Merge registry rows over the fallback; registry wins per source booth. */
export function mergeBooths(rows: EventBooth[] | null | undefined): EventBooth[] {
  if (!rows || rows.length === 0) return fallbackBooths();
  return rows;
}

export function useEventBooths(event = SF_EVENT) {
  return useQuery({
    queryKey: ["event-booths", event],
    staleTime: 60_000,
    queryFn: async (): Promise<EventBooth[]> => {
      const { data, error } = await supabase
        .from("event_booths")
        .select("id, source_booth_id, boothhub_slug, name, has_tv, published_3d, sort_order")
        .eq("event", event)
        .order("sort_order");
      if (error) return fallbackBooths();
      return mergeBooths(
        (data ?? [])
          .filter((r) => r.boothhub_slug)
          .map((r) => ({
            id: r.id,
            sourceBoothId: r.source_booth_id,
            slug: r.boothhub_slug as string,
            name: r.name,
            hasTv: r.has_tv,
            published3d: r.published_3d,
          })),
      );
    },
  });
}

export function boothForSource(booths: EventBooth[] | undefined, sourceBoothId: string | null): EventBooth | null {
  if (!sourceBoothId) return null;
  return (booths ?? fallbackBooths()).find((b) => b.sourceBoothId === sourceBoothId) ?? null;
}

/** Latest proof pictures for a booth (signed, 1 hour). */
export function useBoothArt(boothId: string | null | undefined) {
  return useQuery({
    queryKey: ["booth-art", boothId],
    enabled: !!boothId,
    queryFn: async (): Promise<BoothArt[]> => {
      const { data } = await supabase.from("booth_art").select("face, path, revision").eq("booth_id", boothId!);
      const out: BoothArt[] = [];
      for (const r of data ?? []) {
        const s = await supabase.storage.from("booth-proofs").createSignedUrl(r.path, 3600);
        if (s.data?.signedUrl) out.push({ face: r.face as BoothArt["face"], url: s.data.signedUrl, revision: r.revision });
      }
      return out;
    },
  });
}

/** Public share link for one booth in 3D. */
export function boothShareUrl(slug: string) {
  return sfKiosk3dUrl(slug);
}
