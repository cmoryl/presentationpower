import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides } from "../deck-access";

export default defineTool({
  name: "get_deck",
  title: "Get deck",
  description:
    "Get one deck of the signed-in user, including every slide in order with its full content payload, notes and style-pack / accent settings. Call this before any slide edit so positions and current copy are known.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID, as returned by list_decks."),
    include_content: z
      .boolean()
      .describe("Include each slide's full content payload. Defaults to true.")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deck_id, include_content }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: deck, error } = await supabase
      .from("decks")
      .select(
        "id, title, brand_mode_id, archetype_id, created_at, updated_at, is_template, status, review_status, context",
      )
      .eq("id", deck_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!deck) return errorResult("Deck not found");

    const loaded = await loadSlides(supabase, deck_id);
    if (!loaded.ok) return errorResult(loaded.error);

    const withContent = include_content !== false;
    // Style-pack / accent settings live on deck.context alongside the strategy
    // payload; surface them explicitly so clients don't have to guess.
    const context = (deck as { context: Record<string, unknown> | null }).context ?? {};
    const style = {
      stylePackId: context.stylePackId ?? null,
      designRecipeId: context.designRecipeId ?? null,
      accent: context.accent ?? null,
      accentOverride: context.accentOverride ?? null,
      abPaletteOverride: context.abPaletteOverride ?? null,
      defaultTransition: context.defaultTransition ?? null,
      backdropMode: context.backdropMode ?? null,
    };

    return textResult({
      ...deck,
      style,
      slideCount: loaded.slides.length,
      slides: loaded.slides.map((s) => {
        const content = (s.content ?? {}) as Record<string, unknown>;
        return {
          id: s.id,
          position: s.position,
          section_id: s.section_id,
          variant_id: s.variant_id,
          layout_id: s.layout_id,
          notes: s.notes,
          stylePackId: content.stylePackId ?? null,
          accent: content.accent ?? null,
          transition: content.transition ?? null,
          ...(withContent ? { content } : {}),
        };
      }),
    });
  },
});
