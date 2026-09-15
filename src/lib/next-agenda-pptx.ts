// -----------------------------------------------------------------------------
// NEXT division agenda — editable PowerPoint export.
//
// The event/agenda boards had no PPTX path at all: the export package shipped a
// press PDF, an Illustrator twin and a Word file, so anyone presenting the
// programme from a deck had to screenshot the board. This builds a real deck
// instead — one slide per resolved agenda page (multi-day and overflow pages
// included), sized to the board's own trim so nothing is cropped or letterboxed.
//
// Everything except the approved gradient ground is native PowerPoint content:
// the eyebrow, headline, date/venue line, every programme row (a real table),
// the QR caption and the footer are editable objects carrying the printed Geist
// sizes and the approved inks. The ground is the same flattened gradient (with
// the approved division lockup burned in at its printed position) the Word
// export uses, so all three outputs agree pixel-for-pixel on brand paint.
// -----------------------------------------------------------------------------

import PptxGenJS from "pptxgenjs";

import {
  AGENDA_BAND,
  agendaBandPalette,
  agendaLocation,
  agendaLocationText,
  agendaBlocks,
  agendaGeometry,
  agendaInk,
  agendaName,
  agendaPages,
  agendaCardType,
  agendaLongestWord,
  agendaParallels,
  agendaQrBackground,
  agendaQrForeground,
  agendaQrStyle,
  agendaQrTransparent,
  agendaRowStyle,
  agendaSlug,
  agendaTitleInk,
  type AgendaConfig,
} from "./next-agenda";
import { agendaCopyInk } from "./next-agenda-contrast";
import type { BookletExtras } from "./next-booklet";
import { flattenedGroundPng } from "./next-agenda-docx";
import { qrModulePxForPrint, qrPng, qrPngDataUrl } from "./qr-print";

const MM_TO_IN = 1 / 25.4;
/** Cap-height millimetres → points, the same conversion the Word export uses. */
const MM_TO_PT = 2.83465 / 0.72;
const FONT = "Geist";

function hex(color: string, fallback = "000000"): string {
  const clean = (color || "").trim().replace("#", "");
  return /^[0-9a-f]{6}$/i.test(clean) ? clean.toUpperCase() : fallback;
}

function pt(mm: number): number {
  return Math.max(6, Math.round(mm * MM_TO_PT * 10) / 10);
}


async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the agenda ground"));
    reader.readAsDataURL(blob);
  });
}

/**
 * The real QR matrix as a PNG at print density, painted with the same module
 * geometry, ink and plate the preview and the press PDF use. Density is derived
 * from the printed edge size so the picture holds 300dpi on an A1 board instead
 * of a fixed pixel guess.
 */
function qrDataUrl(
  payload: string,
  ink: string,
  ground: string,
  style: "block" | "rounded" | "dot" = "block",
  transparent = false,
  edgeMm = 48,
): string | null {
  const png = qrPng(payload, {
    ink,
    ground,
    style,
    transparent,
    modulePx: qrModulePxForPrint(payload, edgeMm),
  });
  return png ? qrPngDataUrl(png) : null;
}

export type AgendaPptxResult = {
  blob: Blob;
  filename: string;
  slideCount: number;
  /** Human-readable notes surfaced in the export README / UI. */
  notes: string[];
};

/**
 * Build the agenda deck. One slide per resolved page; the deck's slide size is
 * the board's trim, so a 16:9 holding screen exports as a normal widescreen
 * deck while an A2 board exports at its own aspect instead of being squashed.
 */
