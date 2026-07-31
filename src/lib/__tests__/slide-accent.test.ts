// Per-slide accentOverride must resolve identically everywhere (renderer,
// PPTX export, QA) and must raise a contrast warning when illegible.

import { describe, expect, it } from "vitest";
import { resolveSlideAccent, readAccentOverride, hexContrast } from "@/lib/slide-accent";
import { buildNextPaletteShowcase } from "@/lib/next-palette-showcase";
import { resolveBrandMode } from "@/lib/brand-profiles";
import { runQa } from "@/lib/qa";
import type { DeckSlide } from "@/lib/deck-store";

const brand = resolveBrandMode("bm-enterprise");

const slide = (content: Record<string, unknown>, mode?: "light" | "dark"): DeckSlide => ({
  id: "s1",
  position: 0,
  sectionId: "SF-01",
  variantId: "MV-OP-COVER",
  layoutId: "LF-01",
  content: content as DeckSlide["content"],
  changes: [],
  mode,
});

describe("slide accent resolution", () => {
  it("accepts valid hex and rejects junk", () => {
    expect(readAccentOverride({ accentOverride: "#A6FA87" })).toBe("#A6FA87");
    expect(readAccentOverride({ accentOverride: "A6FA87" })).toBeUndefined();
    expect(readAccentOverride({ accentOverride: "#ABC" })).toBeUndefined();
    expect(readAccentOverride({})).toBeUndefined();
  });

  it("falls back to the deck brand accent", () => {
    expect(resolveSlideAccent(slide({}), brand)).toBe(brand.tokens.accent);
    expect(resolveSlideAccent(slide({ accentOverride: "nope" }), brand)).toBe(brand.tokens.accent);
  });

  it("keeps every showcase division accent through resolution", () => {
    const payload = buildNextPaletteShowcase();
    const overrides = payload.slides
      .map((s) => readAccentOverride(s.content))
      .filter((v): v is string => !!v);
    expect(overrides.length).toBeGreaterThan(10);
    for (const hex of overrides) {
      expect(resolveSlideAccent({ content: { accentOverride: hex } }, brand)).toBe(hex);
    }
  });
});

describe("QA accent contrast guard", () => {
  it("warns (never blocks) on a high-luminance accent in light mode", () => {
    const issues = runQa([slide({ accentOverride: "#FFEB66", title: "T" }, "light")], brand.id);
    const hit = issues.find((i) => i.code.startsWith("accent-contrast"));
    expect(hit?.severity).toBe("warn");
    expect(hit?.message).toContain("#FFEB66");
  });

  it("stays quiet when the accent is legible for the mode", () => {
    const issues = runQa([slide({ accentOverride: "#A1FBF9", title: "T" }, "dark")], brand.id);
    expect(issues.filter((i) => i.code.startsWith("accent-contrast"))).toEqual([]);
  });

  it("measures WCAG ratios", () => {
    expect(hexContrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });
});
