// Client-side PPTX export using pptxgenjs.
// Family/variant-aware renderers so exported decks look intentional, not
// templated. Renderer routing is by variant ID prefix, with a generic
// fallback for anything unrecognized. Everything is guarded — missing or
// oddly-shaped content falls back gracefully rather than throwing.

import PptxGenJS from "pptxgenjs";
import type { Deck, DeckSlide, DeckStrategySnapshot } from "./deck-store";
import type { BrandMode } from "./taxonomy";
import { getDivisionLogos } from "./division-logos";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type Palette = { primary: string; accent: string; surface: string; ink: string };

export async function exportDeckToPptx(
  deck: Deck,
  brand: BrandMode,
  opts?: { strategy?: DeckStrategySnapshot | null },
) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = "TransPerfect";

  const palette: Palette = {
    primary: brand.tokens.primary.replace("#", ""),
    accent: brand.tokens.accent.replace("#", ""),
    surface: brand.tokens.surface.replace("#", ""),
    ink: brand.tokens.ink.replace("#", ""),
  };

  const strategy = opts?.strategy ?? deck.context?.strategy ?? null;
  const keyMessageBySection = new Map<string, string>();
  strategy?.recommendedSections?.forEach((r) => {
    if (r.sectionId && r.keyMessage) keyMessageBySection.set(r.sectionId, r.keyMessage);
  });

  const logos = getDivisionLogos(deck.brandModeId) ?? getDivisionLogos("tp");
  const [logoColor, logoWhite] = await Promise.all([
    logos?.color ? fetchAsDataUrl(logos.color) : Promise.resolve(null),
    logos?.white
      ? fetchAsDataUrl(logos.white)
      : logos?.color
      ? fetchAsDataUrl(logos.color)
      : Promise.resolve(null),
  ]);

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const kind = classifyVariant(slide.variantId, i);
    const s = pptx.addSlide();
    const isDark = kind === "cover" || kind === "divider";
    s.background = { color: isDark ? palette.primary : "FFFFFF" };

    try {
      switch (kind) {
        case "cover":
          renderCover(s, slide, palette);
          break;
        case "divider":
          renderDivider(s, slide, palette);
          break;
        case "agenda":
          renderAgenda(s, slide, palette);
          break;
        case "stats":
          renderStats(s, slide, palette);
          break;
        case "quote":
          renderQuote(s, slide, palette);
          break;
        case "callout":
          renderCallout(s, slide, palette);
          break;
        case "cards":
          renderCards(s, slide, palette);
          break;
        case "timeline":
          renderTimeline(s, slide, palette);
          break;
        case "compare":
          renderCompare(s, slide, palette);
          break;
        default:
          renderContent(s, slide, palette);
      }
    } catch {
      // Any per-slide renderer bug falls back to the generic mapping.
      renderContent(s, slide, palette);
    }

    const logoData = isDark ? logoWhite : logoColor;
    if (logoData) {
      if (isDark) {
        s.addImage({
          data: logoData,
          x: SLIDE_W - 2.2,
          y: SLIDE_H - 0.9,
          w: 1.7,
          h: 0.5,
          sizing: { type: "contain", w: 1.7, h: 0.5 },
        });
      } else {
        s.addImage({
          data: logoData,
          x: 0.5,
          y: 0.35,
          w: 1.4,
          h: 0.4,
          sizing: { type: "contain", w: 1.4, h: 0.4 },
        });
      }
    }

    if (!isDark) {
      s.addText("TransPerfect", {
        x: 0.5, y: 7.05, w: 4, h: 0.3, fontSize: 9, color: "666666", fontFace: "Inter",
      });
      s.addText(String(i + 1).padStart(2, "0"), {
        x: SLIDE_W - 1.0, y: 7.05, w: 0.5, h: 0.3,
        fontSize: 9, color: "666666", align: "right", fontFace: "Inter",
      });
    }

    const km = slide.sectionId ? keyMessageBySection.get(slide.sectionId) : undefined;
    const noteText = (slide.notes && slide.notes.trim()) ? slide.notes.trim() : (km ?? "");
    if (noteText) s.addNotes(noteText);

  }

  await pptx.writeFile({ fileName: `${sanitize(deck.title)}.pptx` });
}

type SlideKind =
  | "cover"
  | "divider"
  | "agenda"
  | "stats"
  | "quote"
  | "callout"
  | "cards"
  | "timeline"
  | "compare"
  | "content";

