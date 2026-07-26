import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_deck",
  title: "Get deck",
  description: "Get one deck of the signed-in user, including its slides in order.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID, as returned by list_decks."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deck_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: deck, error } = await supabase
      .from("decks")
      .select("id, title, brand_mode_id, archetype_id, created_at, updated_at, is_template")
      .eq("id", deck_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!deck) return errorResult("Deck not found");
    const { data: slides, error: sErr } = await supabase
      .from("deck_slides")
      .select("id, position, section_id, variant_id, layout_id, notes")
      .eq("deck_id", deck_id)
      .order("position", { ascending: true });
    if (sErr) return errorResult(sErr.message);
    return textResult({ ...deck, slides: slides ?? [] });
  },
});
