/**
 * LOOK SELECTION STATE — the rules that keep the two look ids independent.
 *
 * The picker holds THREE values, not two:
 *   • `stylePackId`      — approved visual language (S01–S28), null = brand system
 *   • `appliedRecipeId`  — the industry ground actually persisted (R01–R30)
 *   • `industryFilterId` — the Industry dropdown: recommendations + S+R preview
 *
 * Browsing an industry must never persist a ground, and a ground can never be
 * persisted on its own: `composeEffectivePack` deliberately returns null with no
 * base pack, so `{ stylePackId: null, designRecipeId: 'Rxx' }` would resolve to
 * nothing at all. These helpers are the single place those rules live, shared by
 * the picker UI and the tests.
 */

export interface LookSelectionState {
  stylePackId: string | null;
  appliedRecipeId: string | null;
  industryFilterId: string | null;
}

export const emptyLookSelection: LookSelectionState = {
  stylePackId: null,
  appliedRecipeId: null,
  industryFilterId: null,
};

/** An industry ground needs a base S-style to sit under. */
export function canApplyIndustryGround(state: LookSelectionState): boolean {
  return !!state.stylePackId;
}

/** Industry dropdown: filter / preview context only, never a persisted change. */
export function selectIndustryFilter(
  state: LookSelectionState,
  industryFilterId: string | null,
): LookSelectionState {
  return { ...state, industryFilterId: industryFilterId || null };
}

/** The explicit "Use this industry ground" / "remove" action. */
export function applyIndustryGround(
  state: LookSelectionState,
  recipeId: string | null,
): LookSelectionState {
  const next = recipeId || null;
  if (next && !canApplyIndustryGround(state)) return state; // refuse R-only
  return { ...state, appliedRecipeId: next, industryFilterId: next ?? state.industryFilterId };
}

/**
 * Picking a visual style. Switching between S-styles keeps the applied ground;
 * returning to the brand system clears it (nothing left to ground) while the
 * filter survives so recommendations keep their sector.
 */
export function selectStyle(
  state: LookSelectionState,
  stylePackId: string | null,
): LookSelectionState {
  if (!stylePackId) return { ...state, stylePackId: null, appliedRecipeId: null };
  return { ...state, stylePackId };
}

/** What may be written to `deck.context` — never an R-only look. */
export function deckContextFromLook(state: LookSelectionState): {
  stylePackId: string | null;
  designRecipeId: string | null;
} {
  return {
    stylePackId: state.stylePackId,
    designRecipeId: state.stylePackId ? state.appliedRecipeId : null,
  };
}
