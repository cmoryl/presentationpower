import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCanvaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { connectionStatus } = await import("@/lib/canva.server");
    return connectionStatus();
  });

export const startCanvaConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { origin: string }) => {
    const u = new URL(i.origin);
    if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("Bad origin");
    return { origin: u.origin };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can connect the shared Canva account.");
    const { buildAuthorizeUrl } = await import("@/lib/canva.server");
    return { url: await buildAuthorizeUrl(context.userId, data.origin, "/admin/canva") };
  });
