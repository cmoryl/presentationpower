import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EMPTY_LEARNING,
  LEARNING_LIMITS,
  decayFactor,
  normalizeBoosts,
  signalPolarity,
  type LearnedStyleWeights,
} from "@/lib/style-learning";

/**
 * ADAPTIVE LEARNING — server side.
 *
 * Writes are append-only signals; reads return normalised, decayed, capped
 * weights. Nothing here mutates the approved catalog: expansion only ever
 * produces a PENDING admin-review candidate.
 */

const signalInput = z.object({
  signal: z.string().min(3),
  styleCode: z.string().max(12).optional().nullable(),
  recommendedCodes: z.array(z.string().max(12)).max(30).default([]),
  rankShown: z.number().int().min(0).max(99).optional().nullable(),
  profileKey: z.string().max(200).default(""),
  brief: z.record(z.string(), z.unknown()).default({}),
  deckId: z.string().uuid().optional().nullable(),
  /**
   * Set when the action broke a brand or accessibility rule. Such signals are
   * stored for audit but are NEVER learned from.
   */
  violatesRules: z.boolean().default(false),
});

export const recordStyleSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => signalInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("style_reco_events").insert({
      user_id: context.userId,
      signal: data.signal,
      style_code: data.styleCode ? data.styleCode.toUpperCase() : null,
      recommended_codes: data.recommendedCodes.map((c) => c.toUpperCase()),
      rank_shown: data.rankShown ?? null,
      profile_key: data.profileKey,
      brief: data.brief,
      deck_id: data.deckId ?? null,
      polarity: data.violatesRules ? 0 : signalPolarity(data.signal),
      learnable: !data.violatesRules,
    });
    if (error) throw error;
    return { ok: true };
  });

export const getStyleLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ profileKey: z.string().default("") }).parse(data))
  .handler(async ({ data, context }): Promise<LearnedStyleWeights> => {
    const prefs = await context.supabase
      .from("style_learning_prefs")
      .select("learning_enabled, ignore_before")
      .eq("user_id", context.userId)
      .maybeSingle();

    const enabled = prefs.data?.learning_enabled ?? true;
    if (!enabled) return { ...EMPTY_LEARNING, profileKey: data.profileKey };

    const ignoreBefore = prefs.data?.ignore_before ? new Date(prefs.data.ignore_before).getTime() : 0;

    // 1. PERSONAL — own rows only (RLS enforces it anyway).
    const since = new Date(Date.now() - LEARNING_LIMITS.maxAgeDays * 86400_000).toISOString();
    const own = await context.supabase
      .from("style_reco_events")
      .select("style_code, polarity, created_at")
      .eq("user_id", context.userId)
      .eq("learnable", true)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (own.error) throw own.error;

    const rawUser: Record<string, number> = {};
    let userSamples = 0;
    for (const row of own.data ?? []) {
      const code = (row.style_code ?? "").toUpperCase();
      const pol = Number(row.polarity ?? 0);
      if (!code || !pol) continue;
      const ts = new Date(row.created_at).getTime();
      if (ignoreBefore && ts < ignoreBefore) continue;
      const age = (Date.now() - ts) / 86400_000;
      const w = pol * decayFactor(age);
      if (!w) continue;
      rawUser[code] = (rawUser[code] ?? 0) + w;
      userSamples += 1;
    }

    // 2. COHORT — aggregate only, via a definer function that never exposes rows.
    const rawProfile: Record<string, number> = {};
    let profileSamples = 0;
    if (data.profileKey) {
      const agg = await context.supabase.rpc("style_profile_aggregate", {
        _profile_key: data.profileKey,
      });
      if (!agg.error) {
        for (const row of (agg.data ?? []) as { style_code: string; raw: number; samples: number }[]) {
          const code = (row.style_code ?? "").toUpperCase();
          if (!code) continue;
          rawProfile[code] = (rawProfile[code] ?? 0) + Number(row.raw ?? 0);
          profileSamples += Number(row.samples ?? 0);
        }
      }
    }

    return {
      enabled: true,
      userBoost: userSamples >= LEARNING_LIMITS.userMinSamples ? normalizeBoosts(rawUser) : {},
      userSamples,
      profileBoost:
        profileSamples >= LEARNING_LIMITS.aggregateMinSamples ? normalizeBoosts(rawProfile) : {},
      profileSamples,
      profileKey: data.profileKey,
      generatedAt: new Date().toISOString(),
    };
  });

/** Reset / ignore learned preference. Keeps the audit trail, stops the learning. */
export const setStyleLearningPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        learningEnabled: z.boolean().optional(),
        /** true ⇒ ignore everything recorded before now. */
        resetHistory: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { user_id: context.userId };
    if (typeof data.learningEnabled === "boolean") patch.learning_enabled = data.learningEnabled;
    if (data.resetHistory) patch.ignore_before = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("style_learning_prefs")
      .upsert(patch, { onConflict: "user_id" })
      .select("learning_enabled, ignore_before")
      .single();
    if (error) throw error;
    return row;
  });

export const getStyleLearningPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("style_learning_prefs")
      .select("learning_enabled, ignore_before, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? { learning_enabled: true, ignore_before: null, updated_at: null };
  });

/* ------------------------------------------------------ governed expansion */

export const listExpansionCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("style_expansion_candidates")
      .select("*")
      .order("observations", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

/**
 * Admin-triggered scan. Detects repeated combinations that the current recipe
 * DNA does not cover and files them as PENDING candidates. It never adds a
 * skin, edits a palette or rewrites industry DNA — that stays a human decision.
 */
export const scanExpansionCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ minObservations: z.number().int().min(2).max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const min = data.minObservations ?? LEARNING_LIMITS.expansionThreshold;
    const scan = await context.supabase.rpc("style_expansion_scan", { _min_obs: min });
    if (scan.error) throw scan.error;

    const rows = (scan.data ?? []) as {
      profile_key: string;
      style_codes: string[];
      observations: number;
      evidence: Record<string, unknown>;
    }[];

    const { describeProfile } = await import("@/lib/style-learning");
    const { recipeDnaCodes } = await import("@/lib/approved-visual-styles");
    const { industryRecipeById } = await import("@/lib/design-skins");

    let filed = 0;
    for (const row of rows) {
      const [recipeId, objective, audience] = row.profile_key.split("|");
      const dna = recipeId && recipeId !== "any" ? recipeDnaCodes(recipeId) : [];
      const picks = row.style_codes.slice(0, 2);
      // Only interesting when behaviour diverges from the approved recipe DNA.
      const diverges = dna.length > 0 && picks.some((c) => !dna.includes(c));
      if (!diverges) continue;

      const recipe = recipeId !== "any" ? industryRecipeById(recipeId) : null;
      const title = `${describeProfile(row.profile_key, recipe?.name)} repeatedly choose ${picks.join(
        " + ",
      )} over current recipe DNA (${dna.join(", ") || "none"})`;

      const { error } = await context.supabase.from("style_expansion_candidates").upsert(
        {
          profile_key: row.profile_key,
          title,
          recipe_id: recipeId === "any" ? null : recipeId,
          objective: objective === "any" ? null : objective,
          audience: audience === "any" ? null : audience,
          style_codes: picks,
          observations: row.observations,
          evidence: { ...row.evidence, recipeDna: dna },
          status: "pending",
        },
        { onConflict: "profile_key" },
      );
      if (!error) filed += 1;
    }
    return { scanned: rows.length, filed };
  });

export const reviewExpansionCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "approved", "rejected", "deferred"]),
        note: z.string().max(2000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("style_expansion_candidates")
      .update({
        status: data.status,
        review_note: data.note,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });
