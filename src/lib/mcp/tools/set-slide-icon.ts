import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlide, touchDeck } from "../deck-access";
import { applyIcon } from "@/lib/slide-ops";

export default defineTool({
  name: "set_slide_icon",
  title: "Set slide icon",
  description:
    "Set the icon on a slide, either the slide-level icon or the icon of one item in the slide's item list. Use search_icons to find a valid name.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    position: z.number().int().min(0).describe("0-based slide position."),
    icon_ref: z.string().describe("Curated icon name (e.g. 'Rocket') or a 'pack:name' reference."),
    item_index: z
      .number()
      .int()
      .min(0)
      .describe("Optional — set the icon on content.items[item_index] instead of the slide icon.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, position, icon_ref, item_index }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const found = await loadSlide(supabase, deck_id, position);
    if (!found.ok) return errorResult(found.error);
    const next = applyIcon(found.slide.content, icon_ref, item_index);
    if (!next.ok) return errorResult(next.error);
    const { error } = await supabase
      .from("deck_slides")
      .update({ content: next.value, updated_at: new Date().toISOString() } as never)
      .eq("id", found.slide.id);
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);
    return textResult({ ok: true, deck_id, position, icon: icon_ref, item_index: item_index ?? null });
  },
});
