import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides, touchDeck } from "../deck-access";

export default defineTool({
  name: "reorder_slides",
  title: "Reorder slides",
  description:
    "Reorder a deck's slides. Pass the full list of current 0-based positions in the desired new order.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    order: z
      .array(z.number().int().min(0))
      .min(1)
      .describe("Every current position exactly once, in the new order. E.g. [0,2,1,3]."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, order }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const existing = await loadSlides(supabase, deck_id);
    if (!existing.ok) return errorResult(existing.error);
    const slides = existing.slides;
    if (slides.length === 0) return errorResult("Deck has no slides");

    const expected = slides.map((s) => s.position).sort((a, b) => a - b).join(",");
    const got = [...order].sort((a, b) => a - b).join(",");
    if (expected !== got) {
      return errorResult(
        `order must be a permutation of the deck's current positions [${expected}], got [${order.join(",")}].`,
      );
    }

    // Park everything above the used range first so no two rows collide while
    // we renumber (position is unique per deck).
    const offset = slides.length + 1000;
    for (const slide of slides) {
      const { error } = await supabase
        .from("deck_slides")
        .update({ position: slide.position + offset } as never)
        .eq("id", slide.id);
      if (error) return errorResult(`Reorder failed while staging: ${error.message}`);
    }
    for (const [next, from] of order.entries()) {
      const slide = slides.find((s) => s.position === from)!;
      const { error } = await supabase
        .from("deck_slides")
        .update({ position: next, updated_at: new Date().toISOString() } as never)
        .eq("id", slide.id);
      if (error) return errorResult(`Reorder failed while renumbering: ${error.message}`);
    }
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, order });
  },
});
