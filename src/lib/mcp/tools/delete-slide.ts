import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides, touchDeck } from "../deck-access";

export default defineTool({
  name: "delete_slide",
  title: "Delete slide",
  description:
    "Permanently delete one slide from a deck and close the gap in positions. This cannot be undone from outside the app.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    position: z.number().int().min(0).describe("0-based slide position to delete."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ deck_id, position }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const existing = await loadSlides(supabase, deck_id);
    if (!existing.ok) return errorResult(existing.error);
    const target = existing.slides.find((s) => s.position === position);
    if (!target) return errorResult(`No slide at position ${position} in deck ${deck_id}`);

    const { error } = await supabase.from("deck_slides").delete().eq("id", target.id);
    if (error) return errorResult(error.message);

    // Close the gap, front to back so positions stay unique.
    for (const slide of existing.slides) {
      if (slide.position <= position) continue;
      const { error: shiftErr } = await supabase
        .from("deck_slides")
        .update({ position: slide.position - 1 } as never)
        .eq("id", slide.id);
      if (shiftErr) return errorResult(`Deleted, but resequencing failed: ${shiftErr.message}`);
    }
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, deleted_position: position, remaining: existing.slides.length - 1 });
  },
});
