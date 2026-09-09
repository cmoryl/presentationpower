import { describe, expect, it } from "vitest";
import { svgPathToPdfOps } from "@/lib/vector-path-pdf";
import { loadLondonSignageFace, outlineText } from "@/lib/next-london-text-outline";

// TrueType glyph outlines (Geist Bold) are quadratic. PDF has no quadratic
// operator, so every Q/T run must be degree-elevated to a cubic `c`. Dropping
// them silently is what made outlined copy print as flat facets.
describe("svgPathToPdfOps quadratic support", () => {
  it("elevates Q and T to cubic curves", () => {
    const ops = svgPathToPdfOps("M0 0 Q5 10 10 0 T20 0 Z", {
      scale: 1,
      x: 0,
      y: 0,
      artHeight: 10,
    });
    expect(ops.match(/ c\b/g)).toHaveLength(2);
    expect(ops.endsWith("h")).toBe(true);
  });

  it("keeps every curve of a real outlined glyph", async () => {
    const face = await loadLondonSignageFace();
    const { d } = outlineText(face, "So", { sizeMm: 40, x: 0, y: 0 });
    const quads = (d.match(/Q/g) ?? []).length;
    expect(quads).toBeGreaterThan(0);
    const ops = svgPathToPdfOps(d, { scale: 1, x: 0, y: 0, artHeight: 40 });
    expect((ops.match(/ c\b/g) ?? []).length).toBe(quads);
  });
});
