import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { extractOfficeText } from "@/lib/agent/doc-intake.server";

async function pack(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  Object.entries(files).forEach(([name, body]) => zip.file(name, body));
  return zip.generateAsync({ type: "uint8array" });
}

const DOCX = `<?xml version="1.0"?>
<w:document xmlns:w="w"><w:body>
  <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Global Launch Plan</w:t></w:r></w:p>
  <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Scope</w:t></w:r></w:p>
  <w:p><w:r><w:t>We localize the full site.</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Spanish</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>LatAm variant</w:t></w:r></w:p>
  <w:tbl>
    <w:tr><w:tc><w:p><w:r><w:t>Market</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Words</w:t></w:r></w:p></w:tc></w:tr>
    <w:tr><w:tc><w:p><w:r><w:t>Japan</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12,400</w:t></w:r></w:p></w:tc></w:tr>
  </w:tbl>
</w:body></w:document>`;

const SLIDE = `<?xml version="1.0"?>
<p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>
  <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody>
    <a:p><a:r><a:t>Why Element</a:t></a:r></a:p></p:txBody></p:sp>
  <p:sp><p:nvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:txBody>
    <a:p><a:r><a:t>One system</a:t></a:r></a:p>
    <a:p><a:pPr lvl="1"/><a:r><a:t>Decks &amp; print</a:t></a:r></a:p></p:txBody></p:sp>
  <p:graphicFrame><a:graphic><a:graphicData><a:tbl>
    <a:tr><a:tc><a:txBody><a:p><a:r><a:t>Region</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Sites</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
    <a:tr><a:tc><a:txBody><a:p><a:r><a:t>EMEA</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>18</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
  </a:tbl></a:graphicData></a:graphic></p:graphicFrame>
</p:spTree></p:cSld></p:sld>`;

const NOTES = `<?xml version="1.0"?><p:notes xmlns:p="p" xmlns:a="a"><a:p><a:r><a:t>Keep it to 90 seconds.</a:t></a:r></a:p></p:notes>`;

describe("office extraction keeps structure", () => {
  it("emits Word headings, nested lists and pipe tables", async () => {
    const text = await extractOfficeText(await pack({ "word/document.xml": DOCX }), "docx");
    expect(text).toContain("# Global Launch Plan");
    expect(text).toContain("## Scope");
    expect(text).toContain("- Spanish");
    expect(text).toContain("  - LatAm variant");
    expect(text).toContain("| Market | Words |");
    expect(text).toContain("| --- | --- |");
    expect(text).toContain("| Japan | 12,400 |");
    expect(text.indexOf("## Scope")).toBeLessThan(text.indexOf("- Spanish"));
  });

  it("emits PowerPoint slide titles, indented bullets, tables and notes", async () => {
    const text = await extractOfficeText(
      await pack({ "ppt/slides/slide1.xml": SLIDE, "ppt/notesSlides/notesSlide1.xml": NOTES }),
      "pptx",
    );
    expect(text).toContain("## Slide 1: Why Element");
    expect(text).toContain("- One system");
    expect(text).toContain("  - Decks & print");
    expect(text).toContain("| Region | Sites |");
    expect(text).toContain("| EMEA | 18 |");
    expect(text).toContain("Speaker notes: Keep it to 90 seconds.");
  });

  it("emits Excel sheet names and rows as tables", async () => {
    const shared = `<sst><si><t>Market</t></si><si><t>Japan</t></si></sst>`;
    const sheet = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>2024</v></c></row>
      <row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>18</v></c></row>
    </sheetData></worksheet>`;
    const text = await extractOfficeText(
      await pack({
        "xl/sharedStrings.xml": shared,
        "xl/workbook.xml": `<workbook><sheets><sheet name="Volumes" sheetId="1"/></sheets></workbook>`,
        "xl/worksheets/sheet1.xml": sheet,
      }),
      "xlsx",
    );
    expect(text).toContain("## Volumes");
    expect(text).toContain("| Market | 2024 |");
    expect(text).toContain("| Japan | 18 |");
  });
});
