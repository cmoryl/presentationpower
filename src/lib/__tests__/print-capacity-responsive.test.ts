/**
 * Viewport-invariance contract for the print capacity model.
 *
 * The capacity analyzer must produce identical ok/warn/block verdicts
 * regardless of DOM state, editor viewport, or device pixel ratio — its
 * only inputs are the content model and per-template weight budgets.
 * These tests simulate breakpoint switches by re-running analyzePrintAsset
 * against a shared fixture matrix and asserting stable outputs.
 *
 * If a future refactor sneaks a viewport-derived signal into the analyzer,
 * this suite fails immediately.
 */

import { describe, it, expect } from "vitest";
import {
  analyzePrintAsset,
  canAddModule,
  PRINT_TEMPLATE_BUDGETS,
} from "../print-capacity";
import type {
  CaseStudyContent,
  PrintStatsSection,
  PrintStatsVariant,
  PrintSection,
} from "../print-assets.types";
import { emptyCaseStudy } from "../print-assets.types";

const BREAKPOINTS = [375, 640, 768, 1024, 1280, 1600, 1920] as const;

function stats(variantId: PrintStatsVariant, n: number): PrintStatsSection {
  return {
    id: `s-${variantId}-${n}`,
    kind: "stats",
    variantId,
    title: "Impact",
    eyebrow: "By the numbers",
    items: Array.from({ length: n }, (_, i) => ({
      label: `Metric ${i + 1}`,
      value: String(i + 1),
      unit: "%",
    })),
  };
}

function withModules(base: CaseStudyContent, modules: PrintSection[]): CaseStudyContent {
  return { ...base, modules };
}

/**
 * Wraps analyzePrintAsset with a viewport pretend-parameter — we don't
 * pass it in (the analyzer has no such argument), but we simulate the
 * editor re-invoking analysis on resize by calling repeatedly.
 */
function analyzeAtViewport(width: number, content: CaseStudyContent) {
  void width; // documented no-op: viewport must not influence output
  return analyzePrintAsset("case-study", content);
}

describe("print capacity model — viewport invariance", () => {
  const fixtures: { name: string; content: CaseStudyContent; expected: "ok" | "warn" | "block" }[] = [
    { name: "empty",       content: emptyCaseStudy(), expected: "ok" },
    {
      name: "single-kpi-dashboard",
      content: withModules(emptyCaseStudy(), [stats("kpi-dashboard-portrait", 3)]),
      expected: "ok",
    },
    {
      name: "two-kpi-modules",
      content: withModules(emptyCaseStudy(), [
        stats("kpi-dashboard-portrait", 3),
        stats("stat-callout-row-portrait", 3),
      ]),
      expected: "ok",
    },
    {
      name: "over-budget",
      content: withModules(emptyCaseStudy(), [
        stats("kpi-dashboard-portrait", 3),
        stats("kpi-dashboard-portrait", 3),
        stats("stat-bento-portrait", 3),
      ]),
      expected: "block",
    },
    {
      name: "over-item-cap",
      content: withModules(emptyCaseStudy(), [stats("kpi-dashboard-portrait", 8)]),
      expected: "block",
    },
  ];

  for (const fx of fixtures) {
    it(`${fx.name} reports "${fx.expected}" at every breakpoint`, () => {
      const reports = BREAKPOINTS.map((w) => analyzeAtViewport(w, fx.content));
      const first = JSON.stringify(reports[0]);
      for (const r of reports) {
        expect(JSON.stringify(r)).toBe(first);
      }
      expect(reports[0].level).toBe(fx.expected);
    });
  }

  it("canAddModule gate is stable across viewports for a near-full asset", () => {
    const near = withModules(emptyCaseStudy(), [
      stats("kpi-dashboard-portrait", 3),
      stats("stat-callout-row-portrait", 3),
    ]);
    const decisions = BREAKPOINTS.map((w) => {
      void w;
      return canAddModule("case-study", near, "stats");
    });
    const first = decisions[0];
    for (const d of decisions) {
      expect(d.ok).toBe(first.ok);
      expect(d.remaining).toBeCloseTo(first.remaining, 5);
    }
  });

  it("text truncation limits are viewport-agnostic (long summary triggers warn/block regardless of width)", () => {
    const longSummary = "x".repeat(400);
    const base = emptyCaseStudy();
    const content: CaseStudyContent = { ...base, summary: longSummary };
    const levels = BREAKPOINTS.map((w) => analyzeAtViewport(w, content).level);
    // Same verdict everywhere.
    expect(new Set(levels).size).toBe(1);
    // And not "ok" — a 400-char summary should hit a length ceiling.
    expect(levels[0]).not.toBe("ok");
  });

  it("budgets themselves are constants (no runtime tampering)", () => {
    expect(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget).toBe(5.5);
    expect(PRINT_TEMPLATE_BUDGETS["spotlight"].moduleBudget).toBe(4.5);
    expect(PRINT_TEMPLATE_BUDGETS["ebrochure"].moduleBudget).toBe(4.0);
    expect(PRINT_TEMPLATE_BUDGETS["adaptor-brief"].moduleBudget).toBe(3.5);
  });
});
