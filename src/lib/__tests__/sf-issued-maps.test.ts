import { describe, expect, it } from "vitest";
import { SF_ISSUED_MAPS } from "../sf-issued-maps";

describe("supplied SF map set", () => {
  it("keeps floor 3 on page one and floors 4 and 5 together on page two", () => {
    expect(SF_ISSUED_MAPS.pages.map(p => p.floors)).toEqual([[3], [4, 5]]);
  });
  it("links the supplied PDF and Illustrator originals separately", () => {
    expect(SF_ISSUED_MAPS.pdf).toMatch(/SF_Maps3\.pdf$/);
    expect(SF_ISSUED_MAPS.illustrator).toMatch(/SF_Maps3\.ai$/);
    expect(SF_ISSUED_MAPS.pdf).not.toBe(SF_ISSUED_MAPS.illustrator);
  });
});