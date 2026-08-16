// Public image endpoint for AI-generated skin backdrops.
//
// The backdrop bucket is private, but present/share/print surfaces render
// without a session, so the app serves the bytes itself. Only paths that are
// recorded in `public.skin_backdrops` are served, and only ever as images.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/skin-backdrop")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path");
        if (!path || path.includes("..")) return new Response("Bad path", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Only serve registered backdrops.
        const { data: row } = await supabaseAdmin
          .from("skin_backdrops")
          .select("storage_path")
          .eq("storage_path", path)
          .maybeSingle();
        if (!row) return new Response("Not found", { status: 404 });

        const file = await supabaseAdmin.storage.from("skin-backdrops").download(path);
        if (file.error || !file.data) return new Response("Not found", { status: 404 });

        return new Response(await file.data.arrayBuffer(), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
