import { describe, expect, it } from "vitest";
import { runTemplateTests, testSummary, contrastRatio } from "../template-tests";
import type { CustomTemplate } from "../custom-templates";

const good: CustomTemplate = {
  id: "", code: "C01", name: "Cobalt Field",
  reference: "TransPerfect", description: "A calm cobalt system for enterprise proposals.",
  bestFit: "Enterprise", mode: "light",
  palette: ["#FFFFFF", "#111214", "#003FC7", "#EC388A", "#E0E8F5"],
  typography: "Large scale", surfaceNote: "flat", imagery: "Wide crop",
  density: "Medium", baseSkinCode: "S01", spec: "", status: "draft", notes: "",
};

describe("template readiness suite", () => {
  it("passes a well-formed template", () => {
    expect(testSummary(runTemplateTests(good)).fail).toBe(0);
  });
  it("fails a duplicate code", () => {
    const t = runTemplateTests(good, { existingCodes: ["C01"] });
    expect(t.find((x) => x.id === "code")?.status).toBe("fail");
  });
  it("fails a mode that disagrees with the field", () => {
    const t = runTemplateTests({ ...good, mode: "dark" });
    expect(t.find((x) => x.id === "mode")?.status).toBe("fail");
  });
  it("fails low body contrast", () => {
    const t = runTemplateTests({ ...good, palette: ["#FFFFFF", "#EEEEEE", "#003FC7", "#EC388A", "#E0E8F5"] });
    expect(t.find((x) => x.id === "contrast-body")?.status).toBe("fail");
  });
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });
});
