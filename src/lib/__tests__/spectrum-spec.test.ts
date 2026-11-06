import { describe, it, expect } from "vitest";
import { SPECTRUM_SPEC } from "../spectrum-spec";
const get = (id: string) => SPECTRUM_SPEC.find(item => item.id === id);
describe("issued Spectrum reference rules", () => {
  it("retains the issued 36 pt title", () => expect(get("slide-title")?.value).toBe("36 pt · Regular (400)"));
  it("retains the issued 12 pt floor", () => expect(get("minimum")?.value).toBe("12 pt"));
  it("retains issued side margins", () => expect(get("margins")?.value).toBe("0.75 in · 54 pt · 108 stage px"));
  it("limits frost nesting to three layers", () => expect(get("layers")?.value).toBe("Three layers maximum"));
  it("distinguishes the tracker and company gradient angles", () => {
    expect(get("spectrum-line")?.value).toBe("90° · aqua → blue → violet");
    expect(get("company-gradient")?.value).toBe("100° · aqua → blue → violet");
  });
  it("does not invent inner tile units", () => expect(get("inner-radius")?.value).toBe("20 · unit unspecified"));
});