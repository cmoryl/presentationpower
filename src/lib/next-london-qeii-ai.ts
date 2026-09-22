// -----------------------------------------------------------------------------
// QEII Centre floor plan — Illustrator (.ai) export.
//
// The all-floor PDF is a rasterised proof: a picture of the plan. This writes the
// same plan as live vector art instead. Every wall, room fill and venue symbol is
// a real PDF path object taken from the issued geometry, and every room name, use
// line and colour-key row is live text, so the file opens in Illustrator as
// editable artwork rather than a placed image.
//
// Honest limits, reported by the caller rather than hidden:
// - Type is written with the PDF base face (Helvetica). Illustrator will ask for
//   Geist on open; the copy itself stays editable. This is a working map file, not
//   a press master — press masters carry outlined Geist paths.
// - Division lockups are embedded from the approved lockup files as live vector
//   outlines on their own layer. A lockup file that cannot be read as outlines is
//   named and left off rather than approximated.
// -----------------------------------------------------------------------------

import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import {
  qeiiColourKey,
  qeiiCellsByShape,
  qeiiColourPaint,
  qeiiRoomTextInk,
} from "@/lib/next-london-qeii-rooms";
import { qeiiRepeatedSymbolShapes, qeiiWallWidth } from "@/lib/next-london-qeii-symbols";
import {
  QEII_PLAN_TOKENS,
  qeiiLabelInk,
  qeiiPlanInk,
  type QeiiPlanOptions,
} from "@/lib/next-london-qeii-plan";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiMarkVectors } from "@/lib/next-london-qeii-mark-art";
import { svgPathToPdfOps } from "@/lib/vector-path-pdf";

/** Longest edge of the Illustrator artboard, in points — A3. */
const LONG_EDGE_PT = 1190.55;

const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();

function rgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const v = (hex ?? "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(v)) return fallback;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function fillOp(hex: string | undefined, fallback: [number, number, number]): string {
  const [r, g, b] = rgb(hex, fallback);
  return `${f3(r)} ${f3(g)} ${f3(b)} rg`;
}

function strokeOp(hex: string | undefined, fallback: [number, number, number]): string {
  const [r, g, b] = rgb(hex, fallback);
  return `${f3(r)} ${f3(g)} ${f3(b)} RG`;
}

/**
 * Curly quotes, dashes and bullets the venue's wording actually uses, mapped to
 * the WinAnsi codes the PDF face reads. Without this the byte writer truncates
 * them to control characters and a name like STOREY’S GATE loses its apostrophe.
 */
const WIN_ANSI: Record<string, string> = {
  "\u2018": "\u0091",
  "\u2019": "\u0092",
  "\u201A": "\u0082",
  "\u201C": "\u0093",
  "\u201D": "\u0094",
  "\u201E": "\u0084",
  "\u2020": "\u0086",
  "\u2021": "\u0087",
  "\u2022": "\u0095",
  "\u2026": "\u0085",
  "\u2013": "\u0096",
  "\u2014": "\u0097",
  "\u2030": "\u0089",
  "\u2039": "\u008B",
  "\u203A": "\u009B",
  "\u20AC": "\u0080",
  "\u2122": "\u0099",
  "\u0152": "\u008C",
  "\u0153": "\u009C",
  "\u0160": "\u008A",
  "\u0161": "\u009A",
  "\u0178": "\u009F",
  "\u017D": "\u008E",
  "\u017E": "\u009E",
  "\u0192": "\u0083",
  "\u02C6": "\u0088",
  "\u02DC": "\u0098",
};

/** Fold one character into a byte the PDF face can print, honestly or not at all. */
function winAnsiChar(ch: string): string {
  const mapped = WIN_ANSI[ch];
  if (mapped) return mapped;
  if (ch.charCodeAt(0) <= 0xff) return ch;
  // Anything outside the face is normalised to its closest plain letter rather
  // than written as a broken byte.
  const plain = ch.normalize("NFKD").replace(/[^\x20-\xff]/g, "");
  return plain;
}

