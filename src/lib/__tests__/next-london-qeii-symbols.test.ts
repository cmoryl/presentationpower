import { describe, expect, it } from "vitest";

import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import {
  QEII_WALL_WEIGHT,
  qeiiRepeatedSymbolShapes,
  qeiiWallWidth,
} from "@/lib/next-london-qeii-symbols";

describe("washroom symbols and wall weight", () => {
  it("trims the repeated cubicle figures but keeps artwork on every floor", () => {
    QEII_FLOOR_VECTORS.filter((f) => f.kind === "vector").forEach((floor) => {
      const drop = qeiiRepeatedSymbolShapes(floor);
      // Never a wholesale cull: the plan keeps the great majority of its shapes.
      expect(drop.size).toBeLessThan(floor.shapes.length * 0.45);
    });
  });

  it("leaves one symbol standing where the artwork drew a row of them", () => {
    const ground = QEII_FLOOR_VECTORS.find((f) => f.id === "ground")!;
    const drop = qeiiRepeatedSymbolShapes(ground);
    expect(drop.size).toBeGreaterThan(0);
    // The washroom row at ~y 401 keeps exactly one of its three figures.
    const row = [95, 115, 120].filter((i) => !drop.has(i));
    expect(row).toHaveLength(1);
  });

  it("keeps the wall weight inside its range and honours a heavier setting", () => {
    const shape = { d: "", stroke: "#ffffff", w: 2 };
    expect(qeiiWallWidth(shape, 99)).toBeCloseTo(2 * 1.2);
    expect(qeiiWallWidth(shape, 0)).toBeCloseTo(2 * 0.25);
    expect(qeiiWallWidth(shape, Number.NaN)).toBeCloseTo(2 * QEII_WALL_WEIGHT);
    expect(qeiiWallWidth(shape, 1)).toBeGreaterThan(qeiiWallWidth(shape));
  });

  it("thins walls below the issued weight without losing them", () => {
    expect(QEII_WALL_WEIGHT).toBeLessThan(1);
    expect(qeiiWallWidth({ d: "", stroke: "#ffffff", w: 1.556 })).toBeCloseTo(1.556 * QEII_WALL_WEIGHT);
    expect(qeiiWallWidth({ d: "", stroke: "#ffffff" })).toBeGreaterThan(0);
  });
});