function classifyVariant(id: string, index: number): SlideKind {
  const v = id || "";
  if (index === 0 && !v) return "cover";
  if (v.startsWith("MV-OP-COVER")) return "cover";
  if (v.startsWith("MV-OP-DIVIDER") || v === "MV-CLOSE-THANKS" || v === "MV-CLOSE-STATEMENT") return "divider";
  if (v.startsWith("MV-OP-AGENDA")) return "agenda";
  if (
    v.startsWith("MV-PROOF-STATS") ||
    v === "MV-CTX-STAT-GRID" ||
    v === "MV-INS-OPPORTUNITY-SIZE" ||
    v === "MV-CASE-METRICS" ||
    v === "MV-IMG-STAT-CALLOUT"
  )
    return "stats";
  if (v.startsWith("MV-QUOTE") || v === "MV-INS-QUOTE" || v === "MV-PROOF-TESTIMONIAL")
    return "quote";
  if (
    v === "MV-INS-CALLOUT" ||
    v === "MV-INS-BIG-IDEA" ||
    v === "MV-INS-SO-WHAT" ||
    v === "MV-CLOSE-CTA" ||
    v === "MV-CLOSE-DUAL-CTA" ||
    v === "MV-CLOSE-CONTACT" ||
    v === "MV-CLOSE-DECISION" ||
    v === "MV-CLOSE-METRIC-PROMISE"
  )
    return "callout";
  if (
    v.startsWith("MV-SOL-PILLARS") ||
    v.startsWith("MV-CTX-CARDS") ||
    v === "MV-SOL-FEATURE-LIST" ||
    v === "MV-CTX-CHALLENGE-STACK" ||
    v.startsWith("MV-TEAM-BIOS") ||
    v === "MV-CLOSE-CHECKLIST" ||
    v === "MV-DEC-CHECKLIST" ||
    v === "MV-REC-NEXT"
  )
    return "cards";
  if (v === "MV-PROC-TIMELINE" || v === "MV-PROC-PHASES" || v === "MV-CLOSE-TIMELINE")
    return "timeline";
  if (
    v === "MV-PROC-BEFORE-AFTER" ||
    v === "MV-DEC-COMPARE-TABLE" ||
    v === "MV-DEC-MATRIX" ||
    v === "MV-CLIENT-COMPARE" ||
    v === "MV-CLOSE-SPLIT"
  )
    return "compare";
  return "content";
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return typeof v === "string" ? v : String(v);
}
function arr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

// ────────────────────────── Renderers ──────────────────────────

function renderCover(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const title = str(c.title);
  const subtitle = str(c.subtitle || c.kicker);
  const date = str(c.date);
  s.addShape("rect", { x: 0.6, y: 3.2, w: 0.15, h: 1.6, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(title || "Untitled", {
    x: 1.0, y: 2.8, w: SLIDE_W - 2, h: 2.4,
    fontSize: 54, bold: true, color: "FFFFFF", fontFace: "Inter", valign: "middle",
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 1.0, y: 5.0, w: SLIDE_W - 2, h: 0.8,
      fontSize: 22, color: "FFFFFF", fontFace: "Inter",
    });
  }
  if (date) s.addText(date, { x: 1.0, y: 6.6, w: 4, h: 0.4, fontSize: 12, color: "FFFFFF", fontFace: "Inter" });
}

function renderDivider(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const title = str(c.title || c.headline);
  const eyebrow = str(c.kicker || c.eyebrow || c.number);
  if (eyebrow) {
    s.addText(eyebrow.toUpperCase(), {
      x: 0.8, y: 3.0, w: SLIDE_W - 1.6, h: 0.5,
      fontSize: 14, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 6,
    });
  }
  s.addText(title || "Section", {
    x: 0.8, y: 3.5, w: SLIDE_W - 1.6, h: 1.8,
    fontSize: 48, bold: true, color: "FFFFFF", fontFace: "Inter", valign: "middle",
  });
}

function renderAgenda(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  renderTitleZone(s, c, p);
  const items = arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const startY = 2.0;
  const rowH = Math.min(0.9, (5.4 - startY) / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = startY + k * rowH;
    s.addText(String(k + 1).padStart(2, "0"), {
      x: 0.6, y, w: 1.0, h: rowH,
      fontSize: 22, bold: true, color: p.accent, fontFace: "Inter", valign: "middle",
    });
    s.addText(str(it.label || it.title || it.name), {
      x: 1.5, y, w: SLIDE_W - 2.5, h: rowH,
      fontSize: 20, bold: true, color: p.primary, fontFace: "Inter", valign: "middle",
    });
  });
}

