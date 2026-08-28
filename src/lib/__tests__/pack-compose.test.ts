import { describe, expect, it } from "vitest";
import { ALL_SKIN_PACKS } from "../design-skin-pack";
import { packCompose, composeSummary } from "../pack-compose";

describe("pack composition", () => {
  it("gives every skin a distinct module composition", () => {
    const seen = new Map<string, string>();
    for (const pack of ALL_SKIN_PACKS) {
      const c = packCompose(pack);
      const key = [c.anchor, c.bias, c.plate, c.order, c.column.toFixed(2)].join("|");
      expect(seen.has(key), `${pack.id} composes like ${seen.get(key)}`).toBe(false);
      seen.set(key, pack.id);
    }
    expect(seen.size).toBe(ALL_SKIN_PACKS.length);
  });

  it("keeps the reading column inside the sheet", () => {
    for (const pack of ALL_SKIN_PACKS) {
      const c = packCompose(pack);
      expect(c.column).toBeGreaterThan(0.4);
      expect(c.column).toBeLessThanOrEqual(0.96);
      expect(c.lead + c.trail).toBeLessThan(260);
      expect(composeSummary(c).length).toBeGreaterThan(10);
    }
  });

  it("keeps Spatial Clarity free of outer composition frames", () => {
    const spatialClarity = ALL_SKIN_PACKS.find((pack) => String(pack.id) === "skin-s01");
    expect(spatialClarity).toBeDefined();
    if (!spatialClarity) return;

    expect(packCompose(spatialClarity).plate).toBe("none");
    expect(packCompose(spatialClarity, "MV-CLOSE-CONTACT").plate).toBe("none");
  });
});
