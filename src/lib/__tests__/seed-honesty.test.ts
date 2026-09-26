import { describe, expect, it } from "vitest";
import { sanitizeSeedForBrief } from "../seed-honesty";
import { inferProspectLabel } from "../brief-infer";

describe("seed honesty", () => {
  it("replaces figures the brief never gave", () => {
    const out = sanitizeSeedForBrief(
      { items: [{ value: "$4.2", unit: "B", label: "TAM" }] },
      "Retail",
    );
    expect(out.items[0].value).toBe("—");
    expect(out.items[0].label).toBe("Add figure: TAM");
  });
  it("keeps figures present in the brief", () => {
    const out = sanitizeSeedForBrief({ stat: "40", label: "x" }, "Retail", "we lost 40 days");
    expect(out.stat).toBe("40");
  });
  it("neutralises regulated wording outside regulated industries", () => {
    expect(sanitizeSeedForBrief({ b: "Regulated markets add review steps" }, "Retail").b).toBe(
      "New markets add review steps",
    );
    expect(sanitizeSeedForBrief({ b: "Regulated markets" }, "Life Sciences").b).toBe("Regulated markets");
  });
  it("names the prospect from a descriptive brief", () => {
    expect(inferProspectLabel("Pitch for a mid-size retailer expanding into 5 markets")).toBe(
      "Mid-size retailer",
    );
  });
});
