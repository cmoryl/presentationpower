// -----------------------------------------------------------------------------
// NEXT pillar signs — fully vector, layered press PDF / Illustrator artwork.
//
// WHY: a rasterised plate cannot be scaled, recoloured or re-set by a printer.
// This builder emits the same artwork as the live pillar, but every element is
// real vector geometry sitting on its own named PDF layer (optional content
// group), so Illustrator opens it as an editable, infinitely scalable file:
//
//   01 Ground        tessellated vector gradient (no shading dictionaries)
//   02 Lockup        approved division lockup as vector paths (raster fallback)
//   03 Headline      live Geist text (embedded font, selectable + editable)
//   04 Sub-line      live Geist text
//   05 Arrow         wayfinding arrow path
//   06 QR code       real scannable modules as vector rectangles
//   07 Guides+marks  trim / safe guides + crop marks, set non-printing
//
// Geometry mirrors `PillarSign` so what is on screen is what production gets.
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
  degrees,
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

import { resolveAssetUrl } from "./asset-base-url";
import {
  pillarDivision,
  pillarGeometry,
  pillarHeadlineInk,
  pillarHeadlineOffset,
  pillarHeadlineSize,
  pillarInk,
  pillarLockupScale,
  pillarQrSize,
  pillarStops,
  pillarSubSize,
  type PillarConfig,
} from "./next-pillar-masters";
import { PILLAR_LOGO_DROP } from "./next-pillar-masters";
import { pillarArrowStyle } from "./pillar-arrows";
import { buildPillarQr } from "./pillar-qr";

const MM_TO_PT = 72 / 25.4;
const SLUG_PT = 0.4 * 72;

export type PillarLayerName =
  | "01 Ground"
  | "02 Lockup"
  | "03 Headline"
  | "04 Sub-line"
  | "05 Arrow"
  | "06 QR code"
  | "07 Guides + marks";

export type PillarVectorResult = {
  bytes: Uint8Array<ArrayBuffer>;
  layers: PillarLayerName[];
  /** True when the lockup came through as vector paths rather than a bitmap. */
  lockupVector: boolean;
  page: { widthPt: number; heightPt: number };
};

// ── colour ───────────────────────────────────────────────────────────────────

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

// ── optional content layers ──────────────────────────────────────────────────

type Layer = { name: PillarLayerName; ref: PDFRef; tag: string };

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

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ── vector gradient ground ───────────────────────────────────────────────────

type Axis = { x1: number; y1: number; x2: number; y2: number };

function styleAxis(styleId: string): Axis {
  if (styleId.includes("diagonal")) return { x1: 0, y1: 0, x2: 1, y2: 1 };
  if (styleId.includes("prism")) return { x1: 0, y1: 1, x2: 1, y2: 0 };
  if (styleId.includes("bloom")) return { x1: 0, y1: 0, x2: 0.85, y2: 0.85 };
  return { x1: 0.5, y1: 0, x2: 0.5, y2: 1 };
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 96): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

function drawGround(page: PDFPage, w: number, h: number, stops: string[], styleId: string): void {
  const steps = 512;
  if (styleId.includes("halo")) {
    // Live preview reverses the ramp for halo grounds: light core, saturated rim.
    const ramp = [...stops].reverse();
    polygon(page, [[0, 0], [w, 0], [w, h], [0, h]], mixRgb(ramp, 1));
    const cx = w / 2;
    const cy = h - 0.42 * h;
    for (let i = steps; i >= 1; i -= 1) {
      const t = i / steps;
      polygon(page, ellipse(cx, cy, 0.78 * w * 0.62 * t * 1.6, 0.78 * h * t), mixRgb(ramp, t));
    }
    return;
  }
  const axis = styleAxis(styleId);
  const x1 = axis.x1 * w;
  const y1 = h - axis.y1 * h;
  const dx = axis.x2 * w - x1;
  const dy = h - axis.y2 * h - y1;
  const len = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / len;
  const uy = dy / len;
  const vx = -uy;
  const vy = ux;
  const origin = x1 * ux + y1 * uy;
  const projections = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => x! * ux + y! * uy);
  const min = Math.min(...projections);
  const max = Math.max(...projections);
  const breadth = Math.hypot(w, h) * 1.1;
  const strip = (max - min) / steps;
  for (let i = 0; i < steps; i += 1) {
    const a = min + i * strip;
    const b = min + (i + 1.04) * strip;
    const t = ((a + b) / 2 - origin) / len;
    polygon(
      page,
      [
        [ux * a - vx * breadth, uy * a - vy * breadth],
        [ux * b - vx * breadth, uy * b - vy * breadth],
        [ux * b + vx * breadth, uy * b + vy * breadth],
        [ux * a + vx * breadth, uy * a + vy * breadth],
      ],
      mixRgb(stops, t),
    );
  }
}

