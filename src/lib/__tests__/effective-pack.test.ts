import { describe, expect, it } from "vitest";

import { composeEffectivePack, effectivePack } from "@/lib/effective-pack";
import { stylePackById } from "@/lib/style-packs";

describe("effective pack composition", () => {
  it("returns the brand default when no style pack is selected", () => {
    expect(effectivePack({ stylePackId: null, designRecipeId: "R20" })).toBeNull();
  });

  it("keeps the approved style pack identity when a recipe grounds it", () => {
    const base = stylePackById("skin-s16");
    expect(base).toBeTruthy();
    const composed = composeEffectivePack(base, "R20");
    expect(composed).toBeTruthy();
    expect(composed!.id).toBe(base!.id);
    expect(composed!.type).toEqual(base!.type);
    expect(composed!.card).toEqual(base!.card);
    expect(composed!.mode).toBe(base!.mode);
  });

  it("swaps only the ground layer", () => {
    const base = stylePackById("skin-s16")!;
    const composed = composeEffectivePack(base, "R20")!;
    expect(composed.ground("scene:cover take:0")).not.toEqual(base.ground("scene:cover take:0"));
  });

  it("is a pass-through with no recipe", () => {
    const base = stylePackById("skin-s16")!;
    expect(composeEffectivePack(base, null)).toBe(base);
  });
});
