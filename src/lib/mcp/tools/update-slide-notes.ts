import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlide, touchDeck } from "../deck-access";

export default defineTool({
  name: "update_slide_notes",
  title: "Update speaker notes",
  description:
    "Replace the private speaker notes for a slide. Notes appear only in presenter mode and PowerPoint exports, never on the slide.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    position: z.number().int().min(0).describe("0-based slide position."),
    notes: z.string().describe("Full replacement notes text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, position, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const found = await loadSlide(supabase, deck_id, position);
    if (!found.ok) return errorResult(found.error);
    const { error } = await supabase
      .from("deck_slides")
      .update({ notes, updated_at: new Date().toISOString() } as never)
      .eq("id", found.slide.id);
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, position, length: notes.length });
  },
});
