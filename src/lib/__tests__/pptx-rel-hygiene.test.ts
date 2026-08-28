import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  applyRelHygiene,
  dedupeDrawingIds,
  parseRels,
  relsPathFor,
  resolveTarget,
  stripDanglingRefs,
} from "../pptx-rel-hygiene";

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://x/image" Target="../media/image1.png"/>
<Relationship Id="rId2" Type="http://x/image" Target="../media/gone.png"/>
</Relationships>`;

const SLIDE = `<?xml version="1.0"?><p:sld><p:cSld><p:spTree>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="TP Photo"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/></p:blipFill></p:pic>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="TP Ghost"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/></p:blipFill></p:pic>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="TP Card"/></p:nvSpPr></p:sp>
</p:spTree></p:cSld></p:sld>`;

describe("rel path helpers", () => {
  it("derives the .rels path of a part", () => {
    expect(relsPathFor("ppt/slides/slide3.xml")).toBe("ppt/slides/_rels/slide3.xml.rels");
  });

  it("resolves a relative target", () => {
    expect(resolveTarget("ppt/slides/slide1.xml", "../media/image2.png")).toBe(
      "ppt/media/image2.png",
    );
  });

  it("parses relationship entries", () => {
    expect(parseRels(RELS).map((r) => r.id)).toEqual(["rId1", "rId2"]);
  });
});

describe("dangling reference repair", () => {
  it("removes a picture whose relationship is gone and keeps the valid one", () => {
    const out = stripDanglingRefs(SLIDE, new Set(["rId1"]));
    expect(out.shapesRemoved).toBe(1);
    expect(out.xml).toContain("TP Photo");
    expect(out.xml).not.toContain("TP Ghost");
    expect(out.xml).not.toContain("rId2");
  });

  it("renumbers duplicate shape ids", () => {
    const out = dedupeDrawingIds(SLIDE);
    expect(out.renumbered).toBe(1);
    const ids = [...out.xml.matchAll(/<p:cNvPr\b[^>]*\sid="(\d+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("applyRelHygiene", () => {
  it("prunes the orphan relationship and repairs the slide", async () => {
    const zip = new JSZip();
    zip.file("ppt/media/image1.png", "png-bytes");
    zip.file("ppt/slides/slide1.xml", SLIDE);
    zip.file("ppt/slides/_rels/slide1.xml.rels", RELS);

    const report = await applyRelHygiene(zip);
    expect(report.danglingShapesRemoved).toBe(1);
    expect(report.orphanRelsRemoved).toBe(1);
    expect(report.duplicateIdsFixed).toBeGreaterThanOrEqual(0);

    const rels = await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string");
    expect(rels).not.toContain("rId2");
    expect(rels).toContain("rId1");

    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slide).toContain("TP Photo");
    expect(slide).not.toContain("TP Ghost");
  });

  it("leaves a healthy package untouched", async () => {
    const clean = `<?xml version="1.0"?><p:sld><p:cSld><p:spTree>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="TP Photo"/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/></p:blipFill></p:pic>
</p:spTree></p:cSld></p:sld>`;
    const zip = new JSZip();
    zip.file("ppt/media/image1.png", "png-bytes");
    zip.file("ppt/slides/slide1.xml", clean);
    zip.file(
      "ppt/slides/_rels/slide1.xml.rels",
      `<Relationships><Relationship Id="rId1" Type="http://x/image" Target="../media/image1.png"/></Relationships>`,
    );

    const report = await applyRelHygiene(zip);
    expect(report).toEqual({
      danglingShapesRemoved: 0,
      danglingRefsStripped: 0,
      orphanRelsRemoved: 0,
      duplicateIdsFixed: 0,
    });
    expect(await zip.file("ppt/slides/slide1.xml")!.async("string")).toBe(clean);
  });
});
