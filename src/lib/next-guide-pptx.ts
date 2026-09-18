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
import { guideAccent, guideChevrons, guideGround } from "./next-guide-theme";

const MM_TO_IN = 1 / 25.4;

const INK = "03002C";
const PAPER = "FFFFFF";

const bare = (hex: string) => hex.replace("#", "").toUpperCase();

/**
 * PowerPoint has no free-form gradient mesh, so the violet-to-blue ground is
 * laid as its own two-stop gradient fill on a full-bleed rectangle, with the
 * chevron run over it as flat shapes — the same device as the press sheet, in
 * the terms PowerPoint can actually edit.
 */
function paintGround(
  slide: PptxGenJS.Slide,
  W: number,
  H: number,
  groundId: Parameters<typeof guideGround>[0],
  variant: "cover" | "page",
) {
  const g = guideGround(groundId);
  const first = bare(g.stops[0]!);
  const last = bare(g.stops[Math.floor(g.stops.length / 2)] ?? g.stops[g.stops.length - 1]!);
  slide.background = { color: last };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: { type: "solid", color: first, transparency: 45 },
  });
  for (const c of guideChevrons(variant)) {
    slide.addShape("chevron", {
      x: c.x * W,
      y: c.y * H,
      w: c.w * W,
      h: c.h * H,
      fill: { color: bare(g.ink), transparency: Math.round(100 - c.opacity * 100) },
      line: { type: "none" },
    });
  }
  return g;
}

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
      paintGround(slide, W, H, block.ground, "cover");
      const ACCENT = bare(guideAccent(block.accent));
      if (block.disc) {
        const d = W * 0.3;
        slide.addShape("ellipse", {
          x: W - M - d,
          y: H * 0.05,
          w: d,
          h: d,
          fill: { color: ACCENT },
        });
        slide.addText(block.disc.toUpperCase(), {
          x: W - M - d,
          y: H * 0.05,
          w: d,
          h: d,
          align: "center",
          valign: "middle",
          fontFace: "Geist",
          fontSize: 14,
          bold: true,
          color: INK,
        });
      }
      slide.addText(block.eyebrow.toUpperCase(), {
        x: M,
        y: H * 0.36,
        w: inner,
        h: 0.3,
        fontFace: "Geist",
        fontSize: 12,
        bold: true,
        color: PAPER,
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
          color: ACCENT,
        });
      if (block.strapline)
        slide.addText(block.strapline.toUpperCase(), {
          x: M,
          y: H * 0.65,
          w: inner,
          h: 0.4,
          fontFace: "Geist",
          fontSize: 11,
          color: ACCENT,
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

    if (block.kind === "closing") {
      const g = paintGround(slide, W, H, block.ground, "page");
      const ACCENT = bare(guideAccent(block.accent));
      slide.addText((block.title || "BEYOND INTELLIGENCE").toUpperCase(), {
        x: M,
        y: H * 0.42,
        w: inner,
        h: H * 0.1,
        align: "center",
        fontFace: "Geist",
        fontSize: 30,
        bold: true,
        color: ACCENT,
      });
      if (block.standfirst)
        slide.addText(block.standfirst.toUpperCase(), {
          x: M,
          y: H * 0.54,
          w: inner,
          h: 0.4,
          align: "center",
          fontFace: "Geist",
          fontSize: 11,
          bold: true,
          color: bare(g.ink),
          charSpacing: 1.2,
        });
      continue;
    }

    const g = paintGround(slide, W, H, block.ground, "page");
    const ACCENT = bare(guideAccent(block.accent));
    const PAGE_INK = bare(g.ink);
    slide.addShape("rect", { x: M, y: M * 0.7, w: inner * 0.18, h: 0.012, fill: { color: ACCENT } });
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
        color: PAGE_INK,
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
      color: ACCENT,
      valign: "top",
    });

    const lines: { text: string; options: PptxGenJS.TextPropsOptions }[] = [];
    const push = (text: string, o: PptxGenJS.TextPropsOptions) =>
      lines.push({ text, options: { fontFace: "Geist", color: PAGE_INK, breakLine: true, ...o } });

    const standfirst = "standfirst" in block ? block.standfirst : "";
    if (standfirst) push(standfirst, { fontSize: 13 });

    switch (block.kind) {
      case "welcome":
        push(block.body, { fontSize: 12 });
        if (block.byline) push(block.byline, { fontSize: 11, bold: true, color: ACCENT });
        if (block.note) push(block.note, { fontSize: 11, italic: true });
        break;
      case "info":
      case "list":
        for (const it of block.items) {
          push(it.label, { fontSize: 14, bold: true, color: ACCENT });
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
          if (floor.room) push(floor.room, { fontSize: 11, bold: true, color: PAGE_INK });
          for (const line of floor.lines) push(`· ${line}`, { fontSize: 11 });
        }
        break;
      case "links":
        for (const link of block.links) {
          push(link.label, { fontSize: 14, bold: true, color: PAGE_INK });
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
