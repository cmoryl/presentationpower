import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlannerResult } from "@/lib/reinterpret-ai.server";

const Input = z.object({
  deckTitle: z.string().min(1).max(300),
  divisionId: z.string().max(80).optional().nullable(),
  slides: z
    .array(
      z.object({
        index: z.number().int().min(0),
        title: z.string().max(400).default(""),
        bullets: z.array(z.string().max(800)).max(30).default([]),
        notes: z.string().max(2000).optional().default(""),
        imageCount: z.number().int().min(0).max(200).default(0),
        currentVariantId: z.string().max(80).default(""),
      }),
    )
    .min(1)
    .max(60),
});

export const planDeckReinterpretation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }): Promise<PlannerResult> => {
    const { planReinterpretation } = await import("@/lib/reinterpret-ai.server");
    return planReinterpretation({
      supabase: context.supabase,
      divisionId: data.divisionId ?? null,
      deckTitle: data.deckTitle,
      slides: data.slides,
    });
  });
