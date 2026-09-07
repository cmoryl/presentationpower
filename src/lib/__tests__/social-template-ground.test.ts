import { describe, expect, it } from "vitest";

import {
  socialGroundLook,
  socialGroundPlate,
  socialGroundScene,
  socialLookCode,
} from "../social-template-ground";

describe("social template ground", () => {
  it("normalises pack ids and codes to a bare look code", () => {
    expect(socialLookCode("skin-s04")).toBe("S04");
    expect(socialLookCode("tpl-c01")).toBe("C01");
    expect(socialLookCode("R12")).toBe("R12");
    expect(socialLookCode("")).toBeNull();
  });

  it("resolves an approved core look to its pack", () => {
    const look = socialGroundLook("skin-s06");
    expect(look?.code).toBe("S06");
    expect(look?.pack.tokens.surface).toBeTruthy();
  });

  it("maps module families to the matching scene role", () => {
    expect(socialGroundScene("hero")).toBe("cover");
    expect(socialGroundScene("stats")).toBe("stats");
    expect(socialGroundScene("quote")).toBe("quote");
    expect(socialGroundScene("logo-grid")).toBe("bento");
  });

  it("falls back to a deterministic scene for unknown families", () => {
    const a = socialGroundScene(null, "some-module");
    const b = socialGroundScene(null, "some-module");
    expect(a).toBe(b);
  });

  it("paints a plate with layers, surface and scene", () => {
    const plate = socialGroundPlate("skin-s06", "stats", "stat-band");
    expect(plate).not.toBeNull();
    expect(plate!.scene).toBe("stats");
    expect(plate!.code).toBe("S06");
    expect(plate!.background.length).toBeGreaterThan(0);
    expect(["light", "dark"]).toContain(plate!.mode);
  });

  it("returns nothing without a look, so the aura ground stays", () => {
    expect(socialGroundPlate(null, "hero")).toBeNull();
    expect(socialGroundPlate("not-a-look", "hero")).toBeNull();
  });

  it("gives different scenes different grounds within one look", () => {
    const cover = socialGroundPlate("skin-s06", "hero")!;
    const stats = socialGroundPlate("skin-s06", "stats")!;
    expect(cover.scene).not.toBe(stats.scene);
  });
});
