// Client-side PPTX export using pptxgenjs.
// Maps a Deck's slides to a 16:9 PPTX. Heuristic layouts by content shape:
// - cover: big centered title/subtitle
// - stat/callout: giant number + label
// - items[] with title+body: card grid
// - items[] with label+body: bullet list
// - quote: pull-quote block
// Locked footer (logo text + page number) rendered on every non-cover slide.

import PptxGenJS from "pptxgenjs";
import type { Deck, DeckSlide } from "./deck-store";
import type { BrandMode } from "./taxonomy";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

export async function exportDeckToPptx(deck: Deck, brand: BrandMode) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = "TransPerfect";

  const primary = brand.tokens.primary.replace("#", "");
  const accent = brand.tokens.accent.replace("#", "");
  const surface = brand.tokens.surface.replace("#", "");
  const ink = brand.tokens.ink.replace("#", "");

  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const isCover = i === 0 || isCoverVariant(slide.variantId);
    s.background = { color: isCover ? primary : "FFFFFF" };

    if (isCover) renderCover(s, slide, { fg: "FFFFFF", accent });
    else renderContent(s, slide, { primary, accent, surface, ink });

    // Footer on non-cover slides
    if (!isCover) {
      s.addText("TransPerfect", { x: 0.5, y: 7.05, w: 4, h: 0.3, fontSize: 9, color: "666666", fontFace: "Inter" });
      s.addText(String(i + 1).padStart(2, "0"), {
        x: SLIDE_W - 1.0, y: 7.05, w: 0.5, h: 0.3, fontSize: 9, color: "666666", align: "right", fontFace: "Inter",
      });
    }
  });

  await pptx.writeFile({ fileName: `${sanitize(deck.title)}.pptx` });
}

function isCoverVariant(id: string) {
  return id.startsWith("MV-OP-COVER") || id === "MV-OP-DIVIDER" || id === "MV-OP-DIVIDER-NUMBERED";
}

function renderCover(s: PptxGenJS.Slide, slide: DeckSlide, c: { fg: string; accent: string }) {
  const c1 = slide.content as Record<string, unknown>;
  const title = String(c1.title ?? "");
  const subtitle = String(c1.subtitle ?? c1.kicker ?? "");
  const date = String(c1.date ?? "");
  s.addShape("rect", { x: 0.6, y: 3.2, w: 0.15, h: 1.6, fill: { color: c.accent }, line: { color: c.accent } });
  s.addText(title, {
    x: 1.0, y: 2.8, w: SLIDE_W - 2, h: 2.4,
    fontSize: 54, bold: true, color: c.fg, fontFace: "Inter", valign: "middle",
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 1.0, y: 5.0, w: SLIDE_W - 2, h: 0.8,
      fontSize: 22, color: c.fg, fontFace: "Inter",
    });
  }
  if (date) {
    s.addText(date, { x: 1.0, y: 6.6, w: 4, h: 0.4, fontSize: 12, color: c.fg, fontFace: "Inter" });
  }
}

