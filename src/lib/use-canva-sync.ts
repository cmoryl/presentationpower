// Pictures re-pulled from Canva override the bundled ones. The ?v= stamp changes
// on every sync, so browsers never show a stale cached copy.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CANVA_SYNC_QUERY = ["canva-asset-sync"] as const;

/** Returns (designId, bundledUrl, page = 1) → newest synced URL, or the bundled one. */
export function useCanvaSynced() {
  const q = useQuery({
    queryKey: CANVA_SYNC_QUERY,
    queryFn: async () => {
      const { data } = await supabase.from("canva_asset_sync").select("design_id, synced_at, page_paths").not("synced_at", "is", null);
      return Object.fromEntries((data ?? []).map((r) => [r.design_id, { at: r.synced_at as string, pages: r.page_paths?.length || 1 }]));
    },
    staleTime: 60_000,
  });
  const map = q.data ?? {};
  return <F extends string | null>(id: string | undefined | null, fallback: F, page = 1): string | F => {
    const r = id ? map[id] : undefined;
    if (!r || page > r.pages) return fallback;
    return `/api/public/canva-sync/${id}?v=${encodeURIComponent(r.at)}${page > 1 ? `&page=${page}` : ""}`;
  };
}
