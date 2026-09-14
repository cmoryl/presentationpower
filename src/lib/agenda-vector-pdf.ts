// -----------------------------------------------------------------------------
// NEXT division agenda — fully vector, layered press PDF / Illustrator artwork.
//
//   01 Ground        Gouraud mesh gradient (Type 4 shading — one editable mesh)
//   02 Lockup        approved division lockup as vector paths (raster fallback)
//   03 Title block   eyebrow + day title + date/venue line, live Geist text
//   04 Sessions      session rows, rules and track chips
//   05 Footer        footnote line
//   06 QR code       real scannable modules as vector rectangles
//   07 Guides + marks trim / safe guides + crop marks, set non-printing
//
// Geometry comes from `agendaBlocks`, the same metrics the live AgendaSheet
// renders, so production receives exactly what was approved on screen.
// -----------------------------------------------------------------------------

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames as Ops,
  PDFRef,
  PDFString,
  StandardFonts,
  clip,
  closePath,
  endPath,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingRgbColor,
  translate,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { applyPdfX4, type PdfX4Applied } from "./pdf-x4-vector";
import { resolveAssetUrl } from "./asset-base-url";
import { registerGradientPattern, type ShadingStop } from "./pdf-analytic-shading";
import { extractSvgPaths } from "./pillar-vector-pdf";
import { buildPillarQr } from "./pillar-qr";
import { logoInkBox, logoInkPlacement } from "./next-logo-ink";
import { qrStructuralModule } from "./qr-print";
import {
  agendaBlocks,
  agendaDivision,
  agendaLockupUrl,
  agendaGeometry,
  agendaInk,
  agendaName,
  agendaCardType,
  agendaLongestWord,
  agendaParallels,
  agendaQrBackground,
  agendaQrForeground,
  agendaQrStyle,
  agendaQrTransparent,
  agendaPages,
  agendaStops,
  agendaTitleInk,
  AGENDA_BAND,
  agendaBandPalette,
  type AgendaConfig,
} from "./next-agenda";
import { agendaCopyInk } from "./next-agenda-contrast";

const MM_TO_PT = 72 / 25.4;
const SLUG_PT = 0.4 * 72;

export type AgendaLayerName =
  | "01 Ground"
  | "02 Lockup"
  | "03 Title block"
  | "04 Sessions"
  | "05 Footer"
  | "06 QR code"
  | "07 Guides + marks";

export type AgendaVectorResult = {
  bytes: Uint8Array<ArrayBuffer>;
  layers: AgendaLayerName[];
  lockupVector: boolean;
  /** Pages in the press file — one per programme day / overflow page. */
  pageCount: number;
  page: { widthPt: number; heightPt: number };
  pdfx: PdfX4Applied;
};

function hexRgb(hex: string): [number, number, number] {
  const h = (hex || "#000000").replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}


function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

type Layer = { name: AgendaLayerName; ref: PDFRef; tag: string };

function beginLayer(page: PDFPage, layer: Layer): void {
  page.pushOperators(
    PDFOperator.of(Ops.BeginMarkedContentSequence, [PDFName.of("OC"), PDFName.of(layer.tag)]),
    pushGraphicsState(),
  );
}

function endLayer(page: PDFPage): void {
  page.pushOperators(popGraphicsState(), PDFOperator.of(Ops.EndMarkedContent));
}

function polygon(page: PDFPage, points: [number, number][], color: [number, number, number]): void {
  if (points.length < 3) return;
  page.pushOperators(
    setFillingRgbColor(round(color[0]), round(color[1]), round(color[2])),
    moveTo(points[0]![0], points[0]![1]),
    ...points.slice(1).map(([x, y]) => lineTo(x, y)),
    closePath(),
    fill(),
  );
}

