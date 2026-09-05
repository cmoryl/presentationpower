import { describe, expect, it } from "vitest";
import {
  MAX_ORBIT_SIZE,
  defaultOrbitPos,
  orbitBaseSize,
  patchOrbitPos,
  resetOrbitPos,
  resolveOrbitLayout,
  resolveOrbitPos,
  fitOrbitLayout,
  orbitStageSize,
  orbitsCollide,
  resolveFittedOrbitLayout,
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

describe("orbit collision detection", () => {
  const stage = { w: 860, h: 300 };
  const base = 258;

  it("flags overlapping rings and clears ones that do not touch", () => {
    const a = { x: 40, y: 50, size: 1 };
    const b = { x: 46, y: 52, size: 1 };
    expect(orbitsCollide(a, b, stage, base)).toBe(true);
    expect(orbitsCollide(a, { x: 92, y: 50, size: 1 }, stage, base)).toBe(false);
  });

  it("pushes every overlapping pair apart", () => {
    const fitted = fitOrbitLayout(
      [
        { x: 40, y: 50, size: 1 },
        { x: 44, y: 52, size: 1 },
        { x: 42, y: 48, size: 1 },
      ],
      { stage, base },
    );
    for (let i = 0; i < fitted.length; i += 1) {
      for (let j = i + 1; j < fitted.length; j += 1) {
        expect(orbitsCollide(fitted[i]!, fitted[j]!, stage, base), `${i}/${j}`).toBe(false);
      }
    }
  });

  it("separates perfectly stacked figures instead of dividing by zero", () => {
    const fitted = fitOrbitLayout(
      [
        { x: 50, y: 50, size: 1 },
        { x: 50, y: 50, size: 1 },
      ],
      { stage, base },
    );
    expect(orbitsCollide(fitted[0]!, fitted[1]!, stage, base)).toBe(false);
    expect(fitted.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("keeps every ring inside the stage", () => {
    const fitted = fitOrbitLayout([{ x: 0, y: 100, size: 1.8 }], { stage, base });
    const rx = ((1.8 * base) / 2 / stage.w) * 100;
    const ry = ((1.8 * base) / 2 / stage.h) * 100;
    expect(fitted[0]!.x).toBeGreaterThanOrEqual(Math.min(rx, 50) - 0.2);
    expect(fitted[0]!.y).toBeLessThanOrEqual(100 - Math.min(ry, 50) + 0.2);
  });

  it("leaves a clean arrangement untouched", () => {
    const clean = [
      { x: 22, y: 30, size: 1 },
      { x: 74, y: 70, size: 1 },
    ];
    const fitted = fitOrbitLayout(clean, { stage, base });
    expect(fitted.map((p) => p.nudged)).toEqual([false, false]);
  });

  it("holds the first figure steadier than the later ones", () => {
    const start = [
      { x: 45, y: 50, size: 1 },
      { x: 50, y: 52, size: 1 },
    ];
    const fitted = fitOrbitLayout(start, { stage, base });
    expect(Math.abs(fitted[0]!.x - 45)).toBeLessThan(Math.abs(fitted[1]!.x - 50));
  });

  it("clears the staggered defaults on the real slide stage", () => {
    const items = [{ value: "97%" }, { value: "90%" }, { value: "70%" }];
    const st = orbitStageSize(3);
    const fitted = resolveFittedOrbitLayout(items);
    for (let i = 0; i < fitted.length; i += 1) {
      for (let j = i + 1; j < fitted.length; j += 1) {
        expect(orbitsCollide(fitted[i]!, fitted[j]!, st, orbitBaseSize(3)), `${i}/${j}`).toBe(false);
      }
    }
  });

  it("survives an empty set", () => {
    expect(fitOrbitLayout([], { stage, base })).toEqual([]);
  });
});
