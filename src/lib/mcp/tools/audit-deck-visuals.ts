import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { loadSlides } from "../deck-access";
import { auditVisualData } from "@/lib/agent/visual-data-gaps";

export default defineTool({
  name: "audit_deck_visuals",
  title: "Audit deck visuals for missing data",
  description:
    "Check every chart, KPI board and process diagram in a deck for missing plotted data. Returns each slide whose visual would render as an empty frame on screen and in the PowerPoint export, with the exact content keys to fill and a real example of the shape they expect. Call this after any build or batch of content writes, fix everything it lists with update_slide_content, and re-run until it returns ok — never tell the user a deck is ready while this reports unpopulated visuals.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
  },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const loaded = await loadSlides(supabase, deck_id);
    if (!loaded.ok) return errorResult(loaded.error);
    const audit = auditVisualData(
      loaded.slides.map((s) => ({
        position: s.position,
        variant_id: s.variant_id,
        content: (s.content ?? {}) as Record<string, unknown>,
      })),
    );
    return textResult({ deck_id, ...audit });
  },
});
