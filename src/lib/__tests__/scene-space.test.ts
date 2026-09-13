import { describe, expect, it } from "vitest";

import { LONDON_SCENES, sceneQuad } from "@/lib/next-london-scenes";
import { quadFromRect } from "@/lib/scene-perspective";
import {
  cameraHeightMm,
  depthGradientAngle,
  depthMaskDirection,
  isConvex,
  sceneSpace,
  spaceLabel,
  spaceWarnings,
} from "@/lib/scene-space";

describe("scene space", () => {
  it("reads a frontal face as square to the lens with no depth cues", () => {
    const s = sceneSpace(quadFromRect({ x: 0.2, y: 0.2, w: 0.5, h: 0.4 }));
    expect(s.depthAxis).toBe("none");
    expect(s.depthRatio).toBeCloseTo(1, 3);
    expect(s.haze).toBe(0);
    expect(s.defocus).toBe(0);
  });

  it("finds the deep end of a floor laid away from the lens", () => {
    // Far edge on top is short, near edge at the bottom is wide.
    const s = sceneSpace([
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.9, y: 0.8 },
      { x: 0.1, y: 0.8 },
    ]);
    expect(s.depthAxis).toBe("up");
    expect(s.depthRatio).toBeGreaterThan(1.5);
    expect(s.haze).toBeGreaterThan(0);
    expect(s.defocus).toBeGreaterThan(0.4);
    expect(depthMaskDirection(s.depthAxis)).toBe("to top");
    expect(depthGradientAngle(s.depthAxis)).toBe(180);
  });

  it("finds the deep end of a wall running away to the left", () => {
    const s = sceneSpace([
      { x: 0.05, y: 0.25 },
      { x: 0.8, y: 0.1 },
      { x: 0.8, y: 0.9 },
      { x: 0.05, y: 0.72 },
    ]);
    expect(s.depthAxis).toBe("left");
    expect(depthMaskDirection(s.depthAxis)).toBe("to left");
    expect(depthGradientAngle(s.depthAxis)).toBe(90);
    expect(spaceLabel(s)).toContain("left");
  });

  it("puts the horizon on the eye line and reads the lens tilt", () => {
    const looksUp = sceneSpace([
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.16 },
      { x: 0.8, y: 0.6 },
      { x: 0.2, y: 0.7 },
    ]);
    expect(looksUp.eyeLine).not.toBeNull();
    expect(["looking-up", "looking-down", "level"]).toContain(looksUp.attitude);
  });

  it("turns an eye line into a plausible camera height on a measured wall", () => {
    const quad = [
      { x: 0.05, y: 0.2 },
      { x: 0.85, y: 0.26 },
      { x: 0.85, y: 0.74 },
      { x: 0.05, y: 0.8 },
    ] as const;
    const mm = cameraHeightMm(sceneSpace(quad), quad, { hMm: 2400 });
    expect(mm).not.toBeNull();
    expect(mm!).toBeGreaterThan(0);
  });

  it("keeps every measured London face a physically sane surface", () => {
    for (const scene of LONDON_SCENES) {
      const quad = sceneQuad(scene);
      expect(isConvex(quad), `${scene.id} is not convex`).toBe(true);
      const space = sceneSpace(quad);
      expect(
        spaceWarnings(space, quad),
        `${scene.id}: ${spaceWarnings(space, quad).join("; ")}`,
      ).toEqual([]);
      expect(space.depthRatio).toBeLessThanOrEqual(3.4);
    }
  });
});
