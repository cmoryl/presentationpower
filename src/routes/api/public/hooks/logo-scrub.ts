import { createFileRoute } from "@tanstack/react-router";

// Daily caller checks a small batch of logos not checked in 30 days, so every logo is
// re-checked roughly monthly. Requires the server-only LOGO_SCRUB_SECRET; only flags changes.
export const Route = createFileRoute("/api/public/hooks/logo-scrub")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOGO_SCRUB_SECRET"];
        const token = request.headers.get("x-scrub-secret");
        if (!secret || token !== secret) return new Response("Unauthorized", { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runLogoScrubBatch } = await import("@/lib/logo-scrub.server");
          const out = await runLogoScrubBatch(supabaseAdmin, 15);
          return Response.json(out);
        } catch (e) {
          console.error("logo scrub failed", e);
          return Response.json({ error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
