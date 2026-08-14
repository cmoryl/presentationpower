// Thin server-fn wrapper over the shared brief → deck pipeline.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateDeckFromBrief, generateDeckInput } from "@/lib/deck-generate";

export const generateDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => generateDeckInput.parse(raw))
  .handler(async ({ data, context }) =>
    generateDeckFromBrief(context.supabase, context.userId, data),
  );
