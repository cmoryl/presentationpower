import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RefitResult } from "@/lib/refit-slide.server";

const Input = z.object({
  deckTitle: z.string().max(300).default(""),
  divisionId: z.string().max(80).optional().nullable(),
  variantId: z.string().min(1).max(80),
  variantName: z.string().max(200).default(""),
  variantDescription: z.string().max(600).default(""),
  capacity: z.record(z.string(), z.unknown()).default({}),
  editableFields: z.array(z.string().max(120)).max(60).default([]),
  templateContent: z.record(z.string(), z.unknown()).default({}),
  sourceContent: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(8000).optional().default(""),
});

export const refitSlideToVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data, context }): Promise<RefitResult> => {
    const { refitSlideContent } = await import("@/lib/refit-slide.server");
    return refitSlideContent({
      supabase: context.supabase,
      divisionId: data.divisionId ?? null,
      deckTitle: data.deckTitle,
      variantId: data.variantId,
      variantName: data.variantName,
      variantDescription: data.variantDescription,
      capacity: data.capacity,
      editableFields: data.editableFields,
      templateContent: data.templateContent,
      sourceContent: data.sourceContent,
      notes: data.notes,
    });
  });
