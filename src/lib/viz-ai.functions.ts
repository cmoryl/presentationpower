// Typed RPC surface for the AI data-visualisation pass. Thin wrapper only —
// all runtime logic lives in ./viz-ai.server.ts and the schemas in
// ./viz-ai.schema.ts, so this module stays safe for the client graph.
//
// These endpoints spend paid AI credits and back an admin-only surface
// (/admin/viz-lab), so both require an authenticated session AND a
// server-side admin role check.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { critiqueVizInput, interpretVizInput } from "@/lib/viz-ai.schema";
import type { InterpretVizResult, VizCritique } from "@/lib/viz-ai.schema";

async function assertAdmin(context: {
  supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown; error: unknown }> };
  userId: string;
}) {
  const { data, error } = await context.supabase.rpc(
    "has_role" as never,
    {
      _user_id: context.userId,
      _role: "admin",
    } as never,
  );
  if (error || data !== true) throw new Error("Forbidden");
}

export const interpretVizData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => interpretVizInput.parse(data))
  .handler(async ({ data, context }): Promise<InterpretVizResult> => {
    await assertAdmin(context as never);
    const { interpretVizDataOnServer } = await import("@/lib/viz-ai.server");
    return interpretVizDataOnServer(data);
  });

export const critiqueVizSpec = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => critiqueVizInput.parse(data))
  .handler(async ({ data, context }): Promise<VizCritique> => {
    await assertAdmin(context as never);
    const { critiqueVizSpecOnServer } = await import("@/lib/viz-ai.server");
    return critiqueVizSpecOnServer(data);
  });
