// AI personalization pipeline — thin server-fn wrapper.
// Implementation lives in `@/lib/personalize.core` so MCP tools and scripts
// can run the identical rewriter without an HTTP request context.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PersonalizeInputSchema, personalizeSlidesCore } from "@/lib/personalize.core";
import type { Json } from "@/integrations/supabase/types";

export type { PersonalizeInput } from "@/lib/personalize.core";

/** Serializable variant of PersonalizedSlide for the server-fn boundary. */
export type PersonalizedSlideJson = { id: string; content: Record<string, Json> };

function toJsonRecord(rec: Record<string, unknown>): Record<string, Json> {
  return JSON.parse(JSON.stringify(rec ?? {})) as Record<string, Json>;
}

export const personalizeSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PersonalizeInputSchema.parse(raw))
  .handler(async ({ data }): Promise<{ slides: PersonalizedSlideJson[]; error?: string }> => {
    const result = await personalizeSlidesCore(data);
    return {
      slides: result.slides.map((s) => ({ id: s.id, content: toJsonRecord(s.content) })),
      error: result.error,
    };
  });
