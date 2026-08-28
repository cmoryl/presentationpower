import { describe, expect, it } from "vitest";
import { addMediaTiming, dedupeShapeIds, mediaShapeIds } from "../pptx-media-repair";

const slide = (body: string) =>
  `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`;

const videoPic = (id: string) =>
  `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="TP Motion ground"><a:hlinkClick r:id=""/></p:cNvPr>` +
  `<p:cNvPicPr/><p:nvPr><a:videoFile r:link="rId1"/></p:nvPr></p:nvPicPr>` +
  `<p:blipFill><a:blip r:embed="rId3"/></p:blipFill></p:pic>`;

const rect = (id: string) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="TP Scrim"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr></p:sp>`;

describe("pptx media repair", () => {
  it("finds embedded movie shape ids and ignores plain pictures", () => {
    const xml = slide(
      `<p:pic><p:nvPicPr><p:cNvPr id="2" name="TP Photo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr></p:pic>${videoPic("3")}`,
    );
    expect(mediaShapeIds(xml)).toEqual(["3"]);
  });

  it("renumbers duplicate shape ids (the PowerPoint repair-prompt cause)", () => {
    const xml = slide(`${videoPic("3")}${rect("3")}`);
    const out = dedupeShapeIds(xml);
    expect(out.renumbered).toBe(1);
    const ids = [...out.xml.matchAll(/<p:cNvPr\s+id="(\d+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    // The movie keeps its original id so timing targets stay valid.
    expect(mediaShapeIds(out.xml)).toEqual(["3"]);
  });

  it("appends a timing tree targeting each movie", () => {
    const xml = addMediaTiming(slide(videoPic("3")), ["3"]);
    expect(xml).toContain("<p:timing>");
    expect(xml).toContain('<p:spTgt spid="3"/>');
    expect(xml.indexOf("<p:timing>")).toBeGreaterThan(xml.indexOf("</p:cSld>"));
  });

  it("never doubles an existing timing tree and no-ops without media", () => {
    const withTiming = slide(videoPic("3")).replace("</p:sld>", "<p:timing/></p:sld>");
    expect(addMediaTiming(withTiming, ["3"])).toBe(withTiming);
    const plain = slide(rect("2"));
    expect(addMediaTiming(plain, [])).toBe(plain);
  });
});
