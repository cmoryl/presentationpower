// Pictures re-pulled from Canva override the bundled ones. The ?v= stamp changes
// on every sync, so browsers never show a stale cached copy.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CANVA_SYNC_QUERY = ["canva-asset-sync"] as const;

export function useCanvaSynced() {
  const q = useQuery({
    queryKey: CANVA_SYNC_QUERY,
    queryFn: async () => {
      const { data } = await supabase.from("canva_asset_sync").select("design_id, synced_at").not("synced_at", "is", null);
      return Object.fromEntries((data ?? []).map((r) => [r.design_id, r.synced_at as string]));
    },
    staleTime: 60_000,
  });
  const map = q.data ?? {};
  return (id: string | undefined | null, fallback: string | null) =>
    id && map[id] ? `/api/public/canva-sync/${id}?v=${encodeURIComponent(map[id]!)}` : fallback;
}
