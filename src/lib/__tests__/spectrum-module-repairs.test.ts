import { describe, expect, it } from "vitest";
import { SPECTRUM_REPAIRED_MODULES } from "../spectrum-repaired-modules";
import { MODULE_VARIANTS } from "../taxonomy";
describe("targeted Spectrum repair scope", () => {
  it("covers the 22 flagged modules without changing already-passing siblings", () => {
    expect(SPECTRUM_REPAIRED_MODULES.size).toBe(22);
    expect(SPECTRUM_REPAIRED_MODULES.has("MV-STAT-HERO-NUMBER")).toBe(true);
    expect(SPECTRUM_REPAIRED_MODULES.has("MV-OP-AGENDA-VERTICAL")).toBe(false);
    for (const id of SPECTRUM_REPAIRED_MODULES) expect(MODULE_VARIANTS.some(v => v.id === id)).toBe(true);
  });
});