function styleAxis(styleId: string) {
  if (styleId.includes("diagonal")) return { x1: 0, y1: 0, x2: 1, y2: 1 };
  if (styleId.includes("prism")) return { x1: 0, y1: 1, x2: 1, y2: 0 };
  if (styleId.includes("bloom")) return { x1: 0, y1: 0, x2: 0.85, y2: 0.85 };
  return { x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
}

/**
 * The ground as an EDITABLE gradient: an analytic axial or radial shading used
 * as a pattern fill on the sheet rectangle. A Gouraud mesh prints the same but
 * opens in Illustrator as a gradient mesh, which cannot be retuned by dragging
 * a stop or typing a brand hex — so the board carries a real gradient instead.
 */
function groundGradient(
  w: number,
  h: number,
  stops: string[],
  styleId: string,
  ox: number,
  oy: number,
) {
  const last = Math.max(stops.length - 1, 1);
  const toStops = (list: string[]): ShadingStop[] =>
    list.map((hex, i) => ({ offset: i / last, color: hexRgb(hex) }));
  if (styleId.includes("halo")) {
    return {
      // Pattern space is measured from the page origin, not the current
      // transform, so the slug offset is added to the gradient geometry.
      spec: {
        kind: "radial" as const,
        centre: { x: ox + w / 2, y: oy + h - 0.42 * h },
        rx: 1.2 * w,
        ry: 0.9 * h,
      },
      stops: toStops([...stops].reverse()),
    };
  }
  const axis = styleAxis(styleId);
  return {
    spec: {
      kind: "axial" as const,
      from: { x: ox + axis.x1 * w, y: oy + h - axis.y1 * h },
      to: { x: ox + axis.x2 * w, y: oy + h - axis.y2 * h },
    },
    stops: toStops(stops),
  };
}

type LockupArt =
  | { kind: "svg"; paths: string[]; viewBox: [number, number, number, number] }
  | { kind: "raster"; bytes: Uint8Array; png: boolean }
  | null;

async function loadLockup(url: string): Promise<LockupArt> {
  if (!url) return null;
  try {
    const res = await fetch(resolveAssetUrl(url));
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const head = new TextDecoder().decode(buf.subarray(0, 400)).trim();
    if (head.startsWith("<svg") || head.startsWith("<?xml") || /\.svg(\?|$)/i.test(url)) {
      const svg = new TextDecoder().decode(buf);
      const box = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1] ?? "";
      const nums = box
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      const paths = extractSvgPaths(svg);
      if (paths.length && nums.length === 4) {
        return { kind: "svg", paths, viewBox: nums as [number, number, number, number] };
      }
      return null;
    }
    const png = buf[0] === 0x89 && buf[1] === 0x50;
    return { kind: "raster", bytes: buf, png };
  } catch {
    return null;
  }
}

async function ttf(doc: PDFDocument, path: string): Promise<PDFFont | null> {
  try {
    const res = await fetch(resolveAssetUrl(path));
    if (!res.ok) return null;
    return await doc.embedFont(await res.arrayBuffer(), { subset: false });
  } catch {
    return null;
  }
}

/** Letter-spaced label: pdf-lib has no character-spacing option, so each glyph
 *  is placed individually — matching the tracked labels in the live sheet. */
function drawTracked(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: [number, number, number];
    opacity?: number;
    spacing: number;
  },
): number {
  let x = opts.x;
  for (const ch of text) {
    page.drawText(ch, {
      x,
      y: opts.y,
      size: opts.size,
      font: opts.font,
      color: rgb(...opts.color),
      opacity: opts.opacity ?? 1,
    });
    x += opts.font.widthOfTextAtSize(ch, opts.size) + opts.spacing;
  }
  return x - opts.x;
}

/** Width a tracked label occupies. */
function trackedWidth(font: PDFFont, text: string, size: number, spacing: number): number {
  return font.widthOfTextAtSize(text, size) + spacing * Math.max(0, [...text].length - 1);
}

/** Trim a line to the available width so nothing overruns the safe area. */
function fit(font: PDFFont, rawText: string, size: number, maxWidth: number): string {
  // A single printed line: a typed line break in a session note is collapsed to
  // a space. Left in, it either measures as an unencodable glyph (crashing the
  // press build) or prints as a stray box in the ruled list.
  const text = (rawText ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ");
  if (!text) return "";
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth)
    out = out.slice(0, -1);
  return `${out}…`;
}

