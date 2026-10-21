import { createFileRoute } from "@tanstack/react-router";

// Uptime probe: no data, no secrets, never cached.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
    },
  },
});
