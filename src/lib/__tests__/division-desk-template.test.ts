import { describe, expect, it } from "vitest";

import { divisionSignArtOptions, divisionSigns } from "@/lib/next-division-signage";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import { auditSvg } from "@/lib/london-signage-qa";

describe("FinanceNEXT registration desk front", () => {
  const desk = divisionSigns("finance").find((s) => s.group === "desk");

  it("uses the supplied 71.25 × 40.5 in artboard with 0.125 in bleed", () => {
    expect(desk).toBeTruthy();
    expect(desk!.panel.trimW).toBeCloseTo(1809.75, 2);
    expect(desk!.panel.trimH).toBeCloseTo(1028.7, 2);
    expect(desk!.panel.bleedW).toBeCloseTo(1816.1, 2);
  });

  it("prints the stacked white Finance lockup over REGISTRATION and passes QA", () => {
    const svg = buildLondonPanelSvg(desk!.panel, divisionSignArtOptions(desk!));
    expect(svg).toContain('data-lockup="stacked"');
    expect(svg).toContain('data-family="finance"');
    expect(svg).toContain('data-text="REGISTRATION"');
    const fails = auditSvg(desk!.panel, svg).checks.filter((c) => c.status === "fail");
    expect(fails.map((f) => f.label)).toEqual([]);
  });

  it("is only offered to the division that supplied it", () => {
    expect(divisionSigns("legal").some((s) => s.group === "desk")).toBe(false);
  });
});
