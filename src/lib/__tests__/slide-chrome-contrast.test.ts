import { describe, expect, it } from "vitest";
import { contrastRatio, makeSlideInk } from "@/components/slide/SlideChrome";
import { foregroundOn } from "@/lib/export-foreground";
import { BRAND_MODES } from "@/lib/taxonomy";

const AA = 4.5;

describe("locked slide chrome contrast", () => {
  it.each(["light", "dark"] as const)("keeps muted and faint %s ink at AA", (mode) => {
    for (const brand of BRAND_MODES) {
      const backgrounds = mode === "dark"
        ? ["#03002C", "#0A1230"]
        : ["#FFFFFF", brand.tokens.surface];
      const ink = makeSlideInk(
        mode,
        brand.tokens.accent,
        brand.tokens.primary,
        brand.tokens.surface,
        brand.tokens.ink,
      );

      for (const role of ["muted", "faint"] as const) {
        expect(ink[role], `${brand.id}.${role} must be opaque`).toMatch(/^#[0-9a-f]{6}$/i);
        for (const background of backgrounds) {
          expect(
            contrastRatio(ink[role], background),
            `${brand.id}.${role} on ${background}`,
          ).toBeGreaterThanOrEqual(AA);
        }
      }
    }
  });

  it("gives every split-cover brand panel an AA eyebrow/date foreground", () => {
    for (const brand of BRAND_MODES) {
      const foreground = `#${foregroundOn(brand.tokens.primary)}`;
      expect(
        contrastRatio(foreground, brand.tokens.primary),
        `${brand.id} split-cover panel`,
      ).toBeGreaterThanOrEqual(AA);
    }
  });
});