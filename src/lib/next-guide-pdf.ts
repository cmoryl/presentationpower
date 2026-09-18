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
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { resolveAssetUrl } from "./asset-base-url";
import {
  GUIDE_ARTWORK_NOTE,
  guideSize,
  type GuideBlock,
  type GuideConfig,
} from "./next-guide";

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
  ) {
    this.y = top;
  }
  get room() {
    return this.y - this.bottom;
  }
  space(v: number) {
    this.y -= v;
  }
  rule(color = ACCENT, thickness = 1.2) {
    this.page.drawRectangle({
      x: this.x,
      y: this.y,
      width: this.width,
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
        color: hex(opts.color ?? INK),
      });
    }
    return fitted;
  }
}

function drawCover(page: PDFPage, fonts: Fonts, block: Extract<GuideBlock, { kind: "cover" }>, config: GuideConfig) {
  const w = page.getWidth();
  const h = page.getHeight();
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: hex(INK) });
  // Brick rail — the shared ELEMENT/NEXT device, drawn as vector squares.
  const brick = w * 0.042;
  for (let i = 0; i < 5; i += 1) {
    page.drawRectangle({
      x: w * 0.1 + i * (brick * 1.28),
      y: h - h * 0.1 - brick,
      width: brick,
      height: brick,
      color: hex(i % 2 === 0 ? ACCENT : PAPER),
      opacity: i % 2 === 0 ? 1 : 0.9,
    });
  }
  const margin = w * 0.1;
  const flow = new Flow(page, fonts, margin, h * 0.66, w - margin * 2, h * 0.12);
  if (block.eyebrow) {
    flow.text(block.eyebrow, { size: w * 0.024, bold: true, color: ACCENT, upper: true, tracking: 1.4 });
    flow.space(10);
  }
  flow.text(block.title || "YOUR GUIDE", { size: w * 0.115, bold: true, color: PAPER, leading: w * 0.115 });
  flow.space(14);
  if (block.theme)
    flow.text(block.theme, { size: w * 0.038, bold: true, color: PAPER, upper: true, tracking: 1.2 });
  flow.space(8);
  if (block.strapline)
    flow.text(block.strapline, { size: w * 0.019, color: SURFACE, tracking: 1.1, upper: true });
  // Footer band: the location facts, never retyped into artwork.
  const foot = [config.location.venue, config.location.city, config.location.dates]
    .filter(Boolean)
    .join(" · ");
  const footFlow = new Flow(page, fonts, margin, h * 0.12, w - margin * 2, 0);
  if (foot) footFlow.text(foot, { size: w * 0.02, bold: true, color: PAPER });
  if (block.footnote) {
    footFlow.space(4);
    footFlow.text(block.footnote, { size: w * 0.018, color: ACCENT });
  }
}

