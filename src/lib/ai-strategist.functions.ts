// Phase B · Narrative Strategist — thin server-fn wrapper.
//
// The whole pipeline lives in `@/lib/ai-strategist.core` as a plain async
// function so non-HTTP callers (MCP tools, scripts) can run the identical
// implementation with their own Supabase client. One implementation, two
// callers — same pattern as `slide-ops.ts`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { StrategyInput, planStrategyCore } from "@/lib/ai-strategist.core";

export type { DeckStrategy, StrategySection, StrategyCoreResult } from "@/lib/ai-strategist.core";

export const planDeckStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => StrategyInput.parse(raw))
  .handler(async ({ data, context }) => planStrategyCore(context.supabase, data));
