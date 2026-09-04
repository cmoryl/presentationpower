import { describe, expect, it } from "vitest";
import {
  MAX_ORBIT_SIZE,
  defaultOrbitPos,
  orbitBaseSize,
  patchOrbitPos,
  resetOrbitPos,
  resolveOrbitLayout,
  resolveOrbitPos,
} from "@/lib/orbit-layout";

describe("orbit stat placement", () => {
  it("falls back to the staggered defaults", () => {
    const items = [{ value: "97%" }, { value: "90%" }, { value: "70%" }];
    const layout = resolveOrbitLayout(items);
    expect(layout).toEqual([
      defaultOrbitPos(0, 3),
      defaultOrbitPos(1, 3),
      defaultOrbitPos(2, 3),
    ]);
    expect(new Set(layout.map((p) => `${p.x}:${p.y}`)).size).toBe(3);
  });

  it("honours stored coordinates and clamps out-of-range values", () => {
    expect(resolveOrbitPos({ x: 12, y: 88, size: 1.2 }, 0, 3)).toEqual({
      x: 12,
      y: 88,
      size: 1.2,
    });
    expect(resolveOrbitPos({ x: -40, y: 400, size: 9 }, 0, 3)).toEqual({
      x: 0,
      y: 100,
      size: MAX_ORBIT_SIZE,
    });
  });

  it("patches only the targeted figure and resets back to default", () => {
    const items = [{ value: "97%" }, { value: "90%" }, { value: "70%" }];
    const moved = patchOrbitPos(items, 1, { x: 20, y: 30 });
    expect(moved[1]).toMatchObject({ value: "90%", x: 20, y: 30 });
    expect(moved[0]!.x).toBeUndefined();
    const back = resetOrbitPos(moved, 1);
    expect(back[1]!.x).toBeUndefined();
    expect(resolveOrbitPos(back[1], 1, 3)).toEqual(defaultOrbitPos(1, 3));
  });

  it("shrinks the base ring as figures are added", () => {
    expect(orbitBaseSize(1)).toBeGreaterThan(orbitBaseSize(2));
    expect(orbitBaseSize(2)).toBeGreaterThan(orbitBaseSize(3));
  });
});
