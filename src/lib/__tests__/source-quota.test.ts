import { describe, expect, it } from "vitest";
import { applySourceQuota, pptxQuotaFor } from "@/lib/knowledge-scope";

const row = (id: string, source_type: string) => ({ id, source_type });

describe("pptxQuotaFor", () => {
  it("reserves nothing for tiny result sets", () => {
    expect(pptxQuotaFor(2)).toBe(0);
  });
  it("reserves ~25% of the set, capped at 3", () => {
    expect(pptxQuotaFor(8)).toBe(2);
    expect(pptxQuotaFor(24)).toBe(3);
  });
});

describe("applySourceQuota", () => {
  it("splices deck chunks in by displacing the weakest PDF rows", () => {
    const ranked = Array.from({ length: 8 }, (_, i) => row(`p${i}`, "pdf"));
    const reserve = [row("d0", "pptx"), row("d1", "pptx"), row("d2", "pptx")];
    const out = applySourceQuota(ranked, reserve, { sourceType: "pptx", quota: 2, k: 8 });
    expect(out).toHaveLength(8);
    expect(out.filter((r) => r.source_type === "pptx").map((r) => r.id)).toEqual(["d0", "d1"]);
    // Strongest PDF rows survive, in order.
    expect(out.slice(0, 6).map((r) => r.id)).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
  });

  it("is a no-op when the quota is already met naturally", () => {
    const ranked = [row("d0", "pptx"), row("d1", "pptx"), row("p0", "pdf")];
    const out = applySourceQuota(ranked, [row("d9", "pptx")], {
      sourceType: "pptx",
      quota: 2,
      k: 3,
    });
    expect(out.map((r) => r.id)).toEqual(["d0", "d1", "p0"]);
  });

  it("tops up only the shortfall when some deck rows already ranked", () => {
    const ranked = [row("p0", "pdf"), row("d0", "pptx"), row("p1", "pdf"), row("p2", "pdf")];
    const out = applySourceQuota(ranked, [row("d1", "pptx"), row("d2", "pptx")], {
      sourceType: "pptx",
      quota: 2,
      k: 4,
    });
    expect(out.filter((r) => r.source_type === "pptx").map((r) => r.id)).toEqual(["d0", "d1"]);
    expect(out).toHaveLength(4);
  });

  it("does nothing when there are no deck chunks to add", () => {
    const ranked = [row("p0", "pdf"), row("p1", "pdf")];
    expect(applySourceQuota(ranked, [], { sourceType: "pptx", quota: 2, k: 2 })).toEqual(ranked);
  });

  it("never duplicates a row already in the ranked list", () => {
    const ranked = [row("p0", "pdf"), row("d0", "pptx"), row("p1", "pdf")];
    const out = applySourceQuota(ranked, [row("d0", "pptx"), row("d1", "pptx")], {
      sourceType: "pptx",
      quota: 3,
      k: 3,
    });
    expect(new Set(out.map((r) => r.id)).size).toBe(out.length);
  });
});
