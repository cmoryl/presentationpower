/**
 * The Backgrounds tuner, module cards, stages and exporters must paint the
 * SAME ground for a section. This locks the single-resolver contract:
 * replacement artwork first, admin tuning composed on top, applied once.
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  defaultOverride,
  previewGroundLayers,
  resolveGroundLayers,
  groundIsReplaced,
} from "@/lib/template-background";
import { setBackgroundOverrides } from "@/lib/template-registry";
import { setSkinBackdropOverrides } from "@/lib/skin-backdrop-overrides";
import { stylePackById, packGroundPaint } from "@/lib/style-packs";

const CODE = "S01";
const REPLACEMENT = "/api/public/skin-backdrop?path=S01/cover.png&v=1";

function tuned() {
  return {
    ...defaultOverride(CODE, "cover"),
    intensity: 0.25,
    tint: "#003FC7",
    tintStrength: 0.3,
  };
}

describe("ground resolver cohesion", () => {
  beforeEach(() => {
    setSkinBackdropOverrides({ [`${CODE}:cover:0`]: REPLACEMENT });
    setBackgroundOverrides([tuned()]);
  });

  it("paints the replacement art plus the tuning on module grounds", () => {
    const pack = stylePackById("skin-s01")!;
    const layers = packGroundPaint(pack, "scene:cover cover");
    expect(layers.join(", ")).toContain(REPLACEMENT);
    // tint veil + intensity damp both present
    expect(layers.some((l) => /rgba\(0, 63, 199/.test(l))).toBe(true);
  });

  it("tuner preview equals the module ground for the same section", () => {
    const pack = stylePackById("skin-s01")!;
    expect(previewGroundLayers(pack, CODE, "scene:cover cover", tuned())).toEqual(
      packGroundPaint(pack, "scene:cover cover"),
    );
  });

  it("never applies the tuning twice", () => {
    const pack = stylePackById("skin-s01")!;
    const once = resolveGroundLayers(pack.ground, null, "scene:cover cover", pack.tokens.surface);
    expect(packGroundPaint(pack, "scene:cover cover")).toEqual(once);
  });

  it("reports a replaced ground for suppression of scaffold and motif", () => {
    expect(groundIsReplaced(CODE, "scene:cover cover")).toBe(true);
    setSkinBackdropOverrides({});
    setBackgroundOverrides([]);
    expect(groundIsReplaced(CODE, "scene:cover cover")).toBe(false);
  });
});
