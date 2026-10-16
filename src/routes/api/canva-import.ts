// Sends a browser-built .pptx into the shared TransPerfect Canva account.
// Caller must be signed in (bearer token checked against the auth server).
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 90 * 1024 * 1024;

export const Route = createFileRoute("/api/canva-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(process.env["SUPABASE_URL"]!, key, { auth: { persistSession: false } });
        const { data: u, error: ue } = await sb.auth.getUser(token);
        if (ue || !u.user) return Response.json({ error: "Your session expired — sign in again." }, { status: 401 });

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected a file." }, { status: 400 });
        }
        const file = form.get("file");
        const title = String(form.get("title") ?? "TransPerfect deck").slice(0, 200);
        if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "Missing file." }, { status: 400 });
        if (file.size > MAX_BYTES) return Response.json({ error: "Deck is too large for Canva import." }, { status: 413 });
        try {
          const { importPptx } = await import("@/lib/canva.server");
          return Response.json(await importPptx(await file.arrayBuffer(), title));
        } catch (e) {
          console.error("[canva] import failed", e);
          return Response.json({ error: (e as Error).message }, { status: 502 });
        }
      },
    },
  },
});
