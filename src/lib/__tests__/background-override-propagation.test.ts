/**
 * BACKGROUND OVERRIDE PROPAGATION — an admin edit in the Background Tuner must
 * reach every surface that paints a slide/page ground: previews, deck editor,
 * present/share, print and every export path. They all resolve the look through
 * `stylePackById` / `effectivePack`, so this suite asserts the contract at that
 * seam for each override kind (image upload, tint, intensity, scene swap).
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setBackgroundOverrides, type TemplateBackgroundOverride } from "@/lib/template-registry";
import { stylePackById } from "@/lib/style-packs";
import { effectivePack } from "@/lib/effective-pack";
import { defaultOverride } from "@/lib/template-background";

const IMG = "https://cdn.example.com/uploads/my-backdrop.png";

function override(
  code: string,
  scene: string,
  patch: Partial<TemplateBackgroundOverride>,
): TemplateBackgroundOverride {
  return { ...defaultOverride(code, scene), ...patch };
}

/** Every pack family a user can select from the library. */
const PACK_IDS: Array<{ id: string; code: string }> = [
  { id: "skin-s29", code: "S29" },
  { id: "skin-s01", code: "S01" },
];

afterEach(() => setBackgroundOverrides([]));

describe("uploaded background art propagates", () => {
  beforeEach(() => setBackgroundOverrides([]));

  it.each(PACK_IDS)("$id ground carries the uploaded image", ({ id, code }) => {
    const before = stylePackById(id)!.ground("cover").join(", ");
    expect(before).not.toContain(IMG);

    setBackgroundOverrides([override(code, "cover", { imageUrl: IMG })]);
    const after = stylePackById(id)!.ground("cover").join(", ");
    expect(after).toContain(`url("${IMG}")`);
  });

  it("only the edited section changes", () => {
    setBackgroundOverrides([override("S29", "cover", { imageUrl: IMG })]);
    const pack = stylePackById("skin-s29")!;
    expect(pack.ground("cover").join(", ")).toContain(IMG);
    expect(pack.ground("stats").join(", ")).not.toContain(IMG);
  });

  it("survives an industry recipe ground (effectivePack)", () => {
    setBackgroundOverrides([override("S29", "cover", { imageUrl: IMG })]);
    const composed = effectivePack({ stylePackId: "skin-s29", designRecipeId: "R20" })!;
    expect(composed.ground("cover").join(", ")).toContain(IMG);
  });
});

describe("tint / intensity / scene swap propagate", () => {
  beforeEach(() => setBackgroundOverrides([]));

  it("tint veils the ground", () => {
    setBackgroundOverrides([override("S29", "stats", { tint: "#EC388A", tintStrength: 0.5 })]);
    expect(stylePackById("skin-s29")!.ground("stats").join(", ")).toMatch(/236,\s*56,\s*138/);
  });

  it("intensity changes the composed layer list", () => {
    const base = stylePackById("skin-s29")!.ground("stats").join(", ");
    setBackgroundOverrides([override("S29", "stats", { intensity: 0 })]);
    expect(stylePackById("skin-s29")!.ground("stats").join(", ")).not.toBe(base);
  });

  it("scene swap paints another section's composition", () => {
    const coverLayers = stylePackById("skin-s29")!.ground("cover");
    setBackgroundOverrides([override("S29", "stats", { sceneSwap: "cover" })]);
    const swapped = stylePackById("skin-s29")!.ground("stats");
    expect(swapped.join(", ")).toContain(coverLayers[coverLayers.length - 1]!);
  });

  it("a neutral override leaves the authored art untouched", () => {
    const base = stylePackById("skin-s29")!.ground("cover").join(", ");
    setBackgroundOverrides([override("S29", "cover", {})]);
    expect(stylePackById("skin-s29")!.ground("cover").join(", ")).toBe(base);
  });

  it("clearing overrides restores the look's own artwork", () => {
    const base = stylePackById("skin-s29")!.ground("cover").join(", ");
    setBackgroundOverrides([override("S29", "cover", { imageUrl: IMG })]);
    setBackgroundOverrides([]);
    expect(stylePackById("skin-s29")!.ground("cover").join(", ")).toBe(base);
  });
});
