// -----------------------------------------------------------------------------
// NEXT event booklet — press PDF.
//
// The agenda pages are copied straight out of the agenda press file, so they
// stay fully vector and layered exactly as production approved them. The cover
// is drawn here as vector type on a solid brand ground, and the map / chart
// pages carry their rendered artwork at 300 ppi with a printed credit line so
// no one mistakes a render for vector artwork.
// -----------------------------------------------------------------------------

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { resolveAssetUrl } from "./asset-base-url";
import { buildAgendaVectorPdf } from "./agenda-vector-pdf";
import { agendaGeometry, type AgendaConfig } from "./next-agenda";
import {
  bookletCoverArt,
  bookletCoverLayout,
  coverCrop,
  type BookletCoverArt,
  type BookletCoverLayout,
} from "./next-booklet-cover-art";
import {
  BOOKLET_ARTWORK_NOTE,
  bookletPageCount,
  type BookletConfig,
  type BookletImagePage,
} from "./next-booklet";

const MM_TO_PT = 72 / 25.4;
const SLUG_PT = 0.4 * 72;

const INK = "#03002C";
const ACCENT = "#003FC7";
const PAPER = "#FFFFFF";

export type BookletPdfResult = {
  bytes: Uint8Array<ArrayBuffer>;
  pageCount: number;
  page: { widthPt: number; heightPt: number };
  notes: string[];
};

function hex(h: string) {
  const s = h.replace("#", "");
  const full =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const n = parseInt(full, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function ttf(doc: PDFDocument, path: string): Promise<PDFFont | null> {
  try {
    const res = await fetch(resolveAssetUrl(path));
    if (!res.ok) return null;
    return await doc.embedFont(await res.arrayBuffer(), {
      subset: false,
      // The face substitutes a single glyph for ff / tt but keeps the pair's
      // advance, which printed "coff ee" on the board. Ligatures stay off.
      features: { liga: false, clig: false, dlig: false, rlig: false },
    });
  } catch {
    return null;
  }
}

/** Greedy wrap at a measured width — pdf-lib has no text layout of its own. */
function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0]!;
  for (const word of words.slice(1)) {
    const next = `${line} ${word}`;
    if (font.widthOfTextAtSize(next, size) <= maxW) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}

/** Fits artwork inside a box without ever cropping or distorting it. */
function fitBox(
  wPx: number,
  hPx: number,
  boxW: number,
  boxH: number,
): { w: number; h: number; dx: number; dy: number } {
  const scale = Math.min(boxW / Math.max(1, wPx), boxH / Math.max(1, hPx));
  const w = wPx * scale;
  const h = hPx * scale;
  return { w, h, dx: (boxW - w) * 0.5, dy: (boxH - h) * 0.5 };
}

/**
 * Places the cover picture and its ink veil.
 *
 * The veil is drawn as a stack of thin bands, which is how pdf-lib gets a
 * gradient without a shading dictionary. It stays live artwork: no flattening,
 * and the picture is placed at its own resolution.
 */
async function drawCoverArt(
  doc: PDFDocument,
  page: PDFPage,
  art: BookletCoverArt,
  layout: BookletCoverLayout,
  scrim: number,
  box: { x: number; y: number; w: number; h: number },
): Promise<boolean> {
  let bytes: ArrayBuffer;
  try {
    const res = await fetch(resolveAssetUrl(art.src));
    if (!res.ok) return false;
    bytes = await res.arrayBuffer();
  } catch {
    return false;
  }
  let image: Awaited<ReturnType<PDFDocument["embedJpg"]>>;
  try {
    image = await doc.embedJpg(bytes);
  } catch {
    return false;
  }

  const px = box.x + layout.photo.x * box.w;
  const pw = layout.photo.w * box.w;
  const ph = layout.photo.h * box.h;
  // PDF y runs up the page; the layout rect is measured from the top.
  const py = box.y + box.h - layout.photo.y * box.h - ph;
  const fit = coverCrop(image.width, image.height, pw, ph);
  page.drawImage(image, { x: px + fit.dx, y: py + fit.dy, width: fit.w, height: fit.h });
  // pdf-lib has no clipping path, so a cover-cropped picture spills past its box.
  // The spill is masked back to the ink ground, otherwise a split or framed cover
  // would print the picture underneath its copy panel.
  const mask = (x: number, y: number, w: number, h: number) => {
    if (w <= 0.01 || h <= 0.01) return;
    page.drawRectangle({ x, y, width: w, height: h, color: hex(INK) });
  };
  // Masked against the whole sheet, slug included — a spill into the slug would
  // print on the trimmed-away edge but still shows on the press proof.
  const pageW = page.getWidth();
  const pageH = page.getHeight();
  mask(-2, py + ph, pageW + 4, pageH - (py + ph) + 2);
  mask(-2, -2, pageW + 4, py + 2);
  mask(-2, py, px + 2, ph);
  mask(px + pw, py, pageW - (px + pw) + 2, ph);

  const strength = Math.max(0, Math.min(1, layout.scrim.strength * (scrim / 100)));
  if (strength <= 0.001) return true;
  if (layout.scrim.from === "all") {
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: hex(INK), opacity: strength });
    return true;
  }
  const bands = 44;
  const span = Math.max(0.05, Math.min(1, layout.scrim.span)) * ph;
  const bandH = span / bands;
  for (let i = 0; i < bands; i += 1) {
    // 0 at the open end of the veil, 1 where the copy sits.
    const t = (i + 1) / bands;
    const opacity = strength * Math.pow(t, 1.4);
    const y =
      layout.scrim.from === "bottom"
        ? py + span - (i + 1) * bandH
        : py + ph - span + i * bandH;
    page.drawRectangle({
      x: px,
      y,
      width: pw,
      height: bandH + 0.6,
      color: hex(INK),
      opacity,
    });
  }
  return true;
}

