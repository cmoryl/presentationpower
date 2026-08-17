/**
 * ADAPTIVE STYLE LEARNING — governed, auditable, brand-safe.
 *
 * The Approved Visual Style Library stays the authority. This module only
 * produces a SMALL, CAPPED nudge on top of the deterministic catalog score in
 * `style-intent.ts`, plus the provenance needed to explain it.
 *
 * Non-negotiables encoded here:
 *   • The approved 28 are never mutated, renamed, re-palletted or extended by
 *     learning. Learning can only re-ORDER what the catalog already allows.
 *   • Learned points are hard-capped far below the industry-DNA prior (100 pts),
 *     so personal or crowd preference can never overpower brand / industry /
 *     content constraints.
 *   • Cold start: below the sample floors, learning contributes exactly 0 and
 *     the ranking is pure catalog logic.
 *   • Anti-feedback-loop: capped weights, exponential decay of stale signals,
 *     a guaranteed catalog-only diversity slot in the alternates, and signals
 *     flagged as brand/accessibility violations are never learnable.
 *   • Expansion is a REVIEW CANDIDATE only. Nothing here writes catalog data.
 */

/* -------------------------------------------------------------- signal model */

export type StyleSignal =
  /** A ranked set was presented to the user (neutral; denominator only). */
  | "recommendation_shown"
  /** User opened / paged through the alternates row. */
  | "alternates_viewed"
  /** User picked a style out of the recommendation. */
  | "style_selected"
  /** User replaced the recommended style with a different one. */
  | "style_overridden"
  /** User explicitly dismissed a recommendation. */
  | "recommendation_rejected"
  /** Deck reached a finished state. */
  | "deck_completed"
  /** Deck exported (strongest positive we have). */
  | "deck_exported"
  /** A module / background variant from that style was reused. */
  | "variant_reused"
  /** A module was saved into the user's library under that style. */
  | "module_saved"
  /** Heavy manual restyling after selection — the look did not fit. */
  | "manual_restyle";

/**
 * Signal polarity. Deliberately conservative: no single action is treated as
 * approval. Export and reuse are the only strong positives, and even those sit
 * well under the cap once normalised.
 */
export const SIGNAL_POLARITY: Record<StyleSignal, number> = {
  recommendation_shown: 0,
  alternates_viewed: 0.15,
  style_selected: 0.7,
  style_overridden: -1.1,
  recommendation_rejected: -0.8,
  deck_completed: 1.1,
  deck_exported: 1.6,
  variant_reused: 1.2,
  module_saved: 0.9,
  manual_restyle: -1.2,
};

export const SIGNAL_LABELS: Record<StyleSignal, string> = {
  recommendation_shown: "Recommendation shown",
  alternates_viewed: "Alternates viewed",
  style_selected: "Style selected",
  style_overridden: "Style changed away from",
  recommendation_rejected: "Recommendation rejected",
  deck_completed: "Deck completed",
  deck_exported: "Deck exported",
  variant_reused: "Variant reused",
  module_saved: "Module saved",
  manual_restyle: "Major manual restyling",
};

export function signalPolarity(signal: string): number {
  return SIGNAL_POLARITY[signal as StyleSignal] ?? 0;
}

/* ------------------------------------------------------------ governance caps */

export const LEARNING_LIMITS = {
  /** Max points a single user's history can add to (or take from) one style. */
  userCap: 18,
  /** Max points the aggregate cohort model can move one style. */
  aggregateCap: 24,
  /** Absolute ceiling on catalog + learned delta for one style. */
  totalCap: 30,
  /** Below this many learnable user signals, personal learning is off. */
  userMinSamples: 5,
  /** Below this many learnable cohort signals, aggregate learning is off. */
  aggregateMinSamples: 12,
  /** Signal half-life in days — stale taste decays away. */
  halfLifeDays: 60,
  /** Signals older than this are ignored entirely. */
  maxAgeDays: 365,
  /** Repeat picks needed in one profile before an admin candidate is raised. */
  expansionThreshold: 6,
} as const;

/** Exponential decay factor for a signal of a given age. */
export function decayFactor(ageDays: number, halfLife = LEARNING_LIMITS.halfLifeDays): number {
  if (!Number.isFinite(ageDays) || ageDays <= 0) return 1;
  if (ageDays > LEARNING_LIMITS.maxAgeDays) return 0;
  return Math.pow(0.5, ageDays / halfLife);
}

