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
  agendaTextLines,
  AGENDA_BAND,
  agendaBandPalette,
  agendaLocation,
  agendaLocationText,
  type AgendaLocationAlignId,
  agendaBandComposite,
  agendaFooter,
  agendaBlocks,
  agendaSplitWidths,
  agendaDivision,
  agendaLockupUrl,
  agendaGeometry,
  agendaInk,
  agendaLayout,
  agendaName,
  agendaPages,
  agendaCardType,
  agendaLongestWord,
  agendaParallels,
  AGENDA_MAX_PARALLEL,
  agendaQrBackground,
  agendaQrForeground,
  agendaQrPlateColor,
  agendaQrStyle,
  agendaQrTransparent,
  agendaRowStyle,
  agendaStops,
  agendaTitleInk,
  type AgendaConfig,
} from "./next-agenda";
import { agendaCopyInk } from "./next-agenda-contrast";
import type { BookletExtras } from "./next-booklet";
import { logoInkPlacement } from "./next-logo-ink";
import { qrModulePxForPrint, qrPng } from "./qr-print";

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
 * Flatten the approved gradient ground to a PNG at the trim size, with the
 * approved division lockup burned in at its exact printed position so Word
 * carries the real mark instead of a text substitute. Word gets a picture, but
 * it is the same gradient, the same stops and the same lockup as the press file.
 */
/** Word alignment for the room line ("centre" is spelled the Word way here). */
function docxLocAlign(a: AgendaLocationAlignId): "left" | "center" | "right" {
  return a === "centre" ? "center" : a === "left" ? "left" : "right";
}

export async function flattenedGroundPng(
  config: AgendaConfig,
  px: { w: number; h: number },
): Promise<Blob> {
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

  await drawLockup(ctx, config, canvas.width);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not rasterize the agenda background"))),
      "image/png",
    );
  });
}

/** Paint the approved division lockup onto the flattened Word ground. */
async function drawLockup(
  ctx: CanvasRenderingContext2D,
  config: AgendaConfig,
  canvasWidth: number,
): Promise<void> {
  const blocks = agendaBlocks(config);
  const src = agendaLockupUrl(config);
  if (!blocks.lockup || !src) return;

  const geo = agendaGeometry(config);
  // The ground picture is the trim area, and blocks are measured from the trim
  // origin, so one millimetre maps straight onto the canvas at this scale.
  const scale = canvasWidth / geo.trimW;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("lockup unavailable"));
      el.src = src;
    });
    // The block is the measured ink box, so the whole file is drawn to the box
    // that lands the ink there — exactly what the sheet and the press PDF do.
    const box = logoInkPlacement(src, blocks.lockup);
    ctx.drawImage(img, box.x * scale, box.y * scale, box.w * scale, box.h * scale);
  } catch {
    /* lockup unavailable — the Word ground still carries the approved gradient */
  }
}

function agendaFaceGround(config: AgendaConfig): string {
  return (config.face ?? "dark") === "light" ? "#EEF1F7" : "#03002C";
}

/**
 * Ground colour at a vertical fraction of the sheet. Word table shading cannot be
 * translucent, so a band's fill is composited over this instead — the printed
 * Word page then matches the board's see-through bands rather than sitting flat.
 */
function groundColorAt(config: AgendaConfig, fraction: number): string {
  const stops = agendaStops(config.styleId, config.face, config.divisionId);
  const list = stops.length ? stops : [agendaFaceGround(config)];
  if (list.length === 1) return list[0]!;
  const t = Math.min(1, Math.max(0, fraction)) * (list.length - 1);
  const i = Math.min(list.length - 2, Math.floor(t));
  const rgb = (value: string) => {
    const h = value.replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const a = rgb(list[i]!);
  const b = rgb(list[i + 1]!);
  const f = t - i;
  return `#${a
    .map((c, n) => Math.round(c + (b[n]! - c) * f).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
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

/**
 * A paragraph placed on the printed grid. `lineTwips` is the measured band from
 * `agendaBlocks`, applied with `atLeast` so Word honours the printed leading but
 * never clips a descender when a machine substitutes the typeface.
 */
function para(
  runs: string,
  opts: {
    afterTwips?: number;
    beforeTwips?: number;
    lineTwips?: number;
    align?: "left" | "center" | "right";
    /** Right indent in twips: keeps a right-aligned line clear of the QR code. */
    rightTwips?: number;
  } = {},
): string {
  const line = opts.lineTwips ? Math.max(120, Math.round(opts.lineTwips)) : 0;
  return [
    "<w:p><w:pPr>",
    // Keep Word from adding its own paragraph spacing on top of the print grid.
    '<w:contextualSpacing/><w:widowControl w:val="false"/>',
    `<w:spacing w:before="${Math.round(opts.beforeTwips ?? 0)}" w:after="${Math.round(
      opts.afterTwips ?? 0,
    )}"${line ? ` w:line="${line}" w:lineRule="atLeast"` : ' w:line="240" w:lineRule="auto"'}/>`,
    `<w:ind w:left="0" w:right="${Math.max(0, Math.round(opts.rightTwips ?? 0))}" w:firstLine="0"/>`,
    `<w:jc w:val="${opts.align === "right" ? "right" : opts.align === "center" ? "center" : "left"}"/>`,
    "</w:pPr>",
    runs,
    "</w:p>",
  ].join("");
}

/**
 * Empty paragraph of an exact measured height, used to reproduce the printed
 * gaps (lockup band, gap above the footer) rather than letting Word guess.
 */
function spacer(heightTwips: number, runs = ""): string {
  return [
    "<w:p><w:pPr>",
    `<w:spacing w:before="0" w:after="0" w:line="${Math.max(
      20,
      Math.round(heightTwips),
    )}" w:lineRule="exact"/>`,
    "</w:pPr>",
    runs,
    "</w:p>",
  ].join("");
}

