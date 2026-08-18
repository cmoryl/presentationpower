/**
 * EFFECTIVE PACK — the one canonical composition of the two look ids.
 *
 * The look is always TWO independent selections:
 *   • `stylePackId`    — an approved visual language (S01–S28), e.g. `skin-s16`,
 *                        or null for the approved TransPerfect brand system.
 *   • `designRecipeId` — an industry recipe (R01–R30), e.g. `R20`, or null.
 *
 * Industry is a GROUND/CONTEXT layer, never the primary visual language: the
 * composed pack keeps the S-style's typography, card geometry, palette tokens,
 * density and layout personality and replaces only `ground()` with the industry
 * background system (via the existing `withIndustryGround`).
 *
 * Every surface — library previews, deck editor, present, print, document,
 * share and every export path — resolves the look through this module so screen
 * and export can never disagree.
 */

import { stylePackById, type StylePack } from "./style-packs";
import { withIndustryGround, industryBackgroundSet } from "./industry-backgrounds";

export interface LookSelection {
  stylePackId?: string | null;
  designRecipeId?: string | null;
}

/**
 * Compose a resolved base pack with an industry ground.
 *
 * With no base pack we deliberately return null (approved brand default) rather
 * than promoting the R recipe into the primary visual language.
 */
export function composeEffectivePack(
  base: StylePack | null | undefined,
  designRecipeId?: string | null,
): StylePack | null {
  if (!base) return null;
  if (!designRecipeId) return base;
  return withIndustryGround(base, designRecipeId);
}

/** Resolve both ids into the one effective pack. Null = brand default. */
export function effectivePack(sel: LookSelection | null | undefined): StylePack | null {
  return composeEffectivePack(stylePackById(sel?.stylePackId ?? null), sel?.designRecipeId ?? null);
}

/** Human label for the active composition, e.g. `S16 Luxury Gallery + R20 Luxury`. */
export function lookSelectionLabel(sel: LookSelection | null | undefined): string {
  const base = stylePackById(sel?.stylePackId ?? null);
  const set = industryBackgroundSet(sel?.designRecipeId ?? null);
  const left = base ? `${base.reference} ${base.label}` : "Approved brand system (TransPerfect)";
  return set ? `${left} + ${set.recipeId} ${set.name}` : left;
}
