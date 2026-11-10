import { createServerFn } from "@tanstack/react-start";

export interface NextGuidePhoto { id: string; event: string; area: string; room: string | null; thumbUrl: string; fullUrl: string; width: number | null; height: number | null }

/** Public: only photos approved for the guide AND cleared for marketing are ever signed. */
export const listNextGuidePhotos = createServerFn({ method: "GET" }).handler(async (): Promise<NextGuidePhoto[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { NEXT_EXAMPLE_AREAS } = await import("@/lib/next-visual-examples");
  const { data, error } = await supabaseAdmin.rpc("get_next_guide_photos");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!rows.length) return [];
  const paths = rows.flatMap((r) => [r.thumb_path ?? r.path, r.path]);
  const { data: signed, error: e2 } = await supabaseAdmin.storage.from("event-photos").createSignedUrls(paths, 6 * 3600);
  if (e2) throw new Error(e2.message);
  const url: Record<string, string> = {};
  for (const s of signed ?? []) if (s.path && s.signedUrl) url[s.path] = s.signedUrl;
  return rows.map((r) => ({
    id: r.id, event: r.event_id === "london-2026" ? "London 2026" : "San Francisco 2026",
    area: NEXT_EXAMPLE_AREAS[r.sign_kind ?? ""] ?? "Other event touchpoints", room: r.room,
    thumbUrl: url[r.thumb_path ?? r.path] ?? "", fullUrl: url[r.path] ?? "", width: r.width, height: r.height,
  })).filter((p) => p.thumbUrl);
});
