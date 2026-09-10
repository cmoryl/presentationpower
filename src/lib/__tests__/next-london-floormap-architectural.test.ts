import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_DESIGN, isArchitecturalMap, mapPalette } from "@/lib/next-london-floormap-design";
import { LONDON_FLOORS } from "@/lib/next-london-floorplan";
import { londonFloorMapSvg } from "@/lib/next-london-floormap-svg";

const floor = LONDON_FLOORS[0]!;
const draw = (arch: boolean) =>
  londonFloorMapSvg(floor, [], {
    design: { ...DEFAULT_MAP_DESIGN, sheetStyle: arch ? "architectural" : "directory" },
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
    expect(arch).toContain("m</text>");
  });

  it("leaves the directory sheet untouched", () => {
    const dir = draw(false);
    expect(dir).not.toContain("ldn-hatch");
    expect(dir).toContain("url(#ldn-tile)");
  });

  it("can drop the dimension ribbon", () => {
    const off = londonFloorMapSvg(floor, [], {
      design: { ...DEFAULT_MAP_DESIGN, sheetStyle: "architectural", dimensionRibbon: false },
    });
    expect(off).not.toContain(`${floor.plan.w.toFixed(1)} m</text>`);
  });

  it("ships a cyanotype ground", () => {
    const pal = mapPalette({ ...DEFAULT_MAP_DESIGN, theme: "cyanotype" });
    expect(pal.dark).toBe(true);
    expect(pal.paper).toBe("#0B2E63");
  });
});
