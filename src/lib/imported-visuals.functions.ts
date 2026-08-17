// Server functions for the imported-deck visual conversion pass.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VisualReadResult } from "@/lib/imported-visual-ai.server";

const Input = z.object({
  deckTitle: z.string().min(1).max(300),
  divisionId: z.string().max(120).optional().nullable(),
  slides: z
    .array(
      z.object({
        index: z.number().int().min(0),
        title: z.string().max(400).default(""),
        bullets: z.array(z.string().max(800)).max(30).default([]),
        notes: z.string().max(2000).optional().default(""),
        figures: z.array(z.string().max(60)).max(20).default([]),
        signal: z.string().max(40).default("stat-copy"),
        // Signed storage URLs produced by getImportedDeckSlides.
        imageUrls: z.array(z.string().url().max(2000)).max(2).default([]),
      }),
    )
    .min(1)
    .max(12),
});

export const readImportedDeckVisuals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<VisualReadResult> => {
    const { readImportedVisuals } = await import("@/lib/imported-visual-ai.server");
    return readImportedVisuals({
      divisionId: data.divisionId ?? null,
      deckTitle: data.deckTitle,
      slides: data.slides,
    });
  });
