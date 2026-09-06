import { describe, it, expect } from "vitest";
import {
  EXPORT_FIDELITIES,
  exportFidelityById,
  usesSceneGraph,
  visualThresholdFor,
} from "../export-quality";

describe("Exact Build Fidelity", () => {
  it("is an offered export mode", () => {
    expect(EXPORT_FIDELITIES.map((f) => f.id)).toContain("build");
    expect(EXPORT_FIDELITIES[0]!.id).toBe("build");
  });

  it("round-trips through the id parser", () => {
    expect(exportFidelityById("build")).toBe("build");
    expect(exportFidelityById("nonsense")).toBe("editable");
  });

  it("shares one scene graph with the editable mode", () => {
    expect(usesSceneGraph("build")).toBe(true);
    expect(usesSceneGraph("editable")).toBe(true);
    expect(usesSceneGraph("exact")).toBe(false);
    expect(usesSceneGraph("layered")).toBe(false);
  });

  it("is gated at the 99% visual match target", () => {
    expect(visualThresholdFor("build")).toBeCloseTo(0.99);
    expect(visualThresholdFor("editable")).toBeLessThan(0.99);
  });
});