/** Text as a WinAnsi-safe PDF string literal. */
export function qeiiPdfCopy(value: string): string {
  return [...value]
    .map(winAnsiChar)
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfText(value: string): string {
  return qeiiPdfCopy(value);
}


/** Rough advance width of Helvetica text, used to centre a line. */
function textWidth(text: string, size: number): number {
  return text.length * size * 0.52;
}

export type QeiiAiResult = {
  bytes: Uint8Array;
  filename: string;
  /** Plain-language notes the page shows — never silent. */
  notes: string[];
};

export function qeiiPlanAiFilename(floor: QeiiFloorVector, face: string): string {
  return `TP-NEXT-2026-London-QEII-${floor.title.replace(/\s+/g, "-")}-${face}.ai`;
}

/**
 * Build the Illustrator-openable floor plan.
 *
 * The plan is drawn in its own units and scaled to an A3 artboard. Three named
 * layers arrive in Illustrator: the plan artwork, the room names, and the key.
 */
export async function buildQeiiPlanAi(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<QeiiAiResult> {
  const face = options.face ?? "issued";
  const notes: string[] = [];
  const roomColours = options.roomColours ?? {};
  const paint = qeiiColourPaint(floor, roomColours);
  const cellsByShape = qeiiCellsByShape(paint);
  const layout = qeiiPlanLayout(floor, {
    labelScale: options.labelScale ?? 1,
    showUse: options.showUse,
    showMarks: options.showMarks,
    markScale: options.markScale,
    edits: options.edits,
  });
  const keyRows =
    options.showKey === false ? [] : qeiiColourKey(floor, roomColours, options.keyLabels ?? {});
  const keyStep = floor.w * 0.038;
  const keyH = keyRows.length ? keyStep * (keyRows.length + 1.2) : 0;
  const artH = floor.h + keyH;
  const k = LONG_EDGE_PT / Math.max(floor.w, artH);
  const pageW = floor.w * k;
  const pageH = artH * k;

  /** Plan point → PDF page point (PDF counts up from the bottom). */
  const px = (x: number) => x * k;
  const py = (y: number) => (artH - y) * k;

  // ── layer 1: the plan itself, path for path as the venue drew it ───────────
  const hidden = options.showAllSymbols ? new Set<number>() : qeiiRepeatedSymbolShapes(floor);
  const planOps = floor.shapes
    .map((shape, i) => {
      if (hidden.has(i)) return "";
      const ops = svgPathToPdfOps(shape.d, { scale: k, x: 0, y: 0, artHeight: artH });
      if (!ops) return "";
      const fill = paint.fills.get(i) ?? qeiiPlanInk(shape.fill, face);
      const stroke = qeiiPlanInk(shape.stroke, face);
      const bits: string[] = ["q"];
      if (fill) bits.push(fillOp(fill, [0.01, 0, 0.17]));
      if (stroke) {
        bits.push(strokeOp(stroke, [1, 1, 1]));
        bits.push(`${f3(Math.max(0.05, qeiiWallWidth(shape, options.wallWeight) * k))} w`);
      }
      bits.push(ops, fill && stroke ? "B" : stroke ? "S" : "f", "Q");
      // Rooms the artwork draws inside this block, cut out along the issued wall
      // runs: each is its own editable path at the exact angles drawn.
      const cut = (cellsByShape.get(i) ?? [])
        .map((c) => {
          const cellOps = svgPathToPdfOps(c.d, { scale: k, x: 0, y: 0, artHeight: artH });
          if (!cellOps) return "";
          const cellFill = c.hex ?? fill;
          if (!cellFill) return "";
          return `q ${fillOp(cellFill, [0.01, 0, 0.17])} ${cellOps} f Q\n`;
        })
        .join("");
      return `${bits.join(" ")}\n${cut}`;
    })
    .join("");

  // ── layer 2: room names, use lines and colour tags as live text ────────────
  let textOps = "";
  if (options.showLabels ?? true) {
    for (const block of layout.blocks) {
      const tag = paint.tags.get(block.room);
      const ink = tag
        ? qeiiRoomTextInk(tag)
        : roomColours[block.room]
          ? qeiiRoomTextInk(roomColours[block.room])
          : qeiiLabelInk();
      const turned = Math.abs(block.angle) >= 0.5;
      const open = turned
        ? (() => {
            const rad = (block.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const cx = px(block.x);
            const cy = py(block.y);
            // A turned name spins about its own centre, matching the plan.
            const e = cx - (cos * cx - sin * cy);
            const fy = cy - (sin * cx + cos * cy);
            return `q ${f3(cos)} ${f3(-sin)} ${f3(sin)} ${f3(cos)} ${f3(e)} ${f3(fy)} cm\n`;
          })()
        : "q\n";
      const close = "Q\n";
      const pad = block.size * 0.32;
      const tagOps = tag
        ? `${fillOp(tag, [0, 0.25, 0.78])} ${f3(px(block.box.x0 - pad))} ${f3(
            py(block.box.y1 + pad * 0.6),
          )} ${f3((block.box.x1 - block.box.x0 + pad * 2) * k)} ${f3(
            (block.box.y1 - block.box.y0 + pad * 1.2) * k,
          )} re f\n`
        : "";
      const nameTop = block.y - ((block.lines.length - 1) * block.size * 1.05) / 2;
      const lastLine = nameTop + (block.lines.length - 1) * block.size * 1.05;
      const lines: { text: string; y: number; size: number }[] = block.lines.map((line, li) => ({
        text: line,
        y: nameTop + li * block.size * 1.05,
        size: block.size,
      }));
      if (block.use) {
        lines.push({
          text: block.use,
          y: lastLine + block.size * 0.62 + block.useSize * 0.6,
          size: block.useSize,
        });
      }
      const runs = lines
        .map((line) => {
          const size = line.size * k;
          const x = px(block.x) - textWidth(line.text, size) / 2;
          // The baseline sits below the centre the plan sets the line on.
          const y = py(line.y) - size * 0.36;
          return `BT /F1 ${f3(size)} Tf ${fillOp(ink, [1, 1, 1])} ${f3(x)} ${f3(y)} Td (${pdfText(
            line.text,
          )}) Tj ET\n`;
        })
        .join("");
      textOps += open + tagOps + runs + close;
    }
  }

  // ── layer 3: the colour key ───────────────────────────────────────────────
  const keyOps = keyRows
    .map((row, i) => {
      const y = floor.h + keyStep * (0.9 + i);
      const swatch = keyStep * 0.72;
      const size = keyStep * 0.52 * k;
      return (
        `q ${fillOp(row.hex, [0, 0.25, 0.78])} ${f3(px(floor.w * 0.02))} ${f3(
          py(y + keyStep * 0.38),
        )} ${f3(swatch * k)} ${f3(swatch * k)} re f Q\n` +
        `BT /F1 ${f3(size)} Tf ${fillOp(QEII_PLAN_TOKENS.ink, [0.01, 0, 0.17])} ${f3(
          px(floor.w * 0.02 + keyStep),
        )} ${f3(py(y) - size * 0.36)} Td (${pdfText(row.label)}) Tj ET\n`
      );
    })
    .join("");

  // ── layer 4: division lockups, as the approved outlines ───────────────────
  // Each lockup is written as its own form, which Illustrator opens as a single
  // group — one click picks up the whole logo instead of every outline in it.
  let markOps = "";
  const markForms: { name: string; ops: string; w: number; h: number }[] = [];
  if (options.showMarks ?? true) {
    const { placements, dropped } = await qeiiMarkVectors(floor, options);
    for (const mark of placements) {
      const art = mark.art;
      // Fitted centred inside its box at the artwork's own aspect, exactly as the
      // plan places it on screen.
      const fit = Math.min(mark.w / art.w, mark.h / art.h) * k;
      const rad = (-mark.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const head =
        `q 1 0 0 1 ${f3(px(mark.cx))} ${f3(py(mark.cy))} cm ` +
        `${f3(cos)} ${f3(sin)} ${f3(-sin)} ${f3(cos)} 0 0 cm ` +
        `${f3(fit)} 0 0 ${f3(fit)} 0 0 cm ` +
        `1 0 0 1 ${f3(-art.w / 2)} ${f3(-art.h / 2)} cm\n`;
      const body = art.paths
        .map((path) => {
          const ops = svgPathToPdfOps(path.d, { scale: 1, x: 0, y: 0, artHeight: art.h });
          if (!ops) return "";
          const m = path.m;
          // F·M·F⁻¹ for the y-flip of the artwork's own height.
          const n = [
            m[0],
            -m[1],
            -m[2],
            m[3],
            m[2] * art.h + m[4],
            art.h - m[3] * art.h - m[5],
          ];
          const cm = `${n.map((v) => f3(v)).join(" ")} cm `;
          return `q ${cm}${fillOp(path.fill, [0, 0.25, 0.78])} ${ops} ${
            path.fillRule === "evenodd" ? "f*" : "f"
          } Q\n`;
        })
        .join("");
      if (body) {
        const form = `Xm${markForms.length + 1}`;
        markForms.push({ name: form, ops: body, w: art.w, h: art.h });
        markOps += `${head}/${form} Do\nQ\n`;
      }
    }
    if (placements.length) {
      notes.push(
        `${placements.length} division lockup${placements.length === 1 ? " is" : "s are"} embedded as live vector outlines from the approved artwork, on their own "Division lockups" layer.`,
      );
    }
    if (markForms.length) {
      notes.push(
        `Each lockup is one group in Illustrator (${markForms.length} in all), so a single click picks up the whole logo to move or resize.`,
      );
    }
    if (dropped.length) {
      notes.push(
        `${dropped.join(", ")} could not be read as outlines, so ${dropped.length === 1 ? "it is" : "they are"} not in this file — place ${dropped.length === 1 ? "it" : "them"} from the approved lockup files.`,
      );
    }
  }

  notes.push(
    "Room names and the key are live, editable text set in the standard PDF face; apply Geist in Illustrator. This is a working map file, not a press master.",
  );

  const content =
    `q\n/OC /oc1 BDC\n${fillOp(QEII_PLAN_TOKENS.surface, [0.93, 0.95, 0.97])} 0 0 ${f3(pageW)} ${f3(
      pageH,
    )} re f\n${planOps}EMC\nQ\n` +
    `q\n/OC /oc2 BDC\n${textOps}EMC\nQ\n` +
    `q\n/OC /oc3 BDC\n${keyOps}EMC\nQ\n` +
    (markOps ? `q\n/OC /oc4 BDC\n${markOps}EMC\nQ\n` : "");

  // Lockup forms live after the nine fixed objects, so /Xm1 is object 10.
  const formStart = 10;
  const formRes = markForms
    .map((form, i) => `/${form.name} ${formStart + i} 0 R`)
    .join(" ");

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [6 0 R 7 0 R 8 0 R 9 0 R] /D << /Order [6 0 R 7 0 R 8 0 R 9 0 R] /ON [6 0 R 7 0 R 8 0 R 9 0 R] >> >> >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f3(pageW)} ${f3(pageH)}] ` +
      `/TrimBox [0 0 ${f3(pageW)} ${f3(pageH)}] ` +
      `/TPVenue (Queen Elizabeth II Centre) /TPFloor (${pdfText(floor.title)}) ` +
      `/TPFace (${pdfText(face)}) /TPColorSpace (DeviceRGB) ` +
      `/Resources << /Font << /F1 5 0 R >> ` +
      (formRes ? `/XObject << ${formRes} >> ` : "") +
      `/Properties << /oc1 6 0 R /oc2 7 0 R /oc3 8 0 R /oc4 9 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    `<< /Type /OCG /Name (Plan artwork) >>`,
    `<< /Type /OCG /Name (Room names) >>`,
    `<< /Type /OCG /Name (Colour key) >>`,
    `<< /Type /OCG /Name (Division lockups) >>`,
    ...markForms.map(
      (form) =>
        `<< /Type /XObject /Subtype /Form /FormType 1 /Name (${pdfText(form.name)}) ` +
        `/BBox [0 0 ${f3(form.w)} ${f3(form.h)}] /Resources << >> /Length ${form.ops.length} >>\n` +
        `stream\n${form.ops}endstream`,
    ),
    `<< /Title (Queen Elizabeth II Centre — ${pdfText(floor.title)}) /Creator (TransPerfect Element) ` +
      `/Subject (NEXT 2026 London venue map · live vector artwork) >>`,
  ];


  let pdf = "%PDF-1.5\n%\u00e2\u00e3\u00cf\u00d3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return { bytes, filename: qeiiPlanAiFilename(floor, face), notes };
}
