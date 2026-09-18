import { describe, expect, it } from "vitest";

import {
  clipGeomTag,
  custGeomXml,
  outlineContainsRect,
  parseClipGeomTag,
  parseClipOutline,
  stripClipGeomTag,
} from "../export-clip-geom";
import { withCustomGeometry } from "../pptx-clip-geom";

describe("clip-path → PowerPoint custom geometry", () => {
  it("reads a polygon in percent and px", () => {
    const cmds = parseClipOutline("polygon(50% 0%, 100% 100%, 0% 100%)", 200, 100);
    expect(cmds).toEqual([
      { c: "M", x: 0.5, y: 0 },
      { c: "L", x: 1, y: 1 },
      { c: "L", x: 0, y: 1 },
    ]);
    const px = parseClipOutline("polygon(0px 0px, 200px 0px, 200px 50px)", 200, 100);
    expect(px?.[2]).toEqual({ c: "L", x: 1, y: 0.5 });
  });

  it("reads inset, circle, ellipse and path", () => {
    expect(parseClipOutline("inset(0% 50% 0% 0%)", 100, 100)).toHaveLength(4);
    expect(parseClipOutline("circle(40% at 50% 50%)", 100, 100)?.some((c) => c.c === "C")).toBe(
      true,
    );
    expect(parseClipOutline("ellipse(50% 25% at 50% 50%)", 200, 100)).not.toBeNull();
    expect(parseClipOutline('path("M0 0 L100 0 L100 100 Z")', 100, 100)).toHaveLength(3);
  });

  it("refuses masks PowerPoint cannot hold, rather than faking them", () => {
    expect(parseClipOutline("url(#feather)", 100, 100)).toBeNull();
    expect(parseClipOutline("none", 100, 100)).toBeNull();
    // Arcs would need flattening; a calc() cannot be resolved from a tag.
    expect(parseClipOutline('path("M0 0 A10 10 0 0 1 20 0")', 100, 100)).toBeNull();
    expect(parseClipOutline("polygon(calc(10px + 2%) 0, 100% 100%, 0 100%)", 100, 100)).toBeNull();
    // A collapsed outline would export as an invisible object.
    expect(parseClipOutline("polygon(0 0, 0 0, 0 0)", 100, 100)).toBeNull();
  });

  it("round-trips through the object-name tag", () => {
    const cmds = parseClipOutline("polygon(50% 0, 100% 100%, 0 100%)", 100, 100)!;
    const tag = clipGeomTag(cmds)!;
    expect(tag).toMatch(/^\[cg:M50000,0L100000,100000L0,100000\]$/);
    expect(stripClipGeomTag(`${tag} TP Shape`)).toBe("TP Shape");
    const back = parseClipGeomTag(`${tag} TP Shape`)!;
    expect(back[1]).toEqual({ c: "L", x: 100000, y: 100000 });
  });

  it("emits a closed custGeom path in PowerPoint's own path space", () => {
    const xml = custGeomXml(parseClipGeomTag("[cg:M0,0L100000,0L100000,100000]")!);
    expect(xml).toContain('<a:path w="100000" h="100000">');
    expect(xml).toContain("<a:moveTo>");
    expect(xml).toContain("<a:lnTo>");
    expect(xml).toContain("<a:close/>");
    expect(xml).toContain("<a:avLst/>");
  });

  it("swaps preset geometry for the outline on shapes and pictures, tag stripped", () => {
    const sp =
      '<p:sp><p:nvSpPr><p:cNvPr id="2" name="[cg:M50000,0L100000,100000L0,100000] TP Chevron"/>' +
      "</p:nvSpPr><p:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"100\" cy=\"100\"/></a:xfrm>" +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:sp>';
    const out = withCustomGeometry(sp);
    expect(out).toContain("<a:custGeom>");
    expect(out).not.toContain("prstGeom");
    expect(out).toContain('name="TP Chevron"');

    const pic =
      '<p:pic><p:nvPicPr><p:cNvPr id="3" name="[cg:M0,0L100000,0L50000,100000] TP Image"/>' +
      '</p:nvPicPr><p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
    const outPic = withCustomGeometry(pic);
    expect(outPic).toContain("<a:custGeom>");
    expect(outPic).toContain('name="TP Image"');
  });

  it("leaves untagged parts untouched", () => {
    const sp = '<p:sp><p:spPr><a:prstGeom prst="roundRect"/></p:spPr></p:sp>';
    expect(withCustomGeometry(sp)).toBe(sp);
  });

  it("knows whether a child is safe to export unclipped", () => {
    // Triangle mask: a box in the wide base is inside, one at the apex is not.
    const ctx = {
      cmds: parseClipOutline("polygon(50% 0, 100% 100%, 0 100%)", 100, 100)!,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    };
    expect(outlineContainsRect(ctx, { x: 30, y: 80, w: 40, h: 15 })).toBe(true);
    expect(outlineContainsRect(ctx, { x: 5, y: 5, w: 40, h: 20 })).toBe(false);
  });
});
