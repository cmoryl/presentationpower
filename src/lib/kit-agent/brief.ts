// ---------------------------------------------------------------------------
// CAMPAIGN BRIEF MEMORY — the conversational spine of the events / social agent.
//
// The agents used to hold everything in the chat transcript only. As soon as a
// conversation got long (or the user came back a day later), the model lost the
// event facts it had already collected and started asking for the venue again,
// or built a second kit in a different art direction. The result read as a
// series of disconnected requests rather than one campaign.
//
// A brief is a small, structured record stored on the thread row. The agent
// reads it at the start of every turn and writes back whatever it learned, so
// every later asset — event collateral, the social posts that support it, the
// digital trims — is built from ONE set of facts and ONE art direction.
// ---------------------------------------------------------------------------

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BriefSchema = z.object({
  /** Campaign / event name as it should read on artwork. */
  eventName: z.string().max(200).optional(),
  /** Event kind or campaign angle ("user conference", "product launch"). */
  kind: z.string().max(120).optional(),
  divisionId: z.string().max(80).optional(),
  audience: z.string().max(400).optional(),
  /** The single thing every asset must land. */
  keyMessage: z.string().max(600).optional(),
  proofPoints: z.array(z.string().max(240)).max(8).optional(),
  city: z.string().max(120).optional(),
  venue: z.string().max(200).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  hashtag: z.string().max(80).optional(),
  registrationUrl: z.string().max(400).optional(),
  cta: z.string().max(120).optional(),
  /** Art direction shared by every channel in this campaign. */
  lookId: z.string().max(60).optional(),
  styleId: z.string().max(60).optional(),
  mode: z.enum(["light", "dark", "both"]).optional(),
  /** Deliverables the user asked for, in plain words. */
  deliverables: z.array(z.string().max(160)).max(30).optional(),
  /** Kits already built in this conversation, so follow-ups extend instead of duplicating. */
  kitIds: z.array(z.string().max(60)).max(20).optional(),
  /** Anything the user ruled out — never re-propose these. */
  constraints: z.array(z.string().max(240)).max(20).optional(),
  notes: z.string().max(1200).optional(),
});

export type CampaignBrief = z.infer<typeof BriefSchema>;

/** Fields an EVENT campaign cannot ship without. */
const EVENT_REQUIRED: (keyof CampaignBrief)[] = [
  "eventName",
  "divisionId",
  "audience",
  "keyMessage",
  "city",
  "startDate",
  "cta",
  "lookId",
];

/** Fields a SOCIAL campaign cannot ship without. */
const SOCIAL_REQUIRED: (keyof CampaignBrief)[] = [
  "eventName",
  "divisionId",
  "audience",
  "keyMessage",
  "cta",
  "lookId",
];

const LABELS: Partial<Record<keyof CampaignBrief, string>> = {
  eventName: "campaign or event name",
  divisionId: "division brand mode",
  audience: "audience",
  keyMessage: "one-line key message",
  city: "city",
  startDate: "start date",
  cta: "call to action",
  lookId: "art direction (look)",
};

/** Which required facts are still missing, in plain English. */
export function briefGaps(brief: CampaignBrief, surface: "social" | "event"): string[] {
  const required = surface === "event" ? EVENT_REQUIRED : SOCIAL_REQUIRED;
  return required
    .filter((key) => {
      const value = brief[key];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((key) => LABELS[key] ?? String(key));
}

/** Merge a patch over the stored brief, dropping empty strings so a blank
 *  value from the model never erases a fact the user already gave. */
export function mergeBrief(current: CampaignBrief, patch: CampaignBrief): CampaignBrief {
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    next[key] = value;
  }
  return next as CampaignBrief;
}

export async function readBrief(
  supabase: SupabaseClient,
  threadId: string,
): Promise<CampaignBrief> {
  const { data, error } = await supabase
    .from("agent_threads")
    .select("brief")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const raw = (data as { brief?: unknown } | null)?.brief;
  const parsed = BriefSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export async function writeBrief(
  supabase: SupabaseClient,
  threadId: string,
  brief: CampaignBrief,
): Promise<void> {
  const { error } = await supabase
    .from("agent_threads")
    .update({ brief: brief as never, updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
  if (error) throw new Error(error.message);
}
