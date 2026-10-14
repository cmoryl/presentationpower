import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_deck_job",
  title: "Check a deck generation job",
  description:
    "Status of a generate_deck run (running, done or failed), with the deck id and summary once done. Poll this instead of calling generate_deck again.",
  inputSchema: { job_id: z.string().describe("Job id returned by generate_deck.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ job_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("deck_jobs")
      .select("id,status,deck_id,result,error,steps,updated_at")
      .eq("id", job_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Job not found");
    const stuck = data.status === "running" && Date.now() - new Date(data.updated_at).getTime() > 15 * 60_000;
    return textResult(JSON.stringify({ ...data, status: stuck ? "failed (stuck over 15 min; call generate_deck again)" : data.status }, null, 2));
  },
});
