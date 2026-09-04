import { describe, expect, it } from "vitest";
import {
  DEFAULT_STAT_FORMAT,
  formatStatValue,
  isDefaultStatFormat,
  patchStatFormat,
  resolveStatFormat,
  splitStatValue,
} from "../stat-format";

describe("stat formatting", () => {
  it("defaults to leaving the authored value alone", () => {
    expect(resolveStatFormat(undefined)).toEqual(DEFAULT_STAT_FORMAT);
    expect(isDefaultStatFormat(resolveStatFormat({}))).toBe(true);
    expect(formatStatValue("+38%")).toBe("+38%");
    expect(formatStatValue("38%", {})).toBe("38%");
  });

  it("splits decoration from the numeric core", () => {
    expect(splitStatValue("+38.5%")).toEqual({ lead: "+", digits: "38.5", trail: "%" });
    expect(splitStatValue("1,240 users")).toEqual({ lead: "", digits: "1,240", trail: "users" });
    expect(splitStatValue("n/a").digits).toBe("");
  });

  it("applies prefix, suffix and decimals", () => {
    expect(formatStatValue("38", { prefix: "+", suffix: "%" })).toBe("+38%");
    expect(formatStatValue("38", { decimals: 1, suffix: "%" })).toBe("38.0%");
    expect(formatStatValue("38.46", { decimals: 1, suffix: "%" })).toBe("38.5%");
    expect(formatStatValue("1.4", { prefix: "$", suffix: "B" })).toBe("$1.4B");
    expect(formatStatValue("n/a", { suffix: "%" })).toBe("n/a");
  });

  it("clamps and trims format inputs", () => {
    const fmt = patchStatFormat(undefined, {
      prefix: "abcdefgh",
      suffix: "%%%%%%",
      decimals: 9,
    });
    expect(fmt.prefix).toHaveLength(4);
    expect(fmt.suffix).toHaveLength(4);
    expect(fmt.decimals).toBe(3);
    expect(patchStatFormat({ decimals: 2 }, { prefix: "+" })).toEqual({
      prefix: "+",
      suffix: "",
      decimals: 2,
    });
  });
});
