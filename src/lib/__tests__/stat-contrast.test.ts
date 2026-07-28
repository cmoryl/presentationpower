// Guards the automatic stat-contrast correction: every division accent must
// produce readable figure gradients in both modes, and low-contrast accents
// must never receive a glow.

import { describe, expect, it } from "vitest";
import { BRAND_MODES } from "@/lib/taxonomy";
import { statColors, DARK_STAT_BG, LIGHT_STAT_BG } from "@/lib/stat-contrast";

describe("stat contrast guard", () => {
  it("lifts every brand accent to AA-Large or better on dark backdrops", () => {
    const bad = BRAND_MODES.filter(
      (b) => statColors(b.tokens.accent, "dark", { bg: DARK_STAT_BG }).contrast < 3,
    ).map((b) => b.id);
    expect(bad, `Accents unreadable on dark: ${bad.join(", ")}`).toEqual([]);
  });

  it("keeps light-mode figures readable on white", () => {
    const bad = BRAND_MODES.filter(
      (b) => statColors(b.tokens.accent, "light", { bg: LIGHT_STAT_BG }).contrast < 3,
    ).map((b) => b.id);
    expect(bad, `Accents unreadable on light: ${bad.join(", ")}`).toEqual([]);
  });

  it("omits the halo when contrast is still below target", () => {
    // Near-black accent on a near-black backdrop cannot reach the target.
    const c = statColors("#050514", "dark", { bg: "#03002C" });
    expect(c.glow ?? "").not.toContain("0 0 10px");
  });

  it("never glows in light mode", () => {
    expect(statColors("#003FC7", "light").glow).toBeUndefined();
  });
});
