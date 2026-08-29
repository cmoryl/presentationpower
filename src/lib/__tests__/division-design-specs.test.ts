import { describe, expect, it } from "vitest";
import {
  DIVISION_DESIGN_SPECS,
  divisionDesignSpec,
  divisionDesignSpecIssues,
  divisionPackId,
  isKnownPackId,
} from "@/lib/division-design-specs";
import { conformanceSpecIssues, divisionConformancePresets } from "@/lib/division-conformance";
import { LIBRARY_PRESETS } from "@/lib/library-presets";
import { BRAND_MODES } from "@/lib/taxonomy";

describe("per-division design specs", () => {
  it("covers every brand scope with resolvable packs and recipes", () => {
    expect(divisionDesignSpecIssues()).toEqual([]);
    for (const b of BRAND_MODES) expect(DIVISION_DESIGN_SPECS[b.id]).toBeTruthy();
  });

  it("is not a DataForce-only exception — divisions differ from the master look", () => {
    const nonEnterprise = BRAND_MODES.filter((b) => b.id !== "bm-enterprise");
    const distinct = new Set(nonEnterprise.map((b) => divisionDesignSpec(b.id).packId));
    expect(distinct.size).toBeGreaterThan(3);
    for (const id of ["bm-tp-legal", "bm-tp-media", "bm-tp-games", "bm-tp-digital", "bm-tp-lifesci"]) {
      expect(divisionDesignSpec(id).packId).not.toBe(divisionDesignSpec("bm-enterprise").packId);
    }
  });

  it("resolves a pack per face", () => {
    expect(divisionPackId("bm-enterprise", "light")).toBe("skin-s06");
    expect(divisionPackId("bm-enterprise", "dark")).toBe("skin-s04");
    expect(isKnownPackId(divisionPackId("bm-product", "dark"))).toBe(true);
  });

  it("keeps every conformance preset conformant", () => {
    for (const preset of divisionConformancePresets()) {
      expect(conformanceSpecIssues(preset), preset.brandModeId).toEqual([]);
      expect(preset.packId).toBeTruthy();
      expect(preset.recipe).toBeTruthy();
    }
  });

  it("stamps showcase presets with their division look, never a bare default", () => {
    for (const p of LIBRARY_PRESETS) {
      if (!p.search.scope || p.search.scope === "all") continue;
      expect(p.search.look, p.slug).toBeTruthy();
      expect(isKnownPackId(String(p.search.look)), p.slug).toBe(true);
    }
  });
});
