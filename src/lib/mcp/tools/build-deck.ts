import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { auditVisualData } from "@/lib/agent/visual-data-gaps";
import { resolveVariantSwap, applyIcon } from "@/lib/slide-ops";
import { stylePackById } from "@/lib/style-packs";
import { BRAND_MODES, byId } from "@/lib/taxonomy";

/**
 * One-call deck build: creates the deck and writes every slide with its full
 * content, speaker notes and icon in a single round trip. This replaces the
 * create_deck → N×insert_slide → N×update_slide_content → N×update_slide_notes
 * → N×set_slide_icon sequence the agent otherwise walks slide by slide, which
 * is the difference between a ~30-call build and a 1-call build.
 */
export default defineTool({
  name: "build_deck",
  title: "Build deck (batch)",
  description:
    "Create a deck AND write every slide's full content, notes and icons in ONE call. Strongly preferred over create_deck + per-slide insert_slide/update_slide_content whenever you are building a whole approved outline at once: pass the ordered slide list with each slide's complete content object (every field filled to its capacity budget), speaker notes and optional icon. Validates every section/variant pairing before writing anything; on failure nothing is written. Returns the deck id, per-slide summary and any visuals that still need plotted data.",
  inputSchema: {
    brand_mode_id: z.string().describe("Division / brand mode id, e.g. 'bm-tp-legal'."),
    title: z.string().describe("Deck title."),
    client_name: z.string().describe("Prospect/client, for context.").optional(),
    style_pack_id: z
      .string()
      .describe(
        "Design skin / style pack id for the whole deck ('skin-s01'…'skin-s28' or a built-in pack id). Omit to keep the approved brand system.",
      )
      .optional(),
    appearance: z
      .enum(["light", "dark", "mixed"])
      .describe(
        "Light/dark treatment. 'light' = Enterprise Light (default), 'dark' = Enterprise Dark whole-deck, 'mixed' = dark cover and closing with light working slides (override per slide with each slide's mode). Ignored for the base look when style_pack_id is set.",
      )
      .optional(),
    design_recipe_id: z
      .string()
      .describe("Industry recipe id from the design skin catalog, e.g. 'R01'.")
      .optional(),
    slides: z
      .array(
        z.object({
          section_id: z.string().describe("Section framework id, e.g. 'SF-06'."),
          variant_id: z
            .string()
            .describe("Module variant id permitted for that section."),
          content: z
            .record(z.string(), z.unknown())
            .describe(
              "The slide's COMPLETE content object — every non-decorative field the variant declares, filled to its capacity budget, including plotted data keys for chart/process modules.",
            ),
          notes: z.string().describe("Speaker notes for this slide.").optional(),
          icon: z
            .string()
            .describe("Slide-level icon name for icon-bearing modules (see search_icons).")
            .optional(),
          mode: z
            .enum(["light", "dark"])
            .describe(
              "Per-slide light/dark override — set dark slides in a mixed deck (e.g. cover and closing dark, working slides light).",
            )
            .optional(),
        }),
      )
      .describe("Ordered slide list, position 0 first."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    if (input.slides.length === 0) return errorResult("slides must contain at least one slide.");
    if (input.slides.length > 30) return errorResult("A deck is capped at 30 slides.");

    if (!byId(BRAND_MODES, input.brand_mode_id)) {
      return errorResult(
        `Unknown brand_mode_id "${input.brand_mode_id}". Call get_taxonomy for valid ids.`,
      );
    }
    if (input.style_pack_id && !stylePackById(input.style_pack_id)) {
      return errorResult(
        `Unknown style_pack_id "${input.style_pack_id}". Use a design skin id ('skin-s01'…'skin-s28') or a built-in style pack id.`,
      );
    }

    // Validate + resolve every slide before any row is written.
    const lastIdx = input.slides.length - 1;
    const planned: Array<{
      position: number;
      sectionId: string;
      variantId: string;
      layoutId: string;
      content: Record<string, unknown>;
      mode: "light" | "dark" | null;
      notes: string | null;
    }> = [];
    for (let i = 0; i < input.slides.length; i++) {
      const s = input.slides[i]!;
      const resolved = resolveVariantSwap(s.section_id, "", s.variant_id);
      if (!resolved.ok) {
        return errorResult(`Slide ${i + 1}: ${resolved.error}`);
      }
      let content = { ...(s.content ?? {}) };
      if (s.icon) {
        const withIcon = applyIcon(content, s.icon);
        if (!withIcon.ok) return errorResult(`Slide ${i + 1}: ${withIcon.error}`);
        content = withIcon.value as Record<string, unknown>;
      }
      // Mixed look: dark bookends (cover + closing), light working slides,
      // unless the agent picked an explicit per-slide mode.
      const mode =
        input.appearance === "mixed"
          ? (s.mode ?? (i === 0 || i === lastIdx ? "dark" : "light"))
          : (s.mode ?? null);
      planned.push({
        position: i,
        sectionId: s.section_id,
        variantId: resolved.value.variantId,
        layoutId: resolved.value.layoutId,
        content,
        mode,
        notes: s.notes ?? null,
      });
    }

    // Appearance → whole-deck pack when no explicit skin was requested:
    // dark builds on Enterprise Dark; light/mixed stay on the approved
    // (light) brand system with per-slide dark modes doing the contrast.
    const stylePackId =
      input.style_pack_id ?? (input.appearance === "dark" ? "skin-s04" : null);

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId?.();
    if (!userId) return errorResult("Not authenticated");

    const { data: deck, error } = await supabase
      .from("decks")
      .insert({
        owner_id: userId,
        title: input.title,
        brand_mode_id: input.brand_mode_id,
        status: "draft",
        context: {
          clientName: input.client_name ?? null,
          stylePackId: input.style_pack_id ?? null,
          designRecipeId: input.design_recipe_id ?? null,
        } as never,
      } as never)
      .select("id, title, brand_mode_id")
      .single();
    if (error) return errorResult(error.message);

    const deckId = (deck as { id: string }).id;
    const { error: sErr } = await supabase.from("deck_slides").insert(
      planned.map((s) => ({
        deck_id: deckId,
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        content: s.content as never,
        notes: s.notes,
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
      title: input.title,
      brand_mode_id: input.brand_mode_id,
      slide_count: planned.length,
      slides: planned.map((s) => ({
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
      })),
      editor_url: `/deck/${deckId}`,
      visuals_needing_data: auditVisualData(
        planned.map((s) => ({
          position: s.position,
          variant_id: s.variantId,
          content: s.content,
        })),
      ),
    });
  },
});
