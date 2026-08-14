import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "search_knowledge",
  title: "Search knowledge base",
  description:
    "Search the division-scoped knowledge base (knowledge entries, brand intel, uploaded brand assets) for verified facts, stats, proof points and client references. Use this before writing any factual claim into a slide.",
  inputSchema: {
    query: z.string().min(1).describe("What you need verified facts about."),
    division_id: z
      .string()
      .describe(
        "Brand mode id from get_taxonomy (e.g. 'bm-enterprise', 'bm-tp-legal'). Defaults to the master brand 'bm-enterprise'.",
      )
      .optional(),
    limit: z.number().int().min(1).max(12).describe("Max snippets to return (default 6).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, division_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { retrieveGrounding } = await import("@/lib/knowledge-grounding.server");
    // Real brand mode ids are `bm-*`; anything else silently scopes the search
    // to a division that does not exist, which filters out the whole corpus.
    const { resolveBrandModeId, DEFAULT_BRAND_MODE_ID } = await import("@/lib/mcp/brand-mode");
    const divisionId = resolveBrandModeId(division_id);
    if (!divisionId) {
      return errorResult(
        `Unknown division/brand mode id "${division_id}". Call get_taxonomy for valid ids (e.g. ${DEFAULT_BRAND_MODE_ID}).`,
      );
    }
    try {
      const { snippets, divisionScoped } = await retrieveGrounding({
        supabase: supabaseForUser(ctx),
        divisionId,
        query,
        limit: limit ?? 6,
      });
      return textResult({
        divisionScoped,
        results: snippets.map((s) => ({
          source: s.source,
          title: s.title,
          body: s.body,
          tags: s.tags,
        })),
      });
    } catch (e) {
      return errorResult(`Knowledge lookup failed: ${(e as Error).message}`);
    }
  },
});
