/**
 * REVIEW REASONS — structured feedback from a reviewer decision.
 *
 * Until now a "changes requested" decision carried only free text, so the system
 * knew work had failed review but never why. Free text cannot be learned from
 * safely: it mixes "this look is wrong for the audience" (a taste signal the
 * recommender should absorb) with "contrast fails WCAG" (a rule violation that
 * must NEVER become learned preference — fixing it is mandatory, not optional).
 *
 * So reasons are a fixed, auditable taxonomy with an explicit learnability flag:
 *   • `look` reasons are about fit and composition → learnable negative signal.
 *   • `compliance` reasons are brand / accessibility violations → recorded for
 *     reporting, never learned from (same rule as `violatesRules` elsewhere).
 *   • `content` reasons are about copy and facts → nothing to teach the visual
 *     recommender, so recorded only.
 */

export type ReviewReasonGroup = "look" | "compliance" | "content";

export interface ReviewReason {
  id: string;
  label: string;
  group: ReviewReasonGroup;
  /** Short reviewer-facing hint shown under the chip group. */
  hint?: string;
}

export const REVIEW_REASONS: ReviewReason[] = [
  // ---- look / fit: these teach the style recommender -----------------------
  {
    id: "look-mismatch",
    label: "Look wrong for this audience",
    group: "look",
    hint: "The style itself does not suit who this is for.",
  },
  { id: "look-too-decorative", label: "Too decorative for the subject", group: "look" },
  { id: "look-too-plain", label: "Too plain — lacks presence", group: "look" },
  { id: "layout-crowded", label: "Layout crowded — copy does not fit", group: "look" },
  { id: "imagery-wrong", label: "Imagery wrong for the story", group: "look" },

  // ---- compliance: recorded, never learned from ----------------------------
  {
    id: "contrast-fail",
    label: "Contrast / accessibility fail",
    group: "compliance",
    hint: "Must be fixed — never treated as a preference.",
  },
  { id: "off-brand", label: "Off-brand lockup, colour or type", group: "compliance" },
  { id: "wrong-lockup", label: "Wrong division or client lockup", group: "compliance" },

  // ---- content: recorded only ---------------------------------------------
  { id: "copy-off-message", label: "Copy unclear or off-message", group: "content" },
  { id: "figures-unsourced", label: "Figures without a source", group: "content" },
  { id: "facts-wrong", label: "Facts wrong or out of date", group: "content" },
  { id: "incomplete", label: "Incomplete — empty slots", group: "content" },
];

export const REVIEW_REASON_IDS = REVIEW_REASONS.map((r) => r.id);

const BY_ID = new Map(REVIEW_REASONS.map((r) => [r.id, r]));

export function reviewReason(id: string): ReviewReason | null {
  return BY_ID.get(id) ?? null;
}

export function reviewReasonLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

export const GROUP_LABEL: Record<ReviewReasonGroup, string> = {
  look: "Design fit",
  compliance: "Brand / accessibility",
  content: "Copy & facts",
};

export function reasonsByGroup(): Array<{ group: ReviewReasonGroup; reasons: ReviewReason[] }> {
  return (["look", "compliance", "content"] as ReviewReasonGroup[]).map((group) => ({
    group,
    reasons: REVIEW_REASONS.filter((r) => r.group === group),
  }));
}

/** Drop unknown ids so a stale client can never widen the taxonomy. */
export function normalizeReasons(ids: readonly string[] | null | undefined): string[] {
  const seen = new Set<string>();
  for (const id of ids ?? []) if (BY_ID.has(id)) seen.add(id);
  return [...seen];
}

export function hasLookReason(ids: readonly string[]): boolean {
  return ids.some((id) => BY_ID.get(id)?.group === "look");
}

export function hasComplianceReason(ids: readonly string[]): boolean {
  return ids.some((id) => BY_ID.get(id)?.group === "compliance");
}

export interface ReasonLearnability {
  /** True when this decision may move learned style preference. */
  learnable: boolean;
  /** Plain-English explanation, shown to the reviewer — never silent. */
  reason: string;
}

/**
 * Decide whether a "changes requested" decision may teach the recommender.
 *
 * Learnable only when the reviewer named a design-fit problem AND no compliance
 * violation is in play: a violation means the work broke a rule, which says
 * nothing about whether the look was the right choice.
 */
export function reasonLearnability(ids: readonly string[]): ReasonLearnability {
  if (ids.length === 0)
    return {
      learnable: false,
      reason: "No reason was named, so nothing was learned from this decision.",
    };
  if (hasComplianceReason(ids))
    return {
      learnable: false,
      reason:
        "A brand or accessibility violation was named — recorded for reporting, but never learned from as a preference.",
    };
  if (!hasLookReason(ids))
    return {
      learnable: false,
      reason: "The reasons are about copy or facts, which teach nothing about the visual style.",
    };
  return { learnable: true, reason: "A design-fit problem was named, so the look was down-weighted for briefs like this one." };
}

/** One-line summary for history notes and the queue row. */
export function describeReasons(ids: readonly string[]): string {
  return normalizeReasons(ids).map(reviewReasonLabel).join(" · ");
}
