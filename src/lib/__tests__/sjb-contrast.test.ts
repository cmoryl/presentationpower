import { describe, expect, it } from "vitest";
import { sjbContrast, SJB_COLOR_PROPORTION } from "@/lib/san-juan-bowl";

describe("San Juan Bowl colour rules", () => {
  it("white on navy passes AA", () => expect(sjbContrast("#FFFFFF", "#0D0E21")).toBeGreaterThan(4.5));
  it("gold on white fails AA", () => expect(sjbContrast("#FFD600", "#FFFFFF")).toBeLessThan(3));
  it("proportions total 100%", () =>
    expect(SJB_COLOR_PROPORTION.reduce((s, p) => s + p.pct, 0)).toBe(100));
});
