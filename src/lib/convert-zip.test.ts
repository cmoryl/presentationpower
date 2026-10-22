import { describe, expect, it } from "vitest";
import { classifyZipEntry, linesFromIdmlStories } from "./convert-zip";

describe("convert zip packages", () => {
  it("native InDesign is listed but skipped", () => {
    const p = classifyZipEntry("Job/Brochure.indd", 10);
    expect(p).toMatchObject({ kind: "indd", status: "skipped" });
  });
  it("IDML and Illustrator are ready to resize", () => {
    expect(classifyZipEntry("Job/Brochure.idml", 10)).toMatchObject({ kind: "idml", status: "ready" });
    expect(classifyZipEntry("Job/Poster.ai", 10)).toMatchObject({ kind: "pdf", status: "ready" });
  });
  it("fonts and linked images are support files, mac junk is ignored", () => {
    expect(classifyZipEntry("Job/Document fonts/Geist.otf", 1)).toBe("font");
    expect(classifyZipEntry("Job/Links/photo.tif", 1)).toBe("link");
    expect(classifyZipEntry("__MACOSX/Job/._Poster.ai", 1)).toBeNull();
  });
  it("reads IDML story text in order", () => {
    const xml = `<Story><ParagraphStyleRange><CharacterStyleRange><Content>Hello &amp; welcome</Content></CharacterStyleRange></ParagraphStyleRange><ParagraphStyleRange><Content>Second</Content></ParagraphStyleRange></Story>`;
    expect(linesFromIdmlStories([xml])).toEqual(["Hello & welcome", "Second"]);
  });
});
