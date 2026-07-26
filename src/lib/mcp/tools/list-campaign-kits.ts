import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_campaign_kits",
  title: "List campaign kits",
  description: "List the signed-in user's saved social and event campaign kits.",
  inputSchema: {
    surface: z.string().describe("Optional filter: 'social' or 'event'.").optional(),
    limit: z.number().int().describe("Maximum number of kits to return (default 25).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ surface, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("campaign_kits")
      .select("id, name, surface, brand_id, mode, profile_id, format_ids, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(take);
    if (surface) query = query.eq("surface", surface);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
