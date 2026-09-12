import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import { LONDON_SCENES, fitArtworkInFace, londonScene } from "@/lib/next-london-scenes";
import {
  measuredSurface,
  sceneSpecFit,
  scaleTrueBox,
  specFitLabel,
} from "@/lib/scene-scale";

const panel = (match: string) => {
  const p = LONDON_PANELS.find((x) => x.name.includes(match));
  if (!p) throw new Error(`no panel for ${match}`);
  return p;
};

describe("scene scale accuracy", () => {
  it("places a print at its true fraction of a measured surface", () => {
    const scene = londonScene("ref-scenic-wall-blank")!;
    const surface = measuredSurface(scene)!;
    const p = LONDON_PANELS.find((x) => x.trimW < surface.wMm * 0.5)!;
    const box = scaleTrueBox({
      face: scene.face,
      plate: scene.plate,
      panel: p,
      surface,
    });
    if (box) {
      const expected = (p.trimW / surface.wMm) * scene.face.w;
      expect(box.w).toBeCloseTo(expected, 5);
      // The print keeps its exact trim ratio on the plate.
      const px = (box.w * scene.plate.w) / (box.h * scene.plate.h);
      expect(px).toBeCloseTo(p.trimW / p.trimH, 2);
    }
  });

  it("never returns a box larger than the measured surface", () => {
    const scene = londonScene("ref-foyer-pillar")!;
    const surface = measuredSurface(scene)!;
    const huge = { ...panel(""), trimW: surface.wMm * 3, trimH: surface.hMm * 3 };
    expect(scaleTrueBox({ face: scene.face, plate: scene.plate, panel: huge, surface })).toBeNull();
  });

  it("reports true scale only where the surface is measured", () => {
    for (const scene of LONDON_SCENES) {
      for (const p of LONDON_PANELS.slice(0, 12)) {
        const fit = sceneSpecFit(p, scene);
        if (!fit.surface) {
          expect(fit.mode).toBe("indicative");
          expect(specFitLabel(fit)).toContain("not measured");
        } else {
          expect(["scale-true", "oversize", "cropped"]).toContain(fit.mode);
        }
      }
    }
  });

  it("flags a print that cannot fit the surface it is shown on", () => {
    const scene = londonScene("ref-foyer-pillar")!;
    const surface = measuredSurface(scene)!;
    const fit = sceneSpecFit(
      { ...panel(""), trimW: surface.wMm * 2, trimH: surface.hMm },
      scene,
    );
    expect(fit.mode).toBe("oversize");
    expect(fit.warnings[0]).toContain("does not fit");
  });

  it("keeps every rendered artwork box inside the plate", () => {
    for (const scene of LONDON_SCENES) {
      for (const p of LONDON_PANELS.slice(0, 20)) {
        const box = fitArtworkInFace(p, scene);
        expect(box.w).toBeGreaterThan(0);
        expect(box.h).toBeGreaterThan(0);
        expect(box.x).toBeGreaterThanOrEqual(-0.001);
        expect(box.y).toBeGreaterThanOrEqual(-0.001);
        expect(box.x + box.w).toBeLessThanOrEqual(1.001);
        expect(box.y + box.h).toBeLessThanOrEqual(1.001);
      }
    }
  });
});
