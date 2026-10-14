import { describe, it, expect } from "vitest";
import { validateFigures, FIGURE_NEEDED } from "./figure-validator";

describe("figure validator", () => {
  it("keeps sourced figures, replaces invented ones", () => {
    const removed: string[] = [];
    const out = validateFigures(
      { headline: "3.4x faster and 40% cheaper", items: ["500+ integrations"] },
      { headline: "Old", items: ["x"] },
      "Client cut costs by 40 % last year",
      removed,
    ) as { headline: string; items: string[] };
    expect(out.headline).toBe(`${FIGURE_NEEDED} faster and 40% cheaper`);
    expect(out.items[0]).toBe(`${FIGURE_NEEDED} integrations`);
    expect(removed).toEqual(["3.4x", "500+"]);
  });
  it("leaves unchanged template copy alone", () => {
    const t = { stat: "200+ languages" };
    expect(validateFigures(t, { ...t }, "")).toEqual(t);
  });
});

describe("figure validator — template mode", () => {
  it("checks sample copy, plain counts and sample sources", () => {
    const removed: string[] = [];
    const t = { stat: "38% ↓ time to market", body: "Live in 28 markets", source: "Client rollout, 2024" };
    const out = validateFigures(t, { ...t }, "", removed, { checkTemplate: true }) as typeof t;
    expect(out.stat).toBe(`${FIGURE_NEEDED} ↓ time to market`);
    expect(out.body).toBe(`Live in ${FIGURE_NEEDED} markets`);
    expect(out.source).toBe("");
  });
  it("keeps grounded counts", () => {
    const out = validateFigures({ b: "14 markets a year" }, {}, "14 markets/year", [], { checkTemplate: true });
    expect(out).toEqual({ b: "14 markets a year" });
  });
});
