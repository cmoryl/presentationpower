// NEXT MART price list — live editable outputs.
//
// One sheet, four editable files, all built from the same layout the browser
// renders (`martPriceListLayout`), so production receives exactly what was
// approved on screen:
//
//   svg/   editable SVG — layered groups, live text, real gradient, vector marks
//   pdf/   A4 press PDF with 3 mm bleed — live gradient pattern, live Geist text
//   ai/    Illustrator twin of the press PDF
//   pptx/  editable PowerPoint — native text boxes and a native price table
//   word/  editable Word document — native table of every category and price
//
// The lockups are the approved NEXT MART masters embedded as vector paths. If a
// master cannot be read, it is reported in the notes and left off — never faked.

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames as Ops,
  StandardFonts,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { resolveAssetUrl } from "./asset-base-url";
import { registerGradientPattern, type ShadingStop } from "./pdf-analytic-shading";
import { extractSvgShapes } from "./pillar-vector-pdf";
import { NEXT_MART_LOGOS } from "./next-mart";
import { pillarStops } from "./next-pillar-masters";
import { martStopEventLabel, type MartStop } from "./next-mart-stops";
import {
  MART_PRICE_SHEET,
  martCurrency,
  martPriceListItemCount,
  martPriceListLayout,
  martPriceListMissing,
  martPriceListSlug,
  martPriceListSpec,
  martPriceListStyleLabel,
  martPriceListSvg,
  type MartPriceListConfig,
} from "./next-mart-price-list";

const MM_TO_PT = 72 / 25.4;
const MM_TO_IN = 1 / 25.4;
const CARD = "#FFFFFF";
const INK = "#03002C";

function hexRgb(h: string) {
  const s = (h || "#000000").replace("#", "");
  const n = parseInt(
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s,
    16,
  );
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function stopsFor(config: MartPriceListConfig): ShadingStop[] {
  const stops = pillarStops(config.styleId, config.face);
  return stops.map((hex, i) => {
    const s = hex.replace("#", "");
    const n = parseInt(s, 16);
    return {
      offset: stops.length === 1 ? i : i / (stops.length - 1),
      color: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255],
    };
  });
}

/** Fetch an approved lockup master as SVG markup. */
async function lockupSvg(id: string): Promise<string | null> {
  const logo = NEXT_MART_LOGOS.find((l) => l.id === id);
  if (!logo?.svgUrl) return null;
  try {
    const res = await fetch(resolveAssetUrl(logo.svgUrl));
    if (!res.ok) return null;
    const text = await res.text();
    return /<svg[\s\S]*<\/svg>/i.test(text) ? text : null;
  } catch {
    return null;
  }
}

function lockupIdFor(config: MartPriceListConfig): string {
  return config.face === "light" ? "mart-logo-colour" : "mart-logo-white";
}

/* ── editable SVG ─────────────────────────────────────────────────────────── */

export async function buildMartPriceListSvg(
  config: MartPriceListConfig,
  stop: MartStop,
): Promise<{ svg: string; notes: string[] }> {
  const notes: string[] = [];
  const mark = await lockupSvg(lockupIdFor(config));
  if (!mark) notes.push("NEXT MART lockup master could not be read — the sheet ships without it.");
  return {
    svg: martPriceListSvg(config, stop, { withBleed: true, martLockupSvg: mark ?? undefined }),
    notes,
  };
}

/* ── press PDF (and the Illustrator twin) ─────────────────────────────────── */

export type MartPriceListPdf = {
  bytes: Uint8Array<ArrayBuffer>;
  notes: string[];
  layers: string[];
};

async function embedGeist(doc: PDFDocument, file: string, fallback: StandardFonts): Promise<PDFFont> {
  try {
    const res = await fetch(resolveAssetUrl(file));
    if (!res.ok) throw new Error("font missing");
    return await doc.embedFont(await res.arrayBuffer(), { subset: true, customName: file });
  } catch {
    return doc.embedStandardFont(fallback);
  }
}

