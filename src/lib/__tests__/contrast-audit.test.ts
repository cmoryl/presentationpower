import { describe, expect, it } from "vitest";
import {
  AA_LARGE,
  auditDeckColors,
  auditSlideColors,
  contrastRatio,
  normalizeHex,
} from "../contrast-audit";

describe("contrast-audit", () => {
  it("computes known WCAG ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 2);
  });

  it("normalizes shorthand and invalid hex", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("nonsense")).toBe("#003fc7");
  });

  it("flags yellow accent text on a light surface", () => {
    const a = auditSlideColors({ accent: "#ffeb66", mode: "light" });
    const text = a.findings.find((f) => f.id === "accent-text")!;
    expect(text.level).toBe("fail");
    expect(a.failures).toBeGreaterThan(0);
    expect(a.safeAccent).toBeDefined();
    expect(contrastRatio(a.safeAccent!, a.bg)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it("passes aqua accent text on the dark surface", () => {
    const a = auditSlideColors({ accent: "#a1fbf9", mode: "dark" });
    expect(a.findings.find((f) => f.id === "accent-text")!.level).toBe("pass");
    expect(a.safeAccent).toBeUndefined();
  });

  it("flags deep blue accent text on the dark backdrop", () => {
    const a = auditSlideColors({ accent: "#003fc7", mode: "dark" });
    expect(a.findings.find((f) => f.id === "accent-text")!.level).not.toBe("pass");
  });

  it("always checks body ink against the surface", () => {
    for (const mode of ["light", "dark"] as const) {
      const ink = auditSlideColors({ mode }).findings.find((f) => f.id === "ink-body")!;
      expect(ink.level).toBe("pass");
    }
  });

  it("rolls up failing and warning slides for the deck", () => {
    const deck = auditDeckColors([
      { index: 0, accent: "#ffeb66", mode: "light" },
      { index: 1, accent: "#a1fbf9", mode: "dark" },
    ]);
    expect(deck.failingSlides).toContain(0);
    expect(deck.failingSlides).not.toContain(1);
    expect(deck.level).toBe("fail");
    expect(deck.bySlide.size).toBe(2);
  });
});
