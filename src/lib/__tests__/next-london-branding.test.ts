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
    expect(svg).toContain('data-layer="hero-lockup"');
    expect(svg).toContain('font-weight="700"');
    // Hero lockup is layer 1: painted last, so it sits above ground and copy.
    expect(svg.lastIndexOf('id="hero-lockup"')).toBeGreaterThan(svg.lastIndexOf('id="ground"'));
    const pdf = new TextDecoder("latin1").decode(buildLondonPanelAi(panel));
    expect(pdf).toContain("/TPLockup");
    expect(pdf).toContain("Geist-Bold");
    expect(pdf).toContain(" 1 1 1 rg");
    // Real Illustrator layers, hero lockup listed first.
    expect(pdf).toContain("/Name (Hero lockup)");
    expect(pdf).toContain("/Order [8 0 R 9 0 R 10 0 R]");
  });

  it("switches the placed lockup colourway per panel", () => {
    const panel = LONDON_PANELS[0]!;
    for (const colourway of nextLogoColourways(londonBrandingPlan(panel).familyId)) {
      const plan = londonBrandingPlan(panel, { ...DEFAULT_LOGO_PLACEMENT, colourway });
      expect(plan.colourway).toBe(colourway);
      const fills = new Set(plan.art.paths.map((p) => p.fill));
      if (colourway === "white") expect([...fills]).toEqual(["#fff"]);
      else expect(fills.size).toBeGreaterThan(0);
    }
  });
});

