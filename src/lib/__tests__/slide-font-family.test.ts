import { describe, expect, it } from "vitest";

import { mapFontFamily } from "../pptx-font-map";
import {
  SLIDE_FONT_OPTIONS,
  TEXT_FORMAT_PRESETS,
  applyTextPreset,
  isEmptyTextFormat,
  isPresetActive,
} from "../slide-text-format";

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

describe("text formatting presets", () => {
  it("replaces only the scopes the preset declares", () => {
    const serif = TEXT_FORMAT_PRESETS.find((p) => p.id === "editorial-serif")!;
    const caption = TEXT_FORMAT_PRESETS.find((p) => p.id === "caption")!;
    const a = applyTextPreset(null, serif);
    const b = applyTextPreset(a, caption);
    expect(b.all?.fontFamily).toBe("serif");
    expect(b.headings?.trackingEm).toBe(-0.02);
    expect(b.body?.sizeScale).toBe(0.8);
    expect(isPresetActive(b, caption)).toBe(true);
    expect(isPresetActive(b, serif)).toBe(true);
  });

  it("does not report a preset active before it is applied", () => {
    const impact = TEXT_FORMAT_PRESETS.find((p) => p.id === "heading-impact")!;
    expect(isPresetActive({ body: { sizeScale: 1.2 } }, impact)).toBe(false);
    expect(isPresetActive(applyTextPreset(null, impact), impact)).toBe(true);
  });
});
