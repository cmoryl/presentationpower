// Opens the real record behind an Oracle citation, including a signed link to
// the original brand document file when the citation came from one.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { OracleSourceResult } from "@/lib/oracle-source.server";

const Input = z.object({ id: z.string().min(3).max(200) });

export const getOracleSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }): Promise<OracleSourceResult> => {
    const { resolveOracleSource } = await import("@/lib/oracle-source.server");
    const client = context.supabase as unknown as Parameters<typeof resolveOracleSource>[0];
    try {
      return await resolveOracleSource(client, data.id);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
