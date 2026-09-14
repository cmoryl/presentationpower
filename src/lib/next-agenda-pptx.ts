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
  agendaBlocks,
  agendaGeometry,
  agendaInk,
  agendaName,
  agendaPages,
  agendaQrBackground,
  agendaQrForeground,
  agendaQrStyle,
  agendaQrTransparent,
  agendaSlug,
  agendaTitleInk,
  type AgendaConfig,
} from "./next-agenda";
import { flattenedGroundPng } from "./next-agenda-docx";
import { buildPillarQr } from "./pillar-qr";

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
 * Rasterize the real QR matrix at print density so it stays scannable, using
 * the same module shape, ink and plate the editor previewed.
 */
function qrDataUrl(
  payload: string,
  ink: string,
  ground: string,
  style: "block" | "rounded" | "dot" = "block",
  transparent = false,
): string | null {
  const qr = buildPillarQr(payload);
  if (!qr) return null;
  const scale = 8;
  const canvas = document.createElement("canvas");
  canvas.width = qr.size * scale;
  canvas.height = qr.size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (!transparent) {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = ink;
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (!qr.modules[y * qr.size + x]) continue;
      const px = x * scale;
      const py = y * scale;
      if (style === "dot") {
        ctx.beginPath();
        ctx.arc(px + scale / 2, py + scale / 2, scale / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === "rounded") {
        ctx.beginPath();
        const inset = scale * 0.06;
        const size = scale * 0.88;
        const r = scale * 0.26;
        ctx.roundRect(px + inset, py + inset, size, size, r);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, scale, scale);
      }
    }
  }
  return canvas.toDataURL("image/png");
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
export async function buildAgendaPptx(config: AgendaConfig): Promise<AgendaPptxResult> {
  const pages = agendaPages(config);
  const geo = agendaGeometry(config);
  const face = config.face ?? "dark";
  const inkHex = hex(agendaInk(face), face === "light" ? "03002C" : "FFFFFF");
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

  for (const page of pages) {
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
        w: inX(b.contentW),
        h: inX(eyebrowBand),
        fontFace: FONT,
        fontSize: pt(L.eyebrowSize),
        lineSpacing: pt(eyebrowBand),
        bold: true,
        charSpacing: 3,
        color: inkHex,
        valign: "top",
        margin: 0,
      });
    }
    s.addText(cfg.title ?? "", {
      x: inX(b.x),
      y: inX(b.titleY),
      w: inX(b.contentW),
      h: inX(titleBand),
      fontFace: FONT,
      fontSize: pt(L.titleSize),
      lineSpacing: pt(titleBand),
      bold: true,
      color: hex(agendaTitleInk(cfg), inkHex),
      valign: "top",
      margin: 0,
    });
    if ((cfg.meta ?? "").trim()) {
      s.addText(cfg.meta, {
        x: inX(b.x),
        y: inX(b.metaY),
        w: inX(b.contentW),
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
    if (rows.length) {
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

    const foot = [(cfg.footnote ?? "").trim()].filter(Boolean).join(" ");
    if (foot) {
      s.addText(foot, {
        x: inX(b.x),
        y: inX(b.footY),
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
        y: inX(b.footY),
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
    slideCount: pages.length,
    notes,
  };
}