// ── lockup as vector paths ───────────────────────────────────────────────────

type LockupArt =
  | { kind: "svg"; paths: string[]; viewBox: [number, number, number, number] }
  | { kind: "raster"; bytes: Uint8Array; png: boolean }
  | null;

/** Every drawable shape in a mono lockup SVG, normalised to path data.
 * Illustrator exports mix <path>, <polygon>, <polyline> and <rect>; taking only
 * <path> silently dropped whole letters from the wordmark. */
export function extractSvgPaths(svg: string): string[] {
  const out: string[] = [];
  for (const m of svg.matchAll(/<path[^>]*\sd\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]!);
  for (const m of svg.matchAll(/<(polygon|polyline)[^>]*\spoints\s*=\s*["']([^"']+)["']/gi)) {
    const nums = m[2]!.trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length < 6) continue;
    const parts: string[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      parts.push(`${i === 0 ? "M" : "L"}${nums[i]} ${nums[i + 1]}`);
    }
    out.push(`${parts.join(" ")} Z`);
  }
  for (const m of svg.matchAll(/<rect\b[^>]*>/gi)) {
    const attr = (name: string) => Number(new RegExp(`\\s${name}\\s*=\\s*["']([-0-9.]+)`, "i").exec(m[0]!)?.[1]);
    const x = attr("x") || 0;
    const y = attr("y") || 0;
    const w = attr("width");
    const h = attr("height");
    if (!Number.isFinite(w) || !Number.isFinite(h)) continue;
    out.push(`M${x} ${y} H${x + w} V${y + h} H${x} Z`);
  }
  for (const m of svg.matchAll(/<(circle|ellipse)\b[^>]*>/gi)) {
    const attr = (name: string) => Number(new RegExp(`\\s${name}\\s*=\\s*["']([-0-9.]+)`, "i").exec(m[0]!)?.[1]);
    const cx = attr("cx") || 0;
    const cy = attr("cy") || 0;
    const rx = Number.isFinite(attr("r")) ? attr("r") : attr("rx");
    const ry = Number.isFinite(attr("r")) ? attr("r") : attr("ry");
    if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
    out.push(
      `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`,
    );
  }
  return out;
}

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

// ── main builder ─────────────────────────────────────────────────────────────

async function ttf(doc: PDFDocument, path: string): Promise<PDFFont | null> {
  try {
    const res = await fetch(resolveAssetUrl(path));
    if (!res.ok) return null;
    // Full embedding (no subset): Illustrator re-interprets subset cmaps and
    // shows .notdef boxes for some characters; the complete font maps cleanly.
    return await doc.embedFont(await res.arrayBuffer(), { subset: false });
  } catch {
    return null;
  }
}

