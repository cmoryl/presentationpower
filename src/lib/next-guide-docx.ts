// -----------------------------------------------------------------------------
// NEXT delegate guide — editable Microsoft Word export.
//
// Written as plain WordprocessingML in a zip, so no extra dependency is needed
// and the file opens natively in Word, Pages and Docs. Everything is live,
// editable text in the brand's own inks and the Geist family, so an event team
// can correct a time or a room without coming back to us.
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { guideSize, type GuideBlock, type GuideConfig } from "./next-guide";

const TWIPS_PER_MM = 1440 / 25.4;

const INK = "03002C";
const ACCENT = "003FC7";
const SURFACE = "EEF1F7";

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type RunOpts = {
  size?: number; // points
  bold?: boolean;
  color?: string;
  caps?: boolean;
  spacingBefore?: number; // points
  spacingAfter?: number;
  shade?: string;
  indent?: number; // mm
};

function para(text: string, o: RunOpts = {}): string {
  const half = Math.round((o.size ?? 11) * 2);
  const before = Math.round((o.spacingBefore ?? 0) * 20);
  const after = Math.round((o.spacingAfter ?? 6) * 20);
  const ind = o.indent ? `<w:ind w:left="${Math.round(o.indent * TWIPS_PER_MM)}"/>` : "";
  const shade = o.shade ? `<w:shd w:val="clear" w:fill="${o.shade}"/>` : "";
  const caps = o.caps ? "<w:caps/>" : "";
  const bold = o.bold ? "<w:b/>" : "";
  return (
    `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>${ind}${shade}` +
    `<w:rPr><w:rFonts w:ascii="Geist" w:hAnsi="Geist"/>${bold}${caps}<w:color w:val="${o.color ?? INK}"/><w:sz w:val="${half}"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Geist" w:hAnsi="Geist"/>${bold}${caps}<w:color w:val="${o.color ?? INK}"/><w:sz w:val="${half}"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

function pageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function blockXml(block: GuideBlock, config: GuideConfig): string {
  const out: string[] = [];
  switch (block.kind) {
    case "cover":
      out.push(para(block.eyebrow, { size: 11, bold: true, color: ACCENT, caps: true }));
      out.push(para(block.title || "YOUR GUIDE", { size: 44, bold: true, spacingAfter: 4 }));
      if (block.theme) out.push(para(block.theme, { size: 18, bold: true, color: ACCENT, caps: true }));
      if (block.strapline) out.push(para(block.strapline, { size: 11, caps: true, color: ACCENT }));
      out.push(
        para(
          [config.location.venue, config.location.address, config.location.dates]
            .filter(Boolean)
            .join(" · "),
          { size: 11, bold: true, spacingBefore: 12 },
        ),
      );
      if (block.footnote) out.push(para(block.footnote, { size: 11, color: ACCENT }));
      break;
    case "welcome":
      out.push(para(block.title, { size: 22, bold: true }));
      out.push(para(block.body, { size: 11 }));
      if (block.byline) out.push(para(block.byline, { size: 11, bold: true, color: ACCENT }));
      if (block.note) out.push(para(block.note, { size: 11, shade: SURFACE, spacingBefore: 8 }));
      break;
    case "info":
    case "list":
      out.push(para(block.title, { size: 22, bold: true }));
      if (block.standfirst) out.push(para(block.standfirst, { size: 12, color: ACCENT }));
      for (const it of block.items) {
        out.push(para(it.label, { size: 13, bold: true, spacingBefore: 6, spacingAfter: 2 }));
        out.push(para(it.body, { size: 11 }));
      }
      break;
    case "schedule":
      out.push(para(block.title, { size: 22, bold: true }));
      if (block.standfirst) out.push(para(block.standfirst, { size: 12, color: ACCENT }));
      for (const day of block.days) {
        out.push(para(day.name, { size: 14, bold: true, color: ACCENT, spacingBefore: 8 }));
        for (const r of day.rows)
          out.push(para(`${r.time}    ${r.item}`, { size: 11, spacingAfter: 3 }));
      }
      break;
    case "keynote":
      out.push(para(block.eyebrow, { size: 11, bold: true, color: ACCENT, caps: true }));
      out.push(para(block.talkTitle, { size: 26, bold: true, spacingAfter: 2 }));
      out.push(para(block.name, { size: 15, bold: true, color: ACCENT }));
      if (block.when) out.push(para(block.when, { size: 11, bold: true }));
      out.push(para(block.body, { size: 11, spacingBefore: 6 }));
      break;
    case "floors":
      out.push(para(block.title, { size: 22, bold: true }));
      if (block.standfirst) out.push(para(block.standfirst, { size: 12, color: ACCENT }));
      for (const floor of block.floors) {
        out.push(para(floor.name, { size: 13, bold: true, color: ACCENT, spacingBefore: 6, spacingAfter: 2 }));
        if (floor.room) out.push(para(floor.room, { size: 11, bold: true, spacingAfter: 2 }));
        for (const line of floor.lines)
          out.push(para(`· ${line}`, { size: 11, indent: 5, spacingAfter: 2 }));
      }
      break;
    case "links":
      out.push(para(block.title, { size: 22, bold: true }));
      if (block.standfirst) out.push(para(block.standfirst, { size: 12, color: ACCENT }));
      for (const link of block.links) {
        out.push(para(link.label, { size: 13, bold: true, spacingAfter: 2 }));
        out.push(para(link.url, { size: 11, color: ACCENT }));
      }
      break;
  }
  return out.join("");
}

export async function buildGuideDocx(config: GuideConfig): Promise<Uint8Array<ArrayBuffer>> {
  const size = guideSize(config.sizeId);
  const pageW = Math.round(size.trimW * TWIPS_PER_MM);
  const pageH = Math.round(size.trimH * TWIPS_PER_MM);
  const margin = Math.round(18 * TWIPS_PER_MM);

  const body = config.blocks
    .map((b) => blockXml(b, config))
    .filter(Boolean)
    .join(pageBreak());

  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}` +
    `<w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"/>` +
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/>` +
    "</w:sectPr></w:body></w:document>";

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
  );
  zip.file("word/document.xml", document);

  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return out as Uint8Array<ArrayBuffer>;
}
