import { describe, expect, it } from "vitest";

import {
  fitArtworkInFace,
  londonScene,
  sceneArtworkObjectFit,
  scenesForPanel,
} from "@/lib/next-london-scenes";
import { LONDON_PANELS, type LondonPanel } from "@/lib/next-london-signage";

function panel(name: string): LondonPanel {
  const found = LONDON_PANELS.find((p) => p.name === name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

describe("door vinyl scene mounting", () => {
  it("skins the whole door leaf for a door-shaped item", () => {
    const door = panel("DOOR BRANDING ALBERT - 840x2000mm");
    const scene = londonScene("door-vinyl")!;
    const box = fitArtworkInFace(door, scene);
    expect(box).toEqual(scene.face);
    expect(sceneArtworkObjectFit(door, scene)).toBe("cover");
  });

  it("never cover-crops an item that is nothing like a door", () => {
    const square = panel("FLEMING DOOR ARTWORK - 1500x1500mm");
    const scene = londonScene("door-vinyl")!;
    expect(sceneArtworkObjectFit(square, scene)).toBe("contain");
    const box = fitArtworkInFace(square, scene);
    // keeps the true trim ratio and stays on the plate
    const ratio = (box.w * scene.plate.w) / (box.h * scene.plate.h);
    expect(ratio).toBeCloseTo(1, 2);
    expect(box.x + box.w).toBeLessThanOrEqual(1);
    expect(box.y + box.h).toBeLessThanOrEqual(1);
  });

  it("does not default a square door artwork to the door leaf scene", () => {
    const square = panel("FLEMING DOOR ARTWORK - 1500x1500mm");
    expect(scenesForPanel(square)[0]!.id).not.toBe("door-vinyl");
  });
});
