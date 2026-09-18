// -----------------------------------------------------------------------------
// NEXT delegate guide — press PDF.
//
// Every page is live vector type drawn on brand ink or paper: there is no placed
// render anywhere in the file, so the guide can be reflowed, corrected and
// reprinted without going back to artwork. Geist is embedded when the face is
// available; if it is not, the builder says so in its notes rather than
// silently substituting a different look.
// -----------------------------------------------------------------------------

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames as Ops,
  StandardFonts,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { resolveAssetUrl } from "./asset-base-url";
import {
  GUIDE_ARTWORK_NOTE,
  guideSize,
  type GuideBlock,
  type GuideConfig,
} from "./next-guide";
import {
  GUIDE_IMAGES,
  guideAccent,
  guideChevronPathAt,
  guideChevrons,
  guideGround,
  guideImage,
} from "./next-guide-theme";
import { registerGradientPattern, type ShadingStop } from "./pdf-analytic-shading";
import { qrRaster } from "./qr-print";

const MM_TO_PT = 72 / 25.4;

const INK = "#03002C";
const ACCENT = "#003FC7";
const PAPER = "#FFFFFF";
const SURFACE = "#EEF1F7";

export type GuidePdfResult = {
  bytes: Uint8Array<ArrayBuffer>;
  pageCount: number;
  page: { widthPt: number; heightPt: number };
  notes: string[];
};

