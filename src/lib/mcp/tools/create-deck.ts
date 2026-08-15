import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { planDeck } from "@/lib/deck-originate";
import { stylePackById } from "@/lib/style-packs";

/**
 * Deterministic deck origination — no model call, so it works without any AI
 * secret. This is the entry point external clients need: `insert_slide` and the
 * rest all require a deck_id that nothing else could produce.
 */
export default defineTool({
  name: "create_deck",
  title: "Create deck",
  description:
    "Create a deck deterministically (no AI call) by expanding a narrative archetype's section recipe into empty slides, or from an explicit ordered slide list. Validates the brand mode, archetype, and every section/variant pairing before writing anything. Returns the deck id, the ordered slide summary and the editor URL — then fill slides with update_slide_content.",
  inputSchema: {
    brand_mode_id: z.string().describe("Division / brand mode id, e.g. 'bm-tp-legal'."),
    archetype_id: z
      .string()
      .describe("Narrative archetype id whose sectionRecipe becomes the slide order.")
      .optional(),
    slides: z
      .array(
        z.object({
          section_id: z.string().describe("Section framework id, e.g. 'SF-06'."),
          variant_id: z
            .string()
            .describe("Optional variant to pin; must be permitted for that section.")
            .optional(),
        }),
      )
      .describe("Explicit ordered slide list. Overrides the archetype recipe.")
      .optional(),
    section_framework_ids: z
      .array(z.string())
      .describe("Restrict the archetype recipe to these sections, in recipe order.")
      .optional(),
    title: z.string().describe("Deck title. Defaults to the archetype name.").optional(),
    client_name: z.string().describe("Prospect/client, used in the default title.").optional(),
    style_pack_id: z
      .string()
      .describe(
        "Design skin / style pack id for the whole deck — an OnDeck catalog skin ('skin-s01'…'skin-s28') or a built-in pack id. Omit to keep the approved brand system.",
      )
      .optional(),
    design_recipe_id: z
      .string()
      .describe("Industry recipe id from the design skin catalog, e.g. 'R01'.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");

    // Plan first: a bad pairing must fail before any row is written.
    const plan = planDeck(input);
    if (!plan.ok) return errorResult(plan.error);

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId?.();
    if (!userId) return errorResult("Not authenticated");

    const { data: deck, error } = await supabase
      .from("decks")
      .insert({
        owner_id: userId,
        title: plan.value.title,
        brand_mode_id: plan.value.brandModeId,
        archetype_id: plan.value.archetypeId,
        status: "draft",
        context: {
          clientName: input.client_name ?? null,
          stylePackId: input.style_pack_id ?? null,
          designRecipeId: input.design_recipe_id ?? null,
        } as never,
      } as never)
      .select("id, title, brand_mode_id, archetype_id")
      .single();
    if (error) return errorResult(error.message);

    const deckId = (deck as { id: string }).id;
    const { error: sErr } = await supabase.from("deck_slides").insert(
      plan.value.slides.map((s) => ({
        deck_id: deckId,
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        content: {} as never,
      })) as never,
    );
    if (sErr) {
      // Don't leave an empty shell behind when the slide write fails.
      await supabase.from("decks").delete().eq("id", deckId);
      return errorResult(`Deck slides could not be created: ${sErr.message}`);
    }

    return textResult({
      ok: true,
      deck_id: deckId,
      title: plan.value.title,
      brand_mode_id: plan.value.brandModeId,
      archetype_id: plan.value.archetypeId,
      slide_count: plan.value.slides.length,
      slides: plan.value.slides.map((s) => ({
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        chosen_by: s.chosenBy,
      })),
      editor_url: `/deck/${deckId}`,
    });
  },
});