function renderContent(
  s: PptxGenJS.Slide,
  slide: DeckSlide,
  c: { primary: string; accent: string; surface: string; ink: string },
) {
  const content = slide.content as Record<string, unknown>;
  const title = String(content.title ?? content.headline ?? content.insight ?? content.idea ?? "");
  const kicker = String(content.kicker ?? "");

  // Title zone
  let cursorY = 0.55;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y: cursorY, w: SLIDE_W - 1.2, h: 0.3,
      fontSize: 11, bold: true, color: c.accent, fontFace: "Inter", charSpacing: 3,
    });
    cursorY += 0.35;
  }
  if (title) {
    s.addText(title, {
      x: 0.6, y: cursorY, w: SLIDE_W - 1.2, h: 1.1,
      fontSize: 32, bold: true, color: c.primary, fontFace: "Inter",
    });
    cursorY += 1.15;
  }

  const items = Array.isArray(content.items) ? (content.items as Array<Record<string, unknown>>) : null;
  const stat = content.stat ?? content.amount;
  const quote = content.quote;

  if (typeof stat === "string" || typeof stat === "number") {
    // Big stat callout
    const unit = String(content.unit ?? "");
    const label = String(content.label ?? content.narrative ?? "");
    s.addText(`${stat}${unit}`, {
      x: 0.6, y: cursorY + 0.5, w: SLIDE_W - 1.2, h: 3.0,
      fontSize: 180, bold: true, color: c.primary, fontFace: "Inter",
    });
    if (label) {
      s.addText(label, {
        x: 0.6, y: cursorY + 3.8, w: SLIDE_W - 1.2, h: 1.5,
        fontSize: 18, color: c.ink, fontFace: "Inter",
      });
    }
    return;
  }

  if (typeof quote === "string") {
    const attribution = String(content.attribution ?? "");
    const role = String(content.role ?? "");
    s.addText(`" ${quote} "`, {
      x: 0.9, y: cursorY + 0.5, w: SLIDE_W - 1.8, h: 3.5,
      fontSize: 28, italic: true, color: c.primary, fontFace: "Inter",
    });
    if (attribution) {
      s.addText(`${attribution}${role ? ` · ${role}` : ""}`, {
        x: 0.9, y: cursorY + 4.3, w: SLIDE_W - 1.8, h: 0.5,
        fontSize: 14, color: c.ink, fontFace: "Inter",
      });
    }
    return;
  }

  if (items && items.length > 0) {
    const firstItem = items[0];
    const hasCardShape = "title" in firstItem && "body" in firstItem;
    const hasStatShape = "value" in firstItem;

    if (hasStatShape) {
      // Stat grid — up to 4 columns
      const cols = Math.min(items.length, 4);
      const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
      items.slice(0, cols).forEach((it, k) => {
        const x = 0.6 + k * (colW + 0.3);
        s.addText(`${it.value ?? ""}${it.unit ?? ""}`, {
          x, y: cursorY + 0.4, w: colW, h: 1.6,
          fontSize: 60, bold: true, color: c.primary, fontFace: "Inter",
        });
        s.addText(String(it.label ?? ""), {
          x, y: cursorY + 2.1, w: colW, h: 1.4,
          fontSize: 13, color: c.ink, fontFace: "Inter",
        });
      });
      return;
    }

    if (hasCardShape) {
      const cols = items.length <= 2 ? items.length : items.length <= 4 ? 2 : 3;
      const rows = Math.ceil(items.length / cols);
      const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
      const rowH = (5.8 - cursorY - (rows - 1) * 0.3) / rows;
      items.forEach((it, k) => {
        const r = Math.floor(k / cols);
        const col = k % cols;
        const x = 0.6 + col * (colW + 0.3);
        const y = cursorY + 0.2 + r * (rowH + 0.3);
        s.addShape("rect", {
          x, y, w: colW, h: rowH,
          fill: { color: c.surface }, line: { color: "E5E1DA" },
        });
        s.addText(String(it.title ?? ""), {
          x: x + 0.25, y: y + 0.2, w: colW - 0.5, h: 0.6,
          fontSize: 16, bold: true, color: c.primary, fontFace: "Inter",
        });
        s.addText(String(it.body ?? ""), {
          x: x + 0.25, y: y + 0.85, w: colW - 0.5, h: rowH - 1.0,
          fontSize: 12, color: c.ink, fontFace: "Inter", valign: "top",
        });
      });
      return;
    }

    // Bulleted list (label/body items or plain label)
    const bullets = items.map((it) => ({
      text: `${it.label ?? it.name ?? ""}${it.body ? ` — ${it.body}` : ""}`,
      options: { bullet: { code: "25CF" }, fontFace: "Inter", fontSize: 14, color: c.ink },
    }));
    s.addText(bullets, {
      x: 0.6, y: cursorY + 0.3, w: SLIDE_W - 1.2, h: 5.5 - cursorY,
      fontSize: 14, color: c.ink, fontFace: "Inter", paraSpaceAfter: 8,
    });
    return;
  }

  // Fallback: narrative / body text
  const narrative = String(content.narrative ?? content.body ?? content.soWhat ?? "");
  if (narrative) {
    s.addText(narrative, {
      x: 0.6, y: cursorY + 0.3, w: SLIDE_W - 1.2, h: 4.5,
      fontSize: 18, color: c.ink, fontFace: "Inter", valign: "top",
    });
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "deck";
}
