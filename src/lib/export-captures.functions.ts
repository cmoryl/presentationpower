// Publish / read the captured scene graph for a deck's slides.
//
// The in-app export already captures every slide from the live component. These
// functions persist those captures so the SERVER-side export (the endpoint the
// I Element app and the MCP connector call) can rebuild from the exact same
// scene graph instead of re-interpreting a module into generic PowerPoint
// shapes. Captures are owner-scoped by RLS.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const captureSchema = z.object({
  deckId: z.string().uuid(),
  slideId: z.string().min(1).max(200),
  position: z.number().int().min(0).max(500),
  variantId: z.string().min(1).max(200),
  mode: z.enum(["light", "dark"]),
  fingerprint: z.string().min(1).max(64),
  // A full-bleed design plate as a data URL. Capped so one call cannot be used
  // to push arbitrary bulk into the row store.
  plate: z.string().min(32).max(8_000_000),
  runs: z.array(z.unknown()).max(2000),
  shapes: z.array(z.unknown()).max(2000),
});

export const saveSlideCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => captureSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("deck_slide_captures").upsert(
      {
        deck_id: data.deckId,
        slide_id: data.slideId,
        position: data.position,
        variant_id: data.variantId,
        mode: data.mode,
        fingerprint: data.fingerprint,
        plate: data.plate,
        runs: data.runs as never,
        shapes: data.shapes as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "deck_id,slide_id,mode" },
    );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const clearSlideCaptures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ deckId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("deck_slide_captures")
      .delete()
      .eq("deck_id", data.deckId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
