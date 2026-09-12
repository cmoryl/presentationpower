import { describe, expect, it } from "vitest";

import { LONDON_SCENES } from "@/lib/next-london-scenes";
import {
  castShadow,
  kelvinTint,
  lightQualityLabel,
  sceneLightQuality,
} from "@/lib/scene-lighting";

describe("scene light quality", () => {
  it("gives every London scene a plausible photographic read", () => {
    for (const s of LONDON_SCENES) {
      const q = sceneLightQuality(s.id);
      expect(q.kelvin).toBeGreaterThanOrEqual(1800);
      expect(q.kelvin).toBeLessThanOrEqual(9000);
      expect(q.hardness).toBeGreaterThan(0);
      expect(q.hardness).toBeLessThanOrEqual(1);
      expect(q.azimuth).toBeGreaterThanOrEqual(0);
      expect(q.azimuth).toBeLessThanOrEqual(360);
      expect(q.elevation).toBeGreaterThan(5);
      expect(q.elevation).toBeLessThan(90);
      expect(q.shadowLength).toBeGreaterThan(0);
      expect(lightQualityLabel(q)).toMatch(/·/);
    }
  });

  it("throws the shadow away from the light and always downward", () => {
    const left = castShadow(sceneLightQuality("photo-foyer-wall-run"), 0.3);
    expect(left.x).toBeGreaterThan(0); // light from the left → shadow to the right
    expect(left.y).toBeGreaterThan(0);
    const right = castShadow({ ...sceneLightQuality("photo-foyer-wall-run"), azimuth: 250 }, 0.3);
    expect(right.x).toBeLessThan(0);
  });

  it("keeps a low sun's shadow longer and softer than a high one", () => {
    const low = sceneLightQuality("photo-facade-evening");
    const high = sceneLightQuality("live-floor-graphic");
    expect(low.shadowLength).toBeGreaterThan(high.shadowLength);
    expect(castShadow(low, 0.3).blur).toBeGreaterThan(0);
  });

  it("derives a warm cast from a warm temperature and a cool one from daylight", () => {
    const warm = kelvinTint(3000);
    const cool = kelvinTint(6500);
    const red = (hex: string) => parseInt(hex.slice(1, 3), 16);
    const blue = (hex: string) => parseInt(hex.slice(5, 7), 16);
    expect(red(warm) - blue(warm)).toBeGreaterThan(red(cool) - blue(cool));
  });
});