function drawPage(
  page: PDFPage,
  fonts: Fonts,
  block: GuideBlock,
  config: GuideConfig,
  pageNo: number,
  notes: string[],
  /** First unprinted entry, for continuation pages. */
  start = 0,
): number {
  const w = page.getWidth();
  const h = page.getHeight();
  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: hex(PAPER) });
  const margin = w * 0.085;
  const inner = w - margin * 2;

  // Header rule and running head.
  page.drawRectangle({ x: margin, y: h - margin * 0.7, width: inner, height: 1.2, color: hex(ACCENT) });
  const head = [config.location.city, config.location.dates].filter(Boolean).join(" · ");
  if (head)
    page.drawText(head.toUpperCase(), {
      x: margin,
      y: h - margin * 0.7 + 8,
      size: w * 0.0165,
      font: fonts.bold,
      color: hex(ACCENT),
    });

  const flow = new Flow(page, fonts, margin, h - margin, inner, margin * 1.1);
  const title =
    block.kind === "keynote" ? block.talkTitle || block.name : "title" in block ? block.title : "";
  const eyebrow = block.kind === "keynote" ? block.eyebrow : "";
  if (eyebrow) {
    flow.text(eyebrow, { size: w * 0.019, bold: true, color: ACCENT, upper: true, tracking: 1.2 });
    flow.space(6);
  }
  if (title) {
    flow.text(start > 0 ? `${title} (continued)` : title, {
      size: w * 0.056,
      bold: true,
      leading: w * 0.062,
    });
    flow.space(12);
    flow.rule();
  }

  let fitted = true;
  const standfirst = start > 0 ? "" : "standfirst" in block ? block.standfirst : "";
  if (standfirst) {
    fitted = flow.text(standfirst, { size: w * 0.024, color: ACCENT, leading: w * 0.034 }) && fitted;
    flow.space(16);
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
        fitted = flow.text(block.byline, { size: body, bold: true, color: ACCENT }) && fitted;
      if (block.note) {
        flow.space(22);
        page.drawRectangle({
          x: margin,
          y: flow.y - w * 0.055,
          width: inner,
          height: w * 0.055,
          color: hex(SURFACE),
        });
        flow.space(12);
        fitted = flow.text(block.note, { size: body, leading: lead, indent: w * 0.02 }) && fitted;
        flow.space(10);
      }
      break;
    }
    case "info":
    case "list": {
      for (let i = start; i < block.items.length; i += 1) {
        const it = block.items[i]!;
        if (flow.room < lead * 3 && i > start) return i;
        const ok =
          flow.text(it.label, { size: w * 0.026, bold: true }) &&
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
        fitted = flow.text(day.name, { size: w * 0.028, bold: true, color: ACCENT }) && fitted;
        flow.space(8);
        for (const r of day.rows) {
          if (flow.room < lead * 1.4) {
            if (d > start) return d;
            fitted = false;
            break;
          }
          const y = flow.y - lead;
          page.drawText(r.time, { x: margin, y, size: body, font: fonts.bold, color: hex(INK) });
          page.drawText(r.item, {
            x: margin + inner * 0.26,
            y,
            size: body,
            font: fonts.regular,
            color: hex(INK),
          });
          flow.space(lead);
          page.drawRectangle({
            x: margin,
            y: flow.y - 5,
            width: inner,
            height: 0.5,
            color: hex(ACCENT),
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
        fitted = flow.text(block.name, { size: w * 0.034, bold: true, color: ACCENT }) && fitted;
      if (block.when) {
        flow.space(4);
        fitted = flow.text(block.when, { size: body, bold: true }) && fitted;
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
        fitted = flow.text(floor.name, { size: w * 0.026, bold: true, color: ACCENT }) && fitted;
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
        fitted = flow.text(link.url, { size: body, color: ACCENT, leading: lead }) && fitted;
        flow.space(14);
      }
      break;
    }
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
    color: hex(ACCENT),
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

  const size = guideSize(config.sizeId);
  const widthPt = size.trimW * MM_TO_PT;
  const heightPt = size.trimH * MM_TO_PT;

  let pageNo = 0;
  for (const block of config.blocks) {
    const page = doc.addPage([widthPt, heightPt]);
    pageNo += 1;
    if (block.kind === "cover") {
      drawCover(page, { bold, regular }, block, config);
      continue;
    }
    // A block longer than one page carries on over continuation pages rather
    // than silently losing its tail.
    let next = drawPage(page, { bold, regular }, block, config, pageNo, notes, 0);
    let guard = 0;
    while (next >= 0 && guard < 20) {
      guard += 1;
      const more = doc.addPage([widthPt, heightPt]);
      pageNo += 1;
      next = drawPage(more, { bold, regular }, block, config, pageNo, notes, next);
    }
  }
  if (!pageNo) doc.addPage([widthPt, heightPt]);

  doc.setTitle(`${config.location.city || "NEXT"} — your guide`);
  doc.setProducer("TransPerfect Element");

  const bytes = (await doc.save()) as Uint8Array<ArrayBuffer>;
  return { bytes, pageCount: doc.getPageCount(), page: { widthPt, heightPt }, notes };
}
