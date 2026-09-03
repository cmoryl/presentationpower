import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides, touchDeck } from "../deck-access";
import { authorCustomModuleFromRequest } from "@/lib/agent/custom-module-request";

export default defineTool({
  name: "author_custom_module",
  title: "Author a new module for an unmatched slide",
  description:
    "LAST RESORT: author a NEW module for a requested slide when no native module variant can hold its shape. Always try list_section_variants / list_variants and insert_slide first — only use this when the closest permitted layout would drop content. The module is built in the approved look as editable canvas objects (heading, copy lines, imagery) and inserted into the deck; set save_to_library to also file it as a draft in the module library (admins only).",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    title: z.string().min(2).describe("Slide headline."),
    lines: z.array(z.string()).describe("Copy lines for the slide, in order.").optional(),
    stats: z
      .array(z.object({ value: z.string(), label: z.string().optional() }))
      .describe("Stat pairs; rendered as copy lines.")
      .optional(),
    image_urls: z.array(z.string()).describe("Absolute image URLs to place.").optional(),
    notes: z.string().describe("Speaker notes.").optional(),
    section_id: z.string().describe("Section framework id this slide belongs to.").optional(),
    position: z
      .number()
      .int()
      .min(0)
      .describe("0-based insert position; defaults to the end.")
      .optional(),
    why_no_native_module: z
      .string()
      .min(10)
      .describe("Why no permitted native variant fits. Shown to the user."),
    save_to_library: z
      .boolean()
      .describe("Also file the authored module as a draft in the module library.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (
    {
      deck_id,
      title,
      lines,
      stats,
      image_urls,
      notes,
      section_id,
      position,
      why_no_native_module,
      save_to_library,
    },
    ctx,
  ) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const existing = await loadSlides(supabase, deck_id);
    if (!existing.ok) return errorResult(existing.error);

    const proposal = authorCustomModuleFromRequest({
      title,
      ...(lines ? { lines } : {}),
      ...(stats ? { stats } : {}),
      ...(image_urls ? { imageUrls: image_urls } : {}),
      ...(notes ? { notes } : {}),
      sectionId: section_id ?? null,
    });
    if (proposal.canvasBlocks.length === 0)
      return errorResult(
        "Nothing to author: pass a title plus at least one copy line, stat or image.",
      );

    const at = Math.min(position ?? existing.slides.length, existing.slides.length);
    for (const slide of [...existing.slides].reverse()) {
      if (slide.position < at) continue;
      const { error } = await supabase
        .from("deck_slides")
        .update({ position: slide.position + 1 } as never)
        .eq("id", slide.id);
      if (error) return errorResult(`Could not make room at position ${at}: ${error.message}`);
    }

    // Canvas blocks ride along in the slide's authoring extras, exactly like a
    // hand-built canvas slide, so editor/PDF/PPTX need no new code path.
    const content = {
      ...(proposal.content as Record<string, unknown>),
      __extras: { canvasBlocks: proposal.canvasBlocks },
    };

    const { data, error } = await supabase
      .from("deck_slides")
      .insert({
        deck_id,
        position: at,
        section_id: section_id ?? proposal.sectionId ?? "SF-06",
        variant_id: proposal.baseVariantId,
        layout_id: "LF-01",
        content: content as never,
        notes: notes ?? proposal.notes ?? null,
      } as never)
      .select("id, position, section_id, variant_id, layout_id")
      .single();
    if (error) return errorResult(error.message);
    await touchDeck(supabase, deck_id);

    let library: Record<string, unknown> | undefined;
    if (save_to_library) {
      const { error: libErr } = await supabase.from("custom_modules").insert({
        module_key: proposal.moduleKey,
        name: proposal.name,
        description: proposal.description,
        base_variant_id: proposal.baseVariantId,
        family_id: proposal.familyId,
        section_id: section_id ?? proposal.sectionId ?? null,
        tags: proposal.tags,
        content: proposal.content as never,
        canvas_blocks: proposal.canvasBlocks as never,
        notes: proposal.notes || null,
        status: "draft",
      } as never);
      library = libErr
        ? {
            saved: false,
            message: `Not filed in the module library (${libErr.message}). The slide itself is in the deck and fully editable.`,
          }
        : { saved: true, status: "draft", module_key: proposal.moduleKey };
    }

    return textResult({
      ok: true,
      slide: data,
      module: {
        name: proposal.name,
        module_key: proposal.moduleKey,
        blocks: proposal.canvasBlocks.length,
        rationale: proposal.rationale,
      },
      why_no_native_module,
      ...(library ? { library } : {}),
      tell_user: `Authored a new module "${proposal.name}" for this slide because no existing module could hold it — every object on it is editable.`,
    });
  },
});
