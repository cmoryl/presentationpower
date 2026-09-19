import { describe, expect, it } from "vitest";
import { readBrandDocument } from "@/lib/brand-guide-doc-read";

const DOC = `
# TransPerfect Legal Brand Guide

## Primary colours
Blue 500 #003FC7 PANTONE 2728 C R0 G63 B199
Blue 800 #03002C

## Secondary colours
Aqua #A1FBF9
Lavender #C2A3FF

## Neutrals
Light Gray #F2F2F2

Primary typeface: Geist Sans
Web font — Geist Variable

## Never translate
- GlobalLink - product name, always English
- TransPerfect Legal
`;

describe("readBrandDocument", () => {
  const read = readBrandDocument(DOC);

  it("takes colours from the file and groups them by section", () => {
    const blue = read.swatches.find((s) => s.hex === "#003FC7");
    expect(blue?.name).toBe("Blue 500");
    expect(blue?.group).toBe("primaryColors");
    expect(blue?.pantone).toMatch(/PANTONE 2728/i);
    expect(read.swatches.find((s) => s.hex === "#A1FBF9")?.group).toBe("secondaryColors");
    expect(read.swatches.find((s) => s.hex === "#F2F2F2")?.group).toBe("neutrals");
  });

  it("reads the typeface names", () => {
    expect(read.typefacePrimary).toBe("Geist Sans");
    expect(read.typefaceWeb).toBe("Geist Variable");
  });

  it("collects never-translate terms with their note", () => {
    const gl = read.terms.find((t) => t.term === "GlobalLink");
    expect(gl?.doNotTranslate).toBe(true);
    expect(gl?.note).toContain("product name");
    expect(read.terms.map((t) => t.term)).toContain("TransPerfect Legal");
  });

  it("never invents a colour that is not written in the file", () => {
    expect(read.swatches.every((s) => DOC.toUpperCase().includes(s.hex))).toBe(true);
  });

  it("drops colours with no readable name", () => {
    expect(readBrandDocument("#123456").swatches).toHaveLength(0);
  });
});
