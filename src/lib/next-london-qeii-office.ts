// -----------------------------------------------------------------------------
// QEII Centre floor plan — editable PowerPoint and Word exports.
//
// Neither PowerPoint nor Word can carry the venue's plan as live vector art, so
// the drawing itself arrives as one picture at print resolution — the same
// artwork the proof PDF shows, with the room wording left out of it. Every room
// name, use line and colour-key row is then laid over that picture as real,
// editable text in the same place, at the same size and in the same ink the plan
// sets, so the crew can retype a room in PowerPoint or Word without redrawing
// anything.
//
// The Illustrator export (next-london-qeii-ai.ts) is the one that keeps the plan
// as live vector paths.
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiPlanSvg, type QeiiPlanOptions } from "@/lib/next-london-qeii-plan";
import { inlineSvgImages, qeiiRasteriseSvg } from "@/lib/next-london-qeii-pdf";
import { qeiiColourKey, qeiiColourPaint, qeiiRoomTextInk } from "@/lib/next-london-qeii-rooms";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiOfficeResult = { blob: Blob; filename: string; notes: string[] };

const FONT = "Geist";

function hex(colour: string | undefined, fallback: string): string {
  const v = (colour ?? "").trim().replace("#", "");
  return /^[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : fallback;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(floor: QeiiFloorVector): string {
  return floor.title.replace(/\s+/g, "-");
}

/** Room names, lines and key rows in the places the plan sets them. */
type PlanText = {
  art: { dataUrl: string; w: number; h: number };
  /** Plan-unit geometry of the artwork, including the key strip. */
  units: { w: number; h: number };
  blocks: {
    room: string;
    lines: string[];
    use?: string;
    x: number;
    y: number;
    size: number;
    useSize: number;
    angle: number;
    ink: string;
  }[];
  key: { hex: string; label: string; x: number; y: number; size: number }[];
  notes: string[];
};

/**
 * Rasterise the plan without its wording and work out where each piece of copy
 * belongs, in plan units.
 */
async function planText(floor: QeiiFloorVector, options: QeiiPlanOptions): Promise<PlanText> {
  const notes: string[] = [];
  const svg = qeiiPlanSvg(floor, { ...options, showText: false });
  const inlined = await inlineSvgImages(svg, new Map());
  if (inlined.dropped.length) {
    notes.push(
      `${inlined.dropped.length} division lockup${inlined.dropped.length === 1 ? "" : "s"} could not be read, so ${inlined.dropped.length === 1 ? "it is" : "they are"} not on this map.`,
    );
  }
  const art = await qeiiRasteriseSvg(inlined.svg);
  const roomColours = options.roomColours ?? {};
  const paint = qeiiColourPaint(floor, roomColours);
  const layout = qeiiPlanLayout(floor, {
    labelScale: options.labelScale ?? 1,
    showUse: options.showUse,
    showMarks: options.showMarks,
    markScale: options.markScale,
    edits: options.edits,
  });
  const blocks =
    (options.showLabels ?? true)
      ? layout.blocks.map((block) => {
          const tag = paint.tags.get(block.room) ?? roomColours[block.room];
          const ink = tag ? qeiiRoomTextInk(tag) : "#FFFFFF";
          return {
            room: block.room,
            lines: block.lines,
            use: block.use,
            x: block.x,
            y: block.y,
            size: block.size,
            useSize: block.useSize,
            angle: block.angle,
            ink,
          };
        })
      : [];
  const keyRows =
    options.showKey === false ? [] : qeiiColourKey(floor, roomColours, options.keyLabels ?? {});
  const keyStep = floor.w * 0.038;
  const keyH = keyRows.length ? keyStep * (keyRows.length + 1.2) : 0;
  const key = keyRows.map((row, i) => ({
    hex: row.hex,
    label: row.label,
    x: floor.w * 0.02 + keyStep,
    y: floor.h + keyStep * (0.9 + i),
    size: keyStep * 0.52,
  }));
  return { art, units: { w: floor.w, h: floor.h + keyH }, blocks, key, notes };
}

// ── PowerPoint ───────────────────────────────────────────────────────────────

/**
 * One 16:9 slide per floor: the plan as a picture with every room name as its
 * own editable text box on top.
 */
export async function buildQeiiPlanPptx(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<QeiiOfficeResult> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const plan = await planText(floor, options);
  const pptx = new PptxGenJS();
  const slideW = 13.333;
  const slideH = 7.5;
  pptx.defineLayout({ name: "QEII_MAP", width: slideW, height: slideH });
  pptx.layout = "QEII_MAP";
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  slide.addText(`Queen Elizabeth II Centre — ${floor.title}`, {
    x: 0.5,
    y: 0.28,
    w: slideW - 1,
    h: 0.4,
    fontFace: FONT,
    fontSize: 18,
    bold: true,
    color: "03002C",
  });
  slide.addText("NEXT 2026 London · 24–25 September 2026", {
    x: 0.5,
    y: 0.66,
    w: slideW - 1,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: "666666",
  });

  // Fit the artwork under the heading, keeping the venue's proportions.
  const box = { x: 0.5, y: 1.05, w: slideW - 1, h: slideH - 1.6 };
  const k = Math.min(box.w / plan.units.w, box.h / plan.units.h);
  const artW = plan.units.w * k;
  const artH = plan.units.h * k;
  const ox = box.x + (box.w - artW) / 2;
  const oy = box.y + (box.h - artH) / 2;
  slide.addImage({ data: plan.art.dataUrl, x: ox, y: oy, w: artW, h: artH });

  /** Plan units → inches on the slide. */
  const ptSize = (units: number) => Math.max(4, units * k * 72);

  for (const block of plan.blocks) {
    const lines: { text: string; y: number; size: number }[] = [];
    const nameTop = block.y - ((block.lines.length - 1) * block.size * 1.05) / 2;
    block.lines.forEach((line, li) => {
      lines.push({ text: line, y: nameTop + li * block.size * 1.05, size: block.size });
    });
    const lastLine = nameTop + (block.lines.length - 1) * block.size * 1.05;
    if (block.use) {
      lines.push({
        text: block.use,
        y: lastLine + block.size * 0.62 + block.useSize * 0.6,
        size: block.useSize,
      });
    }
    for (const line of lines) {
      const fontSize = ptSize(line.size);
      const h = (fontSize / 72) * 1.5;
      const w = Math.max(0.6, ((line.text.length * fontSize * 0.62) / 72) * 1.15);
      slide.addText(line.text, {
        x: ox + block.x * k - w / 2,
        y: oy + block.y * k + (line.y - block.y) * k - h / 2,
        w,
        h,
        align: "center",
        valign: "middle",
        fontFace: FONT,
        fontSize,
        bold: true,
        color: hex(block.ink, "FFFFFF"),
        // PowerPoint turns a box clockwise, the same way the plan sets the name.
        rotate: Math.abs(block.angle) < 0.5 ? 0 : block.angle,
        margin: 0,
        fit: "none",
      });
    }
  }

  for (const row of plan.key) {
    const size = ptSize(row.size);
    const sw = (size / 72) * 1.1;
    slide.addShape("rect", {
      x: ox + (row.x - row.size * 1.5) * k,
      y: oy + row.y * k - sw / 2,
      w: sw,
      h: sw,
      fill: { color: hex(row.hex, "003FC7") },
      line: { color: hex(row.hex, "003FC7") },
    });
    slide.addText(row.label, {
      x: ox + row.x * k,
      y: oy + row.y * k - (size / 72),
      w: 4,
      h: (size / 72) * 2,
      valign: "middle",
      fontFace: FONT,
      fontSize: size,
      bold: true,
      color: "03002C",
      margin: 0,
      fit: "none",
    });
  }

  slide.addText(
    "Room names and the key are editable text. The plan drawing is a picture — use the Illustrator file to change the drawing itself.",
    { x: 0.5, y: slideH - 0.48, w: slideW - 1, h: 0.3, fontFace: FONT, fontSize: 8.5, color: "666666" },
  );

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return {
    blob,
    filename: `TP-NEXT-2026-London-QEII-${slug(floor)}-map.pptx`,
    notes: [
      ...plan.notes,
      "Room names, use lines and the key are live PowerPoint text; the plan drawing is a picture.",
    ],
  };
}

// ── Word ─────────────────────────────────────────────────────────────────────

const TWIPS_PER_MM = 1440 / 25.4;
const EMU_PER_MM = 36000;

function docxParagraph(
  text: string,
  opts: { size: number; bold?: boolean; colour?: string; align?: string; after?: number } = {
    size: 20,
  },
): string {
  return (
    `<w:p><w:pPr>${opts.align ? `<w:jc w:val="${opts.align}"/>` : ""}` +
    `<w:spacing w:after="${opts.after ?? 60}"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/>` +
    `${opts.bold ? "<w:b/>" : ""}<w:sz w:val="${opts.size}"/>` +
    `<w:color w:val="${hex(opts.colour, "03002C")}"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

/**
 * An A3 landscape Word page: the plan as a full-width picture, then the room
 * list and the key as editable Word text the crew can retype.
 */
export async function buildQeiiPlanDocx(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<QeiiOfficeResult> {
  const plan = await planText(floor, options);
  const pageWmm = 420;
  const pageHmm = 297;
  const marginMm = 15;
  const contentMm = pageWmm - marginMm * 2;
  const artWmm = contentMm;
  const artHmm = (plan.units.h / plan.units.w) * artWmm;
  const bytes = await (await fetch(plan.art.dataUrl)).arrayBuffer();

  const rows = plan.blocks
    .map((block) => {
      const name = block.lines.join(" ");
      return (
        `<w:tr><w:tc><w:tcPr><w:tcW w:w="${Math.round(contentMm * 0.45 * TWIPS_PER_MM)}" w:type="dxa"/></w:tcPr>` +
        docxParagraph(name, { size: 22, bold: true }) +
        `</w:tc><w:tc><w:tcPr><w:tcW w:w="${Math.round(contentMm * 0.55 * TWIPS_PER_MM)}" w:type="dxa"/></w:tcPr>` +
        docxParagraph(block.use ?? "—", { size: 20, colour: "666666" }) +
        `</w:tc></w:tr>`
      );
    })
    .join("");

  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>` +
    docxParagraph(`Queen Elizabeth II Centre — ${floor.title}`, { size: 36, bold: true }) +
    docxParagraph("NEXT 2026 London · 24–25 September 2026", { size: 18, colour: "666666" }) +
    `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${Math.round(artWmm * EMU_PER_MM)}" cy="${Math.round(artHmm * EMU_PER_MM)}"/>` +
    `<wp:docPr id="1" name="Floor plan"/><a:graphic><a:graphicData ` +
    `uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="1" name="plan.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(artWmm * EMU_PER_MM)}" cy="${Math.round(artHmm * EMU_PER_MM)}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>` +
    docxParagraph("Rooms on this floor", { size: 26, bold: true }) +
    `<w:tbl><w:tblPr><w:tblW w:w="${Math.round(contentMm * TWIPS_PER_MM)}" w:type="dxa"/>` +
    `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="E0E8F5"/><w:bottom w:val="single" w:sz="4" w:color="E0E8F5"/>` +
    `<w:insideH w:val="single" w:sz="4" w:color="E0E8F5"/></w:tblBorders></w:tblPr>${rows}</w:tbl>` +
    (plan.key.length
      ? docxParagraph("Colour key", { size: 26, bold: true }) +
        plan.key
          .map((row) => docxParagraph(`■ ${row.label}`, { size: 20, colour: row.hex }))
          .join("")
      : "") +
    docxParagraph(
      "Room names and the key are editable Word text. The plan drawing is a picture — use the Illustrator file to change the drawing itself.",
      { size: 16, colour: "666666" },
    ) +
    `<w:sectPr><w:pgSz w:w="${Math.round(pageWmm * TWIPS_PER_MM)}" w:h="${Math.round(pageHmm * TWIPS_PER_MM)}" w:orient="landscape"/>` +
    `<w:pgMar w:top="${Math.round(marginMm * TWIPS_PER_MM)}" w:right="${Math.round(marginMm * TWIPS_PER_MM)}" ` +
    `w:bottom="${Math.round(marginMm * TWIPS_PER_MM)}" w:left="${Math.round(marginMm * TWIPS_PER_MM)}"/></w:sectPr>` +
    `</w:body></w:document>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/plan.png"/>` +
      `</Relationships>`,
  );
  zip.file("word/document.xml", document);
  zip.file("word/media/plan.png", bytes);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return {
    blob,
    filename: `TP-NEXT-2026-London-QEII-${slug(floor)}-map.docx`,
    notes: [
      ...plan.notes,
      "The room list and key are live Word text; the plan drawing is a picture.",
    ],
  };
}
