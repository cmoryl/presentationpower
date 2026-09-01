import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlannerResult } from "@/lib/reinterpret-ai.server";

const Input = z.object({
  deckTitle: z.string().min(1).max(300),
  divisionId: z.string().max(80).optional().nullable(),
  slides: z
    .array(
      z
        .object({
          index: z.number().int().min(0),
          title: z.string().max(400).default(""),
          bullets: z.array(z.string().max(800)).max(30).default([]),
          notes: z.string().max(4000).optional().default(""),
          imageCount: z.number().int().min(0).max(200).default(0),
          currentVariantId: z.string().max(80).default(""),
          // Deep-read evidence (see reinterpret-evidence.ts). Optional so older
          // callers keep working; shapes are validated loosely and re-clamped
          // by the evidence builder before they ever reach the model.
          layoutName: z.string().max(200).optional(),
          layoutSignature: z.string().max(400).optional(),
          hidden: z.boolean().optional(),
          hasAnimation: z.boolean().optional(),
          textBlocks: z.array(z.unknown()).max(20).optional(),
          charts: z.array(z.unknown()).max(6).optional(),
          tables: z.array(z.unknown()).max(4).optional(),
          diagrams: z.array(z.unknown()).max(4).optional(),
          media: z.array(z.unknown()).max(6).optional(),
          links: z.array(z.string().max(300)).max(8).optional(),
          figures: z.array(z.string().max(40)).max(30).optional(),
        })
        .strip(),
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
