import { describe, expect, it } from "vitest";

import { LONDON_PANELS, LONDON_STYLES } from "@/lib/next-london-signage";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { brewMotifPlan, isBrewPanel } from "@/lib/next-london-brew";

const brewPanels = LONDON_PANELS.filter((p) => isBrewPanel(p));

describe("NEXTbrew theming", () => {
  it("has brew panels on the deep navy → aqua ramp", () => {
    expect(brewPanels.length).toBeGreaterThan(0);
    expect(LONDON_STYLES["11-brew-diagonal"]!.stops[0]).toBe("#03002C");
  });

  it("plans a seamless line field — no floating vector doodles", () => {
    for (const panel of brewPanels) {
      const plan = brewMotifPlan(panel);
      const kinds = new Set(plan.marks.map((m) => m.kind));
      // The cup ring / bean clip art is gone: strokes only.
      expect([...kinds]).toEqual(["path"]);
      expect(plan.marks.length).toBeGreaterThan(6);
      for (const m of plan.marks) expect(m.alpha).toBeGreaterThan(0);

      // Lattice rules must touch the sheet edges so the pattern is continuous
      // across the trim rather than floating inside the panel.
      const lattice = plan.marks.filter((m) => m.kind === "path" && m.d.includes(" L "));
      expect(lattice.length).toBeGreaterThan(4);
    }
  });

  it("emits an editable motif layer in the SVG and live paths in the .ai", () => {
    const panel = brewPanels.find((p) => p.style === "11-brew-diagonal")!;
    const svg = buildLondonPanelSvg(panel);
    expect(svg).toContain('data-layer="brew-motif"');
    // Motif sits above the ground and below the hero lockup.
    expect(svg.indexOf('id="brew-motif"')).toBeGreaterThan(svg.indexOf('id="ground"'));
    expect(svg.lastIndexOf('id="hero-lockup"')).toBeGreaterThan(svg.indexOf('id="brew-motif"'));

    const pdf = new TextDecoder("latin1").decode(buildLondonPanelAi(panel));
    expect(pdf).toContain("/GsBrew");
    expect(pdf).toMatch(/ RG/);
    expect(pdf).toMatch(/ S Q/);
  });

  it("leaves non-brew panels untouched", () => {
    const other = LONDON_PANELS.find((p) => !isBrewPanel(p))!;
    expect(buildLondonPanelSvg(other)).not.toContain("brew-motif");
  });
});
