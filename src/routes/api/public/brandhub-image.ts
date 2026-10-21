import { createFileRoute } from "@tanstack/react-router";

// Same-origin relay for NEXT example renders hosted on the BrandHub creator,
// so the designer guide PDF can embed them (the host sends no CORS headers).
// Locked to one host, one folder and image types only.
const HOST = "https://brandhubcreator.lovable.app";
const ALLOWED = /^\/canva-master-reference\/[\w./-]+\.(png|jpe?g|webp)$/i;

export const Route = createFileRoute("/api/public/brandhub-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path") ?? "";
        if (!ALLOWED.test(path) || path.includes("..")) return new Response("Not allowed", { status: 400 });
        const res = await fetch(`${HOST}${path}`);
        if (!res.ok) return new Response(`Upstream ${res.status}`, { status: 502 });
        const type = res.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) return new Response("Not an image", { status: 415 });
        return new Response(res.body, { headers: { "content-type": type, "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
