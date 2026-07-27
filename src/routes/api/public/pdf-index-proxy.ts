import { createFileRoute } from "@tanstack/react-router";

const INDEX_URL = "https://brandhubcreator.lovable.app/knowledge-export/pdf-master-index.json";

export const Route = createFileRoute("/api/public/pdf-index-proxy")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(INDEX_URL, { headers: { accept: "application/json" } });
          if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502 });
          const text = await res.text();
          return new Response(text, {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        } catch (e) {
          return new Response(`Proxy error: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});
