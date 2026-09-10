import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_DESIGN, isArchitecturalMap, mapPalette } from "@/lib/next-london-floormap-design";
import { floorMapSvg } from "@/lib/next-london-floormap-svg";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { londonFloorPlan } from "@/lib/next-london-floorplan";

const plan = londonFloorPlan("GF");
const draw = (arch: boolean, over = {}) =>
  floorMapSvg("GF", {
    panels: LONDON_PANELS,
    labels: true,
    design: {
      ...DEFAULT_MAP_DESIGN,
      sheetStyle: arch ? "architectural" : "directory",
      ...over,
    },
  });

describe("architectural map sheets", () => {
  it("flags the drawing style", () => {
    expect(isArchitecturalMap({ ...DEFAULT_MAP_DESIGN, sheetStyle: "architectural" })).toBe(true);
    expect(isArchitecturalMap(DEFAULT_MAP_DESIGN)).toBe(false);
  });

  it("draws drafting geometry instead of directory tiles", () => {
    const arch = draw(true);
    expect(arch).toContain('id="ldn-hatch"');
    expect(arch).toContain("url(#ldn-hatch)");
    // No dropped shadows and no rounded room corners on a drafting sheet.
    expect(arch).not.toContain("url(#ldn-tile)");
    expect(arch).toContain(`${plan.w.toFixed(1)} m</text>`);
  });

  it("leaves the directory sheet untouched", () => {
    const dir = draw(false);
    expect(dir).not.toContain("ldn-hatch");
    expect(dir).toContain("url(#ldn-tile)");
  });

  it("can drop the dimension ribbon", () => {
    const off = draw(true, { dimensionRibbon: false });
    expect(off).not.toContain(`${plan.w.toFixed(1)} m</text>`);
  });

  it("ships a cyanotype ground", () => {
    const pal = mapPalette({ ...DEFAULT_MAP_DESIGN, theme: "cyanotype" });
    expect(pal.dark).toBe(true);
    expect(pal.paper).toBe("#0B2E63");
  });
});