/** Wrap copy on word boundaries so a banded row prints every word it carries. */
function wrapLines(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** House location pin, drawn on its own so the press file carries real vector. */
const AGENDA_PIN_PATH =
  "M9 0C4.03 0 0 4.03 0 9c0 6.36 7.4 14.68 7.72 15.03a1.72 1.72 0 0 0 2.56 0C10.6 23.68 18 15.36 18 9c0-4.97-4.03-9-9-9Zm0 13.1A4.1 4.1 0 1 1 9 4.9a4.1 4.1 0 0 1 0 8.2Z";

export async function buildAgendaVectorPdf(config: AgendaConfig): Promise<AgendaVectorResult> {
  const pages = agendaPages(config);
  const geo = agendaGeometry(config);
  const face = config.face ?? "dark";
  const ink = agendaCopyInk(config).hex;
  const stops = agendaStops(config.styleId, face, config.divisionId);

  const bleedW = geo.bleedW * MM_TO_PT;
  const bleedH = geo.bleedH * MM_TO_PT;
  const pageW = bleedW + SLUG_PT * 2;
  const pageH = bleedH + SLUG_PT * 2;
  const ox = SLUG_PT;
  const oy = SLUG_PT;
  const mm = (v: number) => v * MM_TO_PT;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const title = agendaName(config);
  doc.setTitle(title);
  doc.setProducer("TransPerfect Element");
  doc.setCreator("TransPerfect Element — NEXT agenda studio");

  const bold =
    (await ttf(doc, "/fonts/Geist-Bold.ttf")) ?? doc.embedStandardFont(StandardFonts.HelveticaBold);
  const regular =
    (await ttf(doc, "/fonts/Geist-Regular.ttf")) ?? doc.embedStandardFont(StandardFonts.Helvetica);

  const names: AgendaLayerName[] = [
    "01 Ground",
    "02 Lockup",
    "03 Title block",
    "04 Sessions",
    "05 Footer",
    "06 QR code",
    "07 Guides + marks",
  ];
  const layers: Layer[] = names.map((name, i) => {
    const nonPrinting = name === "07 Guides + marks";
    const dict = doc.context.obj({
      Type: "OCG",
      Name: PDFString.of(name),
      Usage: doc.context.obj({
        Print: doc.context.obj({
          PrintState: PDFName.of(nonPrinting ? "OFF" : "ON"),
          Subtype: "Print",
        }),
      }),
    });
    return { name, ref: doc.context.register(dict), tag: `OC${i + 1}` };
  });
  doc.catalog.set(
    PDFName.of("OCProperties"),
    doc.context.obj({
      OCGs: layers.map((l) => l.ref),
      D: doc.context.obj({
        BaseState: PDFName.of("ON"),
        Order: layers.map((l) => l.ref),
        ON: layers.filter((l) => l.name !== "07 Guides + marks").map((l) => l.ref),
        OFF: layers.filter((l) => l.name === "07 Guides + marks").map((l) => l.ref),
      }),
    }),
  );
  const layer = (name: AgendaLayerName) => layers.find((l) => l.name === name)!;

  // Approved division lockup is fetched once and reused on every page.
  const division = agendaDivision(config.divisionId);
  const lockupSrc = agendaLockupUrl(config);
  const art = config.showLockup ? await loadLockup(lockupSrc) : null;
  let lockupVector = false;

  // Every programme day / page of the live file becomes one press page.
  for (const pageDef of pages) {
    const cfg = pageDef.config;
    const blocks = agendaBlocks(cfg);
    const L = blocks.layout;
    const titleInk = agendaTitleInk(cfg);

    const page = doc.addPage([pageW, pageH]);
    const props = doc.context.obj({});
    for (const l of layers) props.set(PDFName.of(l.tag), l.ref);
    page.node.Resources()!.set(PDFName.of("Properties"), props);

    const trimX = ox + mm(geo.bleedEdge);
    const trimY = oy + mm(geo.bleedEdge);
    const trimW = mm(geo.trimW);
    const trimH = mm(geo.trimH);
    page.node.set(
      PDFName.of("TrimBox"),
      doc.context.obj([round(trimX), round(trimY), round(trimX + trimW), round(trimY + trimH)]),
    );
    page.node.set(
      PDFName.of("BleedBox"),
      doc.context.obj([round(ox), round(oy), round(ox + bleedW), round(oy + bleedH)]),
    );

    /** mm from the trim top-left → PDF point coordinates. */
    const px = (x: number) => trimX + mm(x);
    const py = (y: number) => trimY + trimH - mm(y);

    // ── 01 Ground ────────────────────────────────────────────────────────────
    beginLayer(page, layer("01 Ground"));
    page.pushOperators(
      pushGraphicsState(),
      translate(round(ox), round(oy)),
      moveTo(0, 0),
      lineTo(bleedW, 0),
      lineTo(bleedW, bleedH),
      lineTo(0, bleedH),
      closePath(),
      clip(),
      endPath(),
    );
    const ground = groundGradient(
      bleedW,
      bleedH,
      stops,
      config.styleId,
      round(ox),
      round(oy),
    );
    const { name: groundPattern } = registerGradientPattern(
      doc,
      page,
      ground.spec,
      ground.stops,
      "rgb",
      "PGround",
    );
    page.pushOperators(
      PDFOperator.of("cs" as never, [PDFName.of("Pattern")]),
      PDFOperator.of("scn" as never, [groundPattern]),
      PDFOperator.of("re" as never, [
        PDFNumber.of(0),
        PDFNumber.of(0),
        PDFNumber.of(bleedW),
        PDFNumber.of(bleedH),
      ]),
      PDFOperator.of("f" as never),
    );
    page.pushOperators(popGraphicsState());
    endLayer(page);

    // ── 02 Lockup ────────────────────────────────────────────────────────────
    if (blocks.lockup && art) {
      const lw = mm(blocks.lockup.w);
      const lh = mm(blocks.lockup.h);
      beginLayer(page, layer("02 Lockup"));
      if (art.kind === "svg") {
        lockupVector = true;
        const [vx, vy, vw, vh] = art.viewBox;
        // blocks.lockup is the measured ink box, so the file is scaled and
        // offset by its own clear space to land the ink exactly there.
        const inkFrac = logoInkBox(lockupSrc);
        const scale = lw / (vw * (inkFrac?.width ?? 1));
        const offX = inkFrac ? inkFrac.left * vw * scale : 0;
        const offY = inkFrac ? inkFrac.top * vh * scale : 0;
        for (const d of art.paths) {
          page.drawSvgPath(d, {
            x: px(blocks.lockup.x) - vx * scale - offX,
            y: py(blocks.lockup.y) + vy * scale + offY,
            scale,
            color: rgb(...hexRgb(ink)),
          });
        }
      } else if (art.kind === "raster") {
        try {
          const image = art.png ? await doc.embedPng(art.bytes) : await doc.embedJpg(art.bytes);
          const box = logoInkPlacement(lockupSrc, blocks.lockup);
          page.drawImage(image, {
            x: px(box.x),
            y: py(box.y) - mm(box.h),
            width: mm(box.w),
            height: mm(box.h),
          });
        } catch {
          /* lockup unavailable — the board still prints */
        }
      }
      endLayer(page);
    }

    // ── 03 Title block ───────────────────────────────────────────────────────
    beginLayer(page, layer("03 Title block"));
    const eyebrow = (cfg.eyebrow ?? "").trim();
    if (eyebrow) {
      const size = mm(L.eyebrowSize);
      drawTracked(page, eyebrow.toUpperCase(), {
        x: px(blocks.x),
        y: py(blocks.eyebrowY) - size,
        size,
        font: bold,
        color: hexRgb(ink),
        opacity: 0.82,
        spacing: size * 0.22,
      });
    }
    if ((cfg.title ?? "").trim()) {
      const size = mm(L.titleSize);
      page.drawText(fit(bold, cfg.title, size, mm(blocks.headW)), {
        x: px(blocks.x),
        y: py(blocks.titleY) - size * 0.86,
        size,
        font: bold,
        color: rgb(...hexRgb(titleInk)),
      });
    }
    if ((cfg.meta ?? "").trim() && !blocks.location) {
      const size = mm(L.metaSize);
      page.drawText(fit(regular, cfg.meta, size, mm(blocks.headW)), {
        x: px(blocks.x),
        y: py(blocks.metaY) - size,
        size,
        font: regular,
        color: rgb(...hexRgb(ink)),
        opacity: 0.86,
      });
    }
    // Programme look: room line with its pin, and the date beneath it, both set
    // to the right of the lockup exactly where the preview places them.
    if (blocks.location) {
      const loc = blocks.location;
      const size = mm(loc.size);
      // loc.right already steps back for a code parked in the header.
      const right = px(loc.right);
      const label = (cfg.locationLine ?? "").trim();
      if (label) {
        const w = bold.widthOfTextAtSize(label, size);
        page.drawText(label, {
          x: right - w,
          y: py(loc.pin!.y) - size,
          size,
          font: bold,
          color: rgb(...hexRgb(ink)),
        });
        const pinH = size * 1.15;
        page.drawSvgPath(AGENDA_PIN_PATH, {
          x: right - w - pinH * 0.72 - size * 0.3,
          y: py(loc.pin!.y) - size * 0.05,
          scale: pinH / 25,
          color: rgb(...hexRgb(AGENDA_BAND.pin)),
        });
      }
      if ((cfg.meta ?? "").trim()) {
        const ms = mm(loc.metaSize);
        const w = regular.widthOfTextAtSize(cfg.meta, ms);
        page.drawText(cfg.meta, {
          x: right - w,
          y: py(loc.metaY) - ms,
          size: ms,
          font: regular,
          color: rgb(...hexRgb(ink)),
        });
      }
    }
    endLayer(page);

    // ── 04 Sessions ──────────────────────────────────────────────────────────
    beginLayer(page, layer("04 Sessions"));
    if (L.card) {
      // Programme bands: a pale plate per session, an aqua plate for a parallel
      // track, and the same copy geometry the preview measured.
      const BAND = agendaBandPalette(config);
      const bandInk = rgb(...hexRgb(BAND.ink));
      const parInk = rgb(...hexRgb(BAND.parallelInk));
      const railColor = rgb(...hexRgb(BAND.rail));
      const railW = mm(BAND.railW * L.k);
      const padX = mm(L.bandPadX);
      const padY = mm(L.bandPadY);
      const timeW = mm(L.timeColW);
      blocks.rows.forEach((row, i) => {
        const band = row.band;
        if (!band) return;
        page.drawRectangle({
          x: px(band.x),
          y: py(band.y) - mm(band.h),
          width: mm(band.w),
          height: mm(band.h),
          color: rgb(...hexRgb(i % 2 === 0 ? BAND.fillA : BAND.fillB)),
        });
        // Time rail: a Blue 500 edge down the band, the mark that makes the
        // programme read as a built board rather than a tinted block.
        page.drawRectangle({
          x: px(band.x),
          y: py(band.y) - mm(band.h),
          width: railW,
          height: mm(band.h),
          color: railColor,
        });
        const bodyX = px(band.x) + padX + timeW;
        const bodyW = mm(band.w) - padX * 2 - timeW;
        let y = py(band.y) - padY;
        if (row.session.time.trim()) {
          const size = mm(L.timeSize);
          page.drawText(fit(regular, row.session.time, size, timeW), {
            x: px(band.x) + padX,
            y: y - size,
            size,
            font: regular,
            color: bandInk,
          });
        }
        if (row.session.track.trim()) {
          const size = mm(L.trackSize);
          page.drawText(row.session.track.toUpperCase(), {
            x: bodyX,
            y: y - size,
            size,
            font: bold,
            color: bandInk,
          });
          y -= size * 1.5;
        }
        if (row.session.title.trim()) {
          const size = mm(L.titleRowSize);
          const font = row.session.muted ? regular : bold;
          for (const line of wrapLines(font, row.session.title, size, bodyW)) {
            page.drawText(line, { x: bodyX, y: y - size, size, font, color: bandInk });
            y -= size * 1.5;
          }
        }
        if (row.session.detail.trim()) {
          const size = mm(L.detailSize);
          y -= size * 0.5;
          for (const line of wrapLines(regular, row.session.detail, size, bodyW)) {
            page.drawText(line, { x: bodyX, y: y - size, size, font: regular, color: bandInk });
            y -= size * 1.55;
          }
        }
        // One aqua card per parallel track on this slot.
        const parCopy = agendaParallels(row.session);
        row.parallels.forEach((par, pi) => {
          const copy = parCopy[pi];
          if (!copy) return;
          page.drawRectangle({
            x: px(par.x),
            y: py(par.y) - mm(par.h),
            width: mm(par.w),
            height: mm(par.h),
            color: rgb(...hexRgb(BAND.parallel)),
          });
          page.drawRectangle({
            x: px(par.x),
            y: py(par.y) - mm(par.h),
            width: railW,
            height: mm(par.h),
            color: railColor,
          });
          // Narrow cards use fitted type and tighter padding: at the band sizes
          // three or four tracks wrapped to a character a line, or lost the copy
          // entirely when padding and the pin left no column.
          const ct = agendaCardType(L, par.w, row.parallels.length, agendaLongestWord(copy.title));
          const cardPadX = mm(ct.padX);
          const pw = mm(ct.textW);
          let py2 = py(par.y) - padY;
          // A track with its own start time prints that; otherwise it inherits the
          // slot's time, exactly as the board and PowerPoint do.
          const cardTime = (copy.time ?? "").trim() || row.session.time.trim();
          if (cardTime) {
            const ts = mm(ct.timeSize);
            page.drawText(cardTime, {
              x: px(par.x) + cardPadX,
              y: py2 - ts,
              size: ts,
              font: bold,
              color: parInk,
            });
            py2 -= ts * 1.5;
          }
          const size = mm(ct.titleSize);
          for (const line of wrapLines(bold, copy.title, size, pw)) {
            page.drawText(line, {
              x: px(par.x) + cardPadX,
              y: py2 - size,
              size,
              font: bold,
              color: parInk,
            });
            py2 -= size * 1.5;
          }
          if ((copy.speaker ?? "").trim()) {
            const ss = mm(ct.detailSize);
            py2 -= ss * 0.4;
            for (const line of wrapLines(bold, copy.speaker!, ss, pw)) {
              page.drawText(line, {
                x: px(par.x) + cardPadX,
                y: py2 - ss,
                size: ss,
                font: bold,
                color: parInk,
              });
              py2 -= ss * 1.55;
            }
          }
          if (copy.detail.trim()) {
            const ds = mm(ct.detailSize);
            py2 -= ds * 0.5;
            for (const line of wrapLines(regular, copy.detail, ds, pw)) {
              page.drawText(line, {
                x: px(par.x) + cardPadX,
                y: py2 - ds,
                size: ds,
                font: regular,
                color: parInk,
              });
              py2 -= ds * 1.55;
            }
          }
          if (ct.pinW > 0) {
            const pinH = mm(L.locSize * 1.5);
            page.drawSvgPath(AGENDA_PIN_PATH, {
              x: px(par.x + par.w) - cardPadX - pinH * 0.72,
              y: py(par.y + par.h) + padY + pinH,
              scale: pinH / 25,
              color: rgb(...hexRgb(BAND.pin)),
            });
          }
        });
      });
      endLayer(page);
    } else {
    const ruleColor = rgb(...hexRgb(ink));
    const timeW = mm(L.timeColW);
    const trackW = mm(L.trackColW);
    const bodyW = mm(blocks.contentW) - timeW - trackW - mm(4);
    for (const row of blocks.rows) {
      const top = py(row.y);
      page.drawLine({
        start: { x: px(blocks.x), y: top },
        end: { x: px(blocks.x + blocks.contentW), y: top },
        color: ruleColor,
        thickness: 0.6,
        opacity: face === "light" ? 0.22 : 0.28,
      });
      const pad = mm(row.h * 0.16);
      const alpha = row.session.muted ? 0.72 : 1;
      if (row.session.time.trim()) {
        const size = mm(L.timeSize);
        page.drawText(fit(bold, row.session.time, size, timeW), {
          x: px(blocks.x),
          y: top - pad - size * 0.86,
          size,
          font: bold,
          color: rgb(...hexRgb(row.session.muted ? ink : titleInk)),
          opacity: alpha,
        });
      }
      let y = top - pad;
      if (row.session.title.trim()) {
        const size = mm(L.titleRowSize);
        const font = row.session.muted ? regular : bold;
        page.drawText(fit(font, row.session.title, size, bodyW), {
          x: px(blocks.x) + timeW,
          y: y - size * 0.86,
          size,
          font,
          color: rgb(...hexRgb(ink)),
          opacity: alpha,
        });
        y -= size * 1.12;
      }
      if (row.session.detail.trim()) {
        const size = mm(L.detailSize);
        page.drawText(fit(regular, row.session.detail, size, bodyW), {
          x: px(blocks.x) + timeW,
          y: y - size * 0.9,
          size,
          font: regular,
          color: rgb(...hexRgb(ink)),
          opacity: 0.78 * alpha,
        });
      }
      if (row.session.track.trim()) {
        const size = mm(L.trackSize);
        const label = row.session.track.toUpperCase();
        const spacing = size * 0.16;
        const width = trackedWidth(bold, label, size, spacing);
        drawTracked(page, label, {
          x: px(blocks.x + blocks.contentW) - width,
          y: top - pad - size * 0.9,
          size,
          font: bold,
          color: hexRgb(ink),
          opacity: 0.8 * alpha,
          spacing,
        });
      }
    }
    // closing rule
    const lastY = py(blocks.rowsTop + blocks.rowH * blocks.rows.length);
    page.drawLine({
      start: { x: px(blocks.x), y: lastY },
      end: { x: px(blocks.x + blocks.contentW), y: lastY },
      color: ruleColor,
      thickness: 0.6,
      opacity: face === "light" ? 0.22 : 0.28,
    });
    endLayer(page);
    }

    // ── 05 Footer ────────────────────────────────────────────────────────────
    const stamp = (cfg.pageLabel ?? "").trim();
    const footnote = (cfg.footnote ?? "").trim();
    if (blocks.footerBand) {
      beginLayer(page, layer("05 Footer"));
      const size = mm(L.footSize);
      const band = blocks.footerBand;
      // The band bleeds off the foot so no white edge survives trimming.
      page.drawRectangle({
        x: ox,
        y: oy,
        width: bleedW,
        height: py(band.y) - oy,
        color: rgb(...hexRgb(AGENDA_BAND.footerBand)),
      });
      const bandInk = rgb(...hexRgb(AGENDA_BAND.footerInk));
      if (footnote) {
        const fs = mm(L.footSize * 1.15);
        const hasPin = blocks.rows.some((r) => r.parallel);
        const pinH = fs * 1.9;
        const x = px(blocks.x) + (hasPin ? pinH * 0.72 + fs * 0.4 : 0);
        const y = py(band.y - L.footSize * 3.1) - fs;
        if (hasPin) {
          page.drawSvgPath(AGENDA_PIN_PATH, {
            x: px(blocks.x),
            y: y + fs * 1.5,
            scale: pinH / 25,
            color: rgb(...hexRgb(AGENDA_BAND.pin)),
          });
        }
        page.drawText(fit(bold, footnote, fs, mm(blocks.contentW) - (x - px(blocks.x))), {
          x,
          y,
          size: fs,
          font: bold,
          color: rgb(...hexRgb(ink)),
        });
      }
      const left = (cfg.footerLeft ?? "").trim();
      if (left) {
        page.drawText(fit(regular, left.toUpperCase(), size, mm(blocks.contentW * 0.6)), {
          x: px(blocks.x),
          y: py(blocks.footY) - size,
          size,
          font: regular,
          color: bandInk,
        });
      }
      const right = (cfg.footerRight ?? "").trim() || stamp;
      if (right) {
        const label = right.toUpperCase();
        const w = regular.widthOfTextAtSize(label, size);
        page.drawText(label, {
          x: px(blocks.x + blocks.contentW) - w,
          y: py(blocks.footY) - size,
          size,
          font: regular,
          color: bandInk,
        });
      }
      endLayer(page);
    } else if (footnote || stamp) {
      beginLayer(page, layer("05 Footer"));
      const size = mm(L.footSize);
      if (footnote) {
        page.drawText(fit(regular, cfg.footnote, size, mm(blocks.contentW * 0.72)), {
          x: px(blocks.x),
          y: py(blocks.footY) - size,
          size,
          font: regular,
          color: rgb(...hexRgb(ink)),
          opacity: 0.74,
        });
      }
      if (stamp) {
        const spacing = size * 0.16;
        const width = trackedWidth(bold, stamp.toUpperCase(), size, spacing);
        drawTracked(page, stamp.toUpperCase(), {
          x: px(blocks.x + blocks.contentW) - width,
          y: py(blocks.footY) - size,
          size,
          font: bold,
          color: hexRgb(ink),
          opacity: 0.72,
          spacing,
        });
      }
      endLayer(page);
    }

    // ── 06 QR code ───────────────────────────────────────────────────────────
    const qr = buildPillarQr(cfg.qrData ?? "");
    if (qr && blocks.qr) {
      const edge = mm(blocks.qr.edge);
      const unit = edge / qr.size;
      const left = px(blocks.qr.x);
      const bottom = py(blocks.qr.y) - edge;
      beginLayer(page, layer("06 QR code"));
      // The press file uses exactly the ink, plate and module shape the editor
      // previewed — a code that prints differently to the proof is a reprint.
      const style = agendaQrStyle(cfg);
      if (!agendaQrTransparent(cfg)) {
        page.drawRectangle({
          x: left,
          y: bottom,
          width: edge,
          height: edge,
          color: rgb(...hexRgb(agendaQrBackground(cfg))),
        });
      }
      const dark = hexRgb(agendaQrForeground(cfg));
      for (let r = 0; r < qr.size; r += 1) {
        for (let c = 0; c < qr.size; c += 1) {
          if (!qr.modules[r * qr.size + c]) continue;
          const x = left + c * unit;
          const y = bottom + edge - (r + 1) * unit;
          // Scanner anchors stay solid whatever the module style — see qr-print.
          const shaped = style !== "block" && !qrStructuralModule(c, r, qr.size);
          if (shaped && style === "dot") {
            page.drawCircle({
              x: x + unit / 2,
              y: y + unit / 2,
              size: unit / 2,
              color: rgb(...dark),
            });
            continue;
          }
          if (shaped && style === "rounded") {
            page.drawRectangle({
              x: x + unit * 0.06,
              y: y + unit * 0.06,
              width: unit * 0.88,
              height: unit * 0.88,
              color: rgb(...dark),
            });
            continue;
          }
          polygon(
            page,
            [
              [x, y],
              [x + unit, y],
              [x + unit, y + unit],
              [x, y + unit],
            ],
            dark,
          );
        }
      }
      if ((cfg.qrCaption ?? "").trim()) {
        const size = mm(blocks.qr.capSize);
        const label = cfg.qrCaption.toUpperCase();
        const spacing = size * 0.16;
        const width = trackedWidth(bold, label, size, spacing);
        const capX =
          blocks.qr.capAlign === "left"
            ? left
            : blocks.qr.capAlign === "right"
              ? left + edge - width
              : left + edge / 2 - width / 2;
        drawTracked(page, label, {
          x: capX,
          y: py(blocks.qr.capY) - size,
          size,
          font: bold,
          color: hexRgb(ink),
          spacing,
        });
      }
      endLayer(page);
    }

    // ── 07 Guides + marks ────────────────────────────────────────────────────
    beginLayer(page, layer("07 Guides + marks"));
    const guideInk = rgb(...hexRgb(face === "light" ? "#03002C" : "#FFFFFF"));
    page.drawRectangle({
      x: trimX,
      y: trimY,
      width: trimW,
      height: trimH,
      borderColor: guideInk,
      borderWidth: 0.75,
      borderDashArray: [6, 6],
      opacity: 0,
      borderOpacity: 0.6,
    });
    page.drawRectangle({
      x: px(geo.safeInset),
      y: py(geo.trimH - geo.safeInset),
      width: trimW - mm(geo.safeInset) * 2,
      height: trimH - mm(geo.safeInset) * 2,
      borderColor: guideInk,
      borderWidth: 0.75,
      borderDashArray: [4, 8],
      opacity: 0,
      borderOpacity: 0.35,
    });
    const markLen = 0.3 * 72;
    const gap = 0.08 * 72;
    const corners: [number, number][] = [
      [trimX, trimY],
      [trimX + trimW, trimY],
      [trimX, trimY + trimH],
      [trimX + trimW, trimY + trimH],
    ];
    for (const [cx, cy] of corners) {
      const left = cx < pageW / 2;
      const bottom = cy < pageH / 2;
      page.drawLine({
        start: { x: left ? cx - gap - markLen : cx + gap, y: cy },
        end: { x: left ? cx - gap : cx + gap + markLen, y: cy },
        color: rgb(0, 0, 0),
        thickness: 0.5,
      });
      page.drawLine({
        start: { x: cx, y: bottom ? cy - gap - markLen : cy + gap },
        end: { x: cx, y: bottom ? cy - gap : cy + gap + markLen },
        color: rgb(0, 0, 0),
        thickness: 0.5,
      });
    }
    endLayer(page);
  }

  const x4 = await applyPdfX4(doc, {
    title,
    creator: "TransPerfect Element — NEXT agenda studio",
  });

  const bytes = await doc.save({ useObjectStreams: false });
  return {
    bytes: bytes as Uint8Array<ArrayBuffer>,
    layers: names,
    lockupVector,
    pageCount: pages.length,
    page: { widthPt: pageW, heightPt: pageH },
    pdfx: x4,
  };
}
