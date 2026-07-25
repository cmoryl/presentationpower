/**
 * Hero-aware capacity model.
 *
 * The print page is a single portrait sheet: the hero band and the shared
 * modules compete for the same vertical inches. These tests pin down:
 *   1. defaults are a no-op (no hero photo → identical to the old constant budget)
 *   2. a taller hero shrinks the effective module budget
 *   3. a lighter fade seam (washStrength) rebates units back
 *   4. copy-reserve responds to title/summary presence
 *   5. maxHeroHeightPct gives a grip-clamp value that respects module load
 */

import { describe, expect, it } from "vitest";
import {
  analyzePrintAsset,
  canAddModule,
  effectiveModuleBudget,
  heroCostBaseline,
  heroCostUnits,
  HERO_BASELINE_HEIGHT_PCT,
  HERO_HEIGHT_HARD_MAX,
  HERO_HEIGHT_HARD_MIN,
  maxHeroHeightPct,
  PRINT_TEMPLATE_BUDGETS,
} from "../print-capacity";
import { emptyCaseStudy } from "../print-assets.types";
import type { PrintHeroMedia } from "../print-assets.types";

const heroBaseline: PrintHeroMedia = {
  imageUrl: "https://example/photo.jpg",
  heightPct: HERO_BASELINE_HEIGHT_PCT,
  washStrength: 1,
};

describe("hero cost model", () => {
  it("no-hero assets get the full base budget (backwards compatible)", () => {
    const empty = emptyCaseStudy();
    const r = analyzePrintAsset("case-study", empty);
    expect(r.budget).toBe(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget);
    expect(r.heroCostDelta).toBe(0);
  });

  it("baseline hero (46%, ws=1, title+summary) leaves budget unchanged", () => {
    const c = { ...emptyCaseStudy(), title: "T", summary: "S", heroMedia: heroBaseline };
    const r = analyzePrintAsset("case-study", c);
    expect(Math.abs(r.heroCostDelta)).toBeLessThan(0.01);
    expect(r.budget).toBeCloseTo(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget, 3);
  });

  it("a taller hero shrinks the effective module budget", () => {
    const tall: PrintHeroMedia = { ...heroBaseline, heightPct: 65 };
    const eff = effectiveModuleBudget("case-study", tall, { hasTitle: true, hasSummary: true });
    expect(eff).toBeLessThan(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget);
  });

  it("a shorter hero (or no copy) returns units to the module budget", () => {
    const short: PrintHeroMedia = { ...heroBaseline, heightPct: 30 };
    const noCopy = effectiveModuleBudget("case-study", short, { hasTitle: false, hasSummary: false });
    expect(noCopy).toBeGreaterThan(PRINT_TEMPLATE_BUDGETS["case-study"].moduleBudget);
  });

  it("washStrength=0 (no seam rebate) is more expensive than washStrength=1", () => {
    const hard: PrintHeroMedia = { ...heroBaseline, heightPct: 55, washStrength: 0 };
    const soft: PrintHeroMedia = { ...heroBaseline, heightPct: 55, washStrength: 1 };
    const c = { hasTitle: true, hasSummary: true };
    expect(heroCostUnits(hard, c)).toBeGreaterThan(heroCostUnits(soft, c));
  });

  it("heroCostBaseline matches heroCostUnits at defaults", () => {
    const c = { hasTitle: true, hasSummary: true };
    expect(heroCostUnits(heroBaseline, c)).toBeCloseTo(heroCostBaseline(), 5);
  });

  it("canAddModule honours the hero-aware effective budget", () => {
    const bigHero: PrintHeroMedia = { ...heroBaseline, heightPct: 70 };
    const modules = [
      { id: "a", kind: "stats", variantId: "kpi-dashboard-portrait", items: [{ label: "x", value: "1" }, { label: "y", value: "2" }, { label: "z", value: "3" }] },
      { id: "b", kind: "stats", variantId: "kpi-dashboard-portrait", items: [{ label: "x", value: "1" }, { label: "y", value: "2" }, { label: "z", value: "3" }] },
    ] as never;
    const withHero = canAddModule("case-study", modules, 1.6, {
      heroMedia: bigHero,
      copy: { hasTitle: true, hasSummary: true },
    });
    const withoutHero = canAddModule("case-study", modules, 1.6);
    expect(withHero.remaining).toBeLessThan(withoutHero.remaining);
  });

  it("maxHeroHeightPct shrinks as module load grows", () => {
    const light = maxHeroHeightPct("case-study", 1.6, heroBaseline, { hasTitle: true, hasSummary: true });
    const heavy = maxHeroHeightPct("case-study", 5.0, heroBaseline, { hasTitle: true, hasSummary: true });
    expect(light).toBeGreaterThan(heavy);
    expect(heavy).toBeGreaterThanOrEqual(HERO_HEIGHT_HARD_MIN);
    expect(light).toBeLessThanOrEqual(HERO_HEIGHT_HARD_MAX);
  });

  it("maxHeroHeightPct never returns below hard floor even when overloaded", () => {
    const clamp = maxHeroHeightPct("case-study", 999, heroBaseline, { hasTitle: true, hasSummary: true });
    expect(clamp).toBe(HERO_HEIGHT_HARD_MIN);
  });

  it("suggestions surface reduce-hero when modules push past the effective budget", () => {
    // Heavy modules + a tall hero → block, with a reduce-hero suggestion.
    const modules = [
      { id: "a", kind: "stats", variantId: "kpi-dashboard-portrait", items: [{ label: "x", value: "1" }, { label: "y", value: "2" }, { label: "z", value: "3" }] },
      { id: "b", kind: "stats", variantId: "kpi-dashboard-portrait", items: [{ label: "x", value: "1" }, { label: "y", value: "2" }, { label: "z", value: "3" }] },
      { id: "c", kind: "stats", variantId: "stat-bento-portrait", items: [{ label: "x", value: "1" }, { label: "y", value: "2" }, { label: "z", value: "3" }] },
    ];
    const content = {
      ...emptyCaseStudy(),
      title: "T",
      summary: "S",
      heroMedia: { ...heroBaseline, heightPct: 60 },
      modules,
    } as never;
    const r = analyzePrintAsset("case-study", content);
    expect(r.level).toBe("block");
    expect(r.suggestions.some((s) => s.kind === "reduce-hero")).toBe(true);
    expect(r.suggestions.some((s) => s.kind === "swap-variant")).toBe(true);
  });
});
