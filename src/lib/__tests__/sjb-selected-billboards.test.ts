import { describe, expect, it } from "vitest";
import { SJB_SELECTED_BILLBOARDS } from "../sjb-selected-billboards";

describe("Selected Bowl billboard campaign", () => {
  it("contains exactly the seven screenshot-selected Canva masters", () => {
    expect(SJB_SELECTED_BILLBOARDS.map(b => b.id)).toEqual(["DAHaEObQVkg", "DAHaD3KaDEU", "DAHaKi7GT1w", "DAHaKum2isE", "DAHaJ1QyNFY", "DAHaJ7fcT5k", "DAHaLhvVST4"]);
  });
  it("preserves the two English and five Spanish artwork languages", () => {
    expect(SJB_SELECTED_BILLBOARDS.filter(b => b.lang === "en").map(b => b.id)).toEqual(["DAHaD3KaDEU", "DAHaLhvVST4"]);
    expect(SJB_SELECTED_BILLBOARDS.filter(b => b.lang === "es")).toHaveLength(5);
  });
  it("retains the four native 840×400 and three native 1728×512 artboards", () => {
    expect(SJB_SELECTED_BILLBOARDS.map(b => [b.w, b.h])).toEqual([[1728,512],[840,400],[840,400],[1728,512],[840,400],[840,400],[1728,512]]);
  });
});