function drawCover(
  page: PDFPage,
  fonts: { bold: PDFFont; regular: PDFFont },
  cover: { eyebrow: string; title: string; subtitle: string; footnote: string },
  geo: { bleedW: number; bleedH: number; trimW: number; trimH: number; safeInset: number },
  /** Vertical band the copy may use, in points from the page bottom. */
  copyBand?: { top: number; bottom: number; anchor: "top" | "bottom" },
): void {
  const mm = (v: number) => v * MM_TO_PT;
  const w = mm(geo.bleedW);
  const h = mm(geo.bleedH);
  if (!copyBand) {
    // Plain ink cover: the ground bleeds off every edge, the slug stays paper.
    page.drawRectangle({ x: SLUG_PT, y: SLUG_PT, width: w, height: h, color: hex(INK) });
  }

  const pad = mm(geo.safeInset);
  const left = SLUG_PT + mm((geo.bleedW - geo.trimW) / 2) + pad;
  const right = SLUG_PT + mm(geo.bleedW - (geo.bleedW - geo.trimW) / 2) - pad;
  const inner = right - left;
  const trimTop = SLUG_PT + h - mm((geo.bleedH - geo.trimH) / 2) - pad;
  const trimBottom = SLUG_PT + mm((geo.bleedH - geo.trimH) / 2) + pad;

  // ── measure the copy block, then place it inside its band ─────────────────
  const brickH = mm(4.2);
  const brickW = mm(9);
  const eyebrowSize = 11;
  const titleSize = Math.min(54, Math.max(28, inner / 7));
  const subSize = Math.max(12, titleSize * 0.3);
  const eyebrow = (cover.eyebrow ?? "").toUpperCase();
  const titleLines = wrap(fonts.bold, (cover.title ?? "").toUpperCase(), titleSize, inner);
  const subLines = wrap(fonts.regular, cover.subtitle ?? "", subSize, inner * 0.82);

  const blockH =
    brickH +
    mm(16) +
    (eyebrow ? eyebrowSize + mm(10) : 0) +
    titleLines.length * titleSize * 1.06 +
    (subLines.length ? mm(12) + subLines.length * subSize * 1.35 : 0);

  // The footnote owns the page foot, so a bottom-anchored copy block stops
  // above it instead of printing through it.
  const footSize = 9.5;
  const footLines = wrap(fonts.regular, (cover.footnote ?? "").trim(), footSize, inner);
  const footReserve = footLines.length ? footLines.length * footSize * 1.3 + mm(8) : 0;

  const bandTop = copyBand?.top ?? trimTop;
  const bandBottom = (copyBand?.bottom ?? trimBottom) + footReserve;
  const railY =
    copyBand?.anchor === "bottom"
      ? Math.min(bandTop, bandBottom + blockH) - brickH
      : bandTop - brickH;

  // Brick rail — the house device, drawn as plain rectangles so it stays live.
  for (let i = 0; i < 5; i += 1) {
    page.drawRectangle({
      x: left + i * (brickW + mm(2.4)),
      y: railY,
      width: brickW,
      height: brickH,
      color: hex(i === 4 ? ACCENT : PAPER),
      opacity: i === 4 ? 1 : 0.9,
    });
  }

  let y = railY - mm(16);
  if (eyebrow) {
    page.drawText(eyebrow, {
      x: left,
      y,
      size: eyebrowSize,
      font: fonts.bold,
      color: hex(PAPER),
      opacity: 0.82,
    });
    y -= mm(10);
  }

  y -= titleSize;
  for (const line of titleLines) {
    page.drawText(line, { x: left, y, size: titleSize, font: fonts.bold, color: hex(PAPER) });
    y -= titleSize * 1.06;
  }

  if (subLines.length) {
    y -= mm(6);
    page.drawRectangle({ x: left, y: y + subSize * 0.9, width: mm(28), height: mm(1.2), color: hex(ACCENT) });
    y -= mm(6);
    for (const line of subLines) {
      page.drawText(line, {
        x: left,
        y,
        size: subSize,
        font: fonts.regular,
        color: hex(PAPER),
        opacity: 0.9,
      });
      y -= subSize * 1.35;
    }
  }


  if (footLines.length) {
    let fy = SLUG_PT + mm((geo.bleedH - geo.trimH) / 2) + pad + (footLines.length - 1) * footSize * 1.3;
    for (const line of footLines) {
      page.drawText(line, {
        x: left,
        y: fy,
        size: footSize,
        font: fonts.regular,
        color: hex(PAPER),
        opacity: 0.72,
      });
      fy -= footSize * 1.3;
    }
  }
}

