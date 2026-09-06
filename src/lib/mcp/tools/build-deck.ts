import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { auditVisualData } from "@/lib/agent/visual-data-gaps";
import { resolveVariantSwap, applyIcon } from "@/lib/slide-ops";
import { stylePackById } from "@/lib/style-packs";
import { hasNativeVariantEmitter } from "@/lib/export-native-variants";
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
        "AUTHORIZED OVERRIDES ONLY: a design skin / style pack id for the whole deck ('skin-s01'…'skin-s28' or a built-in pack id). Omit for every normal build so the deck is created on the approved Enterprise brand system — set this only when the user explicitly named a different look, and then also set allow_non_enterprise_look: true.",
      )
      .optional(),
    allow_non_enterprise_look: z
      .boolean()
      .describe(
        "Must be true when style_pack_id is set. Confirms the user explicitly authorized a look other than the approved Enterprise brand system.",
      )
      .optional(),
    appearance: z
      .enum(["light", "dark", "mixed"])
      .describe(
        "Light/dark treatment within the approved brand system. 'mixed' (DEFAULT) = dark cover and closing with light working slides (override per slide with each slide's mode), 'light' = Enterprise Light whole-deck, 'dark' = Enterprise Dark whole-deck. Ignored for the base look when style_pack_id is set.",
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
          variant_id: z.string().describe("Module variant id permitted for that section."),
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
    // Approved brand system is the creation default: a different skin is only
    // written when the caller explicitly confirms an authorized override.
    if (input.style_pack_id && !input.allow_non_enterprise_look) {
      return errorResult(
        "New decks are created on the approved Enterprise brand system. Omit style_pack_id (light/dark mixing is done with per-slide modes), or set allow_non_enterprise_look: true only when the user explicitly authorized a different look.",
      );
    }

    // Mixed is the default appearance: dark bookends, light working slides.
    const appearance = input.appearance ?? "mixed";

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
        appearance === "mixed"
          ? (s.mode ?? (i === 0 || i === lastIdx ? "dark" : "light"))
          : (s.mode ?? appearance);
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

    // Appearance is expressed through per-slide modes on the approved
    // Enterprise brand system. Alternate skins are stored only when explicitly
    // authorized above.
    const stylePackId = input.style_pack_id ?? null;

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
          stylePackId,
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
        // Per-slide light/dark rides in the slide extras so it round-trips
        // through save/load exactly like editor-set modes.
        content: (s.mode ? { ...s.content, __extras: { mode: s.mode } } : s.content) as never,
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
      appearance,
      style_pack_id: stylePackId,
      slide_count: planned.length,
      slides: planned.map((s) => ({
        position: s.position,
        section_id: s.sectionId,
        variant_id: s.variantId,
        layout_id: s.layoutId,
        mode: s.mode,
        exports_natively: hasNativeVariantEmitter(s.variantId),
      })),
      editor_url: `/deck/${deckId}`,
      pptx_delivery:
        "Call export_deck next and give the user its download_url — that file is the finished editable deck. Slides with exports_natively: false still export complete; swap them for a native alternative only if the user wants pixel-exact design plates without opening the app.",
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
