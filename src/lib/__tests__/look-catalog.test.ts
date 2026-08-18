import { describe, it, expect } from "vitest";
import { lookCatalog, lookFamilyCounts, searchLooks } from "@/lib/look-catalog";
describe("look catalog", () => {
  it("spans every family", () => {
    const c = lookCatalog();
    console.log(lookFamilyCounts(), c.length);
    expect(c.length).toBeGreaterThanOrEqual(86);
    expect(new Set(c.map((e) => e.pack.id)).size).toBe(c.length);
    for (const e of c) { expect(e.name).toBeTruthy(); expect(e.palette.length).toBeGreaterThan(0); }
    expect(searchLooks("s01", c).length).toBeGreaterThan(0);
  });
});
