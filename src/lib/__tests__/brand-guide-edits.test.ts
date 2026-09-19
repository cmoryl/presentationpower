import { describe, expect, it } from "vitest";
import {
  applyBrandGuidePatch,
  colorEditsRetheme,
  sanitizeBrandGuidePatch,
} from "@/lib/brand-guide-edits";
import { getBrandGuide, MASTER_TRANSPERFECT_GUIDE } from "@/lib/brand-guides";

describe("brand guide edits", () => {
  it("keeps the authored guide when there is no edit", () => {
    const merged = applyBrandGuidePatch(MASTER_TRANSPERFECT_GUIDE, null);
    expect(merged).toBe(MASTER_TRANSPERFECT_GUIDE);
    expect(applyBrandGuidePatch(MASTER_TRANSPERFECT_GUIDE, {})).toBe(MASTER_TRANSPERFECT_GUIDE);
  });

  it("merges edited colours, type and logo rules over the baseline", () => {
    const merged = applyBrandGuidePatch(MASTER_TRANSPERFECT_GUIDE, {
      primaryColors: [{ name: "Blue 500", hex: "#003FC7", role: "primary" }],
      typefacePrimary: "Geist Variable",
      logoRules: [{ title: "Never recolour", description: "Approved fills only", do: false }],
      editedAt: "2026-09",
    });
    expect(merged.primaryColors).toHaveLength(1);
    expect(merged.typefacePrimary).toBe("Geist Variable");
    expect(merged.logoRules[0]?.title).toBe("Never recolour");
    expect(merged.updatedAt).toBe("2026-09");
    // Untouched sections still come from the authored guide.
    expect(merged.neutrals).toEqual(MASTER_TRANSPERFECT_GUIDE.neutrals);
  });

  it("drops unusable swatches and clamps type sizes", () => {
    const patch = sanitizeBrandGuidePatch({
      primaryColors: [
        { name: "Good", hex: "#003fc7" },
        { name: "Bad hex", hex: "blue" },
        { name: "", hex: "#FFFFFF" },
      ],
      headingScale: [{ label: "H1", sizePx: 9999, weight: 700 }],
      unknownField: "ignored",
    });
    expect(patch.primaryColors).toEqual([{ name: "Good", hex: "#003FC7" }]);
    expect(patch.headingScale?.[0]?.sizePx).toBe(400);
    expect("unknownField" in patch).toBe(false);
  });

  it("only re-themes renders for divisions that keep their own palette", () => {
    expect(colorEditsRetheme("master")).toBe(false);
    expect(colorEditsRetheme("bm-tp-legal")).toBe(false);
    expect(colorEditsRetheme("bm-element")).toBe(true);
  });

  it("resolves a division guide by slug for the editor", () => {
    const guide = getBrandGuide("transperfect-master");
    expect(guide?.divisionId).toBe("master");
  });
});
