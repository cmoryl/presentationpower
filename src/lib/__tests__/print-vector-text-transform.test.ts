import { describe, expect, it } from "vitest";

import { applyTextTransform } from "@/lib/print-vector-text";

// The PDF vector-text overlay reads Text-node data, which keeps authored
// casing. Eyebrows and small labels are uppercased purely with CSS, so the
// overlay must transform before drawing — and must not change string length,
// because character indices map 1:1 onto the Range-based glyph walk.
describe("applyTextTransform", () => {
  it("uppercases CSS-uppercased runs", () => {
    expect(applyTextTransform("What you get", "uppercase")).toBe("WHAT YOU GET");
    expect(applyTextTransform("Fortune 100 medtech", "uppercase")).toBe("FORTUNE 100 MEDTECH");
  });

  it("passes through when no transform applies", () => {
    expect(applyTextTransform("Built for how modern teams ship", "none")).toBe(
      "Built for how modern teams ship",
    );
  });

  it("handles lowercase and capitalize", () => {
    expect(applyTextTransform("Project Statistics", "lowercase")).toBe("project statistics");
    expect(applyTextTransform("project statistics", "capitalize")).toBe("Project Statistics");
  });

  it("never changes string length", () => {
    for (const t of ["uppercase", "lowercase", "capitalize", "none"]) {
      const src = "Straße — ISO 17100 (v2)";
      expect(applyTextTransform(src, t).length).toBe(src.length);
    }
  });
});
