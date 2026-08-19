import { describe, it, expect } from "vitest";
import { lookCatalog, lookFamilyCounts, searchLooks } from "@/lib/look-catalog";
describe("look catalog", () => {
  it("spans every family", () => {
    const c = lookCatalog();
    // 58 = 28 approved style packs (S01–S28) + 30 industry recipes (R01–R30).
    expect(lookFamilyCounts()).toBeTruthy();
    expect(c.length).toBeGreaterThanOrEqual(58);
    expect(new Set(c.map((e) => e.pack.id)).size).toBe(c.length);
    for (const e of c) { expect(e.name).toBeTruthy(); expect(e.palette.length).toBeGreaterThan(0); }
    expect(searchLooks("s01", c).length).toBeGreaterThan(0);
  });
});
