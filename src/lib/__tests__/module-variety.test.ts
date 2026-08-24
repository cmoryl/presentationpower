import { describe, expect, it } from "vitest";
import { pickVariedVariant, varietyReport } from "@/lib/module-variety";
import { variantsForSection } from "@/lib/taxonomy";

const SECTION = "SF-06";

describe("pickVariedVariant", () => {
  it("does not hand back a module the deck already used when siblings are free", () => {
    const pool = variantsForSection(SECTION);
    expect(pool.length).toBeGreaterThan(2);
    const used: string[] = [];
    for (let i = 0; i < 3; i++) {
      const picked = pickVariedVariant({ pool, usedVariantIds: used, seed: "deck-a" });
      expect(picked).toBeTruthy();
      used.push(picked!.id);
    }
    expect(new Set(used).size).toBe(3);
  });

  it("is deterministic for the same seed and history", () => {
    const pool = variantsForSection(SECTION);
    const a = pickVariedVariant({ pool, usedVariantIds: [], seed: "deck-b" });
    const b = pickVariedVariant({ pool, usedVariantIds: [], seed: "deck-b" });
    expect(a?.id).toBe(b?.id);
  });

  it("honours a suggestion the first time and rotates away on the repeat", () => {
    const pool = variantsForSection(SECTION);
    const suggested = pool[1]!.id;
    const first = pickVariedVariant({
      pool,
      usedVariantIds: [],
      suggestedVariantId: suggested,
      seed: "s",
    });
    expect(first?.id).toBe(suggested);
    const second = pickVariedVariant({
      pool,
      usedVariantIds: [suggested],
      suggestedVariantId: suggested,
      seed: "s",
    });
    expect(second?.id).not.toBe(suggested);
  });
});

describe("varietyReport", () => {
  it("flags a deck built out of one layout and offers alternates", () => {
    const v = variantsForSection(SECTION)[0]!.id;
    const report = varietyReport(
      [0, 1, 2, 3, 4].map((position) => ({ position, variant_id: v, section_id: SECTION })),
    );
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.severity).toBe("blocking");
    expect(report.issues[0]?.used_on_slides).toEqual([1, 2, 3, 4, 5]);
    expect(report.unused_options.length).toBeGreaterThan(0);
    expect(report.variety_score).toBeLessThan(50);
  });

  it("passes a deck that spends distinct layouts", () => {
    const pool = variantsForSection(SECTION).slice(0, 4);
    const report = varietyReport(
      pool.map((v, position) => ({ position, variant_id: v.id, section_id: SECTION })),
    );
    expect(report.ok).toBe(true);
    expect(report.variety_score).toBe(100);
  });
});
