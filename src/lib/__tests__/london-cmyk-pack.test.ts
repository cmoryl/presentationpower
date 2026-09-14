import { describe, expect, it } from "vitest";

import { auditAiGradient, auditSvg, londonApprovedRamp } from "@/lib/london-signage-qa";
import { cmykShort, londonCmykBuild } from "@/lib/next-london-cmyk";
import {
  londonCmykPanels,
  londonCmykSignOff,
  londonCmykSignOffCsv,
  londonPanelCmykStatus,
} from "@/lib/next-london-cmyk-signoff";
import { buildLondonPanelAiAsync, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { loadLondonSignageFace } from "@/lib/next-london-text-outline";

const panels = londonCmykPanels();
const panel = panels[0]!;
const text = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

describe("London CMYK sign-off ledger", () => {
  it("covers every panel in the kit", () => {
    expect(panels.length).toBeGreaterThanOrEqual(154);
    expect(new Set(panels.map((p) => p.id)).size).toBe(panels.length);
  });

  it("labels every colour build as approved or machine-converted", () => {
    const led = londonCmykSignOff(1);
    expect(led.stops).toBeGreaterThan(0);
    expect(led.approved + led.converted).toBe(led.stops);
    // The kit is not fully approved yet; the ledger must say so rather than imply it is.
    expect(led.fullyApproved).toBe(led.converted === 0);
  });

  it("gives every panel a status whose stops sum to its total", () => {
    for (const p of panels) {
      const s = londonPanelCmykStatus(p, 1);
      expect(s.total).toBe(s.stops.length);
      expect(s.approved + s.converted).toBe(s.total);
      for (const stop of s.stops) {
        expect(stop.build.approved).toBe(londonCmykBuild(stop.hex, 1).approved);
        expect(cmykShort(stop.build)).toMatch(/^C\d+ M\d+ Y\d+ K\d+$/);
      }
    }
  });

  it("exports a printer sign-off sheet with an approval column per colour", () => {
    const csv = londonCmykSignOffCsv(1);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("printer_approval");
    expect(lines.length).toBe(londonCmykSignOff(1).stops + 1);
    expect(csv).toMatch(/approved build|conversion/);
  });
});

describe("London print QA colour space checks", () => {
  it("reads DeviceCMYK gradient stops back out of a CMYK .ai master", async () => {
    await loadLondonSignageFace();
    const ai = await buildLondonPanelAiAsync(panel, { colorSpace: "cmyk", vibrance: 1 });
    const checks = auditAiGradient(panel, text(ai), { colorSpace: "cmyk", vibrance: 1 });
    const space = checks.find((c) => c.id === "ai-colorspace");
    const stops = checks.find((c) => c.id === "ai-gradient-stops");
    expect(space?.status).toBe("pass");
    expect(stops?.status).toBe("pass");
    const signoff = checks.find((c) => c.id === "ai-cmyk-signoff");
    expect(signoff).toBeDefined();
    const unapproved = londonApprovedRamp(panel).filter(
      (hex) => !londonCmykBuild(hex, 1).approved,
    ).length;
    expect(signoff!.status).toBe(unapproved > 0 ? "warn" : "pass");
  });

  it("keeps the RGB master in DeviceRGB with no sign-off warning", async () => {
    await loadLondonSignageFace();
    const ai = await buildLondonPanelAiAsync(panel, { colorSpace: "rgb", vibrance: 1 });
    const checks = auditAiGradient(panel, text(ai), { colorSpace: "rgb", vibrance: 1 });
    expect(checks.filter((c) => c.status === "fail")).toEqual([]);
    expect(checks.find((c) => c.id === "ai-cmyk-signoff")).toBeUndefined();
  });

  it("requires a CMYK SVG to label its converted colours, and an RGB one not to", async () => {
    await loadLondonSignageFace();
    const cmyk = buildLondonPanelSvg(panel, { colorSpace: "cmyk", vibrance: 1 });
    const rgb = buildLondonPanelSvg(panel, { colorSpace: "rgb", vibrance: 1 });
    const of = (svg: string, opts: Parameters<typeof auditSvg>[2]) =>
      auditSvg(panel, svg, opts).checks.find((c) => c.id === "svg-colorspace");
    expect(of(cmyk, { colorSpace: "cmyk" })?.status).toBe("pass");
    expect(of(rgb, { colorSpace: "rgb" })?.status).toBe("pass");
    // An unlabelled conversion must be caught, not shipped silently.
    expect(of(rgb, { colorSpace: "cmyk" })?.status).toBe("fail");
    expect(of(cmyk, { colorSpace: "rgb" })?.status).toBe("fail");
  });
});