function cell(
  widthTwips: number,
  content: string,
  padTwips = 0,
  opts: {
    fill?: string;
    span?: number;
    vAlign?: "top" | "center";
    /** Colour of the time rail drawn down the left edge of the cell. */
    rail?: string;
    railW?: number;
    /** Colour of a hairline rule drawn along the top edge of the cell. */
    topRule?: string;
  } = {},
): string {
  // Cell margins are printed padding, so on a narrow parallel column the board's
  // padding can eat the whole column: at four tracks it left ~1mm of text width
  // and Word wrapped the copy to one character a line. Cap it at a share of the
  // column so every card keeps a real text measure.
  const pad = Math.max(0, Math.min(padTwips, widthTwips * 0.1));
  padTwips = pad;
  // Left rail and top hairline share one <w:tcBorders> block: Word keeps only the
  // last one it reads, so emitting two blocks silently dropped the footer rule.
  const borders = [
    opts.topRule
      ? `<w:top w:val="single" w:sz="6" w:space="0" w:color="${hex(opts.topRule)}"/>`
      : "",
    opts.rail
      ? `<w:left w:val="single" w:sz="${Math.max(
          4,
          Math.round((opts.railW ?? 1.8) * 8),
        )}" w:space="0" w:color="${hex(opts.rail)}"/>`
      : "",
  ].join("");
  return [
    "<w:tc><w:tcPr>",
    `<w:tcW w:w="${Math.round(widthTwips)}" w:type="dxa"/>`,
    opts.span && opts.span > 1 ? `<w:gridSpan w:val="${opts.span}"/>` : "",
    opts.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${hex(opts.fill)}"/>` : "",
    borders ? `<w:tcBorders>${borders}</w:tcBorders>` : "",

    `<w:tcMar><w:top w:w="${Math.round(padTwips)}" w:type="dxa"/><w:bottom w:w="${Math.round(
      padTwips,
    )}" w:type="dxa"/><w:left w:w="${Math.round(
      opts.fill ? padTwips : 0,
    )}" w:type="dxa"/><w:right w:w="${Math.round(padTwips)}" w:type="dxa"/></w:tcMar>`,
    `<w:vAlign w:val="${opts.vAlign ?? "center"}"/>`,
    "</w:tcPr>",
    content || "<w:p/>",
    "</w:tc>",
  ].join("");
}

/**
 * Build the .docx. Text stays editable and keeps the printed fonts, sizes and
 * inks; the approved gradient ground is a flattened full-page picture behind it.
 */
