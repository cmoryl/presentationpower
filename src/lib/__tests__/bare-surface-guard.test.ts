import { describe, expect, it } from "vitest";
import { STYLE_PACKS } from "@/lib/style-packs";

/**
 * Bare-surface guard.
 *
 * Organic Systems (S21) declares `surfaceStyle: "bare"` so its content sits
 * directly on the biomorphic field — no translucent boxes, rings, or shadows
 * framing module content. VariantRenderer keys off `pack.card.bg ===
 * "transparent"` to strip the box chrome, so the pack contract must hold:
 *
 *   - exactly the bare skins resolve to a transparent card
 *   - a bare card carries no border, no shadow, no blur
 */
describe("bare surface style", () => {
  const s21 = STYLE_PACKS.find((p) => p.id === "skin-s21");

  it("S21 (Organic Systems) resolves to a fully transparent card", () => {
    expect(s21, "skin-s21 must exist").toBeTruthy();
    expect(s21!.card.bg).toBe("transparent");
    expect(s21!.card.border).toBe("none");
    expect(s21!.card.shadow).toBe("none");
    expect(s21!.card.blur).toBe("none");
  });

  it("no other pack accidentally resolves to a transparent card", () => {
    const transparentPacks = STYLE_PACKS.filter((p) => p.card.bg === "transparent").map(
      (p) => p.id,
    );
    expect(transparentPacks).toEqual(["skin-s21"]);
  });
});
