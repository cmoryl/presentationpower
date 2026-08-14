import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "generate_deck",
  title: "Generate a deck from a brief",
  description:
    "Run the full authoring pipeline for the signed-in user: narrative strategist section planning, grounded knowledge synthesis, variant selection and copy personalization, then save the deck. Pass brief_id from create_brief, or the brief fields inline. Returns the deck id, an ordered slide summary and the editor URL.",
  inputSchema: {
    brief_id: z.string().describe("Existing brief UUID from create_brief.").optional(),
    prospect: z.string().describe("Prospect or client name (required without brief_id).").optional(),
    industry: z.string().describe("Industry vertical.").optional(),
    audience: z.string().describe("Who is in the room.").optional(),
    meeting_objective: z.string().describe("What the meeting should achieve.").optional(),
    client_facts: z.string().describe("Freeform known facts about the client.").optional(),
    brand_mode_id: z
      .string()
      .describe("Brand mode id, e.g. 'bm-enterprise'. Call get_taxonomy for the list.")
      .optional(),
    sub_company: z.string().describe("Sub-company name when brand_mode_id is 'bm-subcompany'.")
      .optional(),
    archetype_id: z
      .string()
      .describe("Narrative archetype id, e.g. 'arch-problem-solution'.")
      .optional(),
    length_target: z.number().int().min(4).max(24).describe("Target slide count.").optional(),
    personalize: z
      .boolean()
      .describe("Rewrite copy for this prospect. Defaults to true.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const userId = ctx.getUserId();
    if (!userId) return errorResult("Not authenticated");
    // Imported lazily so the tool module itself stays cheap to load.
    const { generateDeckFromBrief } = await import("@/lib/deck-generate");
    try {
      const res = await generateDeckFromBrief(supabaseForUser(ctx), userId, {
        briefId: input.brief_id,
        prospect: input.prospect,
        industry: input.industry,
        audience: input.audience,
        meetingObjective: input.meeting_objective,
        clientFacts: input.client_facts,
        brandModeId: input.brand_mode_id,
        subCompany: input.sub_company,
        archetypeId: input.archetype_id,
        lengthTarget: input.length_target,
        personalize: input.personalize,
      });
      if (!res.ok) return errorResult(res.error);
      return textResult(res.result);
    } catch (e) {
      return errorResult(`Deck generation failed: ${(e as Error).message}`);
    }
  },
});
