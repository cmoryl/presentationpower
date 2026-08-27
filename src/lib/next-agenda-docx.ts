// -----------------------------------------------------------------------------
// NEXT division agenda — editable Microsoft Word export.
//
// Word cannot carry the layered approved gradient ground as live vector art, so
// the ground is flattened to a single full-bleed picture anchored behind the
// text, exactly at the trim size of the chosen format. Everything else stays
// live, editable Word content: the eyebrow, headline, date/venue line, every
// programme row and the footer are real paragraphs and table cells carrying the
// same Geist family, the same point sizes derived from the print layout, and the
// same approved inks as the printed board.
//
// The file is written as WordprocessingML (a plain .docx zip), so no extra
// dependency is needed and the result opens natively in Word, Pages and Docs.
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import {
  agendaBlocks,
  agendaDivision,
  agendaGeometry,
  agendaInk,
  agendaLayout,
  agendaName,
  agendaStops,
  agendaTitleInk,
  type AgendaConfig,
} from "./next-agenda";

/** Word measures pages in twentieths of a point. */
const TWIPS_PER_MM = 1440 / 25.4;
/** DrawingML EMUs per millimetre. */
const EMU_PER_MM = 36000;
/** mm cap height → Word half-points (Word sizes are in half-points). */
const MM_TO_HALF_PT = (2.83465 * 2) / 0.72;

const FONT = "Geist";
const FONT_FALLBACK = "Inter";

