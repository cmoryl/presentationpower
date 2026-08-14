import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides, touchDeck } from "../deck-access";
import { resolveVariantSwap } from "@/lib/slide-ops";

export default defineTool({
  name: "insert_slide",
  title: "Insert slide",
  description:
    "Insert a new slide into a deck at a given position, using a section framework and a module variant permitted for that section. Later slides shift down.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    section_id: z.string().describe("Section framework id, e.g. 'SF-06'."),
    variant_id: z.string().describe("Module variant id permitted for that section."),
    position: z
      .number()
      .int()
      .min(0)
      .describe("0-based insert position. Defaults to the end of the deck.")
      .optional(),
    content: z
      .record(z.string(), z.unknown())
      .describe("Initial slide content object (e.g. { title, subtitle, items }).")
      .optional(),
    notes: z.string().describe("Optional speaker notes.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, section_id, variant_id, position, content, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const existing = await loadSlides(supabase, deck_id);
    if (!existing.ok) return errorResult(existing.error);
    if (existing.slides.length === 0) {
      const { data: deck, error: dErr } = await supabase
        .from("decks")
        .select("id")
        .eq("id", deck_id)
        .maybeSingle();
      if (dErr) return errorResult(dErr.message);
      if (!deck) return errorResult("Deck not found");
    }

    // Reuse the shared validator: it also picks a permitted layout for us.
    const resolved = resolveVariantSwap(section_id, "", variant_id);
    if (!resolved.ok) return errorResult(resolved.error);

    const at = Math.min(position ?? existing.slides.length, existing.slides.length);

    // Shift later slides down, from the back so positions never collide.
    for (const slide of [...existing.slides].reverse()) {
      if (slide.position < at) continue;
      const { error } = await supabase
        .from("deck_slides")
        .update({ position: slide.position + 1 } as never)
        .eq("id", slide.id);
      if (error) return errorResult(`Could not make room at position ${at}: ${error.message}`);
    }

    const { data, error } = await supabase
      .from("deck_slides")
      .insert({
        deck_id,
        position: at,
        section_id,
        variant_id: resolved.value.variantId,
        layout_id: resolved.value.layoutId,
        content: (content ?? {}) as never,
        notes: notes ?? null,
      } as never)
      .select("id, position, section_id, variant_id, layout_id")
      .single();
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, slide: data });
  },
});
