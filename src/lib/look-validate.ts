/**
 * LOOK VALIDATION — guards against mismatched pack / recipe combinations.
 *
 * The look is two independent ids (`stylePackId` = S-language, `designRecipeId`
 * = R industry ground). Independent does not mean *any* pair is coherent. The
 * Gaming demo shipped a retail-flavoured pairing (S11 + R13) with a Gaming
 * brief, so the deck painted supermarket plates behind gaming copy. This module
 * is the single place those rules live; it is used by the demo look admin, the
 * deck context setter and the showcase retargeter.
 *
 * Rules enforced here:
 *   1. R without S is meaningless — `composeEffectivePack` drops it silently.
 *   2. Both ids must exist in the catalog.
 *   3. An industry pack (`skin-rNN`) must not also carry an R recipe: the
 *      ground would be applied twice, from two different industries.
 *   4. Element product languages (S29 / S30) must not wear industry plates —
 *      they ship their own authored brand ground.
 *   5. When an industry/division intent is known, the recipe must belong to it;
 *      a recipe from another sector is a mismatch with a suggested fix.
 */

import { INDUSTRY_RECIPES, designSkinByCode, industryRecipeById } from "./design-skins";
import { isSkinPackId, skinCodeFromPackId } from "./design-skin-pack";

export type LookIssueLevel = "error" | "warning";

export interface LookIssue {
  level: LookIssueLevel;
  code:
    | "recipe-without-pack"
    | "unknown-pack"
    | "unknown-recipe"
    | "double-industry"
    | "product-language-recipe"
    | "industry-mismatch";
  message: string;
  /** The repair `normalizeLook()` applies for this issue. */
  fix?: string;
}

export interface LookInput {
  stylePackId?: string | null;
  designRecipeId?: string | null;
  /** Optional intent: division industry, brief industry or recipe name. */
  industry?: string | null;
}

export interface LookValidation {
  ok: boolean;
  issues: LookIssue[];
  /** Recipe that best matches `industry`, when one could be resolved. */
  suggestedRecipeId: string | null;
}

const PRODUCT_LANGUAGE_CODES = new Set(["S29", "S30"]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Best-guess R recipe for a free-text industry / division sector. */
export function recipeForIndustry(industry: string | null | undefined): string | null {
  const needle = norm(industry ?? "");
  if (!needle) return null;
  const direct = industryRecipeById(needle.toUpperCase());
  if (direct) return direct.id;

  let best: { id: string; score: number } | null = null;
  for (const r of INDUSTRY_RECIPES) {
    const haystack = [r.name, ...(r.keywords ?? [])].map(norm);
    let score = 0;
    for (const h of haystack) {
      if (!h) continue;
      if (h === needle) score = Math.max(score, 100);
      else if (h.includes(needle) || needle.includes(h)) score = Math.max(score, 60);
      else {
        const words = needle.split(" ").filter((w) => w.length > 3);
        if (words.some((w) => h.includes(w))) score = Math.max(score, 30);
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { id: r.id, score };
  }
  return best && best.score >= 30 ? best.id : null;
}

/** Does this R recipe plausibly serve the named industry? */
export function recipeMatchesIndustry(
  recipeId: string | null | undefined,
  industry: string | null | undefined,
): boolean {
  if (!recipeId || !industry) return true;
  const want = recipeForIndustry(industry);
  if (!want) return true; // no confident opinion → don't block
  return want === recipeId;
}

export function validateLook(input: LookInput): LookValidation {
  const issues: LookIssue[] = [];
  const packId = input.stylePackId ?? null;
  const recipeId = input.designRecipeId ?? null;
  const suggestedRecipeId = recipeForIndustry(input.industry);

  const packCode = packId && isSkinPackId(packId) ? skinCodeFromPackId(packId) : null;
  const packKnown = packId ? Boolean(packCode && designSkinByCode(packCode)) : true;
  const recipe = recipeId ? industryRecipeById(recipeId) : null;

  if (packId && !packKnown) {
    issues.push({
      level: "error",
      code: "unknown-pack",
      message: `Unknown visual language “${packId}”.`,
      fix: "Falls back to the approved brand system.",
    });
  }
  if (recipeId && !recipe) {
    issues.push({
      level: "error",
      code: "unknown-recipe",
      message: `Unknown background family “${recipeId}”.`,
      fix: "Background family cleared.",
    });
  }

  if (recipeId && !packId) {
    issues.push({
      level: "error",
      code: "recipe-without-pack",
      message: `Background family ${recipeId} needs a visual language to sit under — on its own it is ignored.`,
      fix: "Background family cleared.",
    });
  }

  if (recipe && packCode && /^R\d{2}$/.test(packCode)) {
    issues.push({
      level: "error",
      code: "double-industry",
      message: `${packCode} is already an industry language; adding ${recipeId} paints two different industry grounds.`,
      fix: "Background family cleared.",
    });
  }

  if (recipe && packCode && PRODUCT_LANGUAGE_CODES.has(packCode)) {
    issues.push({
      level: "error",
      code: "product-language-recipe",
      message: `${packCode} ships its own Element brand ground; industry plates would overwrite it.`,
      fix: "Background family cleared.",
    });
  }

  if (recipe && input.industry && suggestedRecipeId && suggestedRecipeId !== recipe.id) {
    const want = industryRecipeById(suggestedRecipeId);
    issues.push({
      level: "warning",
      code: "industry-mismatch",
      message: `Background family ${recipe.id} ${recipe.name} doesn’t match “${input.industry}”${
        want ? ` — ${want.id} ${want.name} does` : ""
      }.`,
      fix: want ? `Use ${want.id} or clear the background family.` : undefined,
    });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues, suggestedRecipeId };
}

/**
 * Repair a look so it can never persist an invalid combination. Warnings are
 * surfaced but never silently rewritten — art direction stays the author's
 * call; only structurally broken pairings are corrected.
 */
export function normalizeLook(input: LookInput): {
  stylePackId: string | null;
  designRecipeId: string | null;
  issues: LookIssue[];
  changed: boolean;
} {
  const { issues } = validateLook(input);
  let packId = input.stylePackId ?? null;
  let recipeId = input.designRecipeId ?? null;

  for (const issue of issues) {
    if (issue.code === "unknown-pack") packId = null;
    if (
      issue.code === "unknown-recipe" ||
      issue.code === "recipe-without-pack" ||
      issue.code === "double-industry" ||
      issue.code === "product-language-recipe"
    ) {
      recipeId = null;
    }
  }
  // A cleared pack can never keep a ground.
  if (!packId) recipeId = null;

  return {
    stylePackId: packId,
    designRecipeId: recipeId,
    issues,
    changed: packId !== (input.stylePackId ?? null) || recipeId !== (input.designRecipeId ?? null),
  };
}
