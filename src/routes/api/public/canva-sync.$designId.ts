// Serves the newest cleaned Canva picture for a design. Public: these are the
// same published Bowl artworks already shown on public pages; only synced rows resolve.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/canva-sync/$designId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^D[A-Za-z0-9_-]{10}$/.test(params.designId)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("canva_asset_sync").select("storage_path").eq("design_id", params.designId).not("synced_at", "is", null).maybeSingle();
        if (!row?.storage_path) return new Response("Not found", { status: 404 });
        const { data, error } = await supabaseAdmin.storage.from("canva-sync").download(row.storage_path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