function renderStats(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  renderTitleZone(s, c, p);
  const items = arr(c.items).length
    ? arr(c.items)
    : c.stat != null
    ? [{ value: c.stat, unit: c.unit, label: c.label || c.narrative }]
    : [];
  if (!items.length) return renderContent(s, slide, p);
  const cols = Math.min(items.length, 4);
  const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
  const y = 2.3;
  items.slice(0, cols).forEach((it, k) => {
    const x = 0.6 + k * (colW + 0.3);
    s.addText(`${str(it.value ?? it.stat ?? it.amount)}${str(it.unit ?? "")}`, {
      x, y, w: colW, h: 2.0,
      fontSize: 56, bold: true, color: p.accent, fontFace: "Inter",
    });
    s.addText(str(it.label ?? it.narrative ?? ""), {
      x, y: y + 2.1, w: colW, h: 1.8,
      fontSize: 14, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

function renderQuote(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const quote = str(c.quote || c.body);
  const attribution = str(c.attribution || c.author);
  const role = str(c.role || c.title);
  s.addText("\u201C", {
    x: 0.8, y: 1.2, w: 1.5, h: 1.5,
    fontSize: 120, bold: true, color: p.accent, fontFace: "Georgia",
  });
  s.addText(quote || "", {
    x: 1.5, y: 2.2, w: SLIDE_W - 3.0, h: 3.4,
    fontSize: 28, italic: true, color: p.primary, fontFace: "Georgia", valign: "middle",
  });
  if (attribution) {
    s.addText(`${attribution}${role ? ` \u00b7 ${role}` : ""}`, {
      x: 1.5, y: 5.7, w: SLIDE_W - 3.0, h: 0.5,
      fontSize: 14, color: p.ink, fontFace: "Inter", charSpacing: 2,
    });
  }
}

function renderCallout(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const kicker = str(c.kicker);
  const headline = str(c.title || c.headline || c.insight || c.idea);
  const body = str(c.narrative || c.body || c.soWhat);
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.8, y: 2.2, w: SLIDE_W - 1.6, h: 0.4,
      fontSize: 12, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 4,
    });
  }
  s.addText(headline || "", {
    x: 0.8, y: 2.7, w: SLIDE_W - 1.6, h: 2.4,
    fontSize: 44, bold: true, color: p.primary, fontFace: "Inter", valign: "middle",
  });
  if (body) {
    s.addText(body, {
      x: 0.8, y: 5.3, w: SLIDE_W - 1.6, h: 1.4,
      fontSize: 16, color: p.ink, fontFace: "Inter",
    });
  }
}

function renderCards(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  const items = arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const n = Math.min(items.length, 6);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
  const availH = 5.9 - titleY - (rows - 1) * 0.3;
  const rowH = Math.max(1.2, availH / rows);
  items.slice(0, n).forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + 0.3);
    const y = titleY + r * (rowH + 0.3);
    s.addShape("rect", {
      x, y, w: colW, h: rowH,
      fill: { color: p.surface }, line: { color: "E5E1DA" },
    });
    s.addShape("rect", { x, y, w: 0.08, h: rowH, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.title || it.label || it.name), {
      x: x + 0.3, y: y + 0.2, w: colW - 0.5, h: 0.6,
      fontSize: 16, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body || it.description || it.detail), {
      x: x + 0.3, y: y + 0.85, w: colW - 0.5, h: rowH - 1.0,
      fontSize: 12, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

function renderTimeline(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  const items = arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const n = Math.min(items.length, 6);
  const trackY = titleY + 1.0;
  const dot = 0.7;
  const marginX = 0.8;
  const usableW = SLIDE_W - marginX * 2;
  const step = n > 1 ? usableW / (n - 1) : 0;

  // Connecting line
  s.addShape("rect", {
    x: marginX + dot / 2, y: trackY + dot / 2 - 0.02, w: usableW - dot, h: 0.04,
    fill: { color: p.accent }, line: { color: p.accent },
  });

  items.slice(0, n).forEach((it, k) => {
    const cx = marginX + step * k;
    s.addShape("ellipse", {
      x: cx, y: trackY, w: dot, h: dot,
      fill: { color: p.primary }, line: { color: p.primary },
    });
    s.addText(String(k + 1), {
      x: cx, y: trackY, w: dot, h: dot,
      fontSize: 20, bold: true, color: "FFFFFF", fontFace: "Inter", align: "center", valign: "middle",
    });
    const boxX = cx + dot / 2 - 1.3;
    s.addText(str(it.label || it.title || it.name), {
      x: boxX, y: trackY + dot + 0.15, w: 2.6, h: 0.5,
      fontSize: 14, bold: true, color: p.primary, fontFace: "Inter", align: "center",
    });
    s.addText(str(it.body || it.description || it.detail), {
      x: boxX, y: trackY + dot + 0.7, w: 2.6, h: 2.0,
      fontSize: 11, color: p.ink, fontFace: "Inter", align: "center", valign: "top",
    });
  });
}

function renderCompare(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  const items = arr(c.items).length
    ? arr(c.items)
    : [c.left, c.right].filter(Boolean).map((v) => v as Record<string, unknown>);
  const cols = items.length >= 2 ? 2 : 1;
  if (!items.length) return renderContent(s, slide, p);
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / cols;
  const y = titleY + 0.2;
  const h = 5.8 - y;

  // Divider
  if (cols === 2) {
    s.addShape("rect", {
      x: SLIDE_W / 2 - 0.01, y: y + 0.3, w: 0.02, h: h - 0.6,
      fill: { color: "E5E1DA" }, line: { color: "E5E1DA" },
    });
  }

  items.slice(0, cols).forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const label = str(it.label || it.title || it.name || (k === 0 ? "Today" : "Tomorrow"));
    s.addText(label.toUpperCase(), {
      x, y, w: colW, h: 0.4,
      fontSize: 11, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 4,
    });
    s.addText(str(it.headline || it.title2 || ""), {
      x, y: y + 0.5, w: colW, h: 1.0,
      fontSize: 22, bold: true, color: p.primary, fontFace: "Inter",
    });
    const bullets = arr(it.items);
    if (bullets.length) {
      s.addText(
        bullets.map((b) => ({
          text: str(b.label || b.body || b.name),
          options: { bullet: { code: "25CF" }, fontFace: "Inter", fontSize: 13, color: p.ink },
        })),
        { x, y: y + 1.6, w: colW, h: h - 1.8, fontSize: 13, color: p.ink, paraSpaceAfter: 6 },
      );
    } else {
      s.addText(str(it.body || it.description || ""), {
        x, y: y + 1.6, w: colW, h: h - 1.8,
        fontSize: 14, color: p.ink, fontFace: "Inter", valign: "top",
      });
    }
  });
}

// Returns the y offset below the title zone for content to start.
function renderTitleZone(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette): number {
  const kicker = str(c.kicker);
  const title = str(c.title || c.headline || c.insight || c.idea);
  let y = 0.55;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y, w: SLIDE_W - 1.2, h: 0.3,
      fontSize: 11, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 3,
    });
    y += 0.35;
  }
  if (title) {
    s.addText(title, {
      x: 0.6, y, w: SLIDE_W - 1.2, h: 1.0,
      fontSize: 30, bold: true, color: p.primary, fontFace: "Inter",
    });
    y += 1.1;
  }
  return Math.max(y, 1.6);
}

