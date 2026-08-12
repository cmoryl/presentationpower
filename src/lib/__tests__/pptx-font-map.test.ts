import { describe, expect, it } from "vitest";
import {
  CANONICAL_FONTS,
  cssStackFor,
  fallbackFor,
  mapFontFamily,
  normalizeTypefacesInXml,
  patchThemeFontScheme,
} from "../pptx-font-map";

describe("mapFontFamily", () => {
  it("maps brand + web stacks to the brand sans", () => {
    expect(mapFontFamily('"Geist Variable", Geist, sans-serif')).toBe("Geist");
    expect(mapFontFamily("ui-sans-serif, system-ui, -apple-system")).toBe("Geist");
    expect(mapFontFamily("Calibri")).toBe("Geist");
    expect(mapFontFamily("")).toBe(CANONICAL_FONTS.sans);
  });

  it("keeps monospace and serif voices", () => {
    expect(mapFontFamily("ui-monospace, SFMono-Regular, monospace")).toBe("Geist Mono");
    expect(mapFontFamily("Times New Roman")).toBe("Georgia");
    expect(mapFontFamily("Some Slab Display, serif")).toBe("Georgia");
  });

  it("walks the stack past unknown faces", () => {
    expect(mapFontFamily('"Totally Unknown", Georgia, serif')).toBe("Georgia");
    expect(mapFontFamily('"Totally Unknown"')).toBe("Geist");
  });
});

describe("fallbacks", () => {
  it("provides an ordered substitution chain", () => {
    expect(fallbackFor("Geist")[0]).toBe("Inter");
    expect(fallbackFor("Geist Mono")).toContain("Courier New");
    expect(cssStackFor("Arial")).toBe('Geist, Inter, "Helvetica Neue", Arial, sans-serif');
  });
});

describe("OOXML patching", () => {
  it("replaces an existing font scheme with the brand scheme", () => {
    const theme =
      '<a:theme><a:themeElements><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont></a:fontScheme></a:themeElements></a:theme>';
    const out = patchThemeFontScheme(theme);
    expect(out).not.toContain("Calibri Light");
    expect(out).toContain('<a:fontScheme name="TransPerfect">');
    expect((out.match(/<a:fontScheme/g) ?? []).length).toBe(1);
    expect(out).toContain('<a:latin typeface="Geist"');
  });

  it("inserts a scheme when the theme has none", () => {
    const out = patchThemeFontScheme("<a:theme><a:themeElements></a:themeElements></a:theme>");
    expect(out).toContain('<a:fontScheme name="TransPerfect">');
  });

  it("normalizes stray typefaces but preserves inherit + theme refs", () => {
    const xml =
      '<a:rPr><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface="+mn-lt"/></a:rPr>';
    const out = normalizeTypefacesInXml(xml);
    expect(out).toContain('typeface="Geist"');
    expect(out).toContain('typeface=""');
    expect(out).toContain('typeface="+mn-lt"');
  });
});
