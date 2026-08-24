import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides, touchDeck } from "../deck-access";
import { resolveVariantSwap } from "@/lib/slide-ops";
import { visualDataGap } from "@/lib/agent/visual-data-gaps";

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
    // A chart/diagram module inserted without its plotted values renders as an
    // empty frame on screen and in PowerPoint, so say so loudly right here.
    const gap = visualDataGap(resolved.value.variantId, (content ?? {}) as Record<string, unknown>);
    // In-loop variety nudge: the agent inserts one slide at a time and cannot
    // see that it has already spent this layout twice. Tell it now, with the
    // permitted layouts still on the table, rather than at audit time.
    const priorUses = existing.slides.filter(
      (s) => s.variant_id === resolved.value.variantId,
    ).length;
    let varietyWarning: Record<string, unknown> | undefined;
    if (priorUses >= 2) {
      const used = new Set(existing.slides.map((s) => s.variant_id));
      const alternates = variantsForSection(section_id)
        .filter((v) => !used.has(v.id) && v.id !== resolved.value.variantId)
        .slice(0, 5)
        .map((v) => ({ id: v.id, name: v.name, description: v.description }));
      varietyWarning = {
        message: `This deck now uses ${resolved.value.variantId} on ${priorUses + 1} slides, so those slides read as one template. Move this slide (or an earlier one) to a different permitted layout with change_slide_variant and rewrite its content for that layout's fields.`,
        alternates,
      };
    }
    return textResult({
      ok: true,
      slide: data,
      ...(gap ? { visual_data_required: gap } : {}),
      ...(varietyWarning ? { layout_variety_warning: varietyWarning } : {}),
    });

  },
});
