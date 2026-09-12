import { describe, expect, it } from "vitest";

import {
  doorLeafColumns,
  doorLeafLabel,
  doorOpeningSize,
  doorShutLines,
  isDoubleDoor,
  londonDoorSpec,
  LONDON_DOOR_SPECS,
} from "@/lib/next-london-doors";
import { LONDON_PANELS } from "@/lib/next-london-signage";

describe("London door leaf geometry", () => {
  it("matches every branded door item to a leaf spec", () => {
    const doors = LONDON_PANELS.filter((p) => /DOOR/i.test(p.name));
    const unmatched = doors.filter((p) => !londonDoorSpec(p)).map((p) => p.name);
    expect(unmatched).toEqual([]);
  });

  it("reads Albert as a pair with one sheet per leaf", () => {
    const spec = londonDoorSpec("DOOR BRANDING ALBERT - 840x2000mm");
    expect(spec?.leaves).toBe(2);
    expect(spec?.scope).toBe("leaf");
    expect(doorOpeningSize(spec!)).toEqual({ w: 1680, h: 2000 });
    expect(doorShutLines(spec!)).toEqual([0.5]);
  });

  it("keeps unequal leaf widths true on Abbey", () => {
    const spec = londonDoorSpec("DOOR BRANDING ABBEY - 920x2020mm")!;
    const cols = doorLeafColumns(spec);
    expect(cols).toHaveLength(2);
    expect(cols[0].w).toBeCloseTo(920 / 1300, 5);
    expect(doorShutLines(spec)[0]).toBeCloseTo(920 / 1300, 5);
  });

  it("treats Churchill and the lift car front as spanning sheets", () => {
    expect(londonDoorSpec("CHURCHILL DOUBLE DOOR VINYL - 1780x2200mm")?.scope).toBe("spanning");
    expect(londonDoorSpec("LIFT DOOR - 1100x2085mm")?.scope).toBe("spanning");
  });

  it("treats Wordsworth as a single leaf", () => {
    const spec = londonDoorSpec("DOOR BRANDING WORDSWORTH - 900x2020mm")!;
    expect(isDoubleDoor(spec)).toBe(false);
    expect(doorLeafLabel(spec)).toContain("Single leaf");
  });

  it("columns always tile the opening exactly once", () => {
    for (const spec of LONDON_DOOR_SPECS) {
      const cols = doorLeafColumns(spec);
      expect(cols).toHaveLength(spec.leaves);
      expect(cols[0].x).toBe(0);
      const last = cols[cols.length - 1];
      expect(last.x + last.w).toBeCloseTo(1, 6);
    }
  });
});
