import { describe, expect, it } from "vitest";

import { LONDON_SCENES, sceneQuad } from "@/lib/next-london-scenes";
import {
  applyHomography,
  faceQuadTransform,
  isQuadSkewed,
  quadBounds,
  quadForeshortening,
  quadFromRect,
  quadInFaceSpace,
  rectToQuadHomography,
  type SceneQuad,
} from "@/lib/scene-perspective";

const RECT = { x: 0.2, y: 0.1, w: 0.5, h: 0.4 };

describe("scene perspective", () => {
  it("maps a rectangle's corners exactly onto the target quad", () => {
    const target: SceneQuad = [
      { x: 10, y: 20 },
      { x: 300, y: 60 },
      { x: 280, y: 400 },
      { x: 40, y: 380 },
    ];
    const m = rectToQuadHomography({ w: 320, h: 420 }, target)!;
    expect(m).toBeTruthy();
    const src: SceneQuad = [
      { x: 0, y: 0 },
      { x: 320, y: 0 },
      { x: 320, y: 420 },
      { x: 0, y: 420 },
    ];
    src.forEach((p, i) => {
      const got = applyHomography(m, p);
      expect(got.x).toBeCloseTo(target[i]!.x, 4);
      expect(got.y).toBeCloseTo(target[i]!.y, 4);
    });
  });

  it("treats a frontal face as unwarped so the print stays unresampled", () => {
    expect(isQuadSkewed(quadFromRect(RECT))).toBe(false);
    expect(faceQuadTransform(quadFromRect(RECT), RECT, { w: 800, h: 600 })).toBeNull();
    expect(quadForeshortening(quadFromRect(RECT))).toBeCloseTo(1, 6);
  });

  it("emits a matrix3d for a raked face", () => {
    const quad: SceneQuad = [
      { x: 0.2, y: 0.12 },
      { x: 0.7, y: 0.08 },
      { x: 0.72, y: 0.52 },
      { x: 0.18, y: 0.48 },
    ];
    expect(isQuadSkewed(quad)).toBe(true);
    const css = faceQuadTransform(quad, RECT, { w: 800, h: 600 });
    expect(css).toMatch(/^matrix3d\(/);
    expect(css).not.toContain("NaN");
  });

  it("expresses a quad in face-local pixels", () => {
    const quad: SceneQuad = [
      { x: 0.2, y: 0.1 },
      { x: 0.7, y: 0.1 },
      { x: 0.7, y: 0.5 },
      { x: 0.2, y: 0.5 },
    ];
    const local = quadInFaceSpace(quad, RECT, { w: 100, h: 50 });
    expect(local[0]).toEqual({ x: 0, y: 0 });
    expect(local[2]!.x).toBeCloseTo(100, 6);
    expect(local[2]!.y).toBeCloseTo(50, 6);
  });

  it("keeps every measured scene quad sane and near its face rectangle", () => {
    for (const scene of LONDON_SCENES) {
      const quad = sceneQuad(scene);
      const bounds = quadBounds(quad);
      expect(bounds.w).toBeGreaterThan(0.01);
      expect(bounds.h).toBeGreaterThan(0.01);
      for (const p of quad) {
        expect(p.x).toBeGreaterThanOrEqual(-0.02);
        expect(p.x).toBeLessThanOrEqual(1.02);
        expect(p.y).toBeGreaterThanOrEqual(-0.02);
        expect(p.y).toBeLessThanOrEqual(1.02);
      }
      if (!scene.quad) continue;
      // A measured quad must describe the same surface as the face rectangle.
      expect(Math.abs(bounds.x - scene.face.x)).toBeLessThan(0.06);
      expect(Math.abs(bounds.y - scene.face.y)).toBeLessThan(0.06);
      expect(Math.abs(bounds.w - scene.face.w)).toBeLessThan(0.12);
      expect(Math.abs(bounds.h - scene.face.h)).toBeLessThan(0.12);
      // A deep foyer wall run legitimately halves; anything below reads as a
      // mis-read corner rather than perspective.
      expect(quadForeshortening(quad)).toBeGreaterThan(0.45);
      expect(faceQuadTransform(quad, scene.face, { w: 1536, h: 1024 })).toMatch(/^matrix3d\(/);
    }
  });
});
