import { describe, expect, it } from "vitest";
import { withMasterBackground } from "../pptx-native-xml";

const MASTER_NO_BG = `<p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld></p:sldMaster>`;
const MASTER_WITH_BG = `<p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree/></p:cSld></p:sldMaster>`;

describe("withMasterBackground (Slide Master background inheritance)", () => {
  it("inserts p:bg as the first child of p:cSld", () => {
    const out = withMasterBackground(MASTER_NO_BG, "03002C");
    expect(out).toContain('<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="03002C"/>');
    expect(out.indexOf("<p:bg>")).toBeLessThan(out.indexOf("<p:spTree"));
  });

  it("replaces an existing scheme background instead of stacking one", () => {
    const out = withMasterBackground(MASTER_WITH_BG, "FFFFFF");
    expect(out.match(/<p:bg>/g)).toHaveLength(1);
    expect(out).not.toContain("bgRef");
    expect(out).toContain('val="FFFFFF"');
  });

  it("is idempotent", () => {
    const once = withMasterBackground(MASTER_NO_BG, "03002C");
    expect(withMasterBackground(once, "03002C")).toBe(once);
  });

  it("leaves malformed master XML untouched", () => {
    expect(withMasterBackground("<not-a-master/>", "03002C")).toBe("<not-a-master/>");
  });
});
