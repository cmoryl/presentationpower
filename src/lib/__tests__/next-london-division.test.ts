import { describe, expect, it } from "vitest";

import { LONDON_PANELS, LONDON_STYLES } from "@/lib/next-london-signage";
import { londonBrandingPlan, londonPanelFamily } from "@/lib/next-london-branding";
import { londonPanelStops, buildLondonPanelSvg } from "@/lib/next-london-revise";
import {
  londonDivisionAccent,
  londonDivisionColourway,
  londonDivisionStops,
} from "@/lib/next-london-division";
import { DEFAULT_LOGO_PLACEMENT } from "@/lib/next-london-logo-placement";

const divisionPanels = LONDON_PANELS.filter((p) => londonDivisionAccent(londonPanelFamily(p)));

describe("London division signage", () => {
  it("finds division-specific panels", () => {
    expect(divisionPanels.length).toBeGreaterThan(0);
  });

  it("prints a white lockup on every division panel, even when overridden", () => {
    for (const panel of divisionPanels) {
      for (const colourway of ["white", "white-accent", "color", "dblue"] as const) {
        const plan = londonBrandingPlan(panel, { ...DEFAULT_LOGO_PLACEMENT, colourway });
        expect(["white", "white-accent"]).toContain(plan.colourway);
      }
      // Default placement is the all-white cut.
      expect(londonBrandingPlan(panel).colourway).toBe("white");
    }
  });

  it("clamps unapproved colourways only for divisions", () => {
    expect(londonDivisionColourway("lifesci", "color")).toBe("white");
    expect(londonDivisionColourway("lifesci", "white-accent")).toBe("white-accent");
    expect(londonDivisionColourway("transperfect", "color")).toBe("color");
  });

  it("tints the light end of the ramp with the division accent, dark head intact", () => {
    const base = LONDON_STYLES["08-chevron-sweep"]!.stops;
    const tinted = londonDivisionStops("lifesci", base);
    expect(tinted[0]).toBe(base[0]);
    expect(tinted[tinted.length - 1]).not.toBe(base[base.length - 1]);
    // Master-brand items are untouched.
    expect(londonDivisionStops("transperfect", base)).toEqual(base);
  });

  it("carries the tinted ramp into panel masters", () => {
    const panel = divisionPanels[0]!;
    const stops = londonPanelStops(panel);
    const base = LONDON_STYLES[panel.style]?.stops ?? [];
    expect(stops).not.toEqual(base);
    const svg = buildLondonPanelSvg(panel);
    expect(svg).toContain(stops[stops.length - 1]!);
  });

  it("leaves master-brand panels on the approved ramp", () => {
    const master = LONDON_PANELS.find((p) => londonPanelFamily(p) === "transperfect")!;
    expect(londonPanelStops(master)).toEqual(LONDON_STYLES[master.style]!.stops);
  });
});