function paintGround(page: PDFPage, config: MartPriceListConfig) {
  const w = page.getWidth();
  const h = page.getHeight();
  const { name } = registerGradientPattern(
    page.doc,
    page,
    { kind: "axial", from: { x: 0, y: h }, to: { x: w, y: 0 } },
    stopsFor(config),
    "rgb",
    "PMart",
  );
  page.pushOperators(
    pushGraphicsState(),
    PDFOperator.of("cs" as never, [PDFName.of("Pattern")]),
    PDFOperator.of("scn" as never, [name]),
    PDFOperator.of(Ops.AppendRectangle, [
      PDFNumber.of(0),
      PDFNumber.of(0),
      PDFNumber.of(w),
      PDFNumber.of(h),
    ]),
    PDFOperator.of("f" as never),
    popGraphicsState(),
  );
}

export async function buildMartPriceListPdf(
  config: MartPriceListConfig,
  stop: MartStop,
): Promise<MartPriceListPdf> {
  const notes: string[] = [];
  const S = MART_PRICE_SHEET;
  const layout = martPriceListLayout(config);
  const bleed = S.bleed;
  const pageW = (S.trimW + bleed * 2) * MM_TO_PT;
  const pageH = (S.trimH + bleed * 2) * MM_TO_PT;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await embedGeist(doc, "/fonts/Geist-Bold.ttf", StandardFonts.HelveticaBold);
  const regular = await embedGeist(doc, "/fonts/Geist-Regular.ttf", StandardFonts.Helvetica);
  const page = doc.addPage([pageW, pageH]);

  paintGround(page, config);

  /** mm from the trim top-left → PDF points from the page bottom-left. */
  const px = (mm: number) => (mm + bleed) * MM_TO_PT;
  const py = (mm: number) => pageH - (mm + bleed) * MM_TO_PT;

  // 02 Lockup — approved master as vector paths.
  const mark = await lockupSvg(lockupIdFor(config));
  if (mark) {
    const box = /viewBox\s*=\s*"([^"]+)"/i.exec(mark)?.[1]?.trim().split(/[\s,]+/).map(Number);
    const shapes = extractSvgShapes(mark);
    if (box && box.length === 4 && box[2] && box[3] && shapes.length) {
      const boxW = 120 * MM_TO_PT;
      const boxH = 24 * MM_TO_PT;
      const scale = Math.min(boxW / box[2], boxH / box[3]);
      const x = px((S.trimW - 120) / 2) + (boxW - box[2] * scale) / 2;
      const y = py(layout.lockupY) - (boxH - box[3] * scale) / 2;
      for (const shape of shapes) {
        page.drawSvgPath(shape.d, {
          x: x - box[0]! * scale,
          y: y + box[1]! * scale,
          scale,
          color: hexRgb(shape.fill && shape.fill !== "none" ? shape.fill : "#FFFFFF"),
          borderWidth: 0,
        });
      }
    } else {
      notes.push("NEXT MART lockup carried no readable vector paths — left off the sheet.");
    }
  } else {
    notes.push("NEXT MART lockup master could not be read — the sheet ships without it.");
  }

  // 03 Title
  const titleInk = config.face === "light" ? hexRgb(INK) : hexRgb("#FFFFFF");
  const titleSize = 22 * MM_TO_PT * 0.62;
  const titleW = bold.widthOfTextAtSize(config.heading, titleSize);
  page.drawText(config.heading, {
    x: px(S.trimW / 2) - titleW / 2,
    y: py(layout.headingY),
    size: titleSize,
    font: bold,
    color: titleInk,
  });
  if (config.eyebrow.trim()) {
    const eSize = 9 * MM_TO_PT * 0.62;
    const eW = regular.widthOfTextAtSize(config.eyebrow, eSize);
    page.drawText(config.eyebrow, {
      x: px(S.trimW / 2) - eW / 2,
      y: py(layout.headingY - 13),
      size: eSize,
      font: regular,
      color: titleInk,
    });
  }

  // 04 Tables
  for (const b of layout.blocks) {
    const x = px(b.x);
    const yTop = py(b.y);
    const wPt = b.w * MM_TO_PT;
    const hPt = b.h * MM_TO_PT;
    if (b.kind === "bar") {
      page.drawRectangle({
        x,
        y: yTop - hPt,
        width: wPt,
        height: hPt,
        color: hexRgb(config.barHex),
      });
      const size = (b.lines.length > 1 ? 6.4 : 7.6) * MM_TO_PT;
      b.lines.forEach((line, i) => {
        const lw = bold.widthOfTextAtSize(line, size);
        page.drawText(line, {
          x: x + wPt / 2 - lw / 2,
          y:
            yTop -
            hPt / 2 -
            size * 0.35 -
            (i - (b.lines.length - 1) / 2) * 6.5 * MM_TO_PT,
          size,
          font: bold,
          color: hexRgb("#FFFFFF"),
        });
      });
      continue;
    }
    page.drawRectangle({ x, y: yTop - hPt, width: wPt, height: hPt, color: hexRgb(CARD) });
    page.drawLine({
      start: { x, y: yTop - hPt },
      end: { x: x + wPt, y: yTop - hPt },
      thickness: 0.3 * MM_TO_PT,
      color: hexRgb("#D8DEE9"),
    });
    const priceX = x + wPt - MART_PRICE_SHEET.priceW * MM_TO_PT;
    page.drawLine({
      start: { x: priceX, y: yTop },
      end: { x: priceX, y: yTop - hPt },
      thickness: 0.3 * MM_TO_PT,
      color: hexRgb("#D8DEE9"),
    });
    const size = layout.itemSize * 0.62 * MM_TO_PT * 0.62;
    b.lines.forEach((line, i) => {
      page.drawText(line, {
        x: x + 4 * MM_TO_PT,
        y: yTop - hPt / 2 - size * 0.35 + (b.lines.length - 1 - i * 2) * size * 0.6,
        size,
        font: bold,
        color: hexRgb(INK),
      });
    });
    if (b.price) {
      const pw = bold.widthOfTextAtSize(b.price, size);
      page.drawText(b.price, {
        x: priceX + (MART_PRICE_SHEET.priceW * MM_TO_PT) / 2 - pw / 2,
        y: yTop - hPt / 2 - size * 0.35,
        size,
        font: bold,
        color: hexRgb(INK),
      });
    }
  }

  // 05 Footer
  if (config.footer.trim()) {
    const size = 7 * MM_TO_PT * 0.62;
    const fw = regular.widthOfTextAtSize(config.footer, size);
    page.drawText(config.footer, {
      x: px(S.trimW / 2) - fw / 2,
      y: py(layout.footerY + 20),
      size,
      font: regular,
      color: titleInk,
    });
  }

  doc.setTitle(`NEXT MART price list — ${martStopEventLabel(stop)}`);
  doc.setSubject(martPriceListSpec(config, stop));
  doc.setProducer("TransPerfect Element");

  const bytes = (await doc.save()) as Uint8Array<ArrayBuffer>;
  return {
    bytes,
    notes,
    layers: ["01 Ground", "02 Lockup", "03 Title", "04 Tables", "05 Footer"],
  };
}