async function drawArtworkPage(
  doc: PDFDocument,
  page: PDFPage,
  fonts: { bold: PDFFont; regular: PDFFont },
  art: BookletImagePage,
  geo: { bleedW: number; bleedH: number; trimW: number; trimH: number; safeInset: number },
): Promise<void> {
  const mm = (v: number) => v * MM_TO_PT;
  const w = mm(geo.bleedW);
  const h = mm(geo.bleedH);
  page.drawRectangle({ x: SLUG_PT, y: SLUG_PT, width: w, height: h, color: hex(PAPER) });

  const pad = mm(geo.safeInset);
  const left = SLUG_PT + mm((geo.bleedW - geo.trimW) / 2) + pad;
  const right = SLUG_PT + mm(geo.bleedW - (geo.bleedW - geo.trimW) / 2) - pad;
  const top = SLUG_PT + h - mm((geo.bleedH - geo.trimH) / 2) - pad;
  const bottom = SLUG_PT + mm((geo.bleedH - geo.trimH) / 2) + pad;
  const inner = right - left;

  const headSize = 15;
  const head = (art.title ?? "").toUpperCase();
  if (head) {
    page.drawText(head, {
      x: left,
      y: top - headSize,
      size: headSize,
      font: fonts.bold,
      color: hex(INK),
    });
    page.drawRectangle({
      x: left,
      y: top - headSize - mm(4),
      width: mm(24),
      height: mm(1.2),
      color: hex(ACCENT),
    });
  }

  const capSize = 8;
  const capLines = wrap(fonts.regular, art.caption ?? "", capSize, inner);
  const capBlock = capLines.length ? capLines.length * capSize * 1.3 + mm(4) : 0;

  const boxTop = top - (head ? headSize + mm(10) : 0);
  const boxBottom = bottom + capBlock;
  const boxH = Math.max(mm(20), boxTop - boxBottom);
  const fit = fitBox(art.wPx, art.hPx, inner, boxH);
  const image = await doc.embedPng(art.png);
  page.drawImage(image, {
    x: left + fit.dx,
    y: boxBottom + fit.dy,
    width: fit.w,
    height: fit.h,
  });

  let cy = bottom + (capLines.length - 1) * capSize * 1.3;
  for (const line of capLines) {
    page.drawText(line, {
      x: left,
      y: cy,
      size: capSize,
      font: fonts.regular,
      color: hex(INK),
      opacity: 0.62,
    });
    cy -= capSize * 1.3;
  }
}

/**
 * Builds the booklet press PDF.
 *
 * `agenda` must already carry the booklet's own page format — the studio forces
 * it — otherwise the copied agenda pages would arrive at a different trim.
 */