export async function buildPillarVectorPdf(config: PillarConfig): Promise<PillarVectorResult> {
  const geo = pillarGeometry(config);
  const face = config.face ?? "dark";
  const ink = pillarInk(face);
  const headlineInk = pillarHeadlineInk(config);
  const stops = pillarStops(config.styleId, face);

  const bleedW = geo.bleedW * MM_TO_PT;
  const bleedH = geo.bleedH * MM_TO_PT;
  const pageW = bleedW + SLUG_PT * 2;
  const pageH = bleedH + SLUG_PT * 2;
  // Origin of the bleed sheet inside the slug page.
  const ox = SLUG_PT;
  const oy = SLUG_PT;
  const mm = (v: number) => v * MM_TO_PT;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`NEXT pillar — ${config.kind} — ${pillarDivision(config.divisionId).name}`);
  doc.setProducer("TransPerfect Element");
  doc.setCreator("TransPerfect Element — NEXT pillar studio");

  const bold = (await ttf(doc, "/fonts/Geist-Bold.ttf")) ?? doc.embedStandardFont(StandardFonts.HelveticaBold);
  const regular = (await ttf(doc, "/fonts/Geist-Regular.ttf")) ?? doc.embedStandardFont(StandardFonts.Helvetica);

  const page = doc.addPage([pageW, pageH]);

  // Optional content groups.
  const names: PillarLayerName[] = [
    "01 Ground",
    "02 Lockup",
    "03 Headline",
    "04 Sub-line",
    "05 Arrow",
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
  const props = doc.context.obj({});
  for (const l of layers) props.set(PDFName.of(l.tag), l.ref);
  page.node.Resources()!.set(PDFName.of("Properties"), props);
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
  const layer = (name: PillarLayerName) => layers.find((l) => l.name === name)!;

  // Box geometry: trim + safe inside the bleed sheet.
  const trimX = ox + mm(geo.bleedEdge);
  const trimY = oy + mm(geo.bleedEdge);
  const trimW = mm(geo.trimW);
  const trimH = mm(geo.trimH);
  page.node.set(
    PDFName.of("TrimBox"),
    doc.context.obj([round(trimX), round(trimY), round(trimX + trimW), round(trimY + trimH)]),
  );
  page.node.set(PDFName.of("BleedBox"), doc.context.obj([round(ox), round(oy), round(ox + bleedW), round(oy + bleedH)]));

  const safe = mm(geo.safeInset);
  const safeX = trimX + safe;
  const safeW = trimW - safe * 2;
  const safeTop = trimY + trimH - safe;
  const safeBottom = trimY + safe;
  const centerX = safeX + safeW / 2;

  // ── 01 Ground ──────────────────────────────────────────────────────────────
  beginLayer(page, layer("01 Ground"));
  // Clip to the bleed sheet: diagonal grounds tessellate past the page bounds,
  // and Illustrator shows that overhang as a tilted band outside the artboard.
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
  drawGround(page, bleedW, bleedH, stops, config.styleId);
  page.pushOperators(popGraphicsState());
  endLayer(page);

  // ── 02 Lockup ──────────────────────────────────────────────────────────────
  const division = pillarDivision(config.divisionId);
  const lockupW = trimW * 0.58 * pillarLockupScale(config);
  const lockupH = lockupW / (division.ratio || 1.7);
  const isLogoOnly = config.kind === "logo";
  // Logo-only pillars drop a quarter of the column, mirroring the live sign.
  const lockupTop = isLogoOnly ? safeTop - trimH * PILLAR_LOGO_DROP : safeTop;
  let lockupVector = false;

  if (config.showLockup) {
    const art = await loadLockup(division.whiteUrl || division.colorUrl);
    beginLayer(page, layer("02 Lockup"));
    if (art?.kind === "svg") {
      lockupVector = true;
      const [vx, vy, vw, vh] = art.viewBox;
      const scale = lockupW / vw;
      for (const d of art.paths) {
        page.drawSvgPath(d, {
          x: centerX - lockupW / 2 - vx * scale,
          y: lockupTop + vy * scale,
          scale,
          color: rgb(...hexRgb(ink)),
        });
      }
      void vh;
    } else if (art?.kind === "raster") {
      try {
        const image = art.png ? await doc.embedPng(art.bytes) : await doc.embedJpg(art.bytes);
        page.drawImage(image, {
          x: centerX - lockupW / 2,
          y: lockupTop - lockupH,
          width: lockupW,
          height: lockupH,
        });
      } catch {
        /* lockup unavailable — sign still prints without it */
      }
    }
    endLayer(page);
  }

  // ── 03 Headline / 04 Sub-line ──────────────────────────────────────────────
  const headline = (config.headline || "").trim();
  const subline = (config.subheadline || "").trim();
  const headlineSize = mm(pillarHeadlineSize(config));
  const subSize = mm(pillarSubSize(config));
  const drop = mm(pillarHeadlineOffset(config));
  const vertical = Boolean(config.verticalHeadline) && !isLogoOnly;
  const headTop = (config.showLockup ? lockupTop - lockupH : safeTop) - drop;

  let headlineBottom = headTop;
  if (!isLogoOnly && headline) {
    beginLayer(page, layer("03 Headline"));
    if (vertical) {
      const size = headlineSize * 1.45;
      const width = bold.widthOfTextAtSize(headline, size);
      const blockTop = headTop - mm(Math.min(120, geo.trimH * 0.06));
      const blockBottom = safeBottom;
      const startY = Math.max(blockBottom, (blockTop + blockBottom) / 2 - width / 2);
      page.drawText(headline, {
        x: centerX + bold.heightAtSize(size) * 0.34,
        y: startY,
        size,
        font: bold,
        color: rgb(...hexRgb(headlineInk)),
        rotate: degrees(90),
      });
      headlineBottom = startY - subSize * 0.7;
    } else {
      const size = headlineSize;
      const top = headTop - mm(Math.min(140, geo.trimH * 0.07));
      const width = bold.widthOfTextAtSize(headline, size);
      const baseline = top - size * 0.82;
      page.drawText(headline, {
        x: centerX - width / 2,
        y: baseline,
        size,
        font: bold,
        color: rgb(...hexRgb(headlineInk)),
      });
      headlineBottom = baseline;
    }
    endLayer(page);
  }

  if (!isLogoOnly && subline) {
    beginLayer(page, layer("04 Sub-line"));
    const width = regular.widthOfTextAtSize(subline, subSize);
    page.drawText(subline, {
      x: centerX - width / 2,
      y: headlineBottom - subSize * 1.5,
      size: subSize,
      font: regular,
      color: rgb(...hexRgb(headlineInk)),
      opacity: 0.92,
    });
    endLayer(page);
  }

  if (isLogoOnly) {
    const lines = [subline, (config.logoUrl || "").trim(), (config.logoSocial || "").trim()].filter(Boolean);
    if (lines.length) {
      beginLayer(page, layer("04 Sub-line"));
      let y = lockupTop - lockupH - Math.max(mm(30), subSize * 1.2) - subSize;
      lines.forEach((line, i) => {
        const size = i === 0 ? subSize : subSize * 0.9;
        const width = regular.widthOfTextAtSize(line, size);
        page.drawText(line, {
          x: centerX - width / 2,
          y,
          size,
          font: regular,
          color: rgb(...hexRgb(headlineInk)),
        });
        y -= size * 1.7;
      });
      endLayer(page);
    }
  }

  // ── 05 Arrow ───────────────────────────────────────────────────────────────
  if (config.kind === "directional") {
    const edge = mm(Math.min(300, geo.trimW * 0.5));
    const rotation = ({ right: 0, down: -90, left: 180, up: 90 } as const)[config.arrow] ?? 0;
    const top = Math.min(headlineBottom - mm(Math.min(150, geo.trimH * 0.075)), safeTop);
    const cy = top - edge / 2;
    // Arrow geometry from the live sign, centred on the column and rotated about
    // its own centre so every direction sits on the same axis as the copy.
    const rad = (rotation * Math.PI) / 180;
    const draw = (glyph: [number, number][]) =>
      glyph.map(([gx, gy]) => {
        const lx = (gx - 50) * (edge / 100);
        const ly = (50 - gy) * (edge / 100);
        return [
          centerX + lx * Math.cos(rad) - ly * Math.sin(rad),
          cy + lx * Math.sin(rad) + ly * Math.cos(rad),
        ] as [number, number];
      });
    beginLayer(page, layer("05 Arrow"));
    for (const poly of pillarArrowStyle(config.arrowStyle).polys) {
      polygon(page, draw(poly), hexRgb(headlineInk));
    }
    endLayer(page);
  }

  // ── 06 QR code ─────────────────────────────────────────────────────────────
  const qr = buildPillarQr(config.qrData ?? "");
  let qrBottom = safeBottom;
  if (qr) {
    const edge = Math.min(mm(pillarQrSize(config)), safeW);
    const unit = edge / qr.size;
    const caption = (config.qrCaption || "").trim();
    const captionSize = Math.max(mm(10), subSize * 0.55);
    const qrY = safeBottom + (caption ? captionSize * 2.2 : 0);
    beginLayer(page, layer("06 QR code"));
    page.drawRectangle({
      x: centerX - edge / 2,
      y: qrY,
      width: edge,
      height: edge,
      color: rgb(1, 1, 1),
    });
    const dark: [number, number, number] = hexRgb("#03002C");
    for (let row = 0; row < qr.size; row += 1) {
      for (let col = 0; col < qr.size; col += 1) {
        if (!qr.modules[row * qr.size + col]) continue;
        const x = centerX - edge / 2 + col * unit;
        const y = qrY + edge - (row + 1) * unit;
        polygon(page, [[x, y], [x + unit, y], [x + unit, y + unit], [x, y + unit]], dark);
      }
    }
    if (caption) {
      const width = bold.widthOfTextAtSize(caption, captionSize);
      page.drawText(caption, {
        x: centerX - width / 2,
        y: safeBottom + captionSize * 0.4,
        size: captionSize,
        font: bold,
        color: rgb(...hexRgb(headlineInk)),
      });
    }
    endLayer(page);
    qrBottom = qrY + edge;
  }
  void qrBottom;

  // ── 07 Guides + marks ──────────────────────────────────────────────────────
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
    x: safeX,
    y: safeBottom,
    width: safeW,
    height: safeTop - safeBottom,
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

  const bytes = await doc.save({ useObjectStreams: false });
  return {
    bytes: bytes as Uint8Array<ArrayBuffer>,
    layers: names,
    lockupVector,
    page: { widthPt: pageW, heightPt: pageH },
  };
}