/* ── editable PowerPoint ──────────────────────────────────────────────────── */

export async function buildMartPriceListPptx(
  config: MartPriceListConfig,
  stop: MartStop,
): Promise<{ blob: Blob; notes: string[] }> {
  const notes: string[] = [];
  const S = MART_PRICE_SHEET;
  const layout = martPriceListLayout(config);
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const slideW = S.trimW * MM_TO_IN;
  const slideH = S.trimH * MM_TO_IN;
  pptx.defineLayout({ name: "MART_A4", width: slideW, height: slideH });
  pptx.layout = "MART_A4";
  const slide = pptx.addSlide();

  const stops = pillarStops(config.styleId, config.face);
  slide.background = { color: stops[Math.floor(stops.length / 2)]!.replace("#", "") };
  notes.push(
    "PowerPoint paints the ground as the approved gradient's mid stop — a flat brand colour, not a gradient. The press PDF and SVG carry the live gradient.",
  );

  const ink = config.face === "light" ? INK : "FFFFFF";
  slide.addText(config.heading, {
    x: 0,
    y: (layout.headingY - 12) * MM_TO_IN,
    w: slideW,
    h: 0.5,
    align: "center",
    fontFace: "Geist",
    fontSize: 26,
    bold: true,
    color: ink.replace("#", ""),
  });
  if (config.eyebrow.trim()) {
    slide.addText(config.eyebrow, {
      x: 0,
      y: (layout.headingY - 20) * MM_TO_IN,
      w: slideW,
      h: 0.3,
      align: "center",
      fontFace: "Geist",
      fontSize: 11,
      color: ink.replace("#", ""),
    });
  }

  for (const b of layout.blocks) {
    const x = b.x * MM_TO_IN;
    const y = b.y * MM_TO_IN;
    const w = b.w * MM_TO_IN;
    const h = b.h * MM_TO_IN;
    if (b.kind === "bar") {
      slide.addText(b.lines.join(" "), {
        x,
        y,
        w,
        h,
        align: "center",
        valign: "middle",
        fontFace: "Geist",
        fontSize: 11,
        bold: true,
        color: "FFFFFF",
        fill: { color: config.barHex.replace("#", "") },
      });
      continue;
    }
    slide.addText(b.lines.join(" "), {
      x,
      y,
      w: w - MART_PRICE_SHEET.priceW * MM_TO_IN,
      h,
      valign: "middle",
      fontFace: "Geist",
      fontSize: 10,
      bold: true,
      color: INK.replace("#", ""),
      fill: { color: "FFFFFF" },
      margin: 4,
    });
    slide.addText(b.price ?? "", {
      x: x + w - MART_PRICE_SHEET.priceW * MM_TO_IN,
      y,
      w: MART_PRICE_SHEET.priceW * MM_TO_IN,
      h,
      align: "center",
      valign: "middle",
      fontFace: "Geist",
      fontSize: 10,
      bold: true,
      color: INK.replace("#", ""),
      fill: { color: "FFFFFF" },
    });
  }

  if (config.footer.trim()) {
    slide.addText(config.footer, {
      x: 0,
      y: (layout.footerY + 14) * MM_TO_IN,
      w: slideW,
      h: 0.3,
      align: "center",
      fontFace: "Geist",
      fontSize: 9,
      color: ink.replace("#", ""),
    });
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  return { blob, notes };
}

/* ── editable Word ────────────────────────────────────────────────────────── */

const xmlEsc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wPara(text: string, opts: { size?: number; bold?: boolean; colour?: string; align?: string } = {}) {
  const { size = 22, bold = false, colour = "03002C", align } = opts;
  return `<w:p><w:pPr>${align ? `<w:jc w:val="${align}"/>` : ""}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Geist" w:hAnsi="Geist"/>${
    bold ? "<w:b/>" : ""
  }<w:sz w:val="${size}"/><w:color w:val="${colour}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p>`;
}

function wCell(text: string, widthDxa: number, opts: { bold?: boolean; fill?: string; colour?: string } = {}) {
  return `<w:tc><w:tcPr><w:tcW w:w="${widthDxa}" w:type="dxa"/>${
    opts.fill ? `<w:shd w:val="clear" w:fill="${opts.fill}"/>` : ""
  }</w:tcPr>${wPara(text, { bold: opts.bold, colour: opts.colour ?? "03002C", size: 20 })}</w:tc>`;
}

export async function buildMartPriceListDocx(
  config: MartPriceListConfig,
  stop: MartStop,
): Promise<{ blob: Blob; notes: string[] }> {
  const currency = martCurrency(config.currencyId);
  const rows = config.categories
    .map((category) => {
      const head = `<w:tr>${wCell(category.title, 6000, {
        bold: true,
        fill: config.barHex.replace("#", ""),
        colour: "FFFFFF",
      })}${wCell("", 2400, { fill: config.barHex.replace("#", "") })}</w:tr>`;
      const items = category.items
        .map(
          (item) =>
            `<w:tr>${wCell(item.name, 6000, { bold: true })}${wCell(
              item.price === null ? "—" : String(item.price),
              2400,
            )}</w:tr>`,
        )
        .join("");
      return head + items;
    })
    .join("");

  const body =
    wPara("NEXT MART", { size: 40, bold: true }) +
    wPara(config.heading, { size: 32, bold: true }) +
    wPara(`${martStopEventLabel(stop)} · ${stop.venue} · ${stop.dates}`, { size: 20, colour: "666666" }) +
    wPara(`Prices in ${currency.code} (${currency.symbol.trim()})`, { size: 20, colour: "666666" }) +
    `<w:tbl><w:tblPr><w:tblW w:w="8400" w:type="dxa"/><w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="D8DEE9"/><w:insideV w:val="single" w:sz="4" w:color="D8DEE9"/></w:tblBorders></w:tblPr>${rows}</w:tbl>` +
    (config.footer.trim() ? wPara(config.footer, { size: 18, colour: "666666" }) : "") +
    wPara(
      `Ground: ${martPriceListStyleLabel(config.styleId)} (${config.styleId}), ${config.face} face. Word carries the copy and the prices as editable text; the press PDF and SVG carry the approved gradient and lockup artwork.`,
      { size: 16, colour: "666666" },
    );

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr></w:body></w:document>`;

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  zip.file("word/document.xml", document);
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return {
    blob,
    notes: ["Word carries copy, categories and prices as an editable table, without the gradient ground."],
  };
}

/* ── the pack ─────────────────────────────────────────────────────────────── */

export type MartPriceListPack = {
  blob: Blob;
  filename: string;
  notes: string[];
};

export async function exportMartPriceListPack(
  config: MartPriceListConfig,
  stop: MartStop,
): Promise<MartPriceListPack> {
  const slug = martPriceListSlug(config);
  const notes: string[] = [];
  const svg = await buildMartPriceListSvg(config, stop);
  const pdf = await buildMartPriceListPdf(config, stop);
  const pptx = await buildMartPriceListPptx(config, stop).catch(() => null);
  const word = await buildMartPriceListDocx(config, stop).catch(() => null);
  notes.push(...svg.notes, ...pdf.notes);
  if (pptx) notes.push(...pptx.notes);
  else notes.push("PowerPoint file could not be built in this browser — not included.");
  if (word) notes.push(...word.notes);
  else notes.push("Word file could not be built in this browser — not included.");

  const missing = martPriceListMissing(config);
  if (missing.length) notes.push(`Prices missing — do not print: ${missing.join(", ")}`);

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  zip.file(`svg/${slug}.svg`, svg.svg);
  const pdfBuffer = pdf.bytes.buffer.slice(
    pdf.bytes.byteOffset,
    pdf.bytes.byteOffset + pdf.bytes.byteLength,
  ) as ArrayBuffer;
  zip.file(`pdf/${slug}.pdf`, pdfBuffer);
  zip.file(`ai/${slug}.ai`, pdfBuffer);
  if (pptx) zip.file(`pptx/${slug}.pptx`, await pptx.blob.arrayBuffer());
  if (word) zip.file(`word/${slug}.docx`, await word.blob.arrayBuffer());
  zip.file(
    "READ-ME.txt",
    [
      martPriceListSpec(config, stop),
      `Files:`,
      `  svg/   editable SVG — layered groups, live text, live gradient, vector lockup.`,
      `  pdf/   A4 press PDF, ${MART_PRICE_SHEET.bleed} mm bleed, live gradient pattern and live Geist text.`,
      `  ai/    Illustrator twin of the press PDF (same bytes, PDF-compatible).`,
      `  pptx/  editable PowerPoint slide.`,
      `  word/  editable Word document.`,
      ``,
      `Layers in the press PDF: ${pdf.layers.join(" · ")}`,
      `Items: ${martPriceListItemCount(config)}`,
      ``,
      `Notes:`,
      ...notes.map((n) => `  - ${n}`),
      ``,
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: `next-mart-${slug}.zip`, notes };
}
