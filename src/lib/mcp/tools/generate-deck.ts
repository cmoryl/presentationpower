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
    prospect: z
      .string()
      .describe("Prospect or client name (required without brief_id).")
      .optional(),
    industry: z.string().describe("Industry vertical.").optional(),
    audience: z.string().describe("Who is in the room.").optional(),
    meeting_objective: z.string().describe("What the meeting should achieve.").optional(),
    client_facts: z.string().describe("Freeform known facts about the client.").optional(),
    brand_mode_id: z
      .string()
      .describe("Brand mode id, e.g. 'bm-enterprise'. Call get_taxonomy for the list.")
      .optional(),
    sub_company: z
      .string()
      .describe("Sub-company name when brand_mode_id is 'bm-subcompany'.")
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
    const db = supabaseForUser(ctx);
    // Retry-safe: the same brief + user + brand mode maps to one job, so a
    // client that times out and retries gets the first run, not a second deck.
    const keySource = JSON.stringify({ userId, ...input });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keySource));
    const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const existing = await db.from("deck_jobs").select("id,status,result,error,updated_at").eq("idempotency_key", key).maybeSingle();
    if (existing.data) {
      const j = existing.data;
      const stale = j.status === "running" && Date.now() - new Date(j.updated_at).getTime() > 15 * 60_000;
      if (j.status === "done" && j.result) return textResult(`${j.result}\n\n(job ${j.id}: returned the existing deck for this brief; no duplicate created)`);
      if (j.status === "running" && !stale) return textResult(`Deck generation for this brief is already running (job ${j.id}). Call get_deck_job with job_id "${j.id}" to check progress; do not call generate_deck again.`);
      // failed or stuck: clear it and run again
      await db.from("deck_jobs").delete().eq("id", j.id);
    }
    const created = await db.from("deck_jobs").insert({ idempotency_key: key, created_by: userId, steps: [{ step: "started", at: new Date().toISOString() }] }).select("id").single();
    if (created.error) return textResult("Deck generation for this brief has just started in another call. Call get_deck_job to check on it.");
    const jobId = created.data.id;
    // Imported lazily so the tool module itself stays cheap to load.
    const { generateDeckFromBrief } = await import("@/lib/deck-generate");
    try {
      const res = await generateDeckFromBrief(db, userId, {
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
      if (!res.ok) {
        await db.from("deck_jobs").update({ status: "failed", error: res.error, updated_at: new Date().toISOString() }).eq("id", jobId);
        return errorResult(res.error);
      }
      const text = typeof res.result === "string" ? res.result : JSON.stringify(res.result);
      const deckId = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(text)?.[0] ?? null;
      await db.from("deck_jobs").update({ status: "done", result: text, deck_id: deckId, updated_at: new Date().toISOString() }).eq("id", jobId);
      return textResult(res.result);
    } catch (e) {
      await db.from("deck_jobs").update({ status: "failed", error: (e as Error).message, updated_at: new Date().toISOString() }).eq("id", jobId);
      return errorResult(`Deck generation failed: ${(e as Error).message}`);
    }
  },
});
