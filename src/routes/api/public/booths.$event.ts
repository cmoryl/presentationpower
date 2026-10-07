// Public booth list + latest 3D artwork for BoothHub.
// GET /api/public/booths/next-sf            → all booths with artwork URLs
// GET /api/public/booths/next-sf?slug=media → one booth
// Only registry booths and their newest saved proofs are returned; no author data.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export const Route = createFileRoute("/api/public/booths/$event")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const event = params.event;
        if (!/^[a-z0-9-]{2,40}$/.test(event)) return new Response("Bad event", { status: 400, headers: CORS });
        const slug = new URL(request.url).searchParams.get("slug");
        if (slug && !/^[a-z0-9:-]{1,60}$/.test(slug)) return new Response("Bad slug", { status: 400, headers: CORS });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("event_booths")
          .select("id, boothhub_slug, name, has_tv, published_3d, sort_order, kind")
          .eq("event", event)
          .not("boothhub_slug", "is", null)
          .order("sort_order");
        if (slug) q = q.eq("boothhub_slug", slug);
        const { data: booths, error } = await q;
        if (error) return new Response("Unavailable", { status: 503, headers: CORS });
        if (slug && !booths?.length) return new Response("Not found", { status: 404, headers: CORS });

        const ids = (booths ?? []).map((b) => b.id);
        const { data: art } = ids.length
          ? await supabaseAdmin.from("booth_art").select("booth_id, face, path, revision").in("booth_id", ids)
          : { data: [] as { booth_id: string; face: string; path: string; revision: string }[] };

        const out = [];
        for (const b of booths ?? []) {
          const faces: Record<string, string> = {};
          let revision: string | null = null;
          for (const a of (art ?? []).filter((x) => x.booth_id === b.id)) {
            const s = await supabaseAdmin.storage.from("booth-proofs").createSignedUrl(a.path, 3600);
            if (s.data?.signedUrl) faces[a.face] = s.data.signedUrl;
            if (!revision || a.revision > revision) revision = a.revision;
          }
          out.push({ slug: b.boothhub_slug, name: b.name, hasTv: b.has_tv, published3d: b.published_3d, revision, art: faces, kind: "proof", type: b.kind });
        }
        return Response.json(slug ? out[0] : { event, booths: out }, { headers: CORS });
      },
    },
  },
});
