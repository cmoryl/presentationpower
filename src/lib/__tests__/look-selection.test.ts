import { describe, expect, it } from "vitest";

import {
  applyIndustryGround,
  canApplyIndustryGround,
  deckContextFromLook,
  emptyLookSelection,
  selectIndustryFilter,
  selectStyle,
  type LookSelectionState,
} from "@/lib/look-selection";
import { composeEffectivePack, effectivePack } from "@/lib/effective-pack";
import { stylePackById } from "@/lib/style-packs";

const withS16: LookSelectionState = { ...emptyLookSelection, stylePackId: "skin-s16" };

describe("look selection — S style and R ground stay independent", () => {
  it("1. browsing an industry never persists a ground", () => {
    const next = selectIndustryFilter(withS16, "R20");
    expect(next.industryFilterId).toBe("R20");
    expect(next.appliedRecipeId).toBeNull();
    expect(deckContextFromLook(next).designRecipeId).toBeNull();
  });

  it("2. a filtered ground previews as S16 + R20 while the style identity stays S16", () => {
    const base = stylePackById("skin-s16")!;
    const preview = composeEffectivePack(base, "R20")!;
    expect(preview.id).toBe(base.id);
    expect(preview.type).toEqual(base.type);
    expect(preview.card).toEqual(base.card);
    expect(preview.mode).toBe(base.mode);
    expect(preview.ground("scene:cover take:0")).not.toEqual(base.ground("scene:cover take:0"));
  });

  it("3. applying R20 with S16 persists both ids independently", () => {
    const next = applyIndustryGround(selectIndustryFilter(withS16, "R20"), "R20");
    expect(deckContextFromLook(next)).toEqual({
      stylePackId: "skin-s16",
      designRecipeId: "R20",
    });
  });

  it("4. switching S16 → S04 keeps the applied R20 ground", () => {
    const applied = applyIndustryGround(withS16, "R20");
    const next = selectStyle(applied, "skin-s04");
    expect(deckContextFromLook(next)).toEqual({
      stylePackId: "skin-s04",
      designRecipeId: "R20",
    });
  });

  it("5. switching R20 → R08 keeps the S style", () => {
    const next = applyIndustryGround(applyIndustryGround(withS16, "R20"), "R08");
    expect(next.stylePackId).toBe("skin-s16");
    expect(next.appliedRecipeId).toBe("R08");
  });

  it("6. choosing the brand system clears the applied ground but keeps the filter", () => {
    const applied = applyIndustryGround(selectIndustryFilter(withS16, "R20"), "R20");
    const next = selectStyle(applied, null);
    expect(next.appliedRecipeId).toBeNull();
    expect(next.industryFilterId).toBe("R20");
    expect(deckContextFromLook(next)).toEqual({ stylePackId: null, designRecipeId: null });
  });

  it("7. an R-only look cannot be created through the picker or deck creation", () => {
    expect(canApplyIndustryGround(emptyLookSelection)).toBe(false);
    const refused = applyIndustryGround(selectIndustryFilter(emptyLookSelection, "R20"), "R20");
    expect(refused.appliedRecipeId).toBeNull();
    expect(deckContextFromLook({ ...emptyLookSelection, appliedRecipeId: "R20" })).toEqual({
      stylePackId: null,
      designRecipeId: null,
    });
    // And the resolver agrees: an R-only look has no base to ground.
    expect(effectivePack({ stylePackId: null, designRecipeId: "R20" })).toBeNull();
  });

  it("8. reload / export resolve the persisted pair to the same composition", () => {
    const ctx = deckContextFromLook(applyIndustryGround(withS16, "R20"));
    const reloaded = effectivePack(ctx)!;
    const expected = composeEffectivePack(stylePackById("skin-s16"), "R20")!;
    expect(reloaded.id).toBe(expected.id);
    expect(reloaded.reference).toBe(expected.reference);
    expect(reloaded.ground("scene:cover take:0")).toEqual(expected.ground("scene:cover take:0"));
  });
});
