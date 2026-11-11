import { describe, expect, it } from "vitest";
import { SJB_APPLICATION_TEMPLATES as rows } from "./sjb-application-templates";

describe("Bowl editable application coverage", () => {
  it("includes eight-layout light and dark presentation sources", () => {
    expect(rows.filter(r => r.family === "presentation").map(r => [r.mode, r.pages])).toEqual([["light", 8], ["dark", 8]]);
  });
  it("includes Letter and A4 letterhead, fact sheet and two-page report", () => {
    expect(rows.filter(r => r.format === "Word")).toHaveLength(6);
    expect(rows.filter(r => r.family === "report").map(r => r.pages)).toEqual([2, 2]);
  });
  it("includes Full HD, UHD and portrait AV layouts", () => {
    expect(rows.find(r => r.id === "holding-hd-dark")?.width).toBe(1920);
    expect(rows.find(r => r.id === "holding-4k-light")?.width).toBe(3840);
    expect(rows.find(r => r.id === "opening-portrait-light")?.height).toBe(1920);
  });
  it("includes supplier-pending pull-up and proportional fabrication artwork", () => {
    expect(rows.find(r => r.id === "pull-up-33x80")?.size).toBe("Proposed 33 × 80 in");
    expect(rows.find(r => r.id === "backlit-artwork")?.size).toBe("Proportional 16:9 · supplier size required");
  });
});