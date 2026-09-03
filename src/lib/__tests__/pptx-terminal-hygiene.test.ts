import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { applyTerminalPptxHygiene, preserveDrawingTextWhitespace } from "../pptx-terminal-hygiene";

describe("terminal PowerPoint hygiene", () => {
  it("marks DrawingML runs whose intentional edge whitespace must be preserved", () => {
    const result = preserveDrawingTextWhitespace(
      '<a:t>plain</a:t><a:t> leading</a:t><a:t>trailing </a:t><a:t xml:space="preserve"> kept </a:t>',
    );
    expect(result.fixed).toBe(2);
    expect(result.xml).toContain('<a:t xml:space="preserve"> leading</a:t>');
    expect(result.xml).toContain('<a:t xml:space="preserve">trailing </a:t>');
    expect(result.xml).toContain('<a:t xml:space="preserve"> kept </a:t>');
  });

  it("deduplicates shape ids even when a deck contains no video", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>',
    );
    zip.file("ppt/presentation.xml", '<p:presentation xmlns:p="p"><p:sldIdLst/></p:presentation>');
    zip.file(
      "ppt/slides/slide1.xml",
      '<p:sld xmlns:p="p"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="A"/></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="2" name="B"/></p:nvSpPr></p:sp></p:spTree></p:cSld></p:sld>',
    );
    const input = await zip.generateAsync({ type: "blob" });
    const output = await applyTerminalPptxHygiene(input);
    const result = await JSZip.loadAsync(await output.arrayBuffer());
    const xml = await result.file("ppt/slides/slide1.xml")?.async("string");
    const ids = [...(xml ?? "").matchAll(/<p:cNvPr\s+id="(\d+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
