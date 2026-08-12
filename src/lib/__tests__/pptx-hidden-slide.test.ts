import { describe, expect, it } from "vitest";
import { withHiddenFlag } from "../pptx-native-xml";

const SLD = `<?xml version="1.0"?><p:sld xmlns:p="ns"><p:cSld/></p:sld>`;

describe("withHiddenFlag (PowerPoint Hide Slide parity)", () => {
  it("adds show=\"0\" to the slide root when hidden", () => {
    expect(withHiddenFlag(SLD, true)).toContain('<p:sld xmlns:p="ns" show="0">');
  });

  it("leaves visible slides untouched", () => {
    expect(withHiddenFlag(SLD, false)).toBe(SLD);
  });

  it("never stacks the attribute", () => {
    const once = withHiddenFlag(SLD, true);
    const twice = withHiddenFlag(once, true);
    expect(twice).toBe(once);
    expect(twice.match(/show="0"/g)).toHaveLength(1);
  });

  it("clears the flag when a hidden slide is shown again", () => {
    expect(withHiddenFlag(withHiddenFlag(SLD, true), false)).not.toContain("show=");
  });
});
