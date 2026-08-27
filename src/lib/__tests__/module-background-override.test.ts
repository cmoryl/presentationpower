/**
 * PER-MODULE BACKGROUND REPLACEMENT
 *
 * An admin replacing the background for ONE module inside a look must affect
 * that module everywhere (card, module view, PPTX/PDF rasterisation) and
 * nothing else in the look.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  isModuleScene,
  moduleIdFromSeed,
  moduleScene,
  setSkinBackdropOverrides,
  skinBackdropOverride,
} from "@/lib/skin-backdrop-overrides";
import { packGroundPaint, stylePackById } from "@/lib/style-packs";

const MODULE_ART = "https://cdn.test/mod-bento.png";
const SCENE_ART = "https://cdn.test/skin-cover.png";
const VARIANT = "MV-BENTO-5";

const S01 = stylePackById("skin-s01")!;
/** Seed exactly as SlideChrome composes it for a module render. */
const seed = (scene: string, variantId = VARIANT) =>
  `scene:${scene} mod:${variantId} ${variantId} LF-01`;

afterEach(() => setSkinBackdropOverrides({}));

describe("module-scoped scene keys", () => {
  it("normalises the variant id and round-trips through a seed", () => {
    expect(moduleScene("mv-bento-5")).toBe("mod:MV-BENTO-5");
    expect(isModuleScene(moduleScene(VARIANT))).toBe(true);
    expect(isModuleScene("cover")).toBe(false);
    expect(moduleIdFromSeed(seed("bento"))).toBe(VARIANT);
    expect(moduleIdFromSeed("scene:cover MV-COVER LF-01")).toBeNull();
  });
});

describe("resolution precedence", () => {
  it("prefers the module replacement over the skin scene artwork", () => {
    setSkinBackdropOverrides({
      "S01:cover:0": SCENE_ART,
      [`S01:${moduleScene(VARIANT)}:0`]: MODULE_ART,
    });
    expect(skinBackdropOverride("S01", "cover", 0, VARIANT)).toBe(MODULE_ART);
    expect(skinBackdropOverride("S01", "cover", 0, "MV-OTHER")).toBe(SCENE_ART);
    expect(skinBackdropOverride("S01", "cover", 0)).toBe(SCENE_ART);
  });

  it("never crosses skins", () => {
    setSkinBackdropOverrides({ [`S01:${moduleScene(VARIANT)}:0`]: MODULE_ART });
    expect(skinBackdropOverride("S07", "cover", 0, VARIANT)).toBeNull();
  });

  it("falls back to the look when the module has no replacement", () => {
    setSkinBackdropOverrides({ "S01:cover:0": SCENE_ART });
    expect(skinBackdropOverride("S01", "cover", 0, VARIANT)).toBe(SCENE_ART);
  });
});

describe("ground engine", () => {
  it("paints the module replacement for that module only", () => {
    setSkinBackdropOverrides({ [`S01:${moduleScene(VARIANT)}:0`]: MODULE_ART });
    const mine = packGroundPaint(S01, seed("bento")).join(", ");
    expect(mine).toContain(MODULE_ART);

    const other = packGroundPaint(S01, seed("bento", "MV-STAT-MOSAIC")).join(", ");
    expect(other).not.toContain(MODULE_ART);
  });

  it("replaces rather than layers the authored scene", () => {
    setSkinBackdropOverrides({ [`S01:${moduleScene(VARIANT)}:0`]: MODULE_ART });
    const layers = packGroundPaint(S01, seed("bento"));
    expect(layers[0]).toContain(MODULE_ART);
    // Nothing but flat colour survives underneath, so the old procedural scene
    // can't read through the replacement.
    expect(layers.slice(1).every((l) => /^(#|rgb|hsl)/i.test(l.trim()))).toBe(true);
  });

  it("reverting restores the authored composition", () => {
    const authored = packGroundPaint(S01, seed("bento")).join(", ");
    setSkinBackdropOverrides({ [`S01:${moduleScene(VARIANT)}:0`]: MODULE_ART });
    setSkinBackdropOverrides({});
    expect(packGroundPaint(S01, seed("bento")).join(", ")).toBe(authored);
  });
});
