import { describe, expect, it } from "vitest";
import { applySelection, EMPTY_SELECTION, adaptContent } from "@/lib/cross-format-adapt";

const src = {
  eyebrow: "Case study",
  headline: "2/3 faster",
  body: "Turnaround cut across 40 markets.",
  points: ["One", "Two", "Three"],
  stat: { value: "66%", label: "faster" },
  cta: "Talk to us",
};

describe("info builder selection", () => {
  it("passes everything through by default", () => {
    expect(applySelection(src, EMPTY_SELECTION)).toMatchObject(src);
  });
  it("leaves out fields and single points, keeps the headline", () => {
    const out = applySelection(src, { exclude: ["body", "headline", "stat"], excludePoints: [1], edits: {} });
    expect(out.body).toBeUndefined();
    expect(out.stat).toBeUndefined();
    expect(out.headline).toBe("2/3 faster");
    expect(out.points).toEqual(["One", "Three"]);
  });
  it("applies edits and feeds every target", () => {
    const out = applySelection(src, { ...EMPTY_SELECTION, edits: { headline: "New head", points: { 0: "Uno" } } });
    expect(out.headline).toBe("New head");
    expect(out.points?.[0]).toBe("Uno");
    for (const t of ["social-card", "social-portrait", "social-story", "print-brief", "case-study"] as const) {
      expect(adaptContent(out, t).content.headline.length).toBeGreaterThan(0);
    }
  });
});
