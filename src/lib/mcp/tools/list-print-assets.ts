import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_print_assets",
  title: "List print assets",
  description:
    "List the signed-in user's saved print assets (case studies, spotlights, e-brochures, adaptor briefs).",
  inputSchema: {
    kind: z
      .string()
      .describe("Optional kind filter: case-study, spotlight, ebrochure, or adaptor-brief.")
      .optional(),
    limit: z.number().int().describe("Maximum number of assets to return (default 25).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kind, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("print_assets")
      .select("id, kind, title, brand_mode_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(take);
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult(data ?? []);
  },
});
