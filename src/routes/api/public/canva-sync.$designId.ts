// Serves the newest cleaned Canva picture for a design (?page=N for multi-page
// carousels/stories). Public: these are the same published Bowl artworks already
// shown on public pages; only synced rows resolve.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/canva-sync/$designId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!/^D[A-Za-z0-9_-]{10}$/.test(params.designId)) return new Response("Not found", { status: 404 });
        const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("canva_asset_sync").select("storage_path, page_paths, format").eq("design_id", params.designId).not("synced_at", "is", null).maybeSingle();
        const path = row?.page_paths?.length ? row.page_paths[page - 1] : page === 1 ? row?.storage_path : null;
        if (!path) return new Response("Not found", { status: 404 });
        const { data, error } = await supabaseAdmin.storage.from("canva-sync").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, { headers: { "Content-Type": row?.format === "png" ? "image/png" : "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
