import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_decks",
  title: "List decks",
  description: "List the signed-in user's saved presentation decks (id, title, brand, dates).",
  inputSchema: {
    limit: z.number().int().describe("Maximum number of decks to return (default 25).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("decks")
      .select("id, title, brand_mode_id, archetype_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(take);
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
