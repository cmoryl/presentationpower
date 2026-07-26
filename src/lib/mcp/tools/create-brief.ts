import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "create_brief",
  title: "Create brief",
  description:
    "Create a new deck brief for the signed-in user, which can then be opened in the app to generate a deck.",
  inputSchema: {
    prospect: z.string().describe("Prospect or client name."),
    industry: z.string().describe("Industry vertical for the prospect."),
    meeting_objective: z.string().describe("What the meeting should achieve."),
    audience: z.string().describe("Who is in the room."),
    brand_mode_id: z.string().describe("Brand mode id, e.g. 'transperfect'.").optional(),
    client_facts: z.string().describe("Freeform notes and facts about the client.").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("briefs")
      .insert({
        owner_id: ctx.getUserId(),
        prospect: input.prospect,
        industry: input.industry,
        meeting_objective: input.meeting_objective,
        audience: input.audience,
        brand_mode_id: input.brand_mode_id ?? "transperfect",
        client_facts: input.client_facts ?? "",
      })
      .select("id, prospect, industry, created_at")
      .single();
    if (error) return errorResult(error.message);
    return textResult(data);
  },
});
