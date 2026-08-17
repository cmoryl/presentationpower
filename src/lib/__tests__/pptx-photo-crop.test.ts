import { describe, expect, it } from "vitest";
import {
  coverCropTag,
  withCroppedPictures,
  withRoundedPictures,
} from "@/lib/pptx-shape-normalize";

/** The shape pptxgenjs emits when a `sizing` hint is present on a data URL. */
const picWithZeroSrcRect = (name: string) =>
  `<p:pic><p:nvPicPr><p:cNvPr id="3" name="${name}"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"></a:blip><a:srcRect l="0" r="0" t="0" b="0"/><a:stretch/></p:blipFill><p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;

describe("photo masking parity", () => {
  it("derives a cover crop from the intrinsic ratio", () => {
    // 2:1 artwork in a 1:1 box → crop the sides.
    expect(coverCropTag(2, 3, 3)).toBe("[c:25000,0,25000,0]");
    // 1:2 artwork in a 1:1 box → crop top/bottom.
    expect(coverCropTag(0.5, 3, 3)).toBe("[c:0,25000,0,25000]");
    // Matching ratio → no crop at all.
    expect(coverCropTag(1.5, 3, 2)).toBe("");
    expect(coverCropTag(undefined, 3, 2)).toBe("");
  });

  it("replaces pptxgenjs' placeholder zero srcRect instead of bailing", () => {
    const out = withCroppedPictures(picWithZeroSrcRect("[c:25000,0,25000,0] TP Canvas image 1"));
    expect(out).toContain('<a:srcRect l="25000" r="25000"/>');
    expect(out).not.toContain('l="0"');
    expect(out).toContain('name="TP Canvas image 1"');
  });

  it("keeps the rounded mask when a picture is also cropped and grouped", () => {
    const out = withRoundedPictures(
      withCroppedPictures(
        picWithZeroSrcRect("[g:abc|TP Canvas group 1] [c:25000,0,25000,0] [r:9000] Photo"),
      ),
    );
    expect(out).toContain('<a:srcRect l="25000" r="25000"/>');
    expect(out).toContain('prst="roundRect"');
    expect(out).toContain('fmla="val 9000"');
    // The group tag survives for the later grouping pass.
    expect(out).toContain("[g:abc|TP Canvas group 1]");
  });
});
