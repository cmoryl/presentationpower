// -----------------------------------------------------------------------------
// QEII Centre floor plan — editable PowerPoint and Word exports.
//
// The plan is rebuilt as real shapes in both files: every wall line, room fill
// and venue symbol arrives as its own editable PowerPoint / Word shape taken
// straight from the issued geometry, and every room name, use line and colour-key
// row is live text over it. Nothing is a flattened picture, so the crew can
// recolour a room or move a wall in Office without redrawing anything.
//
// A floor the issued design only places as a picture cannot be rebuilt; that one
// falls back to print-resolution artwork with the wording still editable on top,
// and says so in the file.
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { qeiiDrawShapes, qeiiSegsBox, type QeiiDrawShape } from "@/lib/next-london-qeii-draw";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { QEII_PLAN_TOKENS, qeiiPlanSvg, type QeiiPlanOptions } from "@/lib/next-london-qeii-plan";
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

/** A floor the issued design draws, rather than places as a picture. */
function isRebuilt(floor: QeiiFloorVector): boolean {
  return floor.kind === "vector" && floor.shapes.length >= 20;
}

/** The plan, its wording, and where both belong — all in plan units. */
type PlanPieces = {
  /** Live plan shapes, or null when this floor can only be a picture. */
  shapes: QeiiDrawShape[] | null;
  /** Fallback artwork, only built when the plan cannot be rebuilt. */
  art?: { dataUrl: string; w: number; h: number };
  /** Plan-unit geometry of the drawing, including the key strip. */
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
  /** Division lockups as embedded PNG artwork, placed in plan units. */
  marks: {
    name: string;
    dataUrl: string;
    /** Centre of the lockup, in plan units. */
    cx: number;
    cy: number;
    w: number;
    h: number;
    angle: number;
  }[];
  notes: string[];
};

async function planPieces(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions,
): Promise<PlanPieces> {
  const notes: string[] = [];
  const rebuilt = isRebuilt(floor);
  let art: PlanPieces["art"];
  let shapes: QeiiDrawShape[] | null = null;
  if (rebuilt) {
    shapes = qeiiDrawShapes(floor, options);
  } else {
    const svg = qeiiPlanSvg(floor, { ...options, showText: false });
    const inlined = await inlineSvgImages(svg, new Map());
    if (inlined.dropped.length) {
      notes.push(
        `${inlined.dropped.length} division lockup${inlined.dropped.length === 1 ? "" : "s"} could not be read, so ${inlined.dropped.length === 1 ? "it is" : "they are"} not on this map.`,
      );
    }
    art = await qeiiRasteriseSvg(inlined.svg);
    notes.push(
      "The issued design places this floor as a picture rather than drawn shapes, so the drawing here is artwork, not editable shapes.",
    );
  }
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
  return { shapes, art, units: { w: floor.w, h: floor.h + keyH }, blocks, key, notes };
}

// ── PowerPoint ───────────────────────────────────────────────────────────────

type PptxPoint =
  | { x: number; y: number; moveTo?: boolean }
  | { x: number; y: number; curve: { type: "cubic"; x1: number; y1: number; x2: number; y2: number } }
  | { close: true };

/**
 * One 16:9 slide per floor: the plan rebuilt as editable PowerPoint shapes with
 * every room name as its own text box on top.
 */
