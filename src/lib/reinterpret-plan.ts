// AI reinterpretation plan — validation + application (pure, no network).
//
// The AI planner (see reinterpret-ai.server.ts) returns, per source slide, a
// recommended design from DESIGN_CATALOG plus lightly re-written copy in our
// voice. Nothing it returns is trusted directly:
//
//  1. the recommended variant must exist in the catalog, otherwise the slide
//     falls back to the deterministic design pass;
//  2. re-written copy is length-clamped and, when the planner drops content,
//     the source bullets are kept so no imported fact disappears;
//  3. every slide the reviewer rejects reverts to the source copy + heuristic
//     layout, so an unapproved plan can never reach a deck.

import { DESIGN_CATALOG, designReinterpretedDeck } from "./reinterpret-design";
import type { MappedSlide } from "./pptx-mapping";

export type AiSlidePlan = {
  /** Source slide index (0-based, matches ParsedSlide.index). */
  index: number;
  /** Recommended variant id from DESIGN_CATALOG. */
  variantId: string;
  /** Re-written headline in our voice (optional — falls back to source). */
  title?: string;
  /** Re-written / re-ordered bullets (optional — falls back to source). */
  bullets?: string[];
  /** Why this layout, in one sentence — shown to the reviewer. */
  rationale: string;
  /** Planner confidence 0–1. */
  confidence: number;
  /** Grounding excerpt numbers the planner used. */
  sourceRefs?: number[];
};

export type PlanIssue = "unknown-variant" | "copy-clamped" | "content-restored";

export type ValidatedPlan = AiSlidePlan & {
  /** Catalog entry backing `variantId`, when it resolved. */
  designName?: string;
  issues: PlanIssue[];
  /** False when the variant did not resolve — slide degrades to heuristics. */
  usable: boolean;
};

export type ReinterpretProposal = {
  /** Deterministic (no-AI) reinterpretation, used for rejected slides. */
  baseline: MappedSlide[];
  plans: ValidatedPlan[];
};

const MAX_TITLE = 90;
const MAX_BULLET = 180;

function clampBullets(
  next: string[] | undefined,
  source: string[],
  issues: PlanIssue[],
): string[] | undefined {
  if (!next || next.length === 0) return undefined;
  const cleaned = next
    .map((b) => (b ?? "").toString().trim())
    .filter(Boolean)
    .map((b) => {
      if (b.length > MAX_BULLET) {
        if (!issues.includes("copy-clamped")) issues.push("copy-clamped");
        return `${b.slice(0, MAX_BULLET - 1).trimEnd()}…`;
      }
      return b;
    });
  if (cleaned.length === 0) return undefined;
  // Never let the planner silently delete more than a third of the content.
  if (source.length >= 3 && cleaned.length < Math.ceil(source.length * 0.66)) {
    issues.push("content-restored");
    const extra = source.filter(
      (s) => !cleaned.some((c) => c.toLowerCase().includes(s.slice(0, 24).toLowerCase())),
    );
    return [...cleaned, ...extra].slice(0, Math.max(source.length, cleaned.length));
  }
  return cleaned;
}

export function validateAiPlans(mapped: MappedSlide[], raw: AiSlidePlan[]): ValidatedPlan[] {
  const byIndex = new Map(mapped.map((m) => [m.source.index, m]));
  const catalog = new Map(DESIGN_CATALOG.map((d) => [d.variantId, d]));
  const out: ValidatedPlan[] = [];

  for (const p of raw) {
    const slide = byIndex.get(p.index);
    if (!slide) continue;
    const issues: PlanIssue[] = [];
    const entry = catalog.get(p.variantId);
    if (!entry) issues.push("unknown-variant");

    let title = (p.title ?? "").trim();
    if (title.length > MAX_TITLE) {
      title = `${title.slice(0, MAX_TITLE - 1).trimEnd()}…`;
      if (!issues.includes("copy-clamped")) issues.push("copy-clamped");
    }

    const sourceBullets = (slide.source.bullets ?? []).filter(Boolean);
    const bullets = clampBullets(p.bullets, sourceBullets, issues);

    out.push({
      index: p.index,
      variantId: p.variantId,
      title: title || undefined,
      bullets,
      rationale: (p.rationale ?? "").toString().slice(0, 240),
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0)),
      sourceRefs: Array.isArray(p.sourceRefs) ? p.sourceRefs.slice(0, 8) : [],
      designName: entry?.name,
      issues,
      usable: Boolean(entry),
    });
  }

  return out.sort((a, b) => a.index - b.index);
}

/**
 * Apply only the approved plans. Approved slides get the AI copy + AI layout
 * preference; everything else runs through the plain deterministic pass.
 */
export function applyApprovedPlans(
  mapped: MappedSlide[],
  plans: ValidatedPlan[],
  approvedIndexes: Set<number>,
  /** Deck-wide design-style bias (see reinterpret-style.ts). */
  styleVariantIds?: string[],
  /** Per-slide design-style bias, overriding the deck-wide one. */
  styleVariantIdsByIndex?: Record<number, string[]>,
): MappedSlide[] {
  const approved = plans.filter((p) => p.usable && approvedIndexes.has(p.index));
  const byIndex = new Map(approved.map((p) => [p.index, p]));

  const withCopy = mapped.map((m) => {
    const p = byIndex.get(m.source.index);
    if (!p) return m;
    return {
      ...m,
      source: {
        ...m.source,
        title: p.title || m.source.title,
        bullets: p.bullets ?? m.source.bullets,
      },
    } as MappedSlide;
  });

  const preferred: Record<number, string> = {};
  for (const p of approved) preferred[p.index] = p.variantId;

  const designed = designReinterpretedDeck(withCopy, {
    preferred,
    styleVariantIds,
    styleVariantIdsByIndex,
  });

  // Carry the reviewer-visible rationale onto the slide so the deck records
  // why each page looks the way it does.
  return designed.map((m) => {
    const p = byIndex.get(m.source.index);
    if (!p) return m;
    return { ...m, rationale: `${m.rationale} · ${p.rationale}` };
  });
}

/** Baseline (no AI) reinterpretation — used for rejected slides and previews. */
export function baselineReinterpretation(
  mapped: MappedSlide[],
  styleVariantIds?: string[],
  styleVariantIdsByIndex?: Record<number, string[]>,
): MappedSlide[] {
  return designReinterpretedDeck(mapped, { styleVariantIds, styleVariantIdsByIndex });
}

