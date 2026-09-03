import { describe, it, expect } from "vitest";
import { londonCmykBuild, cmykLabel } from "@/lib/next-london-cmyk";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg, buildLondonPanelAi, londonAiBytes } from "@/lib/next-london-revise";

describe("london cmyk", () => {
  it("uses approved builds", () => {
    const b = londonCmykBuild("#13B1F3");
    expect(b.approved).toBe(true);
    expect(Math.round(b.c * 100)).toBe(92);
  });
  it("keeps saturated colour free of black and under TAC", () => {
    const b = londonCmykBuild("#A1FBF9");
    expect(b.k).toBeLessThan(0.05);
    for (const hex of ["#7BCD3A", "#139DD8", "#FF66AA", "#123456"]) {
      const v = londonCmykBuild(hex);
      expect(v.tac).toBeLessThanOrEqual(300.5);
    }
  });
  it("prints near-black as 100K", () => {
    const b = londonCmykBuild("#0a0a0a");
    expect(b.c + b.m + b.y).toBe(0);
    expect(b.k).toBeGreaterThan(0.9);
  });
  it("emits DeviceCMYK ai and cmyk svg metadata for every panel", () => {
    for (const panel of LONDON_PANELS) {
      const svg = buildLondonPanelSvg(panel, { colorSpace: "cmyk" });
      expect(svg).toContain('data-colorspace="cmyk"');
      expect(svg).toContain("device-cmyk(");
      const ai = new TextDecoder().decode(londonAiBytes(buildLondonPanelAi(panel, { colorSpace: "cmyk" })));
      expect(ai).toContain("/DeviceCMYK");
      expect(ai).not.toContain(" rg ");
      expect(ai).toContain("/TPColorSpace (DeviceCMYK");
      const rgb = new TextDecoder().decode(londonAiBytes(buildLondonPanelAi(panel)));
      expect(rgb).toContain("/DeviceRGB");
    }
  });
  it("labels builds", () => {
    expect(cmykLabel(londonCmykBuild("#003FC7"))).toContain("approved");
  });
});