/* -------------------------------------------------------------- profile keys */

export interface LearningProfile {
  recipeId?: string | null;
  objective?: string | null;
  audience?: string | null;
  density?: string | null;
  data?: string | null;
}

/**
 * Cohort key for aggregate learning: industry × objective × audience × content
 * profile. Coarse on purpose — fine-grained keys never reach the sample floor.
 */
export function profileKey(p: LearningProfile): string {
  const part = (v?: string | null) => (v ? String(v) : "any");
  return [part(p.recipeId), part(p.objective), part(p.audience), part(p.density), part(p.data)].join("|");
}

export function describeProfile(key: string, recipeName?: string | null): string {
  const [recipeId, objective, audience, density, data] = key.split("|");
  const bits = [
    recipeName || (recipeId !== "any" ? recipeId : "All industries"),
    objective !== "any" ? objective.replace(/-/g, " ") : null,
    audience !== "any" ? `${audience.replace(/-/g, " ")} audience` : null,
    density !== "any" ? `${density} density` : null,
    data && data !== "any" ? `${data} data` : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

/* --------------------------------------------------------- learned weight set */

/** Normalised, already-decayed learning payload handed to the recommender. */
export interface LearnedStyleWeights {
  /** User has learning switched on. */
  enabled: boolean;
  /** Per S-code, -1…1. Empty during cold start. */
  userBoost: Record<string, number>;
  userSamples: number;
  /** Per S-code, -1…1 for the cohort this brief falls into. */
  profileBoost: Record<string, number>;
  profileSamples: number;
  profileKey: string;
  generatedAt?: string;
}

export const EMPTY_LEARNING: LearnedStyleWeights = {
  enabled: false,
  userBoost: {},
  userSamples: 0,
  profileBoost: {},
  profileSamples: 0,
  profileKey: "",
};

export function learningActive(l?: LearnedStyleWeights | null): boolean {
  if (!l || !l.enabled) return false;
  return (
    (l.userSamples >= LEARNING_LIMITS.userMinSamples && Object.keys(l.userBoost).length > 0) ||
    (l.profileSamples >= LEARNING_LIMITS.aggregateMinSamples && Object.keys(l.profileBoost).length > 0)
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Turn a raw decayed score map into a normalised -1…1 boost map. Normalising by
 * the largest magnitude keeps one loud style from dominating and makes the cap
 * meaningful regardless of how much history exists.
 */
export function normalizeBoosts(raw: Record<string, number>): Record<string, number> {
  const peak = Math.max(0, ...Object.values(raw).map((v) => Math.abs(v)));
  if (!peak) return {};
  const out: Record<string, number> = {};
  for (const [code, v] of Object.entries(raw)) {
    const n = Math.round((v / peak) * 1000) / 1000;
    if (Math.abs(n) >= 0.02) out[code] = clamp(n, -1, 1);
  }
  return out;
}

export interface LearnedFactor {
  label: string;
  points: number;
  source: "user" | "aggregate";
}

/**
 * Learned point contributions for one style. Always capped; returns [] during
 * cold start or when the user has opted out.
 */
export function learnedFactorsFor(
  code: string,
  learning?: LearnedStyleWeights | null,
): LearnedFactor[] {
  if (!learningActive(learning) || !learning) return [];
  const out: LearnedFactor[] = [];

  if (learning.userSamples >= LEARNING_LIMITS.userMinSamples) {
    const b = learning.userBoost[code] ?? 0;
    if (b) {
      const pts = clamp(b * LEARNING_LIMITS.userCap, -LEARNING_LIMITS.userCap, LEARNING_LIMITS.userCap);
      out.push({
        label: b > 0 ? "you reuse this look" : "you usually move away from this look",
        points: Math.round(pts * 10) / 10,
        source: "user",
      });
    }
  }

  if (learning.profileSamples >= LEARNING_LIMITS.aggregateMinSamples) {
    const b = learning.profileBoost[code] ?? 0;
    if (b) {
      const pts = clamp(
        b * LEARNING_LIMITS.aggregateCap,
        -LEARNING_LIMITS.aggregateCap,
        LEARNING_LIMITS.aggregateCap,
      );
      out.push({
        label: b > 0 ? "works for similar decks" : "underperforms on similar decks",
        points: Math.round(pts * 10) / 10,
        source: "aggregate",
      });
    }
  }

  // Total learned delta ceiling.
  const total = out.reduce((n, f) => n + f.points, 0);
  if (Math.abs(total) > LEARNING_LIMITS.totalCap) {
    const scale = LEARNING_LIMITS.totalCap / Math.abs(total);
    for (const f of out) f.points = Math.round(f.points * scale * 10) / 10;
  }
  return out;
}

/* ----------------------------------------------------------------- provenance */

export interface RecommendationProvenance {
  /** Points from the approved catalog rules alone. */
  catalogPoints: number;
  /** Points added or removed by learning (0 during cold start). */
  learnedPoints: number;
  /** "catalog" until learning contributes anything. */
  source: "catalog" | "catalog+learned";
  /** True while sample floors are unmet — pure catalog logic. */
  coldStart: boolean;
  /** 0–1: how much evidence stands behind the learned part. */
  confidence: number;
  userSamples: number;
  profileSamples: number;
  profileKey: string;
}

export function provenanceFor(
  catalogPoints: number,
  learned: LearnedFactor[],
  learning?: LearnedStyleWeights | null,
): RecommendationProvenance {
  const learnedPoints = Math.round(learned.reduce((n, f) => n + f.points, 0) * 10) / 10;
  const cold = !learningActive(learning);
  const userConf = Math.min(1, (learning?.userSamples ?? 0) / (LEARNING_LIMITS.userMinSamples * 4));
  const aggConf = Math.min(1, (learning?.profileSamples ?? 0) / (LEARNING_LIMITS.aggregateMinSamples * 4));
  return {
    catalogPoints: Math.round(catalogPoints * 10) / 10,
    learnedPoints,
    source: learnedPoints !== 0 ? "catalog+learned" : "catalog",
    coldStart: cold,
    confidence: cold ? 0 : Math.round(Math.max(userConf, aggConf) * 100) / 100,
    userSamples: learning?.userSamples ?? 0,
    profileSamples: learning?.profileSamples ?? 0,
    profileKey: learning?.profileKey ?? "",
  };
}

export function explainProvenance(p: RecommendationProvenance): string {
  if (p.coldStart)
    return "Ranked from approved catalog rules only — not enough usage history to personalise yet.";
  const dir = p.learnedPoints > 0 ? "lifted" : p.learnedPoints < 0 ? "lowered" : "unchanged";
  return `Catalog rules scored ${p.catalogPoints}; learned preference ${dir} it by ${Math.abs(
    p.learnedPoints,
  )} (confidence ${Math.round(p.confidence * 100)}%, ${p.userSamples} of your signals, ${
    p.profileSamples
  } similar decks). Learned weight is capped at ${LEARNING_LIMITS.totalCap} points, well under the industry-DNA prior.`;
}

/* ------------------------------------------------------------------ diversity */

/**
 * Anti-feedback-loop guard: guarantee at least `slots` alternates whose score
 * was NOT lifted by learning, so the catalog keeps proposing looks the user has
 * not already converged on. Pure list surgery — order preserved otherwise.
 */
export function ensureDiversity<T extends { learnedPoints: number }>(
  primary: T[],
  alternates: T[],
  rest: T[],
  slots = 1,
): { primary: T[]; alternates: T[] } {
  const catalogOnly = (x: T) => x.learnedPoints <= 0;
  const have = alternates.filter(catalogOnly).length;
  if (have >= slots) return { primary, alternates };

  const next = [...alternates];
  let need = slots - have;
  for (const cand of rest) {
    if (!need) break;
    if (!catalogOnly(cand)) continue;
    // Replace the most learning-inflated alternate, keeping the count stable.
    let worst = -1;
    let worstPts = -Infinity;
    next.forEach((a, i) => {
      if (!catalogOnly(a) && a.learnedPoints > worstPts) {
        worst = i;
        worstPts = a.learnedPoints;
      }
    });
    if (worst < 0) break;
    next[worst] = cand;
    need -= 1;
  }
  return { primary, alternates: next };
}
