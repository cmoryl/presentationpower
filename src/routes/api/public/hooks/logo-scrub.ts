import { createFileRoute } from "@tanstack/react-router";

// Daily caller checks a small batch of logos not checked in 30 days, so every logo is
// re-checked roughly monthly. Requires the database-only token in internal_job_tokens (cron reads it in SQL); only flags changes.
export const Route = createFileRoute("/api/public/hooks/logo-scrub")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-scrub-secret");
        if (!token || token.length < 32) return new Response("Unauthorized", { status: 401 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin.from("internal_job_tokens").select("token").eq("name", "logo_scrub").maybeSingle();
          if (!row || row.token !== token) return new Response("Unauthorized", { status: 401 });
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