export async function buildBookletPdf(args: {
  config: BookletConfig;
  agenda: AgendaConfig;
  imagePages?: BookletImagePage[];
}): Promise<BookletPdfResult> {
  const { config, agenda } = args;
  const imagePages = args.imagePages ?? [];
  const geo = agendaGeometry(agenda);
  const pageW = geo.bleedW * MM_TO_PT + SLUG_PT * 2;
  const pageH = geo.bleedH * MM_TO_PT + SLUG_PT * 2;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(config.cover.title || "NEXT event booklet");
  doc.setProducer("TransPerfect Element");
  doc.setCreator("TransPerfect Element — NEXT booklet studio");

  const bold =
    (await ttf(doc, "/fonts/Geist-Bold.ttf")) ?? doc.embedStandardFont(StandardFonts.HelveticaBold);
  const regular =
    (await ttf(doc, "/fonts/Geist-Regular.ttf")) ?? doc.embedStandardFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  const notes: string[] = [];

  if (config.includeCover) {
    const page = doc.addPage([pageW, pageH]);
    const art = bookletCoverArt(config.cover.artId);
    const layout = bookletCoverLayout(config.cover.treatment ?? "full-bleed");
    let placed = false;
    if (art) {
      // Ink ground first: a framed or split cover shows it around the picture.
      page.drawRectangle({
        x: SLUG_PT,
        y: SLUG_PT,
        width: geo.bleedW * MM_TO_PT,
        height: geo.bleedH * MM_TO_PT,
        color: hex(INK),
      });
      placed = await drawCoverArt(doc, page, art, layout, config.cover.scrim ?? 88, {
        x: SLUG_PT,
        y: SLUG_PT,
        w: geo.bleedW * MM_TO_PT,
        h: geo.bleedH * MM_TO_PT,
      });
      if (!placed) {
        notes.push(
          `⚠ Cover picture “${art.name}” could not be loaded — the cover printed on the plain ink ground instead.`,
        );
      }
    }
    // The copy band is measured on the trim, then kept inside the safe area so
    // no cover line can drift into the trim edge.
    const trimTopPt = SLUG_PT + (geo.bleedH - (geo.bleedH - geo.trimH) / 2) * MM_TO_PT;
    const trimBottomPt = SLUG_PT + ((geo.bleedH - geo.trimH) / 2) * MM_TO_PT;
    const safeTop = trimTopPt - geo.safeInset * MM_TO_PT;
    const safeBottom = trimBottomPt + geo.safeInset * MM_TO_PT;
    const band = placed
      ? {
          top: Math.min(safeTop, trimTopPt - layout.copy.y * geo.trimH * MM_TO_PT),
          bottom: Math.max(
            safeBottom,
            trimTopPt - (layout.copy.y + layout.copy.h) * geo.trimH * MM_TO_PT,
          ),
          anchor: layout.copy.anchor,
        }
      : undefined;
    drawCover(page, fonts, config.cover, geo, band);
    notes.push(
      placed
        ? `Cover picture “${art!.name}” placed live at its own resolution under a vector ink veil, with the title, sub-line and footnote as live type`
        : "Cover drawn as live vector type on the approved ink ground with the brick rail",
    );
    if (placed) notes.push(art!.credit);
  }

  let agendaPageCount = 0;
  if (config.includeAgenda) {
    const built = await buildAgendaVectorPdf(agenda);
    const source = await PDFDocument.load(built.bytes);
    const copied = await doc.copyPages(source, source.getPageIndices());
    for (const page of copied) doc.addPage(page);
    agendaPageCount = copied.length;
    notes.push(
      `${agendaPageCount} agenda page${agendaPageCount === 1 ? "" : "s"} copied from the approved press file — layers and vector type intact`,
    );
  }

  for (const art of imagePages) {
    await drawArtworkPage(doc, doc.addPage([pageW, pageH]), fonts, art, geo);
  }
  if (imagePages.length) {
    notes.push(
      `${imagePages.length} rendered page${imagePages.length === 1 ? "" : "s"} placed at 300 ppi`,
    );
    notes.push(BOOKLET_ARTWORK_NOTE);
  }

  const bytes = (await doc.save()) as Uint8Array<ArrayBuffer>;
  const expected = bookletPageCount(config, agendaPageCount);
  const pageCount = doc.getPageCount();
  if (pageCount !== expected) {
    // A silent page-count drift means the running order on screen is not the
    // running order in the file, so it surfaces instead of shipping quietly.
    notes.push(`⚠ Page plan expected ${expected} pages but the file carries ${pageCount}`);
  }

  return {
    bytes,
    pageCount,
    page: { widthPt: pageW, heightPt: pageH },
    notes: [
      `Booklet trim ${geo.trimW} × ${geo.trimH} mm with ${Math.round(geo.safeInset)} mm safe margins`,
      ...notes,
    ],
  };
}
