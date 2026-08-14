import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlide, touchDeck } from "../deck-access";
import { resolveVariantSwap } from "@/lib/slide-ops";

export default defineTool({
  name: "change_slide_variant",
  title: "Change slide module variant",
  description:
    "Swap a slide to a different module variant. The variant must be permitted for the slide's section; the layout auto-corrects to a permitted one and content is preserved.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    position: z.number().int().min(0).describe("0-based slide position."),
    variant_id: z
      .string()
      .describe("Target variant id, from list_section_variants for the slide's section."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, position, variant_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const found = await loadSlide(supabase, deck_id, position);
    if (!found.ok) return errorResult(found.error);
    const swap = resolveVariantSwap(found.slide.section_id, found.slide.layout_id, variant_id);
    if (!swap.ok) return errorResult(swap.error);
    const { error } = await supabase
      .from("deck_slides")
      .update({
        variant_id: swap.value.variantId,
        layout_id: swap.value.layoutId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", found.slide.id);
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, position, ...swap.value });
  },
});
