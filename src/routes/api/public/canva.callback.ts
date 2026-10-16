// Canva OAuth callback for the shared team account. The caller is verified by
// the single-use, 15-minute `state` row created for a signed-in admin.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/canva/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const back = (msg: string, path = "/admin/canva") =>
          Response.redirect(`${url.origin}${path}?canva=${encodeURIComponent(msg)}`, 302);
        if (url.searchParams.get("error")) return back(url.searchParams.get("error_description") || "Canva sign-in was cancelled.");
        if (state.length < 16 || !code) return back("Canva sign-in link was incomplete.");
        try {
          const { completeAuthorization } = await import("@/lib/canva.server");
          const to = await completeAuthorization(state, code, url.origin);
          return back("connected", to.startsWith("/") ? to : "/admin/canva");
        } catch (e) {
          console.error("[canva] callback failed", e);
          return back((e as Error).message);
        }
      },
    },
  },
});
