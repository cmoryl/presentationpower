import { describe, expect, it } from "vitest";

import { INDUSTRY_BG_COMBOS } from "./industry-backgrounds";
import {
  deckSceneRefs,
  formatBackgroundRefIssues,
  validateAllBackgroundRefs,
  validateLookBackgroundRefs,
} from "./template-background-validate";

describe("DataForce (R03) background references", () => {
  it("is published in the approved background directory", () => {
    const report = validateLookBackgroundRefs("R03");
    expect(report).not.toBeNull();
    expect(report!.compositions).toBe(INDUSTRY_BG_COMBOS);
  });

  it("resolves every deck scene it can request", () => {
    const report = validateLookBackgroundRefs("skin-r03")!;
    expect(formatBackgroundRefIssues([report])).toBe("");
    expect(report.ok).toBe(true);
    expect(report.scenesChecked.length).toBeGreaterThan(4);
  });

  it("collects scene references from section templates, not just level defaults", () => {
    const refs = deckSceneRefs("R03");
    expect(refs.some((r) => r.source.startsWith("section-template"))).toBe(true);
  });
});

describe("all approved background systems", () => {
  it("have no missing or unpublished scene references", () => {
    const reports = validateAllBackgroundRefs();
    expect(formatBackgroundRefIssues(reports)).toBe("");
    expect(reports.every((r) => r.ok)).toBe(true);
  });
});
