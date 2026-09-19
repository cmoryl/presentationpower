import { describe, expect, it } from "vitest";
import { isCoarseProfileKey, OUTCOME_SIGNALS } from "@/lib/style-learning-outcome.server";
import { profileKey } from "@/lib/style-learning";

describe("outcome cohort attribution", () => {
  it("treats an industry-only key as coarse", () => {
    expect(isCoarseProfileKey(profileKey({ recipeId: "R04" }))).toBe(true);
    expect(isCoarseProfileKey("")).toBe(true);
    expect(isCoarseProfileKey("any|any|any|any|any")).toBe(true);
  });

  it("keeps a full picker cohort key", () => {
    const key = profileKey({
      recipeId: "R04",
      objective: "sales-pitch",
      audience: "executive",
      density: "medium",
      data: "high",
    });
    expect(isCoarseProfileKey(key)).toBe(false);
  });

  it("covers every post-pick signal", () => {
    expect([...OUTCOME_SIGNALS].sort()).toEqual([
      "deck_completed",
      "deck_exported",
      "manual_restyle",
      "module_saved",
      // A reviewer sending work back is evidence too, when the reason is design-fit.
      "review_changes_requested",
      "variant_reused",
    ]);
  });
});
