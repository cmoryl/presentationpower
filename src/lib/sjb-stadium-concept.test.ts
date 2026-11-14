import { describe, expect, it } from "vitest";
import { SJB_STADIUM_CONCEPT as concept } from "./sjb-stadium-concept";

describe("Bowl source-based stadium concept", () => {
  it("preserves the supplied 1920 × 905 field artwork aspect ratio", () => {
    expect(concept.field.length / concept.field.width).toBeCloseTo(1920 / 905, 10);
  });
  it("keeps the baseball horseshoe open on the east rather than inventing an enclosed football bowl", () => {
    expect(concept.stand.start).toBe(Math.PI / 3);
    expect(concept.stand.end).toBe(Math.PI * 5 / 3);
    expect(concept.stand.end - concept.stand.start).toBeLessThan(2 * Math.PI);
  });
});