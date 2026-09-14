import { describe, expect, it } from "vitest";
import { pillarDefault, pillarSlug } from "@/lib/next-pillar-masters";
import {
  PILLAR_TEMPLATES,
  pillarChevronBands,
  pillarChevronInk,
  pillarGroundStops,
  pillarHeadlineLines,
  pillarTemplate,
} from "@/lib/next-pillar-templates";

describe("NEXT pillar templates", () => {
  it("defaults to the issued classic column", () => {
    const config = pillarDefault();
    expect(config.templateId).toBe("classic");
    expect(pillarTemplate(config.templateId).id).toBe("classic");
    expect(pillarTemplate(undefined).id).toBe("classic");
  });

  it("uses the gradient ground for classic and the measured ground for the ascent", () => {
    const classic = pillarDefault();
    expect(pillarGroundStops(classic)[0]).toBe("#7C4EF4");

    const ascent = { ...classic, templateId: "next-ascend" };
    expect(pillarGroundStops(ascent)).toEqual(["#9A70F8", "#B4B0FB", "#8BC6EA"]);
    // Light face tints the same measured ground rather than inventing colour.
    const light = pillarGroundStops({ ...ascent, face: "light" as const });
    expect(light).toHaveLength(3);
    expect(light[0]).not.toBe("#9A70F8");
  });

  it("keeps the division lockup and copy switchable inside every template", () => {
    for (const tpl of PILLAR_TEMPLATES) {
      const config = { ...pillarDefault(), templateId: tpl.id };
      expect(config.showLockup).toBe(true);
      expect(pillarSlug({ ...config, divisionId: "globallink" })).toContain("globallink");
    }
    expect(pillarSlug({ ...pillarDefault(), templateId: "next-ascend" })).toContain("next-ascend");
  });

  it("stacks a word to a line only where the template asks for it", () => {
    expect(pillarHeadlineLines("LIFT YOUR GLOBAL PROFILE", true)).toEqual([
      "LIFT",
      "YOUR",
      "GLOBAL",
      "PROFILE",
    ]);
    expect(pillarHeadlineLines("LIFT YOUR GLOBAL PROFILE", false)).toEqual([
      "LIFT YOUR GLOBAL PROFILE",
    ]);
    expect(pillarHeadlineLines("   ", true)).toEqual([]);
  });

  it("builds chevron bands that cover the sheet without a seam", () => {
    const bands = pillarChevronBands(700, 2031);
    expect(bands.length).toBeGreaterThan(3);
    for (const band of bands) {
      expect(band.points).toHaveLength(6);
      expect(band.points[0]![0]).toBe(0);
      expect(band.points[2]![0]).toBe(700);
    }
    // The last band starts past the foot so the run never ends mid-sheet.
    expect(bands[bands.length - 1]!.points[1]![1]).toBeGreaterThan(2031 * 0.6);
    expect(pillarChevronInk("dark").opacity).toBeLessThan(
      pillarChevronInk("light").opacity,
    );
  });
});