export async function buildQeiiPlanPptx(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<QeiiOfficeResult> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const plan = await planPieces(floor, options);
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

  // The ground the plan sits on — a brand token, as on screen.
  slide.addShape("rect", {
    x: ox,
    y: oy,
    w: artW,
    h: artH,
    fill: { color: hex(QEII_PLAN_TOKENS.surface, "EEF1F7") },
    line: { type: "none" },
  });

  if (plan.shapes) {
    for (const shape of plan.shapes) {
      const b = qeiiSegsBox(shape.segs);
      const pad = shape.strokeW / 2;
      const x0 = b.x0 - pad;
      const y0 = b.y0 - pad;
      const w = Math.max((b.x1 - b.x0 + pad * 2) * k, 0.004);
      const h = Math.max((b.y1 - b.y0 + pad * 2) * k, 0.004);
      const px = (v: number) => (v - x0) * k;
      const py = (v: number) => (v - y0) * k;
      const points: PptxPoint[] = [];
      for (const seg of shape.segs) {
        if (seg.k === "Z") points.push({ close: true });
        else if (seg.k === "M") points.push({ x: px(seg.x), y: py(seg.y), moveTo: true });
        else if (seg.k === "L") points.push({ x: px(seg.x), y: py(seg.y) });
        else
          points.push({
            x: px(seg.x),
            y: py(seg.y),
            curve: {
              type: "cubic",
              x1: px(seg.x1),
              y1: py(seg.y1),
              x2: px(seg.x2),
              y2: py(seg.y2),
            },
          });
      }
      slide.addShape("custGeom" as never, {
        x: ox + x0 * k,
        y: oy + y0 * k,
        w,
        h,
        points: points as never,
        fill: shape.fill ? { color: hex(shape.fill, "03002C") } : { type: "none" },
        line: shape.stroke
          ? { color: hex(shape.stroke, "FFFFFF"), width: Math.max(0.25, shape.strokeW * k * 72) }
          : { type: "none" },
      });
    }
  } else if (plan.art) {
    slide.addImage({ data: plan.art.dataUrl, x: ox, y: oy, w: artW, h: artH });
  }

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
    plan.shapes
      ? "The plan, the room names and the key are all editable PowerPoint shapes and text — nothing here is a flattened picture."
      : "Room names and the key are editable text. This floor's drawing is a picture — use the Illustrator file to change the drawing itself.",
    { x: 0.5, y: slideH - 0.48, w: slideW - 1, h: 0.3, fontFace: FONT, fontSize: 8.5, color: "666666" },
  );

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return {
    blob,
    filename: `TP-NEXT-2026-London-QEII-${slug(floor)}-map.pptx`,
    notes: [
      ...plan.notes,
      plan.shapes
        ? "The plan drawing is live PowerPoint shapes; room names, use lines and the key are live PowerPoint text."
        : "Room names, use lines and the key are live PowerPoint text; this floor's drawing is a picture.",
    ],
  };
}

// ── Word ─────────────────────────────────────────────────────────────────────

const TWIPS_PER_MM = 1440 / 25.4;
const EMU_PER_MM = 36000;
const EMU_PER_PT = 12700;

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

/** One Word shape inside the plan group. */
function wpsShape(
  id: number,
  name: string,
  frame: { x: number; y: number; w: number; h: number },
  geom: string,
  paint: string,
  body = `<wps:bodyPr/>`,
): string {
  return (
    `<wps:wsp><wps:cNvPr id="${id}" name="${esc(name)}"/><wps:cNvSpPr/>` +
    `<wps:spPr><a:xfrm><a:off x="${Math.round(frame.x)}" y="${Math.round(frame.y)}"/>` +
    `<a:ext cx="${Math.max(1, Math.round(frame.w))}" cy="${Math.max(1, Math.round(frame.h))}"/></a:xfrm>` +
    geom +
    paint +
    `</wps:spPr>${body}</wps:wsp>`
  );
}

/**
 * An A3 landscape Word page: the plan rebuilt as an editable group of Word
 * shapes with the room names as live text over it, then the room list and key as
 * Word text the crew can retype.
 */
