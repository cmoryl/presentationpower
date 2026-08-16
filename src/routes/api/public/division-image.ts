// Public image endpoint for division library imagery.
//
// The `division-imagery` bucket is private, but present/share/print surfaces
// (and PPTX export fetches) render without a session, so the app serves the
// bytes itself. Only paths registered in `public.division_imagery` are served,
// and only ever as images.

import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
]);

export const Route = createFileRoute("/api/public/division-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path");
        if (!path || path.includes("..")) return new Response("Bad path", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row } = await supabaseAdmin
          .from("division_imagery")
          .select("storage_path, content_type")
          .eq("storage_path", path)
          .maybeSingle();
        if (!row) return new Response("Not found", { status: 404 });

        const file = await supabaseAdmin.storage.from("division-imagery").download(path);
        if (file.error || !file.data) return new Response("Not found", { status: 404 });

        const type = row.content_type && ALLOWED.has(row.content_type) ? row.content_type : "image/png";

        return new Response(await file.data.arrayBuffer(), {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
