import { describe, expect, it } from "vitest";
import { contentFromSlide } from "@/lib/cross-format-adapt";

describe("headline from saved modules without a title field", () => {
  it("reads insight, idea, message and ask", () => {
    expect(contentFromSlide({ content: { insight: "Orchestration, not translation." } }).headline).toBe("Orchestration, not translation.");
    expect(contentFromSlide({ content: { idea: "A system anyone can assemble." } }).headline).toBe("A system anyone can assemble.");
    expect(contentFromSlide({ content: { message: "Ready to scope the pilot." } }).headline).toBe("Ready to scope the pilot.");
    expect(contentFromSlide({ content: { ask: "Approve a paid pilot." } }).headline).toBe("Approve a paid pilot.");
  });
  it("falls back to the figure, then the module name", () => {
    expect(contentFromSlide({ content: { stat: "40", unit: "%", label: "of launch delays" } }).headline).toBe("40% of launch delays");
    expect(contentFromSlide({ content: {} }, "KPI dashboard").headline).toBe("KPI dashboard");
  });
});
