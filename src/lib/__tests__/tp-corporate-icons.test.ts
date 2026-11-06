import { describe, expect, it } from "vitest";
import { getDivisionLogos } from "../division-logos";
import color from "@/assets/tp-corporate-icons/color.asset.json";
import black from "@/assets/tp-corporate-icons/black.asset.json";
import white from "@/assets/tp-corporate-icons/white.asset.json";

describe("supplied TransPerfect corporate icons", () => {
  it("uses the supplied color T rather than the substituted app icon", () => {
    expect(getDivisionLogos("master")?.icon).toBe(color.url);
  });
  it("preserves the supplied black and white versions separately", () => {
    expect(getDivisionLogos("master")?.iconBlack).toBe(black.url);
    expect(getDivisionLogos("master")?.iconWhite).toBe(white.url);
  });
});