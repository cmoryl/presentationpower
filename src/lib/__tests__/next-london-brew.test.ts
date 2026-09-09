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

  it("plans no background vector graphics on brew grounds", () => {
    for (const panel of brewPanels) {
      expect(brewMotifPlan(panel).marks).toEqual([]);
    }
  });

  it("ships clean gradient masters with no motif layer", () => {
    const panel = brewPanels.find((p) => p.style === "11-brew-diagonal")!;
    const svg = buildLondonPanelSvg(panel);
    expect(svg).not.toContain('data-layer="brew-motif"');

    const pdf = new TextDecoder("latin1").decode(buildLondonPanelAi(panel));
    expect(pdf).not.toContain("/GsBrew");
  });

  it("leaves non-brew panels untouched", () => {
    const other = LONDON_PANELS.find((p) => !isBrewPanel(p))!;
    expect(buildLondonPanelSvg(other)).not.toContain("brew-motif");
  });
});
