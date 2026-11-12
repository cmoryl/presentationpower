import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Daily caller: re-checks Bowl calendar designs in Canva and updates a capped number of
// changed pictures. Authenticated by the managed schedule credential.
export const Route = createFileRoute("/api/public/hooks/canva-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const { runBackgroundSync } = await import("@/lib/canva-sync.server");
          const run = await runBackgroundSync("daily");
          return Response.json({ checked: run.checked, synced: run.synced, failed: run.failed, remaining: run.remaining });
        } catch (e) {
          console.error("canva sync failed", e);
          return Response.json({ error: "Sync failed" }, { status: 500 });
        }
      },
    },
  },
});