// Legacy generic fallback (used when classifier returns "content" or a
// renderer throws).
function renderContent(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const content = slide.content as Record<string, unknown>;
  const cursorY = renderTitleZone(s, content, p);
  const items = Array.isArray(content.items) ? (content.items as Array<Record<string, unknown>>) : null;
  const stat = content.stat ?? content.amount;
  const quote = content.quote;

  if (typeof stat === "string" || typeof stat === "number") {
    const unit = str(content.unit);
    const label = str(content.label || content.narrative);
    s.addText(`${stat}${unit}`, {
      x: 0.6, y: cursorY + 0.3, w: SLIDE_W - 1.2, h: 3.0,
      fontSize: 140, bold: true, color: p.primary, fontFace: "Inter",
    });
    if (label) s.addText(label, { x: 0.6, y: cursorY + 3.6, w: SLIDE_W - 1.2, h: 1.5, fontSize: 18, color: p.ink, fontFace: "Inter" });
    return;
  }

  if (typeof quote === "string") return renderQuote(s, slide, p);

  if (items && items.length > 0) {
    const bullets = items.map((it) => ({
      text: `${str(it.label ?? it.name ?? it.title)}${it.body ? ` \u2014 ${str(it.body)}` : ""}`,
      options: { bullet: { code: "25CF" }, fontFace: "Inter", fontSize: 14, color: p.ink },
    }));
    s.addText(bullets, {
      x: 0.6, y: cursorY + 0.3, w: SLIDE_W - 1.2, h: 5.5 - cursorY,
      fontSize: 14, color: p.ink, fontFace: "Inter", paraSpaceAfter: 8,
    });
    return;
  }

  const narrative = str(content.narrative || content.body || content.soWhat);
  if (narrative) {
    s.addText(narrative, {
      x: 0.6, y: cursorY + 0.3, w: SLIDE_W - 1.2, h: 4.5,
      fontSize: 18, color: p.ink, fontFace: "Inter", valign: "top",
    });
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "deck";
}