export async function buildAgendaDocx(
  config: AgendaConfig,
  /** Booklet mode: a cover page in front and rendered artwork pages behind. */
  extras?: BookletExtras & { omitAgenda?: boolean },
): Promise<{ blob: Blob; notes: string[] }> {
  const pages = agendaPages(config);
  const geo = agendaGeometry(config);
  const L = agendaLayout(pages[0]!.config);
  const blocks = agendaBlocks(config);
  const ink = agendaCopyInk(config).hex;
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

  const backgroundDrawing = (rel: string) =>
    [
      "<w:r><w:drawing>",
      `<wp:anchor behindDoc="1" distT="0" distB="0" distL="0" distR="0" simplePos="0" locked="0" layoutInCell="1" allowOverlap="1" relativeHeight="0">`,
      '<wp:simplePos x="0" y="0"/>',
      '<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>',
      '<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>',
      `<wp:extent cx="${Math.round(geo.trimW * EMU_PER_MM)}" cy="${Math.round(geo.trimH * EMU_PER_MM)}"/>`,
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
      "<wp:wrapNone/>",
      '<wp:docPr id="1" name="Approved NEXT ground" descr="Flattened approved NEXT gradient ground"/>',
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<pic:nvPicPr><pic:cNvPr id="1" name="ground.png"/><pic:cNvPicPr/></pic:nvPicPr>',
      `<pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(geo.trimW * EMU_PER_MM)}" cy="${Math.round(geo.trimH * EMU_PER_MM)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
      "</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>",
    ].join("");

  // The real, scannable code as a picture, placed on the same measured spot the
  // board prints it — Word previously carried only the link as text, so a
  // printed Word handout had nothing to scan.
  const qrBlocks = agendaBlocks(config);
  const qrPayload = (config.qrData ?? "").trim();
  const qrImage =
    qrPayload && qrBlocks.qr
      ? qrPng(qrPayload, {
          ink: agendaQrForeground(config),
          ground: agendaQrTransparent(config)
            ? agendaQrPlateColor(config)
            : agendaQrBackground(config),
          style: agendaQrStyle(config),
          modulePx: qrModulePxForPrint(qrPayload, qrBlocks.qr.edge),
        })
      : null;

  const qrDrawing = (rel: string): string => {
    if (!qrImage || !qrBlocks.qr) return "";
    const edge = Math.round(qrBlocks.qr.edge * EMU_PER_MM);
    return [
      "<w:r><w:drawing>",
      '<wp:anchor behindDoc="0" distT="0" distB="0" distL="0" distR="0" simplePos="0" locked="0" layoutInCell="1" allowOverlap="1" relativeHeight="2">',
      '<wp:simplePos x="0" y="0"/>',
      `<wp:positionH relativeFrom="page"><wp:posOffset>${Math.round(qrBlocks.qr.x * EMU_PER_MM)}</wp:posOffset></wp:positionH>`,
      `<wp:positionV relativeFrom="page"><wp:posOffset>${Math.round(qrBlocks.qr.y * EMU_PER_MM)}</wp:posOffset></wp:positionV>`,
      `<wp:extent cx="${edge}" cy="${edge}"/>`,
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
      "<wp:wrapNone/>",
      `<wp:docPr id="2" name="Agenda QR code" descr="QR code linking to ${esc(qrPayload)}"/>`,
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<pic:nvPicPr><pic:cNvPr id="2" name="qr.png"/><pic:cNvPicPr/></pic:nvPicPr>',
      `<pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${edge}" cy="${edge}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
      "</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>",
    ].join("");
  };

  const timeW = contentTwips * 0.17;
  const trackW = contentTwips * 0.2;
  const bodyW = contentTwips - timeW - trackW;
  const mmT = (mm: number) => Math.max(0, Math.round(mm * TWIPS_PER_MM));
  /**
   * Vertical space one line of a given printed size really occupies in Word.
   * Sizes are cap-height millimetres, Word sets a full line box, so a headline
   * takes more room on the page than its printed band — that difference is what
   * used to push the programme and footer off the sheet.
   */
  // Calibrated against a rendered export: a headline set from a printed
  // cap-height band occupies about twice that band as a Word line box.
  const lineMm = (sizeMm: number) => sizeMm * 1.98;
  const compensations: string[] = [];

  /** One programme page: header block, row table, footer and page stamp. */
  const buildPage = (cfg: AgendaConfig, groundRel: string): string => {
    const PL = agendaLayout(cfg);
    const B = agendaBlocks(cfg);
    const pageTitleHex = hex(agendaTitleInk(cfg));
    const rowCount = Math.max(1, (cfg.sessions ?? []).length);
    const rowPad = mmT(B.rowH * 0.16);

    // ── vertical budget, measured from the printed board ─────────────────────
    // The page margin is the safe inset, so every measured y becomes a distance
    // from the top of the Word text area. Walk the header with a cursor so the
    // line boxes Word really uses are accounted for instead of assumed.
    const hasEyebrow = !!(cfg.eyebrow ?? "").trim();
    const hasMeta = !!(cfg.meta ?? "").trim();
    let cursor = B.eyebrowY;
    const eyebrowBand = Math.max(
      B.titleY - B.eyebrowY,
      hasEyebrow ? lineMm(PL.eyebrowSize) : 0,
    );
    cursor += eyebrowBand;
    const titleGap = Math.max(0, B.titleY - cursor);
    cursor += titleGap;
    const titleBand = Math.max(B.metaY - B.titleY, lineMm(PL.titleSize));
    cursor += titleBand;
    const metaBand = Math.max(B.rowsTop - B.metaY, hasMeta ? lineMm(PL.metaSize) : 0);
    cursor += metaBand;
    const rowsTop = Math.max(B.rowsTop, cursor);
    const preRowGap = Math.max(0, rowsTop - cursor);

    const footLines = [
      (cfg.qrData ?? "").trim() ? 1 : 0,
      (cfg.footnote ?? "").trim() ? 1 : 0,
      (cfg.pageLabel ?? "").trim() ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    // Reserve the room Word really gives those lines, so the QR line and page
    // stamp stay on the sheet instead of starting a blank second page.
    // The footer band is a real table in the Word flow, so its own height counts
    // against the sheet as well as the footnote / page-stamp lines above it.
    const footMm =
      footLines * lineMm(PL.footSize) * 1.5 + (PL.footerBandH ?? 0) * 2.6 + 16 + rowCount * 1.4;

    // Space left on the sheet for the programme band plus the gap above the
    // footer. Everything must land inside it, or Word starts a second page.
    const budget = Math.max(20, geo.trimH - geo.safeInset - rowsTop - footMm);
    let rowH = B.rowH;
    let footGap = Math.max(0, B.footY - (B.rowsTop + B.rowH * rowCount));
    if (rowH * rowCount + footGap > budget) {
      footGap = Math.max(0, budget - rowH * rowCount);
      if (rowH * rowCount > budget) {
        rowH = budget / rowCount;
        footGap = 0;
        compensations.push(
          `Row band tightened to ${rowH.toFixed(1)} mm (from ${B.rowH.toFixed(
            1,
          )} mm) so the day stays on one Word page`,
        );
      }
    }
    const rowBand = mmT(rowH);

    // ── card mode: the Canva-style programme bands ───────────────────────────
    const cardMode = agendaRowStyle(cfg) === "card";
    const cardTimeW = contentTwips * 0.21;
    // Word tables are a fixed grid, so the parallel region is divided into as
    // many equal columns as the busiest slot needs; quieter slots merge the
    // spare columns back into the session body.
    const cardMaxPar = Math.min(
      AGENDA_MAX_PARALLEL,
      (cfg.sessions ?? []).reduce((m, s) => Math.max(m, agendaParallels(s).length), 0),
    );
    const cardSplit = agendaSplitWidths(contentTwips, 0, cardMaxPar);
    const cardParColW = cardSplit.cardW;
    const cardParallelW = cardParColW * Math.max(1, cardMaxPar);
    const cardBodyW = cardMaxPar
      ? cardSplit.leftW - cardTimeW
      : contentTwips - cardTimeW - cardParallelW;

    // Card bands carry copy of very different lengths, so each band asks for the
    // height its own copy really needs in Word line boxes; the whole set is then
    // scaled to the sheet so a long day still lands on one page instead of
    // clipping a speaker's name at the edge of the band.
    const cardLineCount = (text: string, sizeMm: number, colTwips: number) =>
      agendaTextLines(text, sizeMm, colTwips / TWIPS_PER_MM - 6);
    // Parallel columns in Word are as narrow as they are on the board, so the
    // card copy uses the same fitted type: at the band sizes three or four
    // tracks wrapped to one character a line in Word.
    const cardType = agendaCardType(
      PL,
      cardParColW / TWIPS_PER_MM,
      cardMaxPar,
      (cfg.sessions ?? []).reduce(
        (m, s) =>
          agendaParallels(s).reduce((n, p) => Math.max(n, agendaLongestWord(p.title)), m),
        0,
      ),
    );
    const cardWanted = (cfg.sessions ?? []).map((s) => {
      const pars = agendaParallels(s);
      const bodyCol = cardBodyW + (cardMaxPar - pars.length) * cardParColW;
      const left =
        cardLineCount(s.title ?? "", PL.titleRowSize, bodyCol) * lineMm(PL.titleRowSize) +
        cardLineCount(s.detail ?? "", PL.detailSize, bodyCol) * lineMm(PL.detailSize);
      const right = pars.reduce(
        (tallest, p) =>
          Math.max(
            tallest,
            cardLineCount(p.title, cardType.titleSize, cardParColW) *
              lineMm(cardType.titleSize) +
              cardLineCount(p.speaker ?? "", cardType.detailSize, cardParColW) *
                lineMm(cardType.detailSize) +
              cardLineCount(p.detail, cardType.detailSize, cardParColW) *
                lineMm(cardType.detailSize) +
              lineMm(cardType.timeSize),
          ),
        0,
      );
      return Math.max(lineMm(PL.titleRowSize) * 1.2, left, right) + 3.4;
    });
    const cardGapMm = 1.2 * Math.max(0, cardWanted.length - 1);
    // Word's own line boxes run a shade taller than the model on a dense day, so
    // every band keeps a hair of slack: without it the footnote and footer band
    // tipped onto a blank second page.
    const cardBudget = Math.max(
      20,
      (budget - cardGapMm) * 0.97 - cardWanted.length * 1.1,
    );
    const cardTotal = cardWanted.reduce((a, b) => a + b, 0) || 1;
    const cardScale = cardTotal > cardBudget ? cardBudget / cardTotal : 1;
    if (cardScale < 1) {
      compensations.push(
        `Programme bands scaled to ${(cardScale * 100).toFixed(0)}% so the day stays on one Word page`,
      );
    }
    // A Word row height is only a minimum: shrinking the band cannot shrink the
    // copy inside it. So when the day does not fit, the card type shrinks with
    // the bands — otherwise the footnote and brand band tip onto a blank page.
    const copyScale = cardScale < 1 ? Math.max(0.72, Math.sqrt(cardScale)) : 1;
    const cardBodyType = {
      titleSize: PL.titleRowSize * copyScale,
      detailSize: PL.detailSize * copyScale,
    };
    const cardTimeSize = PL.timeSize * copyScale;
    const cardParType = {
      timeSize: cardType.timeSize * copyScale,
      titleSize: cardType.titleSize * copyScale,
      detailSize: cardType.detailSize * copyScale,
    };
    if (copyScale < 1) {
      compensations.push(
        `Card type set at ${(copyScale * 100).toFixed(0)}% so the day stays on one Word page`,
      );
    }
    const cardBands = cardWanted.map((h) => mmT(h * cardScale));

    const cardRows = (cfg.sessions ?? [])
      .map((session, i) => {
        const muted = session.muted;
        const BAND = agendaBandPalette(cfg);
        const bandInk = hex(BAND.ink);
        const parInk = hex(BAND.parallelInk);
        // Word shading is opaque, so the band's translucency is baked in: its
        // fill is composited over the ground colour at this row's height.
        const ground = groundColorAt(cfg, (i + 0.5) / Math.max(1, (cfg.sessions ?? []).length));
        // A veil treatment fades top to clear; Word cannot gradient a table
        // shading, so the band takes the mid point of that fade over the ground.
        const veilAlpha = BAND.fade ? (BAND.fade.top + BAND.fade.bottom) / 2 : null;
        const fill = agendaBandComposite(
          i % 2 === 0 ? BAND.fillA : BAND.fillB,
          veilAlpha ?? BAND.fillAlpha,
          ground,
        );
        const parFill = agendaBandComposite(
          BAND.parallel,
          veilAlpha ?? BAND.parallelAlpha,
          ground,
        );
        const copy = (
          title: string,
          detail: string,
          copyInk = bandInk,
          speaker = "",
          /** Fitted card sizes; the main band keeps its own type. */
          T: { titleSize: number; detailSize: number } = cardBodyType,
        ) =>
          [
            para(
              run(title, {
                size: halfPt(T.titleSize),
                color: copyInk,
                bold: !muted,
              }),
              { afterTwips: 0, lineTwips: mmT(T.titleSize * 1.4) },
            ),
            // Speaker line: its own Word paragraph so it stays editable apart
            // from the notes underneath it.
            speaker.trim()
              ? para(run(speaker, { size: halfPt(T.detailSize), color: copyInk, bold: true }), {
                  beforeTwips: mmT(T.detailSize * 0.3),
                  afterTwips: 0,
                  lineTwips: mmT(T.detailSize * 1.4),
                })
              : "",
            detail.trim()
              ? para(run(detail, { size: halfPt(T.detailSize), color: copyInk }), {
                  beforeTwips: mmT(T.detailSize * 0.35),
                  afterTwips: 0,
                  lineTwips: mmT(T.detailSize * 1.4),
                })
              : "",
          ].join("");
        const pars = agendaParallels(session);
        const spare = cardMaxPar - pars.length;
        return [
          `<w:tr><w:trPr><w:trHeight w:val="${
            cardBands[i] ?? rowBand
          }" w:hRule="atLeast"/><w:cantSplit/></w:trPr>`,
          cell(
            cardTimeW,
            para(run(session.time ?? "", { size: halfPt(cardTimeSize), color: bandInk, bold: true }), {
              afterTwips: 0,
              lineTwips: mmT(cardTimeSize * 1.4),
            }),
            rowPad,
            { fill, vAlign: "top", rail: BAND.rail, railW: BAND.railW * PL.k },
          ),
          // The body takes back any parallel column this slot does not use.
          cell(
            cardBodyW + spare * cardParColW,
            // The tracked stage label prints above the title, as it does on the
            // board and in the press file.
            ((session.track ?? "").trim()
              ? para(
                  run(session.track!.toUpperCase(), {
                    size: halfPt(PL.trackSize),
                    color: bandInk,
                    bold: true,
                  }),
                  { afterTwips: 0, lineTwips: mmT(PL.trackSize * 1.6) },
                )
              : "") + copy(session.title ?? "", session.detail ?? ""),
            rowPad,
            spare > 0 ? { fill, span: spare + 1, vAlign: "top" } : { fill, vAlign: "top" },
          ),

          pars
            .map((p) =>
              cell(
                cardParColW,
                // A track with its own start time prints it above the title; the
                // row's time cell only carries the main band's slot time.
                // A track with its own start time prints it; otherwise it shows
                // the slot's time, exactly as the board and the press file do.
                para(
                  run((p.time ?? "").trim() || (session.time ?? ""), {
                    size: halfPt(cardParType.timeSize),
                    color: parInk,
                    bold: true,
                  }),
                  { afterTwips: 0, lineTwips: mmT(cardParType.timeSize * 1.4) },
                ) + copy(p.title, p.detail, parInk, p.speaker ?? "", cardParType),
                rowPad,
                {
                  fill: parFill,
                  vAlign: "top",
                  rail: BAND.rail,
                  railW: BAND.railW * PL.k,
                },
              ),
            )
            .join(""),
          "</w:tr>",
          // A hairline spacer row keeps the printed gutter between bands.
          `<w:tr><w:trPr><w:trHeight w:val="${mmT(1.2)}" w:hRule="exact"/></w:trPr>`,
          cell(contentTwips, "", 0, { span: cardMaxPar + 2 }),
          "</w:tr>",
        ].join("");
      })
      .join("");

    const rows = (cfg.sessions ?? [])
      .map((session) => {
        const muted = session.muted;
        const rowInk = muted ? hex(ink, "8A93A6") : inkHex;
        const body = [
          para(
            run(session.title ?? "", {
              size: halfPt(PL.titleRowSize),
              color: rowInk,
              bold: !muted,
            }),
            { afterTwips: 0, lineTwips: mmT(PL.titleRowSize * 1.2) },
          ),
          (session.detail ?? "").trim()
            ? para(run(session.detail, { size: halfPt(PL.detailSize), color: rowInk }), {
                beforeTwips: mmT(PL.detailSize * 0.35),
                afterTwips: 0,
                lineTwips: mmT(PL.detailSize * 1.25),
              })
            : "",
        ].join("");
        return [
          // Exact printed band height, and never split across a page.
          // atLeast, not exact: the printed band is the target, but a session
          // title that wraps must never have its second line sliced off.
          `<w:tr><w:trPr><w:trHeight w:val="${rowBand}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>`,
          cell(
            timeW,
            para(
              run(session.time ?? "", { size: halfPt(PL.timeSize), color: rowInk, bold: true }),
              { afterTwips: 0, lineTwips: mmT(PL.timeSize * 1.2) },
            ),
            rowPad,
          ),
          cell(bodyW, body, rowPad),
          cell(
            trackW,
            para(
              run(session.track ?? "", {
                size: halfPt(PL.trackSize),
                color: rowInk,
                caps: true,
                spacing: 20,
              }),
              { afterTwips: 0, align: "right", lineTwips: mmT(PL.trackSize * 1.4) },
            ),
            rowPad,
          ),
          "</w:tr>",
        ].join("");
      })
      .join("");

    const table = [
      "<w:tbl><w:tblPr>",
      `<w:tblW w:w="${Math.round(contentTwips)}" w:type="dxa"/>`,
      '<w:tblInd w:w="0" w:type="dxa"/>',
      cardMode
        ? ""
        : '<w:tblBorders><w:insideH w:val="single" w:sz="2" w:color="7F8798"/></w:tblBorders>',
      // Zero default cell padding: the row padding is measured per row above.
      '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>',
      '<w:tblLayout w:type="fixed"/>',
      '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>',
      "</w:tblPr>",
      "<w:tblGrid>",
      cardMode
        ? `<w:gridCol w:w="${Math.round(cardTimeW)}"/><w:gridCol w:w="${Math.round(cardBodyW)}"/>` +
          Array.from(
            { length: cardMaxPar },
            () => `<w:gridCol w:w="${Math.round(cardParColW)}"/>`,
          ).join("")
        : `<w:gridCol w:w="${Math.round(timeW)}"/><w:gridCol w:w="${Math.round(bodyW)}"/><w:gridCol w:w="${Math.round(trackW)}"/>`,
      "</w:tblGrid>",
      cardMode ? cardRows : rows,
      "</w:tbl>",
    ].join("");

    // Card mode keeps the lockup with the room line and the date right of it, and
    // the eyebrow plus the headline underneath, exactly as the printed board and
    // the PowerPoint deck read. Walk that header from the measured positions so
    // no empty band opens a hole above the programme.
    // A code parked in the header narrows the room / date line: use the same
    // right edge the board measured, or Word prints the room under the QR.
    const cardLocRight = Math.max(
      0,
      mmT(geo.safeInset + PL.contentW - (B.location?.right ?? geo.safeInset + PL.contentW)),
    );
    const cardHeader =
      cardMode && B.location
        ? [
            (cfg.locationLine ?? "").trim()
              ? para(
                  run(agendaLocationText(cfg), {
                    size: halfPt(PL.locSize),
                    color: agendaLocation(cfg).ink ?? inkHex,
                    caps: false,
                    bold: agendaLocation(cfg).bold,
                    spacing: agendaLocation(cfg).weight === "regular" ? 20 : 30,
                  }),
                  {
                    afterTwips: 0,
                    align: docxLocAlign(agendaLocation(cfg).align),
                    rightTwips: agendaLocation(cfg).align === "right" ? cardLocRight : 0,
                    lineTwips: mmT(lineMm(PL.locSize) * 0.62),
                  },
                )
              : "",
            hasMeta
              ? para(run(cfg.meta, { size: halfPt(PL.metaSize), color: inkHex }), {
                  afterTwips: 0,
                  align: docxLocAlign(agendaLocation(cfg).align),
                  rightTwips: agendaLocation(cfg).align === "right" ? cardLocRight : 0,
                  lineTwips: mmT(lineMm(PL.metaSize) * 0.62),
                })
              : "",
            // Close the measured gap between the room / date block and the
            // eyebrow so the headline lands where the board prints it.
            spacer(
              mmT(
                Math.max(
                  1,
                  B.eyebrowY -
                    (B.location?.y ?? B.eyebrowY) -
                    ((cfg.locationLine ?? "").trim() ? lineMm(PL.locSize) * 0.62 : 0) -
                    (hasMeta ? lineMm(PL.metaSize) * 0.62 : 0),
                ),
              ),
            ),
            hasEyebrow
              ? para(
                  run(cfg.eyebrow, {
                    size: halfPt(PL.eyebrowSize),
                    color: inkHex,
                    caps: true,
                    bold: true,
                    spacing: 40,
                  }),
                  { afterTwips: 0, lineTwips: mmT(Math.max(1, B.titleY - B.eyebrowY)) },
                )
              : "",
            (cfg.title ?? "").trim()
              ? para(
                  run(cfg.title ?? "", {
                    size: halfPt(PL.titleSize),
                    color: pageTitleHex,
                    bold: true,
                    spacing: -20,
                  }),
                  { afterTwips: 0, lineTwips: mmT(Math.max(1, B.rowsTop - B.titleY)) },
                )
              : "",
          ].join("")
        : null;

    const header = [
      hasEyebrow
        ? para(
            run(cfg.eyebrow, {
              size: halfPt(PL.eyebrowSize),
              color: inkHex,
              caps: true,
              bold: true,
              spacing: 40,
            }),
            { afterTwips: 0, lineTwips: mmT(eyebrowBand) },
          )
        : spacer(mmT(eyebrowBand)),
      titleGap > 0.2 ? spacer(mmT(titleGap)) : "",
      para(
        run(cfg.title ?? "", {
          size: halfPt(PL.titleSize),
          color: pageTitleHex,
          bold: true,
          spacing: -20,
        }),
        { afterTwips: 0, lineTwips: mmT(titleBand) },
      ),
      // Card mode carries the room line and the date on the right of the header,
      // matching the printed board instead of stacking them on the left.
      cardMode && (cfg.locationLine ?? "").trim()
        ? para(
            run(agendaLocationText(cfg), {
              size: halfPt(PL.metaSize),
              color: agendaLocation(cfg).ink ?? inkHex,
              caps: false,
              bold: agendaLocation(cfg).bold,
              spacing: 30,
            }),
            {
              afterTwips: 0,
              align: docxLocAlign(agendaLocation(cfg).align),
              lineTwips: mmT(PL.metaSize * 1.6),
            },
          )
        : "",
      hasMeta
        ? para(run(cfg.meta, { size: halfPt(PL.metaSize), color: inkHex }), {
            afterTwips: 0,
            align:
              cardMode && (cfg.locationLine ?? "").trim()
                ? docxLocAlign(agendaLocation(cfg).align)
                : "left",
            lineTwips: mmT(metaBand),
          })
        : spacer(mmT(metaBand)),
      preRowGap > 0.2 ? spacer(mmT(preRowGap)) : "",
    ].join("");

    const footer = [
      (cfg.qrData ?? "").trim()
        ? para(
            run(`${(cfg.qrCaption ?? "").trim() || "Scan for the live agenda"}: ${cfg.qrData}`, {
              size: halfPt(PL.footSize),
              color: inkHex,
            }),
            { afterTwips: 0, lineTwips: mmT(PL.footSize * 1.8) },
          )
        : "",
      (cfg.footnote ?? "").trim()
        ? para(run(cfg.footnote, { size: halfPt(PL.footSize), color: inkHex }), {
            afterTwips: 0,
            lineTwips: mmT(PL.footSize * 1.6),
          })
        : "",
      (cfg.pageLabel ?? "").trim()
        ? para(
            run(cfg.pageLabel ?? "", {
              size: halfPt(PL.footSize),
              color: inkHex,
              caps: true,
              bold: true,
              spacing: 30,
            }),
            { afterTwips: 0, align: "right", lineTwips: mmT(PL.footSize * 1.6) },
          )
        : "",
    ].join("");

    // The printed card board finishes on a solid brand band carrying the event
    // URL and dates in white — reproduced here as a shaded full-width table.
    const foot = agendaFooter(cfg);
    const footInk = hex(foot.onGround ? inkHex : foot.ink, "FFFFFF");
    const footCells: { text: string; align: "left" | "center" | "right"; share: number }[] = [
      { text: foot.left, align: "left", share: foot.centre ? 0.4 : 0.62 },
      ...(foot.centre
        ? [{ text: foot.centre, align: "center" as const, share: 0.28 }]
        : []),
      { text: foot.right, align: "right", share: foot.centre ? 0.32 : 0.38 },
    ];
    const footerBand =
      cardMode && foot.style !== "clear" && footCells.some((c) => c.text)
        ? [
            "<w:tbl><w:tblPr>",
            `<w:tblW w:w="${Math.round(contentTwips)}" w:type="dxa"/>`,
            '<w:tblInd w:w="0" w:type="dxa"/>',
            '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>',
            '<w:tblLayout w:type="fixed"/>',
            "</w:tblPr>",
            `<w:tblGrid>${footCells
              .map((c) => `<w:gridCol w:w="${Math.round(contentTwips * c.share)}"/>`)
              .join("")}</w:tblGrid>`,
            `<w:tr><w:trPr><w:trHeight w:val="${mmT(
              Math.max(6, PL.footSize * foot.heightMul),
            )}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>`,
            ...footCells.map((c) => {
              // Word's stand-in face sets the tracked footer wider than Geist, so
              // each slot shrinks to hold one line instead of wrapping and
              // dropping copy off the trimmed edge.
              const usable = Math.max(4, B.contentW * c.share - PL.footSize * 1.6);
              const est = Math.max(1, c.text.length * (PL.footSize * 0.62 + 0.35));
              const size = Math.max(
                PL.footSize * 0.6,
                Math.min(PL.footSize, (PL.footSize * usable) / est),
              );
              return cell(
                contentTwips * c.share,
                para(
                  run(c.text, {
                    size: halfPt(size),
                    color: footInk,
                    caps: false,
                    bold: true,
                    spacing: 30,
                  }),
                  { afterTwips: 0, align: c.align, lineTwips: mmT(size * 1.6) },
                ),
                mmT(PL.footSize * 0.8),
                foot.style === "band"
                  ? { fill: foot.fill }
                  : // The hairline foot prints a rule above the copy, exactly as the
                    // press file and PowerPoint draw it.
                    foot.style === "hairline"
                    ? { topRule: footInk }
                    : {},

              );
            }),

            "</w:tr></w:tbl>",
          ].join("")
        : "";

    return [
      // The ground rides in the first spacer so the picture costs no extra
      // vertical space — that stray line was pushing every block down a step.
      spacer(
        mmT(
          cardHeader
            ? Math.max(0, (B.location?.y ?? B.rowsTop) - geo.safeInset)
            : Math.max(0, B.eyebrowY - geo.safeInset),
        ),
        backgroundDrawing(groundRel) + qrDrawing("rIdQr"),
      ),
      cardHeader ?? header,
      table,
      // Card mode: whatever the bands did not use drops the footer band to the
      // foot of the sheet, where the printed board carries it.
      (cardMode
        ? Math.max(0, cardBudget - cardWanted.reduce((a, b) => a + b, 0) * cardScale)
        : footGap) > 0.2
        ? spacer(
            mmT(
              cardMode
                ? Math.max(0, cardBudget - cardWanted.reduce((a, b) => a + b, 0) * cardScale)
                : footGap,
            ),
          )
        : "",
      footer,
      footerBand,
    ].join("");
  };

  const pageBreak =
    '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';

  // ── booklet extras ────────────────────────────────────────────────────────
  // A booklet page is plain Word content: the cover sits on the same flattened
  // ground as the programme, and each rendered page is an inline picture with a
  // running head and a credit line, so the operator can still edit every word.
  const bkRun = (text: string, sizeMm: number, colorHex: string, bold: boolean, caps = false) =>
    `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}"/>` +
    `<w:color w:val="${colorHex}"/><w:sz w:val="${halfPt(sizeMm)}"/>` +
    `${caps ? '<w:caps/><w:spacing w:val="30"/>' : ""}</w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

  const bkPara = (inner: string, afterMm = 0) =>
    `<w:p><w:pPr><w:spacing w:after="${mmT(afterMm)}" w:line="240" w:lineRule="auto"/></w:pPr>${inner}</w:p>`;

  const inlinePicture = (rel: string, id: number, name: string, wMm: number, hMm: number) =>
    [
      "<w:r><w:drawing>",
      '<wp:inline distT="0" distB="0" distL="0" distR="0">',
      `<wp:extent cx="${Math.round(wMm * EMU_PER_MM)}" cy="${Math.round(hMm * EMU_PER_MM)}"/>`,
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>',
      `<wp:docPr id="${id}" name="${esc(name)}" descr="${esc(name)}"/>`,
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      `<pic:nvPicPr><pic:cNvPr id="${id}" name="${esc(name)}"/><pic:cNvPicPr/></pic:nvPicPr>`,
      `<pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(wMm * EMU_PER_MM)}" cy="${Math.round(hMm * EMU_PER_MM)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
      "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>",
    ].join("");

  const cover = extras?.cover ?? null;
  // A composed cover ground (location picture plus its ink veil) replaces the
  // gradient behind the cover copy. The copy itself stays editable Word text.
  const coverGround = cover ? (extras?.coverGround ?? null) : null;
  const imagePages = extras?.imagePages ?? [];
  const contentMm = contentTwips / TWIPS_PER_MM;

  // A cover picture is veiled in brand ink, so ink-coloured copy would vanish
  // into it: every cover line prints white over a picture ground.
  const coverInk = coverGround ? "FFFFFF" : inkHex;
  const coverTitle = coverGround ? "FFFFFF" : titleHex;
  const coverPage = cover
    ? [
        bkPara(backgroundDrawing("rIdCover"), 0),
        bkPara(bkRun(cover.eyebrow ?? "", L.eyebrowSize, coverInk, true, true), 6),
        bkPara(bkRun(cover.title ?? "", L.titleSize, coverTitle, true), 5),
        (cover.subtitle ?? "").trim() ? bkPara(bkRun(cover.subtitle, L.metaSize, coverInk, false), 4) : "",
        (cover.footnote ?? "").trim() ? bkPara(bkRun(cover.footnote, L.footSize, coverInk, false), 0) : "",
      ].join("")
    : "";

  const artPages = imagePages.map((art, i) => {
    const scale = Math.min(1, contentMm / Math.max(1, art.wPx));
    const wMm = Math.min(contentMm, art.wPx * scale);
    const hMm = art.hPx * (wMm / Math.max(1, art.wPx));
    // The artwork must not push its own caption onto a second page.
    const maxH = Math.max(40, geo.trimH - geo.safeInset * 2 - lineMm(L.titleSize) - lineMm(L.footSize) * 2);
    const fitH = Math.min(hMm, maxH);
    const fitW = wMm * (fitH / Math.max(1, hMm));
    return [
      // Booklet artwork pages print on plain white paper, so the running head
      // uses the paper ink — never the board's on-ground title colour, which
      // can be white or aqua and would vanish here.
      bkPara(bkRun(art.title ?? "", L.titleSize * 0.62, "03002C", true, true), 4),
      bkPara(inlinePicture(`rIdArt${i + 1}`, 40 + i, art.id || `page-${i + 1}`, fitW, fitH), 3),
      (art.caption ?? "").trim() ? bkPara(bkRun(art.caption, L.footSize, inkHex, false), 0) : "",
    ].join("");
  });

  const programme = extras?.omitAgenda
    ? []
    : pages.map((pageDef, i) => buildPage(pageDef.config, `rIdGround${i === 0 ? "" : i + 1}`));

  const body = [coverPage, ...programme, ...artPages].filter(Boolean).join(pageBreak);

  const document = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
    ' xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
    ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
    "<w:body>",
    body,
    "<w:sectPr>",
    `<w:pgSz w:w="${pageW}" w:h="${pageH}" w:orient="${geo.trimW > geo.trimH ? "landscape" : "portrait"}"/>`,
    // The top and side margins are the printed safe inset so measured y values
    // land true. The bottom margin is trimmed to the bleed so Word's slightly
    // taller line boxes cannot tip the footer onto a second page.
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${Math.round(
      Math.min(margin, 6 * TWIPS_PER_MM),
    )}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/>`,
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
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>',
      '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>',
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
      ...pages.map(
        (_p, i) =>
          `<Relationship Id="rIdGround${i === 0 ? "" : i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ground.png"/>`,
      ),
      cover
        ? `<Relationship Id="rIdCover" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${
            coverGround ? "cover.png" : "ground.png"
          }"/>`
        : "",
      ...imagePages.map(
        (_a, i) =>
          `<Relationship Id="rIdArt${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/art${i + 1}.png"/>`,
      ),
      qrImage
        ? '<Relationship Id="rIdQr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qr.png"/>'
        : "",
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
      '<Relationship Id="rIdFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
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
      "</w:rPr></w:rPrDefault>",
      // Paragraph defaults: no Word-added spacing, single leading. Without this
      // Word applies its own Normal style spacing on top of the print grid.
      "<w:pPrDefault><w:pPr>",
      '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>',
      '<w:ind w:left="0" w:right="0" w:firstLine="0"/>',
      "</w:pPr></w:pPrDefault>",
      "</w:docDefaults>",
      // "Normal" must exist and must be flat too, otherwise Word substitutes its
      // built-in Normal (10pt body, 8pt after) and every measured gap shifts.
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>',
      `<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>`,
      `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/><w:sz w:val="${halfPt(
        L.detailSize,
      )}"/></w:rPr></w:style>`,
      "</w:styles>",
    ].join(""),
  );
  zip.file(
    "word/settings.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      // Modern layout mode, so Word does not re-flow the sheet with legacy rules.
      '<w:defaultTabStop w:val="720"/>',
      '<w:compat><w:compatSetting w:name="compatibilityMode"',
      ' w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>',
      "</w:settings>",
    ].join(""),
  );
  zip.file(
    "word/fontTable.xml",
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      // Geist is not installed on most machines. Naming a metric-compatible
      // alternative keeps the substitute close instead of letting Word fall back
      // to a serif with different widths, which is what re-wrapped the rows.
      `<w:font w:name="${FONT}"><w:altName w:val="${FONT_FALLBACK}"/>`,
      '<w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>',
      `<w:font w:name="${FONT_FALLBACK}"><w:altName w:val="Arial"/>`,
      '<w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>',
      "</w:fonts>",
    ].join(""),
  );
  zip.file("word/media/ground.png", groundBytes);
  if (coverGround) zip.file("word/media/cover.png", coverGround);
  imagePages.forEach((art, i) => zip.file(`word/media/art${i + 1}.png`, art.png));
  if (qrImage) zip.file("word/media/qr.png", qrImage.bytes);
  zip.file("word/document.xml", document);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return {
    blob,
    notes: [
      `Page set to ${geo.sizeName} (${geo.trimW} × ${geo.trimH} mm) with ${Math.round(geo.safeInset)} mm safe margins`,
      "Approved gradient ground plus the division lockup flattened to a full-page picture behind the editable text",
      `${pages.length} page${pages.length === 1 ? "" : "s"} across ${pages[pages.length - 1]!.dayCount} programme day${pages[pages.length - 1]!.dayCount === 1 ? "" : "s"}, each with the flattened ground behind it`,
      `Live editable Geist text at the printed sizes · programme rows in Word tables`,
      `Row band reference: ${blocks.rowH.toFixed(1)} mm per row on the printed board`,
      ...(cover
        ? [
            coverGround
              ? "Cover page carries the editable cover copy over the chosen location picture, veiled in brand ink so every line stays readable"
              : "Cover page carries the editable cover copy on the approved ground",
          ]
        : []),
      ...(imagePages.length
        ? [
            `${imagePages.length} rendered page${imagePages.length === 1 ? "" : "s"} placed as pictures with printed credit lines`,
          ]
        : []),
      `Asset: ${agendaName(config)}`,
    ],
  };
}
