import { describe, expect, it } from "vitest";

import {
  checkIconAccentContrast,
  iconContrastRatio,
  iconPageBackground,
  parseIconColor,
  suggestIconAccent,
} from "@/lib/print-icon-contrast";

describe("parseIconColor", () => {
  it("parses hex shorthand, hex and rgb", () => {
    expect(parseIconColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseIconColor("#003FC7")).toEqual({ r: 0, g: 63, b: 199 });
    expect(parseIconColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("composites alpha over white and rejects junk", () => {
    expect(parseIconColor("rgba(0,0,0,0.5)")).toEqual({ r: 128, g: 128, b: 128 });
    expect(parseIconColor("not-a-color")).toBeNull();
    expect(parseIconColor(undefined)).toBeNull();
  });
});

describe("iconContrastRatio", () => {
  it("matches known WCAG ratios", () => {
    expect(iconContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
    expect(iconContrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 2);
    // TransPerfect brand blue on white.
    expect(iconContrastRatio("#003FC7", "#FFFFFF")).toBeGreaterThan(7);
  });
});

describe("checkIconAccentContrast", () => {
  it("passes the section default (no accent override)", () => {
    expect(checkIconAccentContrast(undefined, "#FFFFFF").status).toBe("pass");
  });

  it("passes strong accents on white paper", () => {
    expect(checkIconAccentContrast("#003FC7", "#FFFFFF").status).toBe("pass");
  });

  it("fails pale accents on white paper and suggests a darker one", () => {
    const r = checkIconAccentContrast("#A1FBF9", "#FFFFFF");
    expect(r.status).toBe("fail");
    expect(r.required).toBe(3);
    expect(r.message).toMatch(/hard to read/i);
    expect(r.suggestion).toBeTruthy();
    expect(iconContrastRatio(r.suggestion!, "#FFFFFF")).toBeGreaterThanOrEqual(3);
  });

  it("fails dark accents on dark stock and suggests a lighter one", () => {
    const bg = iconPageBackground("dark");
    const r = checkIconAccentContrast("#03002C", bg);
    expect(r.status).toBe("fail");
    expect(iconContrastRatio(r.suggestion!, bg)).toBeGreaterThanOrEqual(3);
  });

  it("raises the bar to 4.5:1 for hairline strokes", () => {
    const normal = checkIconAccentContrast("#8A8A8A", "#FFFFFF", 1);
    const hairline = checkIconAccentContrast("#8A8A8A", "#FFFFFF", 0.7);
    expect(normal.required).toBe(3);
    expect(hairline.required).toBe(4.5);
    expect(hairline.status).toBe("fail");
  });

  it("flags the borderline band as tight", () => {
    const r = checkIconAccentContrast("#8E8E8E", "#FFFFFF", 1);
    expect(r.status).toBe("tight");
    expect(r.ratio).toBeGreaterThanOrEqual(3);
    expect(r.message).toMatch(/only just/i);
  });
});

describe("suggestIconAccent", () => {
  it("returns undefined for unparseable input", () => {
    expect(suggestIconAccent("nope", "#FFFFFF", 3)).toBeUndefined();
  });

  it("keeps the suggestion in the same hue family", () => {
    const hex = suggestIconAccent("#A1FBF9", "#FFFFFF", 3)!;
    const rgb = parseIconColor(hex)!;
    // Cyan stays blue/green dominant after darkening.
    expect(rgb.b).toBeGreaterThan(rgb.r);
    expect(rgb.g).toBeGreaterThan(rgb.r);
  });
});
