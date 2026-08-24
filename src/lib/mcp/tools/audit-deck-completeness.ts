import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides } from "../deck-access";
import { auditDeckCompleteness } from "@/lib/agent/slide-completeness";
import { varietyReport } from "@/lib/module-variety";

export default defineTool({
  name: "audit_deck_completeness",
  title: "Audit deck for empty, under-filled or repetitive slides",
  description:
    "Check every slide against its own layout contract and report what is not finished: empty content fields, grids with fewer cards than the layout is built for, copy far under the space the block reserves, charts with no plotted data and missing speaker notes. Also reports layout variety — which module layouts are over-used, how many distinct layouts the deck spends, and the permitted layouts it has not used yet. Returns a per-slide fill score, the exact writable content paths (with character budgets) and blocking vs advisory issues. Run this after any build or batch of writes, fix everything blocking with update_slide_content or change_slide_variant, and re-run until ok — never tell the user a deck is ready while slides render blank regions or three slides share one layout.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    include_advisory: z
      .boolean()
      .describe(
        "Include finishing-pass items (unused slots, thin copy, missing notes). Default true.",
      )
      .optional(),
  },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, include_advisory }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const loaded = await loadSlides(supabase, deck_id);
    if (!loaded.ok) return errorResult(loaded.error);
    const report = auditDeckCompleteness(
      loaded.slides.map((s) => ({
        position: s.position,
        variant_id: s.variant_id,
        content: (s.content ?? {}) as Record<string, unknown>,
        notes: (s as { notes?: string | null }).notes ?? null,
      })),
      { include_advisory: include_advisory ?? true },
    );
    // Layout repetition is invisible to the per-slide audit: each slide can be
    // perfectly written while the deck still reads as one template.
    const variety = varietyReport(
      loaded.slides.map((s) => ({
        position: s.position,
        variant_id: s.variant_id,
        section_id: s.section_id,
      })),
    );
    const variance = include_advisory === false ? { ...variety, issues: variety.issues.filter((i) => i.severity === "blocking") } : variety;
    return textResult({
      deck_id,
      ...report,
      ok: report.ok && variety.ok,
      layout_variety: variance,
    });
  },
});

