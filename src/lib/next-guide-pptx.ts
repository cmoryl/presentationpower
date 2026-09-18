// -----------------------------------------------------------------------------
// NEXT delegate guide — editable PowerPoint export.
//
// One slide per guide page, sized to the handout's own trim so nothing is
// cropped or letterboxed. Every line is a native PowerPoint text object in the
// approved inks, so the guide can be walked through on screen at a briefing and
// corrected in place.
// -----------------------------------------------------------------------------

import PptxGenJS from "pptxgenjs";

import { guideSize, type GuideBlock, type GuideConfig } from "./next-guide";

const MM_TO_IN = 1 / 25.4;

const INK = "03002C";
const ACCENT = "003FC7";
const PAPER = "FFFFFF";
const SURFACE = "EEF1F7";

export async function buildGuidePptx(config: GuideConfig): Promise<Uint8Array<ArrayBuffer>> {
  const size = guideSize(config.sizeId);
  const W = size.trimW * MM_TO_IN;
  const H = size.trimH * MM_TO_IN;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "GUIDE", width: W, height: H });
  pptx.layout = "GUIDE";
  pptx.title = `${config.location.city || "NEXT"} — your guide`;

  const M = W * 0.085;
  const inner = W - M * 2;

  for (const block of config.blocks) {
    const slide = pptx.addSlide();
    if (block.kind === "cover") {
      slide.background = { color: INK };
      const brick = W * 0.042;
      for (let i = 0; i < 5; i += 1)
        slide.addShape("rect", {
          x: W * 0.1 + i * brick * 1.28,
          y: H * 0.1,
          w: brick,
          h: brick,
          fill: { color: i % 2 === 0 ? ACCENT : PAPER },
        });
      slide.addText(block.eyebrow.toUpperCase(), {
        x: M,
        y: H * 0.36,
        w: inner,
        h: 0.3,
        fontFace: "Geist",
        fontSize: 12,
        bold: true,
        color: ACCENT,
        charSpacing: 1.4,
      });
      slide.addText(block.title || "YOUR GUIDE", {
        x: M,
        y: H * 0.41,
        w: inner,
        h: H * 0.16,
        fontFace: "Geist",
        fontSize: 54,
        bold: true,
        color: PAPER,
      });
      if (block.theme)
        slide.addText(block.theme.toUpperCase(), {
          x: M,
          y: H * 0.58,
          w: inner,
          h: 0.5,
          fontFace: "Geist",
          fontSize: 22,
          bold: true,
          color: PAPER,
        });
      if (block.strapline)
        slide.addText(block.strapline.toUpperCase(), {
          x: M,
          y: H * 0.65,
          w: inner,
          h: 0.4,
          fontFace: "Geist",
          fontSize: 11,
          color: SURFACE,
          charSpacing: 1.1,
        });
      slide.addText(
        [config.location.venue, config.location.address, config.location.dates]
          .filter(Boolean)
          .join(" · "),
        { x: M, y: H * 0.86, w: inner, h: 0.6, fontFace: "Geist", fontSize: 11, bold: true, color: PAPER },
      );
      if (block.footnote)
        slide.addText(block.footnote, {
          x: M,
          y: H * 0.91,
          w: inner,
          h: 0.3,
          fontFace: "Geist",
          fontSize: 11,
          color: ACCENT,
        });
      continue;
    }

    slide.background = { color: PAPER };
    slide.addShape("rect", { x: M, y: M * 0.7, w: inner, h: 0.012, fill: { color: ACCENT } });
    const head = [config.location.city, config.location.dates].filter(Boolean).join(" · ");
    if (head)
      slide.addText(head.toUpperCase(), {
        x: M,
        y: M * 0.4,
        w: inner,
        h: 0.25,
        fontFace: "Geist",
        fontSize: 10,
        bold: true,
        color: ACCENT,
        charSpacing: 1.1,
      });

    const title =
      block.kind === "keynote" ? block.talkTitle || block.name : "title" in block ? block.title : "";
    slide.addText(title, {
      x: M,
      y: M * 1.0,
      w: inner,
      h: H * 0.09,
      fontFace: "Geist",
      fontSize: 28,
      bold: true,
      color: INK,
      valign: "top",
    });

    const lines: { text: string; options: PptxGenJS.TextPropsOptions }[] = [];
    const push = (text: string, o: PptxGenJS.TextPropsOptions) =>
      lines.push({ text, options: { fontFace: "Geist", color: INK, breakLine: true, ...o } });

    const standfirst = "standfirst" in block ? block.standfirst : "";
    if (standfirst) push(standfirst, { fontSize: 13, color: ACCENT });

    switch (block.kind) {
      case "welcome":
        push(block.body, { fontSize: 12 });
        if (block.byline) push(block.byline, { fontSize: 11, bold: true, color: ACCENT });
        if (block.note) push(block.note, { fontSize: 11, highlight: SURFACE });
        break;
      case "info":
      case "list":
        for (const it of block.items) {
          push(it.label, { fontSize: 14, bold: true });
          push(it.body, { fontSize: 11 });
        }
        break;
      case "schedule":
        for (const day of block.days) {
          push(day.name, { fontSize: 14, bold: true, color: ACCENT });
          for (const r of day.rows) push(`${r.time}    ${r.item}`, { fontSize: 11 });
        }
        break;
      case "keynote":
        push(block.name, { fontSize: 16, bold: true, color: ACCENT });
        if (block.when) push(block.when, { fontSize: 11, bold: true });
        push(block.body, { fontSize: 11 });
        break;
      case "floors":
        for (const floor of block.floors) {
          push(floor.name, { fontSize: 14, bold: true, color: ACCENT });
          if (floor.room) push(floor.room, { fontSize: 11, bold: true });
          for (const line of floor.lines) push(`· ${line}`, { fontSize: 11 });
        }
        break;
      case "links":
        for (const link of block.links) {
          push(link.label, { fontSize: 14, bold: true });
          push(link.url, { fontSize: 11, color: ACCENT });
        }
        break;
      default:
        break;
    }

    if (lines.length)
      slide.addText(lines, {
        x: M,
        y: M * 1.0 + H * 0.1,
        w: inner,
        h: H - (M * 2.2 + H * 0.1),
        valign: "top",
        lineSpacingMultiple: 1.25,
      });
  }

  const out = (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
  return out as Uint8Array<ArrayBuffer>;
}
