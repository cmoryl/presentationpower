// Tests for print-content-schema — guarantees every field in each print
// kind's content type has an editing path declared in the schema. If a new
// field is added without extending the schema, this test fails loudly.

import { describe, it, expect } from "vitest";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import {
  CONTENT_SCHEMAS,
  fullyPopulatedSample,
  unreachablePaths,
  enumerateLeafPaths,
  fieldMatcherFromSchema,
} from "@/lib/print-content-schema";

const KINDS: PrintAssetKind[] = ["case-study", "spotlight", "ebrochure", "adaptor-brief"];

describe("print content schema — reachability", () => {
  for (const kind of KINDS) {
    it(`every leaf field on ${kind} is reachable through the schema`, () => {
      const schema = CONTENT_SCHEMAS[kind];
      const sample = fullyPopulatedSample(kind);
      const missing = unreachablePaths(schema, sample);
      // heroMedia + modules are edited through their own dedicated panels
      // (HeroMediaPanel, ModulesPanel / PrintSectionPicker) and are excluded
      // by default in unreachablePaths.
      expect(missing).toEqual([]);
    });
  }

  it("stringArray schema matches indexed leaves", () => {
    const schema = CONTENT_SCHEMAS["adaptor-brief"];
    const match = fieldMatcherFromSchema(schema);
    expect(match("knowHow[0]")).toBe(true);
    expect(match("knowHow[7]")).toBe(true);
  });

  it("objectArray schema matches indexed child leaves", () => {
    const schema = CONTENT_SCHEMAS["case-study"];
    const match = fieldMatcherFromSchema(schema);
    expect(match("stats[0].label")).toBe(true);
    expect(match("stats[3].delta")).toBe(true);
    expect(match("stats[0].trend")).toBe(true);
  });

  it("enumerateLeafPaths visits nested arrays and objects", () => {
    const paths = enumerateLeafPaths({
      a: "x",
      b: { c: "y" },
      d: ["e", "f"],
      g: [{ h: "z" }],
    });
    expect(paths).toContain("a");
    expect(paths).toContain("b.c");
    expect(paths).toContain("d[0]");
    expect(paths).toContain("d[1]");
    expect(paths).toContain("g[0].h");
  });
});
