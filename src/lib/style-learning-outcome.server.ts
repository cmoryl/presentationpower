/**
 * ADAPTIVE LEARNING — outcome attribution (server side).
 *
 * The picker logs a recommendation under the FULL cohort key
 * (industry | objective | audience | density | data). Outcome signals, however,
 * are raised far from that UI — an export page, an approval decision — where
 * only the deck is in hand. Before this module they were logged under
 * "recipe|any|any|any|any", so the strongest positives (export, completion)
 * never reinforced the cohort that actually produced the recommendation, and a
 * single user's history was split across two keys that each stayed below the
 * sample floor. Learning therefore recorded the taste but never closed the loop.
 *
 * This resolves the cohort from the deck's own recommendation history, so an
 * outcome lands on the key that made the suggestion. Governance is unchanged:
 * caps, decay, cold start and the unlearnable-violation rule all still apply.
 */
import { isSkinPackId, skinCodeFromPackId } from "@/lib/design-skin-pack";
import { profileKey, signalPolarity, type LearningProfile } from "@/lib/style-learning";

/** Signals raised after the pick, away from the picker. */
export const OUTCOME_SIGNALS = new Set([
  "deck_completed",
  "deck_exported",
  "variant_reused",
  "module_saved",
  "manual_restyle",
]);

/** True when a key carries no cohort detail beyond (maybe) the industry. */
export function isCoarseProfileKey(key: string): boolean {
  if (!key.trim()) return true;
  const parts = key.split("|");
  // Anything after the industry slot is unset — nothing to attribute against.
  return parts.slice(1).every((p) => !p || p === "any");
}

type Db = {
  from: (t: string) => {
    select: (c: string) => any;
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

/**
 * Best cohort key for an outcome on `deckId`: the most recent recommendation
 * cohort recorded for that deck, falling back to the caller's key.
 */
export async function resolveOutcomeCohort(
  supabase: Db,
  deckId: string | null | undefined,
  given: string,
): Promise<string> {
  if (!deckId || !isCoarseProfileKey(given)) return given;
  try {
    const { data } = await supabase
      .from("style_reco_events")
      .select("profile_key")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as Array<{ profile_key: string | null }>;
    const found = rows.find((r) => r.profile_key && !isCoarseProfileKey(r.profile_key));
    return found?.profile_key ?? given;
  } catch {
    return given;
  }
}

export interface DeckOutcomeResult {
  ok: boolean;
  /** Plain reason when nothing was learned — surfaced, never silently dropped. */
  reason?: string;
  styleCode?: string;
  profileKey?: string;
}

/**
 * Log an outcome signal for a deck from server code that only knows the deck id.
 * Reads the deck's own style pack and cohort; never throws.
 */
export async function logDeckStyleOutcome(
  supabase: Db,
  input: {
    userId: string;
    deckId: string;
    signal: string;
    /** Rule-violating work is stored for audit but never learned from. */
    violatesRules?: boolean;
  },
): Promise<DeckOutcomeResult> {
  try {
    const { data } = await supabase
      .from("decks")
      .select("context")
      .eq("id", input.deckId)
      .maybeSingle();
    const ctx = (data?.context ?? null) as Record<string, unknown> | null;
    const packId = typeof ctx?.stylePackId === "string" ? ctx.stylePackId : null;
    if (!packId || !isSkinPackId(packId)) {
      return { ok: false, reason: "Deck uses the approved brand system, which has no style code to learn about." };
    }
    const styleCode = skinCodeFromPackId(packId);
    if (!styleCode) return { ok: false, reason: "Style pack has no approved S-code." };

    const brief = (ctx?.brief ?? null) as Record<string, unknown> | null;
    const fallback: LearningProfile = {
      recipeId: typeof ctx?.designRecipeId === "string" ? ctx.designRecipeId : null,
      objective: typeof brief?.meetingObjective === "string" ? brief.meetingObjective : null,
      audience: typeof brief?.audience === "string" ? brief.audience : null,
    };
    const key = await resolveOutcomeCohort(supabase, input.deckId, profileKey(fallback));

    const { error } = await supabase.from("style_reco_events").insert({
      user_id: input.userId,
      signal: input.signal,
      style_code: styleCode.toUpperCase(),
      recommended_codes: [],
      rank_shown: null,
      profile_key: key,
      brief: (brief ?? {}) as never,
      deck_id: input.deckId,
      polarity: input.violatesRules ? 0 : signalPolarity(input.signal),
      learnable: !input.violatesRules,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, styleCode, profileKey: key };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Outcome not recorded" };
  }
}