function hex(h: string) {
  const s = h.replace("#", "");
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

function hexStop(h: string): [number, number, number] {
  const c = hex(h);
  return [c.red, c.green, c.blue];
}

/**
 * The ground, painted as a real shading pattern on the sheet rectangle so
 * Illustrator opens it as an editable gradient rather than a mesh.
 */
function paintGround(doc: PDFDocument, page: PDFPage, block: GuideBlock): void {
  const w = page.getWidth();
  const h = page.getHeight();
  const ground = guideGround(block.ground);
  if (ground.stops.length < 2) {
    page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: hex(ground.stops[0]!) });
    return;
  }
  const last = ground.stops.length - 1;
  const stops: ShadingStop[] = ground.stops.map((s, i) => ({ offset: i / last, color: hexStop(s) }));
  const { name } = registerGradientPattern(
    doc,
    page,
    { kind: "axial", from: { x: 0, y: h }, to: { x: w, y: 0 } },
    stops,
    "rgb",
    "PGuide",
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

/** The chevron watermark, as vector paths on the page. */
function paintChevrons(page: PDFPage, variant: "cover" | "page" | "band", scale = 1): void {
  const w = page.getWidth();
  const h = page.getHeight();
  for (const c of guideChevrons(variant)) {
    page.drawSvgPath(guideChevronPathAt(c, w, h), {
      x: 0,
      y: h,
      color: hex(PAPER),
      opacity: c.opacity * scale,
      borderWidth: 0,
    });
  }
}

/** Paint a photograph to fill a box, cropping rather than squashing it. */
function paintPhoto(
  page: PDFPage,
  img: PDFImage,
  box: { x: number; y: number; w: number; h: number },
): void {
  const boxRatio = box.w / box.h;
  const imgRatio = img.width / img.height;
  let dw = box.w;
  let dh = box.h;
  if (imgRatio > boxRatio) dw = box.h * imgRatio;
  else dh = box.w / imgRatio;
  page.pushOperators(
    pushGraphicsState(),
    PDFOperator.of(Ops.AppendRectangle, [
      PDFNumber.of(box.x),
      PDFNumber.of(box.y),
      PDFNumber.of(box.w),
      PDFNumber.of(box.h),
    ]),
    PDFOperator.of("W" as never),
    PDFOperator.of("n" as never),
  );
  page.drawImage(img, {
    x: box.x + (box.w - dw) / 2,
    y: box.y + (box.h - dh) / 2,
    width: dw,
    height: dh,
  });
  page.pushOperators(popGraphicsState());
}

/** A live code drawn as vector squares — never a placed raster. */
function paintQr(page: PDFPage, url: string, x: number, y: number, edge: number): boolean {
  const raster = qrRaster(url, { style: "block", modulePx: 2 });
  if (!raster) return false;
  const n = raster.width;
  const step = edge / n;
  page.drawRectangle({ x, y, width: edge, height: edge, color: hex(PAPER) });
  for (let ry = 0; ry < n; ry += 1) {
    for (let rx = 0; rx < n; rx += 1) {
      if (raster.ink[ry * n + rx] !== 1) continue;
      page.drawRectangle({
        x: x + rx * step,
        y: y + edge - (ry + 1) * step,
        width: step * 1.02,
        height: step * 1.02,
        color: hex(INK),
      });
    }
  }
  return true;
}

async function ttf(doc: PDFDocument, path: string): Promise<PDFFont | null> {
  try {
    const res = await fetch(resolveAssetUrl(path));
    if (!res.ok) return null;
    return await doc.embedFont(await res.arrayBuffer(), {
      subset: false,
      features: { liga: false, clig: false, dlig: false, rlig: false },
    });
  } catch {
    return null;
  }
}

function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of (text ?? "").split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = words[0]!;
    for (const word of words.slice(1)) {
      const next = `${line} ${word}`;
      if (font.widthOfTextAtSize(next, size) <= maxW) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

type Fonts = { bold: PDFFont; regular: PDFFont };

/** A cursor that lays copy down a page and refuses to print past the bottom. */
class Flow {
  y: number;
  constructor(
    private page: PDFPage,
    private fonts: Fonts,
    private x: number,
    top: number,
    private width: number,
    private bottom: number,
    /** Colour used when a call does not name one — white on the brand ground. */
    private ink: string = INK,
  ) {
    this.y = top;
  }
  get room() {
    return this.y - this.bottom;
  }
  space(v: number) {
    this.y -= v;
  }
  rule(color = ACCENT, thickness = 1.2, widthFrac = 1) {
    this.page.drawRectangle({
      x: this.x,
      y: this.y,
      width: this.width * widthFrac,
      height: thickness,
      color: hex(color),
    });
    this.y -= thickness + 10;
  }
  /** Returns false when the copy did not fit, so callers can report the overflow. */
  text(
    value: string,
    opts: {
      size: number;
      bold?: boolean;
      color?: string;
      leading?: number;
      indent?: number;
      tracking?: number;
      upper?: boolean;
    },
  ): boolean {
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const size = opts.size;
    const leading = opts.leading ?? size * 1.38;
    const indent = opts.indent ?? 0;
    const body = opts.upper ? value.toUpperCase() : value;
    const lines = wrap(font, body, size, this.width - indent);
    let fitted = true;
    for (const line of lines) {
      if (this.y - leading < this.bottom) {
        fitted = false;
        break;
      }
      this.y -= leading;
      this.page.drawText(line, {
        x: this.x + indent,
        y: this.y,
        size,
        font,
        color: hex(opts.color ?? this.ink),
      });
    }
    return fitted;
  }
}

function drawCover(
  doc: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  block: Extract<GuideBlock, { kind: "cover" }>,
  config: GuideConfig,
  images: Map<string, PDFImage>,
): void {
  const w = page.getWidth();
  const h = page.getHeight();
  paintGround(doc, page, block);
  paintChevrons(page, "cover");
  const accent = guideAccent(block.accent);
  const ink = guideGround(block.ground).ink;

  // Photograph band across the foot, under a graduated scrim so the facts read.
  const photo = block.imagePlace === "none" ? null : images.get(block.imageId ?? "");
  if (photo) {
    const bandH = h * 0.38;
    paintPhoto(page, photo, { x: 0, y: 0, w, h: bandH });
    page.drawRectangle({ x: 0, y: 0, width: w, height: bandH, color: hex(INK), opacity: 0.5 });
  }

  // Yellow date disc, top right.
  if (block.disc) {
    const r = w * 0.13;
    const cx = w - w * 0.07 - r;
    const cy = h - h * 0.06 - r;
    page.drawCircle({ x: cx, y: cy, size: r, color: hex(accent) });
    const discSize = w * 0.026;
    const lines = wrap(fonts.bold, block.disc.toUpperCase(), discSize, r * 1.5);
    let dy = cy + ((lines.length - 1) * discSize * 1.2) / 2;
    for (const line of lines) {
      page.drawText(line, {
        x: cx - fonts.bold.widthOfTextAtSize(line, discSize) / 2,
        y: dy - discSize * 0.35,
        size: discSize,
        font: fonts.bold,
        color: hex(INK),
      });
      dy -= discSize * 1.2;
    }
  }

  const margin = w * 0.09;
  const flow = new Flow(page, fonts, margin, h * 0.72, w - margin * 2, h * 0.14, ink);
  flow.text(block.title || "YOUR GUIDE", {
    size: w * 0.125,
    bold: true,
    upper: true,
    leading: w * 0.118,
  });
  flow.space(12);
  if (block.theme)
    flow.text(block.theme, { size: w * 0.044, bold: true, color: accent, upper: true });
  flow.space(8);
  if (block.strapline) flow.text(block.strapline, { size: w * 0.02, bold: true, upper: true });

  const foot = [config.location.venue, config.location.city, config.location.dates]
    .filter(Boolean)
    .join(" \u00b7 ");
  const footFlow = new Flow(page, fonts, margin, h * 0.1, w - margin * 2, 0, ink);
  if (foot) footFlow.text(foot, { size: w * 0.021, bold: true });
  if (block.footnote) {
    footFlow.space(4);
    footFlow.text(block.footnote, { size: w * 0.018, color: accent });
  }
}

/** The back cover: theme line centred on the ground, nothing else. */
function drawClosing(
  doc: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  block: Extract<GuideBlock, { kind: "closing" }>,
): void {
  const w = page.getWidth();
  const h = page.getHeight();
  paintGround(doc, page, block);
  paintChevrons(page, "page");
  const accent = guideAccent(block.accent);
  const ink = guideGround(block.ground).ink;
  const size = w * 0.065;
  const lines = wrap(fonts.bold, (block.title || "").toUpperCase(), size, w * 0.82);
  let y = h * 0.56;
  for (const line of lines) {
    page.drawText(line, {
      x: (w - fonts.bold.widthOfTextAtSize(line, size)) / 2,
      y,
      size,
      font: fonts.bold,
      color: hex(accent),
    });
    y -= size * 1.1;
  }
  if (block.standfirst) {
    const s2 = w * 0.022;
    page.drawText(block.standfirst.toUpperCase(), {
      x: (w - fonts.bold.widthOfTextAtSize(block.standfirst.toUpperCase(), s2)) / 2,
      y: y - s2 * 2,
      size: s2,
      font: fonts.bold,
      color: hex(ink),
    });
  }
}

function drawPage(
  doc: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  block: GuideBlock,
  config: GuideConfig,
  pageNo: number,
  notes: string[],
  images: Map<string, PDFImage>,
  /** First unprinted entry, for continuation pages. */
  start = 0,
): number {
  const w = page.getWidth();
  const h = page.getHeight();
  paintGround(doc, page, block);
  const accent = guideAccent(block.accent);
  const ink = guideGround(block.ground).ink;
  const photo = block.imagePlace === "none" ? null : (images.get(block.imageId ?? "") ?? null);
  const place = block.imagePlace ?? "band";
  paintChevrons(page, photo && place === "band" ? "band" : "page");

  const margin = w * 0.09;
  const inner = w - margin * 2;
  let bottom = margin * 1.2;

  // Photograph band across the foot on a section opener.
  if (photo && place === "band") {
    const bandH = h * 0.26;
    paintPhoto(page, photo, { x: 0, y: 0, w, h: bandH });
    page.drawRectangle({ x: 0, y: 0, width: w, height: bandH, color: hex(INK), opacity: 0.25 });
    bottom = bandH + margin * 0.5;
  }

  // Vertical label down the inside edge, as the master uses.
  if (block.sidebar) {
    page.drawText(block.sidebar.toUpperCase(), {
      x: margin * 0.34,
      y: h * 0.3,
      size: w * 0.017,
      font: fonts.bold,
      color: hex(accent),
      rotate: degrees(90),
    });
  }

  // Running head and its short rule.
  const head = [config.location.city, config.location.dates].filter(Boolean).join(" · ");
  if (head)
    page.drawText(head.toUpperCase(), {
      x: margin,
      y: h - margin * 0.72,
      size: w * 0.016,
      font: fonts.bold,
      color: hex(accent),
    });
  page.drawRectangle({
    x: margin,
    y: h - margin * 0.72 - 8,
    width: inner * 0.22,
    height: 1.8,
    color: hex(accent),
  });

  const flow = new Flow(page, fonts, margin, h - margin, inner, bottom, ink);

  const title =
    block.kind === "keynote" ? block.talkTitle || block.name : "title" in block ? block.title : "";
  const eyebrow = block.kind === "keynote" ? block.eyebrow : "";
  if (eyebrow) {
    flow.text(eyebrow, { size: w * 0.019, bold: true, upper: true, tracking: 1.2 });
    flow.space(6);
  }
  if (title) {
    flow.text(start > 0 ? `${title} (continued)` : title, {
      size: w * 0.058,
      bold: true,
      upper: true,
      color: accent,
      leading: w * 0.062,
    });
    flow.space(10);
  }

  let fitted = true;
  const standfirst = start > 0 ? "" : "standfirst" in block ? block.standfirst : "";
  if (standfirst) {
    fitted = flow.text(standfirst, { size: w * 0.022, leading: w * 0.032 }) && fitted;
    flow.space(16);
  }

  if (photo && place === "hero" && start === 0) {
    const boxH = inner * 0.44;
    flow.space(10);
    paintPhoto(page, photo, { x: margin, y: flow.y - boxH, w: inner, h: boxH });
    flow.space(boxH + 14);
  }

  const body = w * 0.0215;
  const lead = w * 0.031;

  switch (block.kind) {
    case "cover":
      break;
    case "welcome": {
      fitted = flow.text(block.body, { size: w * 0.025, leading: w * 0.037 }) && fitted;
      flow.space(20);
      if (block.byline)
        fitted = flow.text(block.byline, { size: body, bold: true, color: accent }) && fitted;
      if (block.note) {
        flow.space(22);
        // The panel is sized to the wrapped note so no line falls outside it.
        const noteLines = wrap(fonts.regular, block.note, body, inner - w * 0.04);
        const panelH = noteLines.length * lead + w * 0.03;
        page.drawRectangle({
          x: margin,
          y: flow.y - panelH,
          width: inner,
          height: panelH,
          borderColor: hex(accent),
          borderWidth: 1.2,
        });
        flow.space(w * 0.014);
        fitted = flow.text(block.note, { size: body, leading: lead, indent: w * 0.02 }) && fitted;
        flow.space(w * 0.016);
      }
      break;
    }
    case "info":
    case "list": {
      for (let i = start; i < block.items.length; i += 1) {
        const it = block.items[i]!;
        if (flow.room < lead * 3 && i > start) return i;
        const ok =
          flow.text(it.label, { size: w * 0.026, bold: true, color: accent }) &&
          (flow.space(4), flow.text(it.body, { size: body, leading: lead }));
        flow.space(16);
        if (!ok) {
          if (i > start) return i;
          fitted = false;
        }
      }
      break;
    }
    case "schedule": {
      for (let d = start; d < block.days.length; d += 1) {
        const day = block.days[d]!;
        if (flow.room < lead * 4) {
          if (d > start) return d;
          fitted = false;
          break;
        }
        fitted = flow.text(day.name, { size: w * 0.028, bold: true, upper: true, color: accent }) && fitted;
        flow.space(8);
        for (const r of day.rows) {
          if (flow.room < lead * 1.4) {
            if (d > start) return d;
            fitted = false;
            break;
          }
          const y = flow.y - lead;
          page.drawText(r.time, { x: margin, y, size: body, font: fonts.bold, color: hex(accent) });
          page.drawText(r.item, {
            x: margin + inner * 0.26,
            y,
            size: body,
            font: fonts.regular,
            color: hex(ink),
          });
          flow.space(lead);
          page.drawRectangle({
            x: margin,
            y: flow.y - 5,
            width: inner,
            height: 0.5,
            color: hex(ink),
            opacity: 0.35,
          });
          flow.space(6);
        }
        flow.space(18);
      }
      break;
    }
    case "keynote": {
      if (block.name)
        fitted = flow.text(block.name, { size: w * 0.034, bold: true }) && fitted;
      if (block.when) {
        flow.space(4);
        fitted = flow.text(block.when, { size: body, bold: true, color: accent }) && fitted;
      }
      flow.space(18);
      fitted = flow.text(block.body, { size: w * 0.022, leading: w * 0.033 }) && fitted;
      break;
    }
    case "floors": {
      for (let i = start; i < block.floors.length; i += 1) {
        const floor = block.floors[i]!;
        if (flow.room < lead * 3) {
          if (i > start) return i;
          fitted = false;
          break;
        }
        fitted = flow.text(floor.name, { size: w * 0.026, bold: true, color: accent }) && fitted;
        if (floor.room) {
          flow.space(2);
          fitted = flow.text(floor.room, { size: body, bold: true }) && fitted;
        }
        flow.space(4);
        for (const line of floor.lines) {
          if (flow.room < lead * 1.2) {
            if (i > start) return i;
            fitted = false;
            break;
          }
          fitted = flow.text(`· ${line}`, { size: body, leading: lead, indent: w * 0.012 }) && fitted;
        }
        flow.space(16);
      }
      break;
    }
    case "links": {
      for (let i = start; i < block.links.length; i += 1) {
        const link = block.links[i]!;
        if (flow.room < lead * 2.4) {
          if (i > start) return i;
          fitted = false;
          break;
        }
        fitted = flow.text(link.label, { size: w * 0.026, bold: true }) && fitted;
        flow.space(2);
        fitted = flow.text(link.url, { size: body, color: accent, leading: lead }) && fitted;
        flow.space(14);
      }
      break;
    }
  }

  // Side photograph, beside the copy on a portrait page.
  if (photo && place === "side" && start === 0) {
    const boxW = inner * 0.34;
    const boxH = (boxW * 4) / 3;
    paintPhoto(page, photo, { x: margin + inner - boxW, y: bottom + margin * 0.4, w: boxW, h: boxH });
  }

  // Live code card.
  if (block.qrLabel && block.qrUrl && start === 0) {
    const edge = inner * 0.16;
    const cardH = edge + w * 0.026;
    const cardW = inner * 0.52;
    const cy = Math.max(bottom + margin * 0.3, flow.y - cardH - 10);
    page.drawRectangle({ x: margin, y: cy, width: cardW, height: cardH, color: hex(PAPER) });
    const ok = paintQr(page, block.qrUrl, margin + w * 0.013, cy + w * 0.013, edge);
    page.drawText(block.qrLabel, {
      x: margin + edge + w * 0.026,
      y: cy + cardH * 0.58,
      size: w * 0.018,
      font: fonts.bold,
      color: hex(INK),
    });
    // The address is set to fit the card rather than run past its edge.
    const addrX = margin + edge + w * 0.026;
    const addrRoom = cardW - (addrX - margin) - w * 0.013;
    const addr = block.qrUrl.replace(/^https?:\/\//i, "").replace(/^mailto:/i, "");
    let addrSize = w * 0.014;
    while (addrSize > w * 0.008 && fonts.regular.widthOfTextAtSize(addr, addrSize) > addrRoom)
      addrSize -= w * 0.0005;
    page.drawText(addr, {
      x: addrX,
      y: cy + cardH * 0.34,
      size: addrSize,
      font: fonts.regular,
      color: hex(INK),
      opacity: 0.7,
    });

    if (!ok)
      notes.push(
        `Page ${pageNo}: the code for \u201c${block.qrLabel}\u201d could not be encoded, so the card prints without one.`,
      );
  }

  if (!fitted)
    notes.push(
      `Page ${pageNo} (${title || block.kind}) holds more copy than the page can print — shorten it or split the page.`,
    );

  // Folio.
  page.drawText(String(pageNo), {
    x: w - margin - fonts.bold.widthOfTextAtSize(String(pageNo), w * 0.018),
    y: margin * 0.55,
    size: w * 0.018,
    font: fonts.bold,
    color: hex(accent),
  });
  return -1;
}

export async function buildGuidePdf(config: GuideConfig): Promise<GuidePdfResult> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const notes: string[] = [GUIDE_ARTWORK_NOTE];
  const bold = (await ttf(doc, "/fonts/Geist-Bold.ttf")) ?? (await doc.embedFont(StandardFonts.HelveticaBold));
  const regular =
    (await ttf(doc, "/fonts/Geist-Regular.ttf")) ?? (await doc.embedFont(StandardFonts.Helvetica));
  const embedded = bold.name.toLowerCase().includes("geist");
  if (!embedded)
    notes.push(
      "Geist was not available to embed, so this proof is set in Helvetica — do not send it to press.",
    );

  // Photographs are the only placed images in the file; everything else is vector.
  const images = new Map<string, PDFImage>();
  const wanted = new Set(
    config.blocks
      .filter((b) => b.imagePlace !== "none" && b.imageId)
      .map((b) => b.imageId as string),
  );
  for (const id of wanted) {
    const spec = guideImage(id) ?? GUIDE_IMAGES.find((i) => i.id === id) ?? null;
    if (!spec) continue;
    try {
      const res = await fetch(resolveAssetUrl(spec.url));
      if (!res.ok) throw new Error(String(res.status));
      images.set(id, await doc.embedJpg(await res.arrayBuffer()));
    } catch {
      notes.push(`The photograph \u201c${spec.label}\u201d could not be placed, so that page prints without it.`);
    }
  }

  const size = guideSize(config.sizeId);
  const widthPt = size.trimW * MM_TO_PT;
  const heightPt = size.trimH * MM_TO_PT;

  let pageNo = 0;
  for (const block of config.blocks) {
    const page = doc.addPage([widthPt, heightPt]);
    pageNo += 1;
    if (block.kind === "cover") {
      drawCover(doc, page, { bold, regular }, block, config, images);
      continue;
    }
    if (block.kind === "closing") {
      drawClosing(doc, page, { bold, regular }, block);
      continue;
    }
    // A block longer than one page carries on over continuation pages rather
    // than silently losing its tail.
    let next = drawPage(doc, page, { bold, regular }, block, config, pageNo, notes, images, 0);
    let guard = 0;
    while (next >= 0 && guard < 20) {
      guard += 1;
      const more = doc.addPage([widthPt, heightPt]);
      pageNo += 1;
      next = drawPage(doc, more, { bold, regular }, block, config, pageNo, notes, images, next);
    }
  }
  if (!pageNo) doc.addPage([widthPt, heightPt]);

  doc.setTitle(`${config.location.city || "NEXT"} — your guide`);
  doc.setProducer("TransPerfect Element");

  const bytes = (await doc.save()) as Uint8Array<ArrayBuffer>;
  return { bytes, pageCount: doc.getPageCount(), page: { widthPt, heightPt }, notes };
}
