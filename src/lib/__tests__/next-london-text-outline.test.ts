import { describe, expect, it } from "vitest";

import { auditAi, auditSvg } from "@/lib/london-signage-qa";
import { londonBrandingPlan } from "@/lib/next-london-branding";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { loadLondonSignageFace, outlineText } from "@/lib/next-london-text-outline";

const panel = LONDON_PANELS.find((p) => londonBrandingPlan(p).copy)!;

describe("London signage copy is outlined", () => {
  it("ships no live text in either master", () => {
    const svg = buildLondonPanelSvg(panel);
    expect(svg).not.toContain("<text");
    expect(svg).toContain('data-text="');
    const ai = new TextDecoder("latin1").decode(buildLondonPanelAi(panel));
    expect(ai).not.toContain(" Tj");
    expect(ai).not.toContain("/Subtype /TrueType");
    expect(auditAi(panel, ai).status).not.toBe("fail");
    expect(auditSvg(panel, svg).status).not.toBe("fail");
  });

  it("measures runs with the font's own advance widths", async () => {
    const face = await loadLondonSignageFace();
    const one = outlineText(face, "I", { sizeMm: 100, x: 0, y: 0 });
    const many = outlineText(face, "IIII", { sizeMm: 100, x: 0, y: 0 });
    expect(one.d.length).toBeGreaterThan(0);
    expect(many.advanceMm).toBeCloseTo(one.advanceMm * 4, 3);
    const tracked = outlineText(face, "IIII", { sizeMm: 100, trackingEm: 0.1, x: 0, y: 0 });
    expect(tracked.advanceMm).toBeGreaterThan(many.advanceMm);
  });
});
