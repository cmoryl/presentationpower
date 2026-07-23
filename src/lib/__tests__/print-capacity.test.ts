import { describe, it, expect } from "vitest";
import {
  analyzePrintAsset,
  canAddModule,
  PRINT_TEMPLATE_BUDGETS,
  weightForSection,
} from "../print-capacity";
import { emptyCaseStudy } from "../print-assets.types";
import type {
  AdaptorBriefContent,
  CaseStudyContent,
  EBrochureContent,
  PrintStatsSection,
  PrintStatsVariant,
  SpotlightContent,
} from "../print-assets.types";

function makeStats(variantId: PrintStatsVariant, n = 3): PrintStatsSection {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    kind: "stats",
    variantId,
    title: "By the numbers",
    eyebrow: "Impact",
    items: Array.from({ length: n }, (_, i) => ({
      label: `Metric ${i + 1}`,
      value: String(10 + i),
      unit: "%",
    })),
  };
}

describe("print capacity model", () => {
  it("reports ok on an empty case study", () => {
    const rep = analyzePrintAsset("case-study", emptyCaseStudy());
    expect(rep.level).toBe("ok");
    expect(rep.used).toBe(0);
  });

  it("flags a block when modules exceed the page budget", () => {
    const modules = Array.from({ length: 4 }, () => makeStats("kpi-dashboard-portrait", 3));
    const content: CaseStudyContent = { ...emptyCaseStudy(), modules };
    const rep = analyzePrintAsset("case-study", content);
    // 4 * 2.4 = 9.6 vs budget 5.5
    expect(rep.level).toBe("block");
    expect(rep.issues.find((i) => i.code === "modules-page-overflow")).toBeTruthy();
  });

  it("warns when modules approach the page budget", () => {
    // Two callouts + one dashboard = 1.6 + 1.6 + 2.4 = 5.6 (~102% of 5.5) -> block
    // Two callouts + one bento    = 1.6 + 1.6 + 2.0 = 5.2 (~95% of 5.5) -> warn
    const content: CaseStudyContent = {
      ...emptyCaseStudy(),
      modules: [
        makeStats("stat-callout-row-portrait", 3),
        makeStats("stat-callout-row-portrait", 3),
        makeStats("stat-bento-portrait", 3),
      ],
    };
    const rep = analyzePrintAsset("case-study", content);
    expect(rep.level).toBe("warn");
  });

  it("blocks when a stats module has too many items", () => {
    const bad = makeStats("stat-callout-row-portrait", 8); // max 4
    const rep = analyzePrintAsset("case-study", { ...emptyCaseStudy(), modules: [bad] });
    expect(rep.issues.some((i) => i.code === "stats-overflow" && i.level === "block")).toBe(true);
  });

  it("blocks overlong body copy", () => {
    const c: CaseStudyContent = { ...emptyCaseStudy(), summary: "x".repeat(300) };
    const rep = analyzePrintAsset("case-study", c);
    expect(rep.level).toBe("block");
  });

  it("respects spotlight capabilities cap", () => {
    const c: SpotlightContent = {
      productName: "X",
      tagline: "Y",
      capabilities: Array.from({ length: 7 }, () => ({ heading: "h", body: "b" })),
      stats: [],
    };
    const rep = analyzePrintAsset("spotlight", c);
    expect(rep.issues.some((i) => i.code === "capabilities-overflow")).toBe(true);
  });

  it("respects ebrochure bullets cap", () => {
    const c: EBrochureContent = {
      title: "T",
      sections: [
        { heading: "h", body: "b", bullets: ["a", "b", "c", "d", "e", "f"] },
      ],
      stats: [],
    };
    const rep = analyzePrintAsset("ebrochure", c);
    expect(rep.issues.some((i) => i.code === "bullets-overflow")).toBe(true);
  });

  it("respects adaptor-brief feature and know-how caps", () => {
    const c: AdaptorBriefContent = {
      title: "T",
      features: Array.from({ length: 8 }, () => ({ verb: "Supports", body: "b" })),
      knowHow: Array.from({ length: 7 }, () => "line"),
    };
    const rep = analyzePrintAsset("adaptor-brief", c);
    expect(rep.issues.some((i) => i.code === "features-overflow")).toBe(true);
    expect(rep.issues.some((i) => i.code === "knowhow-overflow")).toBe(true);
  });

  it("canAddModule blocks once the lightest variant no longer fits", () => {
    // Fill case-study near budget: two dashboards (2.4 * 2 = 4.8) leaves 0.7 < 1.6
    const modules = [makeStats("kpi-dashboard-portrait"), makeStats("kpi-dashboard-portrait")];
    const gate = canAddModule("case-study", modules, 1.6);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toMatch(/No room/);
  });

  it("canAddModule allows insertion when room remains", () => {
    const gate = canAddModule("case-study", [], 1.6);
    expect(gate.ok).toBe(true);
    expect(gate.remaining).toBeCloseTo(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget, 5);
  });

  it("weightForSection uses variant-specific weights", () => {
    expect(weightForSection(makeStats("kpi-dashboard-portrait"))).toBe(2.4);
    expect(weightForSection(makeStats("stat-callout-row-portrait"))).toBe(1.6);
    expect(weightForSection(makeStats("stat-bento-portrait"))).toBe(2.0);
  });
});
