import { describe, expect, it } from "vitest";
import { BRAND, pptxHex } from "./brand-colors";
import { brandColorSchemeXml, patchThemeXml } from "./pptx-brand-master";

describe("pptx brand master", () => {
  it("colour scheme comes from the one colour file", () => {
    const xml = brandColorSchemeXml();
    expect(xml).toContain(`<a:dk1><a:srgbClr val="${pptxHex(BRAND.ink)}"/></a:dk1>`);
    expect(xml).toContain(`<a:accent1><a:srgbClr val="${pptxHex(BRAND.blue)}"/></a:accent1>`);
  });
  it("replaces an existing theme scheme", () => {
    const out = patchThemeXml(
      '<a:theme><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText"/></a:dk1></a:clrScheme></a:theme>',
    );
    expect(out).toContain('name="TransPerfect Element"');
    expect(out).not.toContain("windowText");
  });
});