export async function buildQeiiPlanDocx(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<QeiiOfficeResult> {
  const plan = await planPieces(floor, options);
  const pageWmm = 420;
  const pageHmm = 297;
  const marginMm = 15;
  const contentMm = pageWmm - marginMm * 2;
  // The drawing has to fit the printable area on the page, or Word and every
  // other reader drops it: title block + margins take roughly 40 mm of height.
  const availHmm = pageHmm - marginMm * 2 - 40;
  const ratio = plan.units.h / plan.units.w;
  const artWmm = Math.min(contentMm, availHmm / ratio);
  const artHmm = artWmm * ratio;
  const artWemu = Math.round(artWmm * EMU_PER_MM);
  const artHemu = Math.round(artHmm * EMU_PER_MM);
  /** Plan units → EMU. */
  const k = artWemu / plan.units.w;

  let drawing = "";
  let picBytes: ArrayBuffer | undefined;

  if (plan.shapes) {
    let id = 2;
    const children: string[] = [
      wpsShape(
        id++,
        "Plan ground",
        { x: 0, y: 0, w: artWemu, h: artHemu },
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
        `<a:solidFill><a:srgbClr val="${hex(QEII_PLAN_TOKENS.surface, "EEF1F7")}"/></a:solidFill><a:ln><a:noFill/></a:ln>`,
      ),
    ];
    for (const shape of plan.shapes) {
      const b = qeiiSegsBox(shape.segs);
      const pad = shape.strokeW / 2;
      const x0 = b.x0 - pad;
      const y0 = b.y0 - pad;
      const w = Math.max(Math.round((b.x1 - b.x0 + pad * 2) * k), 1);
      const h = Math.max(Math.round((b.y1 - b.y0 + pad * 2) * k), 1);
      const px = (v: number) => Math.round((v - x0) * k);
      const py = (v: number) => Math.round((v - y0) * k);
      const ops = shape.segs
        .map((seg) => {
          if (seg.k === "Z") return `<a:close/>`;
          if (seg.k === "M") return `<a:moveTo><a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:moveTo>`;
          if (seg.k === "L") return `<a:lnTo><a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:lnTo>`;
          return (
            `<a:cubicBezTo><a:pt x="${px(seg.x1)}" y="${py(seg.y1)}"/>` +
            `<a:pt x="${px(seg.x2)}" y="${py(seg.y2)}"/>` +
            `<a:pt x="${px(seg.x)}" y="${py(seg.y)}"/></a:cubicBezTo>`
          );
        })
        .join("");
      const geom =
        `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>` +
        `<a:rect l="0" t="0" r="${w}" b="${h}"/>` +
        `<a:pathLst><a:path w="${w}" h="${h}">${ops}</a:path></a:pathLst></a:custGeom>`;
      const paint =
        (shape.fill
          ? `<a:solidFill><a:srgbClr val="${hex(shape.fill, "03002C")}"/></a:solidFill>`
          : `<a:noFill/>`) +
        (shape.stroke
          ? `<a:ln w="${Math.max(635, Math.round(shape.strokeW * k * 0.75))}" cap="rnd"><a:solidFill><a:srgbClr val="${hex(shape.stroke, "FFFFFF")}"/></a:solidFill></a:ln>`
          : `<a:ln><a:noFill/></a:ln>`);
      children.push(
        wpsShape(id++, `Plan shape ${id}`, { x: Math.round(x0 * k), y: Math.round(y0 * k), w, h }, geom, paint),
      );
    }

    // Room names, use lines and the key as live Word text over the drawing.
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
        const ptSize = Math.max(3, (line.size * k) / EMU_PER_PT);
        const boxH = Math.round(ptSize * 1.6 * EMU_PER_PT);
        const boxW = Math.round(Math.max(line.text.length * ptSize * 0.62, 12) * EMU_PER_PT);
        const rot = Math.abs(block.angle) < 0.5 ? "" : ` rot="${Math.round(block.angle * 60000)}"`;
        const txBody =
          `<wps:txbx><w:txbxContent><w:p><w:pPr><w:jc w:val="center"/>` +
          `<w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr>` +
          `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:b/>` +
          `<w:sz w:val="${Math.max(2, Math.round(ptSize * 2))}"/>` +
          `<w:color w:val="${hex(block.ink, "FFFFFF")}"/></w:rPr>` +
          `<w:t xml:space="preserve">${esc(line.text)}</w:t></w:r></w:p></w:txbxContent></wps:txbx>` +
          `<wps:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></wps:bodyPr>`;
        children.push(
          `<wps:wsp><wps:cNvPr id="${id++}" name="${esc(line.text)}"/><wps:cNvSpPr txBox="1"/>` +
            `<wps:spPr><a:xfrm${rot}><a:off x="${Math.round(block.x * k - boxW / 2)}" y="${Math.round(line.y * k - boxH / 2)}"/>` +
            `<a:ext cx="${boxW}" cy="${boxH}"/></a:xfrm>` +
            `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>` +
            `</wps:spPr>${txBody}</wps:wsp>`,
        );
      }
    }

    for (const row of plan.key) {
      const sw = Math.round(row.size * 1.1 * k);
      children.push(
        wpsShape(
          id++,
          `Key swatch ${row.label}`,
          { x: Math.round((row.x - row.size * 1.5) * k), y: Math.round(row.y * k - sw / 2), w: sw, h: sw },
          `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`,
          `<a:solidFill><a:srgbClr val="${hex(row.hex, "003FC7")}"/></a:solidFill><a:ln><a:noFill/></a:ln>`,
        ),
      );
      const ptSize = Math.max(3, (row.size * k) / EMU_PER_PT);
      const boxH = Math.round(ptSize * 1.6 * EMU_PER_PT);
      children.push(
        `<wps:wsp><wps:cNvPr id="${id++}" name="${esc(`Key ${row.label}`)}"/><wps:cNvSpPr txBox="1"/>` +
          `<wps:spPr><a:xfrm><a:off x="${Math.round(row.x * k)}" y="${Math.round(row.y * k - boxH / 2)}"/>` +
          `<a:ext cx="${Math.round(Math.max(row.label.length * ptSize * 0.62, 24) * EMU_PER_PT)}" cy="${boxH}"/></a:xfrm>` +
          `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>` +
          `<wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>` +
          `<w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/><w:b/>` +
          `<w:sz w:val="${Math.max(2, Math.round(ptSize * 2))}"/><w:color w:val="03002C"/></w:rPr>` +
          `<w:t xml:space="preserve">${esc(row.label)}</w:t></w:r></w:p></w:txbxContent></wps:txbx>` +
          `<wps:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></wps:bodyPr></wps:wsp>`,
      );
    }

    drawing =
      `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${artWemu}" cy="${artHemu}"/><wp:docPr id="1" name="Floor plan"/>` +
      `<wp:cNvGraphicFramePr/>` +
      `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">` +
      `<wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/>` +
      `<a:ext cx="${artWemu}" cy="${artHemu}"/><a:chOff x="0" y="0"/>` +
      `<a:chExt cx="${artWemu}" cy="${artHemu}"/></a:xfrm></wpg:grpSpPr>` +
      children.join("") +
      `</wpg:wgp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  } else if (plan.art) {
    picBytes = await (await fetch(plan.art.dataUrl)).arrayBuffer();
    drawing =
      `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${artWemu}" cy="${artHemu}"/>` +
      `<wp:docPr id="1" name="Floor plan"/><a:graphic><a:graphicData ` +
      `uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
      `<pic:nvPicPr><pic:cNvPr id="1" name="plan.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${artWemu}" cy="${artHemu}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>` +
      `</wp:inline></w:drawing></w:r></w:p>`;
  }

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
    `xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ` +
    `xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>` +
    docxParagraph(`Queen Elizabeth II Centre — ${floor.title}`, { size: 36, bold: true }) +
    docxParagraph("NEXT 2026 London · 24–25 September 2026", { size: 18, colour: "666666" }) +
    drawing +
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
      plan.shapes
        ? "The plan is a group of editable Word shapes — click into the group to recolour a room or move a wall. Room names and the key are live Word text."
        : "Room names and the key are editable Word text. This floor's drawing is a picture — use the Illustrator file to change the drawing itself.",
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
      (picBytes
        ? `<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/plan.png"/>`
        : "") +
      `</Relationships>`,
  );
  zip.file("word/document.xml", document);
  if (picBytes) zip.file("word/media/plan.png", picBytes);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return {
    blob,
    filename: `TP-NEXT-2026-London-QEII-${slug(floor)}-map.docx`,
    notes: [
      ...plan.notes,
      plan.shapes
        ? "The plan drawing is an editable group of Word shapes; room names, the room list and the key are live Word text."
        : "The room list and key are live Word text; this floor's drawing is a picture.",
    ],
  };
}
