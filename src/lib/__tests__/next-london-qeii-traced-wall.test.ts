import { describe, expect, it } from "vitest";
import {
  QEII_TRACED_WALL_GAIN,
  qeiiFloorTraced,
  qeiiWallGain,
  qeiiWallWidth,
} from "@/lib/next-london-qeii-symbols";

describe("traced floor wall calibration", () => {
  it("only the traced floor is set heavier", () => {
    expect(qeiiFloorTraced("third")).toBe(true);
    expect(qeiiWallGain("third")).toBe(QEII_TRACED_WALL_GAIN);
    for (const id of ["ground", "first", "second", "fourth", "fifth", "sixth"]) {
      expect(qeiiFloorTraced(id)).toBe(false);
      expect(qeiiWallGain(id)).toBe(1);
    }
    expect(qeiiWallGain(undefined)).toBe(1);
  });

  it("the traced floor's fine outline reads at the drawn floors' wall weight", () => {
    const traced = { d: "M0 0 L10 0", w: 1.6 } as never;
    const drawn = { d: "M0 0 L10 0", w: 1.6 } as never;
    const tracedWall = qeiiWallWidth(traced, 0.55, qeiiWallGain("third"));
    const drawnWall = qeiiWallWidth(drawn, 0.55, qeiiWallGain("fourth"));
    expect(tracedWall).toBeGreaterThan(drawnWall * 4);
    expect(tracedWall).toBeLessThan(drawnWall * 8);
  });
});
