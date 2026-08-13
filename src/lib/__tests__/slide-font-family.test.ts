import { describe, expect, it } from "vitest";

import { mapFontFamily } from "../pptx-font-map";
import { SLIDE_FONT_OPTIONS, isEmptyTextFormat } from "../slide-text-format";

describe("font family override", () => {
  it("every offered CSS stack maps to the face the panel promises", () => {
    for (const o of SLIDE_FONT_OPTIONS) {
      expect(mapFontFamily(o.stack), o.key).toBe(o.pptxFace);
    }
  });

  it("counts as a real override so it survives persistence pruning", () => {
    expect(isEmptyTextFormat({ fontFamily: "serif" })).toBe(false);
    expect(isEmptyTextFormat({})).toBe(true);
  });
});
