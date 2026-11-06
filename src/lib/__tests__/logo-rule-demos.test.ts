import { describe, expect, it } from "vitest";
import { inferLogoRuleDemo, logoRuleDemo, type LogoRuleDemo } from "@/lib/logo-rule-demos";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { NEXT_LOGO_RULES } from "@/lib/next-brand-guide";

const DEMOS: LogoRuleDemo[] = [
  "variant-by-background",
  "clear-space",
  "min-size",
  "vector-crisp",
  "approved-colors",
  "recolor",
  "respace",
  "distort",
  "effects",
  "flip",
  "typeface",
  "low-contrast",
  "busy-bg",
  "mix-lockups",
];

describe("logo rule visual demos", () => {
  it("every logo rule in every brand guide maps to a visual demo", () => {
    for (const guide of BRAND_GUIDES) {
      for (const rule of guide.logoRules) {
        const demo = logoRuleDemo(rule);
        expect(demo, `${guide.slug}: "${rule.title}" has no visual demo`).not.toBeNull();
        expect(DEMOS).toContain(demo);
      }
    }
  });

  it("every NEXT 2026 governance rule maps to a visual demo", () => {
    for (const rule of NEXT_LOGO_RULES) {
      const demo = logoRuleDemo(rule);
      expect(demo, `"${rule.title}" has no visual demo`).not.toBeNull();
      expect(DEMOS).toContain(demo);
    }
  });

  it("maps the canonical misuse rules to the right demonstrations", () => {
    expect(inferLogoRuleDemo("Never recolor a lockup")).toBe("recolor");
    expect(inferLogoRuleDemo("Never rotate, skew or distort")).toBe("distort");
    expect(inferLogoRuleDemo("Keep clear space (1.5H)")).toBe("clear-space");
    expect(inferLogoRuleDemo("Never flip")).toBe("flip");
    expect(inferLogoRuleDemo("Never change the typeface")).toBe("typeface");
    expect(inferLogoRuleDemo("Never place over complex backgrounds")).toBe("busy-bg");
    expect(inferLogoRuleDemo("Never place a color lockup on a low-contrast field")).toBe("low-contrast");
    expect(inferLogoRuleDemo("Use the supplied vectors")).toBe("vector-crisp");
    expect(inferLogoRuleDemo("Respect minimum sizes")).toBe("min-size");
  });

  it("an explicit demo field wins over inference", () => {
    expect(logoRuleDemo({ title: "Never flip", demo: "distort" })).toBe("distort");
  });
});
