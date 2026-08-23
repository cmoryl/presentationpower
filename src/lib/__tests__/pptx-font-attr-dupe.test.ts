import { describe, expect, it } from "vitest";
import { hardenFontFallbacksInXml } from "../pptx-font-map";

/**
 * pptxgenjs writes `pitchFamily`/`charset` on some font tags already. Appending
 * our panose metadata beside those produced a repeated attribute — invalid XML,
 * which PowerPoint reports as "couldn't read some content … [Repaired]".
 */
describe("font hardening never repeats attributes", () => {
  const cases = [
    '<a:latin typeface="Arial" pitchFamily="34" charset="0"/>',
    '<a:cs typeface="Geist" charset="0"/>',
    '<a:buFont typeface="Arial" pitchFamily="34" charset="0"/>',
    '<a:ea typeface="Georgia" pitchFamily="18"/>',
  ];

  for (const xml of cases) {
    it(`single pitchFamily/charset/panose for ${xml.slice(0, 22)}…`, () => {
      const out = hardenFontFallbacksInXml(xml, { embedded: true });
      for (const attr of ["pitchFamily", "charset", "panose", "typeface"]) {
        expect(out.match(new RegExp(`${attr}=`, "g"))?.length ?? 0).toBe(1);
      }
    });
  }

  it("is idempotent", () => {
    const once = hardenFontFallbacksInXml(cases[0], { embedded: true });
    expect(hardenFontFallbacksInXml(once, { embedded: true })).toBe(once);
  });
});
