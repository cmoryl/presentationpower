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
import { registerMeshShading, type MeshSampler } from "./pdf-mesh-shading";
import { extractSvgPaths } from "./pillar-vector-pdf";
import { buildPillarQr } from "./pillar-qr";
import {
  agendaBlocks,
  agendaDivision,
  agendaGeometry,
  agendaInk,
  agendaName,
  agendaPages,
  agendaStops,
  agendaTitleInk,
  type AgendaConfig,
} from "./next-agenda";

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
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function mixRgb(stops: string[], t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const k = scaled - i;
  const a = hexRgb(stops[i]!);
  const b = hexRgb(stops[i + 1]!);
  return a.map((c, idx) => c + (b[idx]! - c) * k) as [number, number, number];
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

function groundSampler(w: number, h: number, stops: string[], styleId: string): MeshSampler {
  if (styleId.includes("halo")) {
    const ramp = [...stops].reverse();
    const cx = w / 2;
    const cy = h - 0.42 * h;
    const rx = 1.2 * w;
    const ry = 0.9 * h;
    return (x, y) => mixRgb(ramp, Math.min(Math.hypot((x - cx) / rx, (y - cy) / ry), 1));
  }
  const axis = styleAxis(styleId);
  const x1 = axis.x1 * w;
  const y1 = h - axis.y1 * h;
  const dx = axis.x2 * w - x1;
  const dy = h - axis.y2 * h - y1;
  const len = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / len;
  const uy = dy / len;
  const origin = x1 * ux + y1 * uy;
  return (x, y) => mixRgb(stops, (x * ux + y * uy - origin) / len);
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
      const nums = box.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
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
  opts: { x: number; y: number; size: number; font: PDFFont; color: [number, number, number]; opacity?: number; spacing: number },
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
function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (!text) return "";
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

export async function buildAgendaVectorPdf(config: AgendaConfig): Promise<AgendaVectorResult> {
  const pages = agendaPages(config);
  const geo = agendaGeometry(config);
  const face = config.face ?? "dark";
  const ink = agendaInk(face);
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

  const bold = (await ttf(doc, "/fonts/Geist-Bold.ttf")) ?? doc.embedStandardFont(StandardFonts.HelveticaBold);
  const regular = (await ttf(doc, "/fonts/Geist-Regular.ttf")) ?? doc.embedStandardFont(StandardFonts.Helvetica);

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
        Print: doc.context.obj({ PrintState: PDFName.of(nonPrinting ? "OFF" : "ON"), Subtype: "Print" }),
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
  const art = config.showLockup
    ? await loadLockup(face === "light" ? division.colorUrl || division.whiteUrl : division.whiteUrl || division.colorUrl)
    : null;
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
    const { name: shading } = registerMeshShading(
      doc,
      page,
      bleedW,
      bleedH,
      groundSampler(bleedW, bleedH, stops, config.styleId),
    );
    page.pushOperators(PDFOperator.of("sh" as never, [shading]));
    page.pushOperators(popGraphicsState());
    endLayer(page);

    // ── 02 Lockup ────────────────────────────────────────────────────────────
    if (blocks.lockup && art) {
      const lw = mm(blocks.lockup.w);
      const lh = mm(blocks.lockup.h);
      beginLayer(page, layer("02 Lockup"));
      if (art.kind === "svg") {
        lockupVector = true;
        const [vx, vy, vw] = art.viewBox;
        const scale = lw / vw;
        for (const d of art.paths) {
          page.drawSvgPath(d, {
            x: px(blocks.lockup.x) - vx * scale,
            y: py(blocks.lockup.y) + vy * scale,
            scale,
            color: rgb(...hexRgb(ink)),
          });
        }
      } else if (art.kind === "raster") {
        try {
          const image = art.png ? await doc.embedPng(art.bytes) : await doc.embedJpg(art.bytes);
          page.drawImage(image, {
            x: px(blocks.lockup.x),
            y: py(blocks.lockup.y) - lh,
            width: lw,
            height: lh,
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
      page.drawText(fit(bold, cfg.title, size, mm(blocks.contentW)), {
        x: px(blocks.x),
        y: py(blocks.titleY) - size * 0.86,
        size,
        font: bold,
        color: rgb(...hexRgb(titleInk)),
      });
    }
    if ((cfg.meta ?? "").trim()) {
      const size = mm(L.metaSize);
      page.drawText(fit(regular, cfg.meta, size, mm(blocks.contentW)), {
        x: px(blocks.x),
        y: py(blocks.metaY) - size,
        size,
        font: regular,
        color: rgb(...hexRgb(ink)),
        opacity: 0.86,
      });
    }
    endLayer(page);

    // ── 04 Sessions ──────────────────────────────────────────────────────────
    beginLayer(page, layer("04 Sessions"));
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

    // ── 05 Footer ────────────────────────────────────────────────────────────
    const stamp = (cfg.pageLabel ?? "").trim();
    if ((cfg.footnote ?? "").trim() || stamp) {
      beginLayer(page, layer("05 Footer"));
      const size = mm(L.footSize);
      if ((cfg.footnote ?? "").trim()) {
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
      page.drawRectangle({ x: left, y: bottom, width: edge, height: edge, color: rgb(1, 1, 1) });
      const dark = hexRgb("#03002C");
      for (let r = 0; r < qr.size; r += 1) {
        for (let c = 0; c < qr.size; c += 1) {
          if (!qr.modules[r * qr.size + c]) continue;
          const x = left + c * unit;
          const y = bottom + edge - (r + 1) * unit;
          polygon(page, [[x, y], [x + unit, y], [x + unit, y + unit], [x, y + unit]], dark);
        }
      }
      if ((cfg.qrCaption ?? "").trim()) {
        const size = mm(L.footSize);
        const label = cfg.qrCaption.toUpperCase();
        const spacing = size * 0.16;
        const width = trackedWidth(bold, label, size, spacing);
        drawTracked(page, label, {
          x: left + edge / 2 - width / 2,
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
