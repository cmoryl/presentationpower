import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RefitResult } from "@/lib/social-module-refit.server";

const Input = z.object({
  moduleLabel: z.string().max(200).default(""),
  moduleDescription: z.string().max(600).default(""),
  formatLabel: z.string().max(120).default(""),
  formatWidth: z.number().int().min(1).max(10000),
  formatHeight: z.number().int().min(1).max(10000),
  overflowPct: z.number().min(-5).max(50).default(0),
  reliefLevel: z.number().int().min(0).max(10).default(0),
  reliefNote: z.string().max(200).default(""),
  fields: z
    .array(
      z.object({
        path: z.string().max(200),
        label: z.string().max(200).default(""),
        value: z.string().max(2000).default(""),
        maxChars: z.number().int().min(4).max(2000).default(160),
      }),
    )
    .max(60),
  candidates: z
    .array(
      z.object({
        id: z.string().max(120),
        label: z.string().max(200).default(""),
        description: z.string().max(400).default(""),
      }),
    )
    .max(24)
    .default([]),
});

export const refitSocialModuleLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<RefitResult> => {
    const { refitSocialModule } = await import("@/lib/social-module-refit.server");
    return refitSocialModule(data);
  });