export async function buildAgendaPptx(
  config: AgendaConfig,
  /** Booklet mode: a cover slide in front and rendered artwork slides behind. */
  extras?: BookletExtras & { omitAgenda?: boolean },
): Promise<AgendaPptxResult> {
  const pages = agendaPages(config);
  const geo = agendaGeometry(config);
  const face = config.face ?? "dark";
  const inkHex = hex(agendaCopyInk(config).hex, face === "light" ? "03002C" : "FFFFFF");
  const groundHex = face === "light" ? "EEF1F7" : "03002C";
  // A muted session reads as lighter weight, not a lighter ink: the gradient
  // grounds run light at one end, so a dimmed grey (the previous 8A93A6) fell
  // below contrast there. Same rule the Word export follows.
  const mutedHex = inkHex;
  const notes: string[] = [];

  const pptx = new PptxGenJS();
  const slideW = geo.trimW * MM_TO_IN;
  const slideH = geo.trimH * MM_TO_IN;
  pptx.defineLayout({ name: "NEXT_AGENDA", width: slideW, height: slideH });
  pptx.layout = "NEXT_AGENDA";
  pptx.author = "TransPerfect NEXT";
  pptx.title = agendaName(config);

  // One flattened ground per face/format — every page paints the same approved
  // gradient, so the bytes are shared instead of duplicated per slide.
  let ground: string | null = null;
  try {
    ground = await blobToDataUrl(
      await flattenedGroundPng(config, {
        w: (geo.trimW / 25.4) * 150,
        h: (geo.trimH / 25.4) * 150,
      }),
    );
  } catch {
    notes.push("Gradient ground unavailable in this browser — slides use a flat brand fill.");
  }

  const inMm = (mm: number) => mm * MM_TO_IN;
  const bytesToDataUrl = (bytes: Uint8Array): string => {
    let bin = "";
    for (const byte of bytes) bin += String.fromCharCode(byte);
    return `data:image/png;base64,${btoa(bin)}`;
  };

  // ── booklet cover slide ───────────────────────────────────────────────────
  if (extras?.cover) {
    const L0 = agendaBlocks(pages[0]!.config).layout;
    const cover = extras.cover;
    const s = pptx.addSlide();
    if (ground) {
      s.addImage({ data: ground, x: 0, y: 0, w: slideW, h: slideH, objectName: "NEXT booklet cover ground" });
    } else {
      s.background = { color: groundHex };
    }
    const pad = geo.safeInset;
    let y = pad;
    const line = (text: string, sizeMm: number, bold: boolean, caps: boolean, opacity?: number) => {
      if (!text.trim()) return;
      s.addText(caps ? text.toUpperCase() : text, {
        x: inMm(pad),
        y: inMm(y),
        w: inMm(geo.trimW - pad * 2),
        h: inMm(sizeMm * 2.2),
        fontFace: FONT,
        fontSize: pt(sizeMm),
        bold,
        charSpacing: caps ? 2 : 0,
        color: inkHex,
        transparency: opacity,
        valign: "top",
        margin: 0,
      });
      y += sizeMm * 2.4;
    };
    line(cover.eyebrow ?? "", L0.eyebrowSize, true, true, 18);
    line(cover.title ?? "", L0.titleSize, true, true);
    line(cover.subtitle ?? "", L0.metaSize, false, false, 10);
    if ((cover.footnote ?? "").trim()) {
      s.addText(cover.footnote, {
        x: inMm(pad),
        y: inMm(geo.trimH - pad - L0.footSize * 2.4),
        w: inMm(geo.trimW - pad * 2),
        h: inMm(L0.footSize * 2.2),
        fontFace: FONT,
        fontSize: pt(L0.footSize),
        color: inkHex,
        transparency: 30,
        valign: "top",
        margin: 0,
      });
    }
    notes.push("Cover slide carries the editable cover copy on the approved ground.");
  }

  for (const page of extras?.omitAgenda ? [] : pages) {
    const cfg = page.config;
    const b = agendaBlocks(cfg);
    const L = b.layout;
    const s = pptx.addSlide();
    const inX = (mm: number) => mm * MM_TO_IN;

    if (ground) {
      s.addImage({
        data: ground,
        x: 0,
        y: 0,
        w: slideW,
        h: slideH,
        objectName: "NEXT agenda ground",
      });
    } else {
      s.background = { color: groundHex };
    }

    // Header bands come from the printed board: each block owns the space up to
    // the next one, and the line pitch is set to that band so PowerPoint's own
    // (larger) line box cannot push the headline down onto the date line.
    const eyebrowBand = Math.max(L.eyebrowSize * 1.6, b.titleY - b.eyebrowY);
    const titleBand = Math.max(L.titleSize * 1.15, b.metaY - b.titleY);
    const metaBand = Math.max(L.metaSize * 1.6, b.rowsTop - b.metaY);

    if ((cfg.eyebrow ?? "").trim()) {
      s.addText(cfg.eyebrow.toUpperCase(), {
        x: inX(b.x),
        y: inX(b.eyebrowY),
        w: inX(b.headW),
        h: inX(eyebrowBand),
        fontFace: FONT,
        fontSize: pt(L.eyebrowSize),
        // Pitch the eyebrow to its own line, not the whole band: a band-sized
        // pitch dropped its baseline to the foot of the space, where the
        // headline starts, and the two printed through each other.
        lineSpacing: pt(L.eyebrowSize * 1.4),

        bold: true,
        charSpacing: 3,
        color: inkHex,
        valign: "top",
        margin: 0,
      });
    }
    // PowerPoint's line box is taller than the printed band, so the headline is
    // hung from the bottom of the space the board leaves above the programme:
    // the descender lands on the first row's edge instead of through it.
    const titleRoom = Math.max(L.titleSize * 1.15, b.rowsTop - b.titleY);
    // Hang the title from the foot of its space, but never above the eyebrow's
    // own line — it printed straight through the eyebrow when it did.
    const titleTop = Math.max(
      b.eyebrowY + eyebrowBand + L.eyebrowSize * 0.6,
      b.rowsTop - Math.max(titleBand, titleRoom),
    );

    s.addText(cfg.title ?? "", {
      x: inX(b.x),
      y: inX(titleTop),
      w: inX(b.headW),
      h: inX(Math.max(L.titleSize, b.rowsTop - titleTop)),
      fontFace: FONT,
      fontSize: pt(L.titleSize),
      lineSpacing: pt(L.titleSize * 1.08),
      bold: true,
      color: hex(agendaTitleInk(cfg), inkHex),
      valign: "bottom",
      margin: 0,
    });
    // Card mode puts the room line and the date right-aligned beside the lockup.
    if (b.location && (cfg.locationLine ?? "").trim()) {
      const loc = b.location;
      const LOC = agendaLocation(cfg);
      const label = agendaLocationText(cfg);
      const locInk = hex(LOC.ink ?? "", inkHex);
      const align = LOC.align === "centre" ? "center" : LOC.align;
      const iconH = LOC.icon.path ? loc.size * 1.05 : 0;
      const iconW = iconH ? (iconH * LOC.icon.vw) / LOC.icon.vh : 0;
      const gap = iconW ? loc.size * 0.34 : 0;
      // The mark is a preset shape in the deck ink, placed against the estimated
      // copy width so it hugs the room line on any edge.
      const estW = label.length * loc.size * 0.62;
      const blockLeft =
        LOC.align === "left"
          ? loc.left
          : LOC.align === "centre"
            ? loc.left + (loc.right - loc.left - (estW + iconW + gap)) / 2
            : Math.max(loc.left, loc.right - estW - iconW - gap);
      if (iconH) {
        const markInk = hex(LOC.iconHex ?? LOC.ink ?? "", locInk);
        const markY = loc.y + loc.size * 0.12;
        // A stepped mark is drawn from its parts: one preset rectangle would
        // print as a plain square and read as the wrong symbol.
        if (LOC.icon.parts?.length) {
          for (const part of LOC.icon.parts) {
            s.addShape("rect" as never, {
              x: inX(blockLeft + part.x * iconW),
              y: inX(markY + part.y * iconH),
              w: inX(part.w * iconW),
              h: inX(part.h * iconH),
              fill: { color: markInk },
              line: { width: 0 },
            });
          }
        } else {
          s.addShape(LOC.icon.shape as never, {
            x: inX(blockLeft),
            y: inX(markY),
            w: inX(iconW),
            h: inX(iconH),
            fill: { color: markInk },
            line: { width: 0 },
          });
        }
      }
      s.addText(label, {
        x: inX(iconW ? blockLeft + iconW + gap : loc.left),
        y: inX(loc.y),
        w: inX(Math.max(loc.size * 4, loc.right - (iconW ? blockLeft + iconW + gap : loc.left))),
        h: inX(loc.size * 1.8),
        fontFace: FONT,
        fontSize: pt(loc.size),
        lineSpacing: pt(loc.size * 1.5),
        bold: LOC.bold,
        charSpacing: LOC.weight === "regular" ? 1 : 2,
        color: locInk,
        align: iconW ? "left" : align,
        valign: "top",
        margin: 0,
      });
      if ((cfg.meta ?? "").trim()) {
        s.addText(cfg.meta, {
          x: inX(loc.left),
          y: inX(loc.metaY),
          w: inX(loc.right - loc.left),
          h: inX(loc.metaSize * 2),
          fontFace: FONT,
          fontSize: pt(loc.metaSize),
          lineSpacing: pt(loc.metaSize * 1.6),
          color: inkHex,
          align,
          valign: "top",
          margin: 0,
        });
      }
    } else if ((cfg.meta ?? "").trim()) {
      s.addText(cfg.meta, {
        x: inX(b.x),
        y: inX(b.metaY),
        w: inX(b.headW),
        h: inX(metaBand),
        fontFace: FONT,
        fontSize: pt(L.metaSize),
        lineSpacing: pt(L.metaSize * 1.6),
        color: inkHex,
        valign: "top",
        margin: 0,
      });
    }

    // Programme rows as ONE native table: presenters re-time sessions in
    // PowerPoint constantly, and a table keeps the columns aligned when they do.
    const rows = b.rows;
    const cardMode = agendaRowStyle(cfg) === "card";

    // Card mode: the printed board draws each session as a pale band, with any
    // parallel session on an aqua card beside it. PowerPoint gets the same
    // geometry as shapes so the deck reads exactly like the printed sheet.
    if (cardMode && rows.length) {
      const BAND = agendaBandPalette(cfg);
      // Bands are curved plates carrying the treatment's transparency, so the
      // gradient ground reads through them exactly as the board and press file
      // print it. The rail is the plate beneath, showing at the left edge, which
      // keeps the band's own curve rather than squaring a corner.
      const radius = inX(BAND.radius * L.k);
      // A veil treatment fades to clear down the band. PowerPoint shapes carry one
      // transparency, so a veil band takes the mid point of that fade — the same
      // weight the printed band averages to.
      const veilAlpha = BAND.fade ? (BAND.fade.top + BAND.fade.bottom) / 2 : null;
      const clear = (alpha: number) => Math.round((1 - (veilAlpha ?? alpha)) * 100);
      const plate = (
        box: { x: number; y: number; w: number; h: number },
        color: string,
        alpha: number,
        name: string,
        inset = 0,
      ) =>
        s.addShape("roundRect", {
          x: inX(box.x) + inset,
          y: inX(box.y),
          w: inX(box.w) - inset,
          h: inX(box.h),
          rectRadius: Math.min(radius, inX(box.h) / 2, (inX(box.w) - inset) / 2),
          fill: { color: hex(color), transparency: clear(alpha) },
          line: { type: "none" },
          objectName: name,
        });
      const rail = (box: { x: number; y: number; w: number; h: number }, alpha: number, name: string) =>
        BAND.railW > 0 ? plate(box, BAND.rail, alpha, name) : undefined;
      const bandText = (
        box: { x: number; y: number; w: number; h: number },
        session: {
          time?: string;
          title?: string;
          speaker?: string;
          detail?: string;
          track?: string;
        },

        copyInk: string = BAND.ink,
        /** Fitted type for a narrow parallel card; omitted on the main band. */
        card?: ReturnType<typeof agendaCardType>,
      ) => {
        // The main band runs the time in its own left column. A parallel card is
        // far too narrow for that column, so the time sits above the copy at the
        // fitted card size.
        const padX = card ? card.padX : L.bandPadX;
        const timeSize = card ? card.timeSize : L.timeSize;
        const titleSize = card ? card.titleSize : L.titleRowSize;
        const detailSize = card ? card.detailSize : L.detailSize;
        const timeShown = (session.time ?? "").trim().length > 0;
        s.addText(session.time ?? "", {
          x: inX(box.x + padX),
          y: inX(box.y + L.bandPadY),
          w: inX(card ? card.textW : L.timeColW),
          h: inX(timeSize * 2),
          fontFace: FONT,
          fontSize: pt(timeSize),
          lineSpacing: pt(timeSize * 1.4),
          bold: true,
          color: copyInk,
          valign: "top",
          margin: 0,
        });
        const copyX = card ? box.x + padX : box.x + L.bandPadX + L.timeColW;
        const copyW = card ? card.textW : box.w - L.bandPadX * 2 - L.timeColW;
        const copyY = card
          ? box.y + L.bandPadY + (timeShown ? timeSize * 1.5 : 0)
          : box.y + L.bandPadY;
        s.addText(
          [
            // The tracked stage label prints above the title, matching the board
            // and the press file.
            ...((session.track ?? "").trim()
              ? [
                  {
                    text: session.track!.toUpperCase(),
                    options: {
                      fontSize: pt(L.trackSize),
                      bold: true,
                      color: copyInk,
                      charSpacing: 2,
                      breakLine: true,
                      lineSpacing: pt(L.trackSize * 1.6),
                    },
                  },
                ]
              : []),
            {
              text: session.title ?? "",
              options: {
                fontSize: pt(titleSize),
                bold: true,
                color: copyInk,
                breakLine: true,
                lineSpacing: pt(titleSize * 1.5),
              },
            },

            // Speaker sits on its own line under the title, so the notes stay a
            // separate editable paragraph in PowerPoint.
            ...((session.speaker ?? "").trim()
              ? [
                  {
                    text: session.speaker!,
                    options: {
                      fontSize: pt(detailSize),
                      bold: true,
                      color: copyInk,
                      breakLine: true,
                      lineSpacing: pt(detailSize * 1.5),
                    },
                  },
                ]
              : []),
            ...((session.detail ?? "").trim()
              ? [
                  {
                    text: session.detail!,
                    options: {
                      fontSize: pt(detailSize),
                      color: copyInk,
                      lineSpacing: pt(detailSize * 1.5),
                    },
                  },
                ]
              : []),
          ],
          {
            x: inX(copyX),
            y: inX(copyY),
            w: inX(Math.max(6, copyW)),
            h: inX(Math.max(6, box.y + box.h - L.bandPadY - copyY)),
            fontFace: FONT,
            valign: "top",
            margin: 0,
            // A stand-in face sets wider lines than Geist, so long speaker notes
            // shrink inside the band instead of being cut off at its edge.
            fit: "shrink",
          },
        );
      };

      rows.forEach((r, i) => {
        const band = r.band;
        if (!band) return;
        rail(band, BAND.fillAlpha, `Session rail ${i + 1}`);
        plate(
          band,
          i % 2 === 0 ? BAND.fillA : BAND.fillB,
          BAND.fillAlpha,
          `Session band ${i + 1}`,
          inX(BAND.railW * L.k),
        );
        bandText(band, r.session);
        // One editable aqua card per parallel track, each its own named shape.
        const parCopy = agendaParallels(r.session);
        r.parallels.forEach((par, pi) => {
          const copy = parCopy[pi];
          if (!copy) return;
          const label = parCopy.length > 1 ? `${i + 1}.${pi + 1}` : `${i + 1}`;
          rail(par, BAND.parallelAlpha, `Parallel rail ${label}`);
          plate(
            par,
            BAND.parallel,
            BAND.parallelAlpha,
            `Parallel session ${label}`,
            inX(BAND.railW * L.k),
          );
          bandText(
            par,
            {
              // A track with its own start time prints that; otherwise it
              // inherits the slot's time, as the board does.
              time: (copy.time ?? "").trim() || r.session.time,
              title: copy.title,
              speaker: copy.speaker,
              detail: copy.detail,
            },
            BAND.parallelInk,
            agendaCardType(L, par.w, r.parallels.length, agendaLongestWord(copy.title)),
          );
        });
      });
    } else if (rows.length) {
      const timeW = inX(L.timeColW);
      const trackW = inX(L.trackColW);
      const bodyW = inX(b.contentW) - timeW - trackW;
      const rowH = inX(b.rowH);
      s.addTable(
        rows.map(({ session }) => {
          const rowInk = session.muted ? mutedHex : inkHex;
          return [
            {
              text: session.time ?? "",
              options: {
                fontSize: pt(L.timeSize),
                lineSpacing: pt(L.timeSize * 1.3),
                bold: true,
                color: rowInk,
                valign: "middle",
              },
            },
            {
              text: [
                {
                  text: session.title ?? "",
                  options: {
                    fontSize: pt(L.titleRowSize),
                    bold: !session.muted,
                    color: rowInk,
                    breakLine: true,
                  },
                },
                ...((session.detail ?? "").trim()
                  ? [
                      {
                        text: session.detail!,
                        options: {
                          fontSize: pt(L.detailSize),
                          color: rowInk,
                          lineSpacing: pt(L.detailSize * 1.4),
                        },
                      },
                    ]
                  : []),
              ],
              options: { valign: "middle", lineSpacing: pt(L.titleRowSize * 1.25) },
            },
            {
              text: (session.track ?? "").toUpperCase(),
              options: {
                fontSize: pt(L.trackSize),
                lineSpacing: pt(L.trackSize * 1.4),
                color: rowInk,
                align: "right",
                charSpacing: 2,
                valign: "middle",
              },
            },
          ];
        }),
        {
          x: inX(b.x),
          y: inX(b.rowsTop),
          w: inX(b.contentW),
          colW: [timeW, bodyW, trackW],
          rowH,
          fontFace: FONT,
          border: [
            { type: "none" },
            { type: "none" },
            { type: "solid", color: "7F8798", pt: 0.5 },
            { type: "none" },
          ],
          // Zero cell padding: the column widths already come from the printed
          // board, so any inset shifts every row off the measured grid.
          margin: 0,
          objectName: "NEXT agenda programme",
        },
      );
    }

    if (b.qr) {
      const data = qrDataUrl(
        cfg.qrData ?? "",
        agendaQrForeground(cfg),
        agendaQrBackground(cfg),
        agendaQrStyle(cfg),
        agendaQrTransparent(cfg),
        b.qr.edge,
      );
      if (data) {
        s.addImage({
          data,
          x: inX(b.qr.x),
          y: inX(b.qr.y),
          w: inX(b.qr.edge),
          h: inX(b.qr.edge),
          objectName: "NEXT agenda QR",
        });
      }
      if ((cfg.qrCaption ?? "").trim()) {
        s.addText(cfg.qrCaption, {
          x: inX(b.qr.x),
          y: inX(b.qr.capY),
          w: inX(b.qr.edge),
          h: inX(b.qr.capSize * 2),
          fontFace: FONT,
          fontSize: pt(b.qr.capSize),
          lineSpacing: pt(b.qr.capSize * 1.4),
          color: inkHex,
          align: b.qr.capAlign,
          valign: "top",
          margin: 0,
        });
      }
    }

    // The printed card board finishes on a full-bleed Blue 500 band carrying the
    // event URL and dates in white.
    if (b.footerBand) {
      const fb = b.footerBand;
      const ft = b.footer;
      if (ft.style === "band") {
        s.addShape("rect", {
          x: inX(fb.x),
          y: inX(fb.y),
          w: inX(fb.w),
          h: inX(fb.h),
          fill: { color: hex(ft.fill) },
          line: { type: "none" },
          objectName: "NEXT agenda footer band",
        });
      } else if (ft.style === "hairline") {
        s.addShape("rect", {
          x: inX(b.x),
          y: inX(fb.y),
          w: inX(b.contentW),
          h: inX(0.5 * L.k),
          fill: { color: hex(inkHex, "FFFFFF"), transparency: 45 },
          line: { type: "none" },
          objectName: "NEXT agenda footer rule",
        });
      }
      const footInk = hex(ft.onGround ? inkHex : ft.ink, "FFFFFF");
      const bandY = fb.y + (fb.h - L.footSize * 1.6) * 0.5;
      const slots: { text: string; x: number; w: number; align: "left" | "center" | "right" }[] = [
        { text: ft.left, x: b.x, w: b.contentW * (ft.centre ? 0.38 : 0.62), align: "left" },
        ...(ft.centre
          ? [
              {
                text: ft.centre,
                x: b.x + b.contentW * 0.34,
                w: b.contentW * 0.32,
                align: "center" as const,
              },
            ]
          : []),
        {
          text: ft.right,
          x: b.x + b.contentW * (ft.centre ? 0.66 : 0.62),
          w: b.contentW * (ft.centre ? 0.34 : 0.38),
          align: "right",
        },
      ];
      for (const slot of slots) {
        if (!slot.text) continue;
        // A stand-in face sets the tracked footer wider than Geist, so each slot
        // shrinks to hold one line inside the band instead of wrapping off the
        // trimmed edge.
        const est = slot.text.length * (L.footSize * 0.62 + 0.35);
        const size = Math.max(L.footSize * 0.62, Math.min(L.footSize, (L.footSize * slot.w) / est));
        const lineH = size * 1.6;
        const y = fb.y + Math.max(0, (fb.h - lineH) * 0.5);
        s.addText(slot.text, {
          x: inX(slot.x),
          y: inX(y),
          w: inX(slot.w),
          h: inX(lineH),
          fontFace: FONT,
          fontSize: pt(size),
          lineSpacing: pt(lineH),
          bold: true,
          charSpacing: 2,
          color: footInk,
          align: slot.align,
          valign: "middle",
          margin: 0,
        });
      }

    }

    const foot = [(cfg.footnote ?? "").trim()].filter(Boolean).join(" ");
    // On a card board the footnote sits above the brand band, not inside it.
    const footNoteY = b.footerBand ? b.footerBand.y - L.footSize * 2.6 : b.footY;
    if (foot) {
      s.addText(foot, {
        x: inX(b.x),
        y: inX(footNoteY),
        w: inX(b.contentW * 0.7),
        h: inX(L.footSize * 2),
        fontFace: FONT,
        fontSize: pt(L.footSize),
        lineSpacing: pt(L.footSize * 1.4),
        color: inkHex,
        valign: "top",
        margin: 0,
      });
    }
    if ((cfg.pageLabel ?? "").trim()) {
      s.addText(cfg.pageLabel!.toUpperCase(), {
        x: inX(b.x + b.contentW * 0.7),
        y: inX(footNoteY),
        w: inX(b.contentW * 0.3),
        h: inX(L.footSize * 2),
        fontFace: FONT,
        fontSize: pt(L.footSize),
        lineSpacing: pt(L.footSize * 1.4),
        bold: true,
        charSpacing: 2,
        color: inkHex,
        align: "right",
        valign: "top",
        margin: 0,
      });
    }
  }

  // ── booklet artwork slides ────────────────────────────────────────────────
  const imagePages = extras?.imagePages ?? [];
  for (const art of imagePages) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    const pad = geo.safeInset;
    const headH = art.title.trim() ? geo.trimH * 0.06 : 0;
    const capH = art.caption.trim() ? geo.trimH * 0.05 : 0;
    if (headH) {
      s.addText(art.title.toUpperCase(), {
        x: inMm(pad),
        y: inMm(pad),
        w: inMm(geo.trimW - pad * 2),
        h: inMm(headH),
        fontFace: FONT,
        fontSize: pt(agendaBlocks(pages[0]!.config).layout.titleSize * 0.62),
        bold: true,
        charSpacing: 2,
        color: "03002C",
        valign: "top",
        margin: 0,
      });
    }
    const boxW = geo.trimW - pad * 2;
    const boxH = geo.trimH - pad * 2 - headH - capH;
    const scale = Math.min(boxW / Math.max(1, art.wPx), boxH / Math.max(1, art.hPx));
    const w = art.wPx * scale;
    const h = art.hPx * scale;
    s.addImage({
      data: bytesToDataUrl(art.png),
      x: inMm(pad + (boxW - w) / 2),
      y: inMm(pad + headH + (boxH - h) / 2),
      w: inMm(w),
      h: inMm(h),
      objectName: art.id || "NEXT booklet artwork",
    });
    if (capH) {
      s.addText(art.caption, {
        x: inMm(pad),
        y: inMm(geo.trimH - pad - capH),
        w: inMm(boxW),
        h: inMm(capH),
        fontFace: FONT,
        fontSize: pt(agendaBlocks(pages[0]!.config).layout.footSize),
        color: "03002C",
        transparency: 38,
        valign: "top",
        margin: 0,
      });
    }
  }
  if (imagePages.length) {
    notes.push(
      `${imagePages.length} rendered slide${imagePages.length === 1 ? "" : "s"} placed as pictures with printed credit lines — the programme slides are the editable ones.`,
    );
  }

  const raw = (await pptx.write({ outputType: "blob" })) as unknown as Blob;
  // Carry Geist inside the package and normalize the theme font scheme, so the
  // board's type does not re-flow into a substitute face on the machine that
  // opens it — the same pass every other deck export runs.
  const { embedFontsInPptx } = await import("./pptx-font-embed");
  const withFonts = await embedFontsInPptx(raw);
  // pptxgenjs emits presentation.xml with notesMasterIdLst after sldIdLst, which
  // the ECMA-376 sequence forbids and Office refuses to open. Reuse the same
  // terminal hygiene pass every other deck export in the app runs through.
  const { applyTerminalPptxHygiene } = await import("./pptx-terminal-hygiene");
  const blob = await applyTerminalPptxHygiene(withFonts);
  notes.push(
    `${pages.length} slide${pages.length === 1 ? "" : "s"} at ${geo.trimW} × ${geo.trimH} mm — every programme row is an editable PowerPoint table cell.`,
  );
  return {
    blob,
    filename: `next-agenda-${agendaSlug(config)}.pptx`,
    slideCount: (extras?.omitAgenda ? 0 : pages.length) + (extras?.cover ? 1 : 0) + (extras?.imagePages?.length ?? 0),
    notes,
  };
}