function halfPt(mm: number): number {
  return Math.max(8, Math.round(mm * MM_TO_HALF_PT));
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hex(color: string, fallback = "000000"): string {
  const clean = (color || "").trim().replace("#", "");
  return /^[0-9a-f]{6}$/i.test(clean) ? clean.toUpperCase() : fallback;
}

/**
 * Flatten the approved gradient ground to a PNG at the trim size. Word gets a
 * picture, but it is the same gradient and the same stops as the press file.
 */
async function flattenedGroundPng(config: AgendaConfig, px: { w: number; h: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(64, Math.round(px.w));
  canvas.height = Math.max(64, Math.round(px.h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not rasterize the agenda background");

  const stops = agendaStops(config.styleId, config.face, config.divisionId);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width * 0.35, canvas.height);
  const list = stops.length ? stops : [agendaFaceGround(config)];
  list.forEach((stop, i) => {
    gradient.addColorStop(list.length === 1 ? 0 : i / (list.length - 1), stop);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not rasterize the agenda background"))),
      "image/png",
    );
  });
}

function agendaFaceGround(config: AgendaConfig): string {
  return (config.face ?? "dark") === "light" ? "#EEF1F7" : "#03002C";
}

function run(
  text: string,
  opts: { size: number; color: string; bold?: boolean; caps?: boolean; spacing?: number },
): string {
  return [
    "<w:r><w:rPr>",
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}" w:eastAsia="${FONT_FALLBACK}"/>`,
    opts.bold ? "<w:b/>" : "",
    opts.caps ? "<w:caps/>" : "",
    `<w:color w:val="${opts.color}"/>`,
    `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`,
    opts.spacing ? `<w:spacing w:val="${Math.round(opts.spacing)}"/>` : "",
    "</w:rPr>",
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`,
  ].join("");
}

function para(runs: string, opts: { afterTwips?: number; align?: "left" | "right" } = {}): string {
  return [
    "<w:p><w:pPr>",
    `<w:spacing w:after="${Math.round(opts.afterTwips ?? 60)}" w:line="240" w:lineRule="auto"/>`,
    opts.align === "right" ? '<w:jc w:val="right"/>' : "",
    "</w:pPr>",
    runs,
    "</w:p>",
  ].join("");
}

function cell(widthTwips: number, content: string): string {
  return [
    "<w:tc><w:tcPr>",
    `<w:tcW w:w="${Math.round(widthTwips)}" w:type="dxa"/>`,
    '<w:vAlign w:val="center"/>',
    "</w:tcPr>",
    content || "<w:p/>",
    "</w:tc>",
  ].join("");
}

/**
 * Build the .docx. Text stays editable and keeps the printed fonts, sizes and
 * inks; the approved gradient ground is a flattened full-page picture behind it.
 */
export async function buildAgendaDocx(config: AgendaConfig): Promise<{ blob: Blob; notes: string[] }> {
  const geo = agendaGeometry(config);
  const L = agendaLayout(config);
  const blocks = agendaBlocks(config);
  const ink = agendaInk(config.face ?? "dark");
  const inkHex = hex(ink, config.face === "light" ? "03002C" : "FFFFFF");
  const titleHex = hex(agendaTitleInk(config));
  const division = agendaDivision(config.divisionId);

  const pageW = Math.round(geo.trimW * TWIPS_PER_MM);
  const pageH = Math.round(geo.trimH * TWIPS_PER_MM);
  const margin = Math.round(geo.safeInset * TWIPS_PER_MM);
  const contentTwips = pageW - margin * 2;

  // Flatten the ground at ~150 ppi of the trim size — plenty for Word output
  // while keeping the file small.
  const groundPx = { w: (geo.trimW / 25.4) * 150, h: (geo.trimH / 25.4) * 150 };
  const ground = await flattenedGroundPng(config, groundPx);
  const groundBytes = await ground.arrayBuffer();

  const backgroundDrawing = [
    "<w:r><w:drawing>",
    `<wp:anchor behindDoc="1" distT="0" distB="0" distL="0" distR="0" simplePos="0" locked="0" layoutInCell="1" allowOverlap="1" relativeHeight="0">`,
    '<wp:simplePos x="0" y="0"/>',
    '<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>',
    '<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>',
    `<wp:extent cx="${Math.round(geo.trimW * EMU_PER_MM)}" cy="${Math.round(geo.trimH * EMU_PER_MM)}"/>`,
    '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
    '<wp:wrapNone/>',
    '<wp:docPr id="1" name="Approved NEXT ground" descr="Flattened approved NEXT gradient ground"/>',
    "<a:graphic xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\"><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">",
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    '<pic:nvPicPr><pic:cNvPr id="1" name="ground.png"/><pic:cNvPicPr/></pic:nvPicPr>',
    '<pic:blipFill><a:blip r:embed="rIdGround"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>',
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(geo.trimW * EMU_PER_MM)}" cy="${Math.round(geo.trimH * EMU_PER_MM)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
    "</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>",
  ].join("");

  const timeW = contentTwips * 0.17;
  const trackW = contentTwips * 0.2;
  const bodyW = contentTwips - timeW - trackW;

  const rows = config.sessions
    .map((session) => {
      const muted = session.muted;
      const rowInk = muted ? hex(ink, "8A93A6") : inkHex;
      const body = [
        para(
          run(session.title ?? "", {
            size: halfPt(L.titleRowSize),
            color: rowInk,
            bold: !muted,
          }),
          { afterTwips: 20 },
        ),
        (session.detail ?? "").trim()
          ? para(
              run(session.detail, { size: halfPt(L.detailSize), color: rowInk }),
              { afterTwips: 0 },
            )
          : "",
      ].join("");
      return [
        "<w:tr>",
        cell(
          timeW,
          para(run(session.time ?? "", { size: halfPt(L.timeSize), color: rowInk, bold: true }), {
            afterTwips: 0,
          }),
        ),
        cell(bodyW, body),
        cell(
          trackW,
          para(
            run(session.track ?? "", {
              size: halfPt(L.trackSize),
              color: rowInk,
              caps: true,
              spacing: 20,
            }),
            { afterTwips: 0, align: "right" },
          ),
        ),
        "</w:tr>",
      ].join("");
    })
    .join("");

  const table = [
    "<w:tbl><w:tblPr>",
    `<w:tblW w:w="${Math.round(contentTwips)}" w:type="dxa"/>`,
    '<w:tblBorders><w:insideH w:val="single" w:sz="2" w:color="7F8798"/></w:tblBorders>',
    "<w:tblLayout w:type=\"fixed\"/></w:tblPr>",
    "<w:tblGrid>",
    `<w:gridCol w:w="${Math.round(timeW)}"/><w:gridCol w:w="${Math.round(bodyW)}"/><w:gridCol w:w="${Math.round(trackW)}"/>`,
    "</w:tblGrid>",
    rows,
    "</w:tbl>",
  ].join("");

  const header = [
    (config.eyebrow ?? "").trim()
      ? para(
          run(config.eyebrow, {
            size: halfPt(L.eyebrowSize),
            color: inkHex,
            caps: true,
            bold: true,
            spacing: 40,
          }),
          { afterTwips: 60 },
        )
      : "",
    para(
      run(config.title ?? "", { size: halfPt(L.titleSize), color: titleHex, bold: true, spacing: -20 }),
      { afterTwips: 80 },
    ),
    (config.meta ?? "").trim()
      ? para(run(config.meta, { size: halfPt(L.metaSize), color: inkHex }), { afterTwips: 200 })
      : "",
  ].join("");

  const footer = [
    (config.qrData ?? "").trim()
      ? para(
          run(`${(config.qrCaption ?? "").trim() || "Scan for the live agenda"}: ${config.qrData}`, {
            size: halfPt(L.footSize),
            color: inkHex,
          }),
          { afterTwips: 40 },
        )
      : "",
    (config.footnote ?? "").trim()
      ? para(run(config.footnote, { size: halfPt(L.footSize), color: inkHex }), { afterTwips: 0 })
      : "",
  ].join("");

  const document = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
    ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
    ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    "<w:body>",
    `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${backgroundDrawing}</w:p>`,
    `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${run(division.name, { size: halfPt(L.metaSize), color: inkHex, caps: true, bold: true, spacing: 40 })}</w:p>`,
    header,
    table,
    "<w:p><w:pPr><w:spacing w:after=\"120\"/></w:pPr></w:p>",
    footer,
    "<w:sectPr>",
    `<w:pgSz w:w="${pageW}" w:h="${pageH}" w:orient="${geo.trimW > geo.trimH ? "landscape" : "portrait"}"/>`,
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/>`,
    "</w:sectPr>",
    "</w:body></w:document>",
  ].join("");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Default Extension="png" ContentType="image/png"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
      "</Types>",
    ].join(""),
  );
  zip.file(
    "_rels/.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      "</Relationships>",
    ].join(""),
  );
  zip.file(
    "word/_rels/document.xml.rels",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rIdGround" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ground.png"/>',
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      "</Relationships>",
    ].join(""),
  );
  zip.file(
    "word/styles.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      "<w:docDefaults><w:rPrDefault><w:rPr>",
      `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}" w:eastAsia="${FONT_FALLBACK}"/>`,
      `<w:color w:val="${inkHex}"/><w:sz w:val="${halfPt(L.detailSize)}"/>`,
      "</w:rPr></w:rPrDefault></w:docDefaults>",
      "</w:styles>",
    ].join(""),
  );
  zip.file("word/media/ground.png", groundBytes);
  zip.file("word/document.xml", document);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return {
    blob,
    notes: [
      `Page set to ${geo.sizeName} (${geo.trimW} × ${geo.trimH} mm) with ${Math.round(geo.safeInset)} mm safe margins`,
      "Approved gradient ground flattened to a full-page picture behind the text",
      `Live editable Geist text at the printed sizes · ${config.sessions.length} programme rows in a Word table`,
      `Row band reference: ${blocks.rowH.toFixed(1)} mm per row on the printed board`,
      `Asset: ${agendaName(config)}`,
    ],
  };
}
