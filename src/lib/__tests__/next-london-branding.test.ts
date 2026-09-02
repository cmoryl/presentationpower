import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { nextLogoFamily } from "@/lib/next-logo-vectors";

describe("London signage branding", () => {
  it("plans a white lockup for every panel", () => {
    for (const panel of LONDON_PANELS) {
      const plan = londonBrandingPlan(panel);
      expect(nextLogoFamily(plan.familyId)).toBeTruthy();
      expect(plan.art.paths.length).toBeGreaterThan(0);
      for (const p of plan.art.paths) expect(p.fill.toLowerCase()).toMatch(/^#(fff|ffffff)$/);
    }
  });

  it("uses side-by-side lockups on wide panels and stacked otherwise", () => {
    for (const panel of LONDON_PANELS) {
      const plan = londonBrandingPlan(panel);
      const wide = panel.trimW / panel.trimH >= 1.6;
      if (wide) expect(plan.orientation).toBe("side");
    }
  });

  it("emits live logo geometry and Geist Bold copy in both vector masters", () => {
    const panel = LONDON_PANELS.find((p) => londonBrandingPlan(p).copy)!;
    const svg = buildLondonPanelSvg(panel);
    expect(svg).toContain('data-layer="lockup"');
    expect(svg).toContain('font-weight="700"');
    const pdf = new TextDecoder("latin1").decode(buildLondonPanelAi(panel));
    expect(pdf).toContain("/TPLockup");
    expect(pdf).toContain("Geist-Bold");
    expect(pdf).toContain(" 1 1 1 rg");
  });
});
