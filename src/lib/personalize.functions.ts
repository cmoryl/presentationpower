// AI personalization pipeline — thin server-fn wrapper.
// Implementation lives in `@/lib/personalize.core` so MCP tools and scripts
// can run the identical rewriter without an HTTP request context.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PersonalizeInputSchema, personalizeSlidesCore } from "@/lib/personalize.core";

export type { PersonalizeInput, PersonalizedSlide } from "@/lib/personalize.core";

export const personalizeSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PersonalizeInputSchema.parse(raw))
  .handler(async ({ data }) => personalizeSlidesCore(data));
