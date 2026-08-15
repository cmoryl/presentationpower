import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlide, touchDeck } from "../deck-access";
import { applyContentPatch } from "@/lib/slide-ops";

export default defineTool({
  name: "update_slide_content",
  title: "Update slide content",
  description:
    "Deep-merge a partial content patch into one slide of a deck. Only include the fields you are changing. Filling empty or placeholder fields with new figures is always allowed; overwriting numbers, dates or currency that are already on the slide requires allow_numeric_edits: true. If the call returns an error, the slide was NOT changed — fix the patch and call again, and never tell the user the slide was updated.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    position: z.number().int().min(0).describe("0-based slide position, as returned by get_deck."),
    patch: z
      .record(z.string(), z.unknown())
      .describe("Partial content object to deep-merge into the slide's content."),
    allow_numeric_edits: z
      .boolean()
      .describe("Set true only when the user explicitly asked to change numbers or stats.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, position, patch, allow_numeric_edits }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const found = await loadSlide(supabase, deck_id, position);
    if (!found.ok) return errorResult(found.error);
    const merged = applyContentPatch(found.slide.content, patch as Record<string, unknown>, {
      allowNumericEdits: allow_numeric_edits === true,
    });
    if (!merged.ok) return errorResult(merged.error);
    const { error } = await supabase
      .from("deck_slides")
      .update({ content: merged.value, updated_at: new Date().toISOString() } as never)
      .eq("id", found.slide.id);
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, position, content: merged.value });
  },
});
