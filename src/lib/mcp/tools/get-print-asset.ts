import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_print_asset",
  title: "Get print asset",
  description: "Get one saved print asset of the signed-in user, including its content blocks.",
  inputSchema: {
    asset_id: z.string().describe("The print asset UUID, as returned by list_print_assets."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ asset_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("print_assets")
      .select("*")
      .eq("id", asset_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Print asset not found");
    return textResult(data);
  },
});
