import { describe, expect, it } from "vitest";

import { normalizeLook, recipeForIndustry, validateLook } from "../look-validate";

describe("look validation", () => {
  it("accepts a plain S language with no ground", () => {
    expect(validateLook({ stylePackId: "skin-s03" }).ok).toBe(true);
  });

  it("accepts a coherent S + R pairing", () => {
    const r = recipeForIndustry("Gaming");
    expect(r).toBeTruthy();
    expect(validateLook({ stylePackId: "skin-s03", designRecipeId: r, industry: "Gaming" }).ok).toBe(
      true,
    );
  });

  it("rejects an R-only look", () => {
    const v = validateLook({ stylePackId: null, designRecipeId: "R22" });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("recipe-without-pack");
    expect(normalizeLook({ stylePackId: null, designRecipeId: "R22" }).designRecipeId).toBeNull();
  });

  it("rejects an industry ground on an industry language", () => {
    const v = validateLook({ stylePackId: "skin-r22", designRecipeId: "R13" });
    expect(v.issues.map((i) => i.code)).toContain("double-industry");
    expect(normalizeLook({ stylePackId: "skin-r22", designRecipeId: "R13" }).designRecipeId).toBeNull();
  });

  it("rejects industry plates on the Element product languages", () => {
    const v = validateLook({ stylePackId: "skin-s29", designRecipeId: "R02" });
    expect(v.issues.map((i) => i.code)).toContain("product-language-recipe");
  });

  it("rejects unknown ids", () => {
    const v = validateLook({ stylePackId: "skin-s99", designRecipeId: "R99" });
    expect(v.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["unknown-pack", "unknown-recipe"]),
    );
    const n = normalizeLook({ stylePackId: "skin-s99", designRecipeId: "R99" });
    expect(n.stylePackId).toBeNull();
    expect(n.designRecipeId).toBeNull();
  });

  it("warns when the ground belongs to another sector (the gaming defect)", () => {
    const gaming = recipeForIndustry("Gaming");
    const retail = recipeForIndustry("Retail");
    expect(gaming).not.toBe(retail);
    const v = validateLook({
      stylePackId: "skin-s11",
      designRecipeId: retail,
      industry: "Gaming",
    });
    expect(v.issues.map((i) => i.code)).toContain("industry-mismatch");
    expect(v.suggestedRecipeId).toBe(gaming);
    // Warnings never silently rewrite art direction.
    expect(normalizeLook({ stylePackId: "skin-s11", designRecipeId: retail, industry: "Gaming" }).designRecipeId).toBe(
      retail,
    );
  });
});
