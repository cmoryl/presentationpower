// Client-side PPTX export using pptxgenjs.
// Family/variant-aware renderers so exported decks look intentional, not
// templated. Renderer routing is by variant ID prefix, with a generic
// fallback for anything unrecognized. Everything is guarded — missing or
// oddly-shaped content falls back gracefully rather than throwing.

import PptxGenJS from "pptxgenjs";
import type { Deck, DeckSlide, DeckStrategySnapshot } from "./deck-store";
import type { BrandMode } from "./taxonomy";
import { getDivisionLogos } from "./division-logos";
import { pickDivisionImage } from "@/assets/backdrops/divisions";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// Deterministic seed→index hash, matches MediaTile in VariantRenderer so
// the exported PPTX uses the same photograph the editor previewed.
function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Resolve the best photograph to embed for a slide. Priority:
 *  1. `content.mediaUrl` — usually set by PPTX import to preserve the
 *     original picture round-trip.
 *  2. `content.mediaSeed` — curated kits and generated decks pick from
 *     the division-specific imagery library via a deterministic hash.
 *  Returns null when no imagery is warranted (agenda / stats / etc.).
 */
function resolveSlideImageUrl(brandId: string, c: Record<string, unknown>): string | null {
  const url = typeof c.mediaUrl === "string" && c.mediaUrl.length > 0 ? c.mediaUrl : null;
  if (url) return url;
  const seed = typeof c.mediaSeed === "string" && c.mediaSeed.length > 0 ? c.mediaSeed : null;
  if (!seed) return null;
  return pickDivisionImage(brandId, seedHash(seed));
}

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

  // Prefetch all slide imagery in parallel so the export runs quickly.
  const slideImages: Array<string | null> = await Promise.all(
    deck.slides.map((slide) => {
      const c = slide.content as Record<string, unknown>;
      const url = resolveSlideImageUrl(deck.brandModeId, c);
      return url ? fetchAsDataUrl(url) : Promise.resolve(null);
    }),
  );

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const kind = classifyVariant(slide.variantId, i);
    const s = pptx.addSlide();
    const advancedDark = slide.variantId === "MV-COUNTDOWN";
    const isDark = advancedDark || kind === "cover" || kind === "divider";
    const useWhiteLogo = isDark || slide.variantId === "MV-SPLIT-MANIFESTO";
    const hideFooter = useWhiteLogo;
    s.background = { color: isDark ? palette.primary : "FFFFFF" };

    // Underlay imagery — preserves both PPTX-imported photos (content.mediaUrl)
    // and curated kit imagery (content.mediaSeed → division library). Full-bleed
    // treatment is only applied to cover/divider kinds where existing renderers
    // draw text over a dark scrim; other renderers use full-width text boxes
    // and would clip a side-panel image, so those keep their current layout.
    const imgData = slideImages[i];
    if (imgData && (kind === "cover" || kind === "divider")) {
      s.addImage({
        data: imgData, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
        sizing: { type: "cover", w: SLIDE_W, h: SLIDE_H },
      });
      s.addShape("rect", {
        x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
        fill: { color: palette.primary, transparency: 35 },
        line: { color: palette.primary, transparency: 100 },
      });
    }




    try {
      if (!renderAdvancedVariant(s, slide, palette)) {
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
      }
    } catch {
      // Any per-slide renderer bug falls back to the generic mapping.
      renderContent(s, slide, palette);
    }

    const logoData = useWhiteLogo ? logoWhite : logoColor;
    if (logoData) {
      if (useWhiteLogo) {
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

    if (!hideFooter) {
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

// ────────────────── Advanced variant renderers (Batch 1 + 2) ──────────────────

const LIGHT_GRAY = "E5E1DA";
const MID_GRAY = "9CA3AF";
const DARK_GRAY = "4B5563";

function renderAdvancedVariant(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette): boolean {
  const c = (slide.content ?? {}) as Record<string, unknown>;
  switch (slide.variantId) {
    case "MV-BENTO-5": renderBento5(s, c, p); return true;
    case "MV-KPI-DASHBOARD": renderKpiDashboard(s, c, p); return true;
    case "MV-ROADMAP-QUARTERS": renderRoadmapQuarters(s, c, p); return true;
    case "MV-FUNNEL": renderFunnel(s, c, p); return true;
    case "MV-FLYWHEEL": renderFlywheel(s, c, p); return true;
    case "MV-MATURITY-CURVE": renderMaturityCurve(s, c, p); return true;
    case "MV-JOURNEY-MAP": renderJourneyMap(s, c, p); return true;
    case "MV-LOGO-WALL": renderLogoWall(s, c, p); return true;
    case "MV-MATRIX-2X2": renderMatrix2x2(s, c, p); return true;
    case "MV-ICEBERG": renderIceberg(s, c, p); return true;
    case "MV-EDITORIAL-SPREAD": renderEditorialSpread(s, c, p); return true;
    case "MV-SPLIT-MANIFESTO": renderSplitManifesto(s, c, p); return true;
    case "MV-NUMBERS-TRIPTYCH": renderNumbersTriptych(s, c, p); return true;
    case "MV-TIMELINE-VERTICAL": renderTimelineVertical(s, c, p); return true;
    case "MV-COMPARE-SLIDER": renderCompareSlider(s, c, p); return true;
    case "MV-PULL-QUOTE-STACK": renderPullQuoteStack(s, c, p); return true;
    case "MV-DEFINITION": renderDefinition(s, c, p); return true;
    case "MV-PRINCIPLES": renderPrinciples(s, c, p); return true;
    case "MV-COUNTDOWN": renderCountdown(s, c, p); return true;
    case "MV-HORIZON": renderHorizon(s, c, p); return true;
    case "MV-DASH-SUMMARY": renderDashSummary(s, c, p); return true;
    case "MV-DASH-DONUT-TRIO": renderDashDonutTrio(s, c, p); return true;
    case "MV-DASH-SALES-CHART": renderDashSalesChart(s, c, p); return true;
    case "MV-DASH-GAUGE-ROW": renderDashGaugeRow(s, c, p); return true;
    case "MV-DASH-PERFORMANCE": renderDashPerformance(s, c, p); return true;
    case "MV-DASH-REPORT-CARDS": renderDashReportCards(s, c, p); return true;
    case "MV-DASH-GROWTH-COLUMNS": renderDashGrowthColumns(s, c, p); return true;
    case "MV-DASH-BREAKDOWN": renderDashBreakdown(s, c, p); return true;
    case "MV-DASH-REGION-STATS": renderDashRegionStats(s, c, p); return true;
    case "MV-GRAPH-YEAR-SERIES": renderGraphYearSeries(s, c, p); return true;
    case "MV-GRAPH-AXIS-BARS": renderGraphAxisBars(s, c, p); return true;
    case "MV-GRAPH-CATEGORY-BARS": renderGraphCategoryBars(s, c, p); return true;
    case "MV-GRAPH-DUAL-DONUT": renderGraphDualDonut(s, c, p); return true;
    case "MV-GRAPH-RINGS": renderGraphRings(s, c, p); return true;
    case "MV-GRAPH-TASK-CARDS": renderGraphTaskCards(s, c, p); return true;
    case "MV-GRAPH-DECADE-AREA": renderGraphDecadeArea(s, c, p); return true;
    case "MV-GRAPH-PERCENT-COMPARE": renderGraphPercentCompare(s, c, p); return true;
    default: return false;
  }
}

function drawTitle(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette): number {
  return renderTitleZone(s, c, p);
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// 1. MV-BENTO-5 — asymmetric 5-cell grid
function renderBento5(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const contentH = 5.9 - y0;
  const cells = [
    { x: 0.6, y: y0, w: 7.5, h: contentH * 0.6 - 0.1 },
    { x: 8.3, y: y0, w: 4.4, h: contentH * 0.6 - 0.1 },
    { x: 0.6, y: y0 + contentH * 0.6, w: 3.9, h: contentH * 0.4 },
    { x: 4.6, y: y0 + contentH * 0.6, w: 3.9, h: contentH * 0.4 },
    { x: 8.6, y: y0 + contentH * 0.6, w: 4.1, h: contentH * 0.4 },
  ];
  items.slice(0, 5).forEach((it, k) => {
    const cell = cells[k];
    const kind = str(it.kind);
    if (kind === "stat") {
      s.addShape("rect", { x: cell.x, y: cell.y, w: cell.w, h: cell.h, fill: { color: "FFFFFF" }, line: { color: LIGHT_GRAY, width: 1 } });
      s.addText(`${str(it.value)}${str(it.unit)}`, {
        x: cell.x + 0.3, y: cell.y + 0.2, w: cell.w - 0.6, h: cell.h * 0.6,
        fontSize: 64, bold: true, color: p.accent, fontFace: "Inter",
      });
      s.addText(str(it.label), {
        x: cell.x + 0.3, y: cell.y + cell.h - 0.9, w: cell.w - 0.6, h: 0.7,
        fontSize: 12, color: p.ink, fontFace: "Inter", charSpacing: 3, bold: true,
      });
    } else if (kind === "media") {
      s.addShape("rect", { x: cell.x, y: cell.y, w: cell.w, h: cell.h, fill: { color: p.primary, transparency: 90 }, line: { color: LIGHT_GRAY, width: 1 } });
      s.addText(str(it.title), {
        x: cell.x + 0.25, y: cell.y + cell.h - 0.55, w: cell.w - 0.5, h: 0.4,
        fontSize: 11, bold: true, color: p.primary, fontFace: "Inter", charSpacing: 2,
      });
    } else {
      s.addShape("rect", { x: cell.x, y: cell.y, w: cell.w, h: cell.h, fill: { color: "FFFFFF" }, line: { color: LIGHT_GRAY, width: 1 } });
      s.addShape("rect", { x: cell.x, y: cell.y, w: 0.06, h: cell.h, fill: { color: p.accent }, line: { color: p.accent } });
      const isLarge = k === 0;
      s.addText(str(it.title), {
        x: cell.x + 0.3, y: cell.y + 0.25, w: cell.w - 0.5, h: isLarge ? 0.7 : 0.5,
        fontSize: isLarge ? 20 : 14, bold: true, color: p.primary, fontFace: "Inter",
      });
      s.addText(str(it.body), {
        x: cell.x + 0.3, y: cell.y + (isLarge ? 1.0 : 0.75), w: cell.w - 0.5, h: cell.h - (isLarge ? 1.2 : 0.9),
        fontSize: isLarge ? 14 : 11, color: p.ink, fontFace: "Inter", valign: "top",
      });
    }
  });
}

// 2. MV-KPI-DASHBOARD
function renderKpiDashboard(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 8);
  if (!items.length) return;
  const cols = items.length <= 3 ? items.length : items.length <= 4 ? 4 : items.length <= 6 ? 3 : 4;
  const rows = Math.ceil(items.length / cols);
  const gap = 0.3;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const availH = 5.9 - y0;
  const rowH = Math.min(2.4, (availH - (rows - 1) * gap) / rows);
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    // top hairline in accent
    s.addShape("rect", { x, y, w: colW, h: 0.03, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.label).toUpperCase(), {
      x, y: y + 0.15, w: colW, h: 0.35,
      fontSize: 10, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 4,
    });
    s.addText(`${str(it.value)}${str(it.unit)}`, {
      x, y: y + 0.55, w: colW, h: rowH * 0.55,
      fontSize: 44, bold: true, color: p.accent, fontFace: "Inter",
    });
    const trend = str(it.trend);
    const arrow = trend === "down" ? "▼" : trend === "up" ? "▲" : "•";
    const deltaColor = trend === "down" ? "DC2626" : trend === "up" ? "16A34A" : p.ink;
    const delta = str(it.delta);
    if (delta) {
      s.addText(`${arrow} ${delta}`, {
        x, y: y + rowH - 0.5, w: colW, h: 0.4,
        fontSize: 12, bold: true, color: deltaColor, fontFace: "Inter",
      });
    }
  });
}

// 3. MV-ROADMAP-QUARTERS
function renderRoadmapQuarters(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const quarters = Array.isArray(c.quarters) && c.quarters.length ? (c.quarters as unknown[]).map(String) : ["Q1", "Q2", "Q3", "Q4"];
  const items = arr(c.items);
  const marginX = 0.6;
  const labelW = 3.0;
  const gridX = marginX + labelW;
  const gridW = SLIDE_W - gridX - marginX;
  const colW = gridW / quarters.length;
  // Quarter headers
  quarters.forEach((q, k) => {
    const x = gridX + k * colW;
    s.addText(q, {
      x, y: y0, w: colW, h: 0.4,
      fontSize: 12, bold: true, color: p.primary, fontFace: "Inter", charSpacing: 3, align: "left",
    });
    s.addShape("rect", { x, y: y0 + 0.42, w: colW - 0.1, h: 0.02, fill: { color: p.accent }, line: { color: p.accent } });
  });
  const rowY = y0 + 0.7;
  const availH = 5.9 - rowY;
  const rowH = Math.min(0.9, availH / Math.max(items.length, 1));
  items.slice(0, 6).forEach((it, k) => {
    const y = rowY + k * rowH;
    s.addText(str(it.label), {
      x: marginX, y, w: labelW - 0.15, h: rowH,
      fontSize: 12, bold: true, color: p.ink, fontFace: "Inter", valign: "middle",
    });
    const start = Math.max(1, Number(it.start) || 1);
    const end = Math.min(quarters.length, Number(it.end) || start);
    const barX = gridX + (start - 1) * colW + 0.05;
    const barW = (end - start + 1) * colW - 0.15;
    s.addShape("roundRect", {
      x: barX, y: y + rowH * 0.25, w: Math.max(0.4, barW), h: rowH * 0.5,
      fill: { color: p.primary }, line: { color: p.primary }, rectRadius: 0.08,
    });
    if (it.note) {
      s.addText(str(it.note), {
        x: barX + 0.15, y: y + rowH * 0.25, w: Math.max(0.4, barW) - 0.3, h: rowH * 0.5,
        fontSize: 9, color: "FFFFFF", fontFace: "Inter", valign: "middle",
      });
    }
  });
}

// 4. MV-FUNNEL
function renderFunnel(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const availH = 5.7 - y0;
  const barH = Math.min(0.9, (availH - (items.length - 1) * 0.12) / items.length);
  const maxW = 9.0;
  const minW = 3.5;
  items.forEach((it, k) => {
    const t = items.length > 1 ? k / (items.length - 1) : 0;
    const w = maxW - (maxW - minW) * t;
    const x = (SLIDE_W - w) / 2;
    const y = y0 + k * (barH + 0.12);
    const transparency = Math.min(70, k * 15);
    s.addShape("rect", {
      x, y, w, h: barH,
      fill: { color: p.primary, transparency }, line: { color: p.primary, transparency },
    });
    s.addText(str(it.label), {
      x: x + 0.25, y, w: w * 0.65, h: barH,
      fontSize: 14, bold: true, color: "FFFFFF", fontFace: "Inter", valign: "middle",
    });
    s.addText(`${str(it.value)}${str(it.unit)}`, {
      x: x + w * 0.6, y, w: w * 0.35 - 0.2, h: barH,
      fontSize: 18, bold: true, color: "FFFFFF", fontFace: "Inter", valign: "middle", align: "right",
    });
    if (it.note) {
      s.addText(str(it.note), {
        x: SLIDE_W - 3.6, y: y + barH * 0.25, w: (SLIDE_W - x - w) - 0.2, h: barH * 0.7,
        fontSize: 9, color: p.ink, fontFace: "Inter", valign: "middle",
      });
    }
  });
}

// 5. MV-FLYWHEEL
function renderFlywheel(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const hub = str(c.hub);
  const cx = SLIDE_W / 2;
  const cy = y0 + (6.0 - y0) / 2;
  const r = Math.min(2.4, (6.0 - y0) / 2 - 0.3);
  s.addShape("ellipse", {
    x: cx - r, y: cy - r, w: r * 2, h: r * 2,
    fill: { color: "FFFFFF", transparency: 100 } as unknown as { color: string },
    line: { color: p.accent, width: 1.5 },
  });
  if (hub) {
    s.addText(hub, {
      x: cx - 1.5, y: cy - 0.4, w: 3.0, h: 0.8,
      fontSize: 14, bold: true, color: p.primary, fontFace: "Inter", align: "center", valign: "middle",
    });
  }
  const n = items.length;
  items.forEach((it, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(n, 1);
    const nx = cx + Math.cos(angle) * r;
    const ny = cy + Math.sin(angle) * r;
    s.addShape("ellipse", {
      x: nx - 0.12, y: ny - 0.12, w: 0.24, h: 0.24,
      fill: { color: p.accent }, line: { color: p.accent },
    });
    const lx = cx + Math.cos(angle) * (r + 0.4);
    const ly = cy + Math.sin(angle) * (r + 0.4);
    const align: "left" | "right" | "center" = Math.abs(Math.cos(angle)) < 0.3 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    const boxW = 2.6;
    const boxX = align === "left" ? lx + 0.05 : align === "right" ? lx - boxW - 0.05 : lx - boxW / 2;
    s.addText(str(it.label), {
      x: boxX, y: ly - 0.35, w: boxW, h: 0.4,
      fontSize: 13, bold: true, color: p.primary, fontFace: "Inter", align,
    });
    s.addText(str(it.note), {
      x: boxX, y: ly, w: boxW, h: 0.7,
      fontSize: 10, color: p.ink, fontFace: "Inter", align,
    });
  });
}

// 6. MV-MATURITY-CURVE
function renderMaturityCurve(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const n = items.length;
  if (!n) return;
  const marginX = 1.0;
  const bottomY = 6.2;
  const topY = y0 + 0.5;
  const step = (SLIDE_W - marginX * 2) / Math.max(n - 1, 1);
  const points = items.map((_, k) => {
    const t = n > 1 ? k / (n - 1) : 0;
    const eased = t * t;
    return { x: marginX + k * step, y: bottomY - eased * (bottomY - topY) };
  });
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    s.addShape("line", {
      x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y,
      line: { color: p.accent, width: 2 },
    });
  }
  items.forEach((it, k) => {
    const pt = points[k];
    const isCurrent = Boolean(it.current);
    s.addShape("ellipse", {
      x: pt.x - 0.15, y: pt.y - 0.15, w: 0.3, h: 0.3,
      fill: { color: isCurrent ? p.accent : p.primary }, line: { color: p.primary },
    });
    s.addText(str(it.label), {
      x: pt.x - 1.3, y: pt.y - 0.85, w: 2.6, h: 0.4,
      fontSize: 12, bold: true, color: p.primary, fontFace: "Inter", align: "center",
    });
    s.addText(str(it.note), {
      x: pt.x - 1.3, y: pt.y - 0.5, w: 2.6, h: 0.4,
      fontSize: 9, color: p.ink, fontFace: "Inter", align: "center",
    });
    if (isCurrent) {
      s.addText("YOU ARE HERE", {
        x: pt.x - 1.3, y: pt.y + 0.2, w: 2.6, h: 0.3,
        fontSize: 9, bold: true, color: p.accent, fontFace: "Inter", align: "center", charSpacing: 4,
      });
    }
  });
}

// 7. MV-JOURNEY-MAP
function renderJourneyMap(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const n = items.length;
  if (!n) return;
  const marginX = 0.6;
  const colW = (SLIDE_W - marginX * 2) / n;
  const phaseY = y0;
  items.forEach((it, k) => {
    const x = marginX + k * colW;
    s.addText(str(it.phase).toUpperCase(), {
      x, y: phaseY, w: colW - 0.1, h: 0.4,
      fontSize: 11, bold: true, color: p.primary, fontFace: "Inter", charSpacing: 4,
    });
    s.addShape("rect", { x, y: phaseY + 0.42, w: colW - 0.2, h: 0.02, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.touchpoint), {
      x, y: phaseY + 0.55, w: colW - 0.15, h: 1.2,
      fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
  // sentiment polyline in bottom half
  const chartTop = y0 + 2.2;
  const chartBottom = 6.4;
  const sentY = (v: number) => chartBottom - ((v - 1) / 4) * (chartBottom - chartTop);
  const pts = items.map((it, k) => ({
    x: marginX + k * colW + (colW - 0.2) / 2,
    y: sentY(Math.max(1, Math.min(5, Number(it.sentiment) || 3))),
  }));
  // baseline
  s.addShape("rect", { x: marginX, y: chartBottom, w: SLIDE_W - marginX * 2, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    s.addShape("line", { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, line: { color: p.accent, width: 2 } });
  }
  pts.forEach((pt) => {
    s.addShape("ellipse", { x: pt.x - 0.1, y: pt.y - 0.1, w: 0.2, h: 0.2, fill: { color: p.primary }, line: { color: p.primary } });
  });
}

// 8. MV-LOGO-WALL
function renderLogoWall(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 12);
  if (!items.length) return;
  const cols = items.length <= 4 ? items.length : items.length <= 6 ? 3 : 4;
  const rows = Math.ceil(items.length / cols);
  const colW = (SLIDE_W - 1.2) / cols;
  const availH = 5.9 - y0;
  const rowH = availH / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * colW;
    const y = y0 + r * rowH;
    s.addShape("rect", { x, y, w: colW - 0.1, h: rowH - 0.1, fill: { color: "FFFFFF" }, line: { color: LIGHT_GRAY, width: 0.5 } });
    s.addText(initials(str(it.name)), {
      x, y: y + 0.15, w: colW - 0.1, h: rowH * 0.55,
      fontSize: 32, bold: true, color: p.primary, fontFace: "Inter", align: "center", valign: "middle",
    });
    s.addText(str(it.name).toUpperCase(), {
      x, y: y + rowH - 0.55, w: colW - 0.1, h: 0.4,
      fontSize: 10, color: p.ink, fontFace: "Inter", align: "center", charSpacing: 3,
    });
  });
}

// 9. MV-MATRIX-2X2
function renderMatrix2x2(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const quadrants = Array.isArray(c.quadrants) ? (c.quadrants as unknown[]).map(String) : ["", "", "", ""];
  const target = Number(c.target) || 0;
  const items = arr(c.items);
  const size = Math.min(5.4, 6.2 - y0);
  const gridX = (SLIDE_W - size) / 2;
  const gridY = y0;
  const half = size / 2;
  // Quadrant order: 1=TL 2=TR 3=BL 4=BR (per matrix convention). Target quadrant filled.
  const quads = [
    { i: 1, x: gridX, y: gridY }, // TL
    { i: 2, x: gridX + half, y: gridY }, // TR
    { i: 3, x: gridX, y: gridY + half }, // BL
    { i: 4, x: gridX + half, y: gridY + half }, // BR
  ];
  quads.forEach((q, idx) => {
    const isTarget = q.i === target;
    s.addShape("rect", {
      x: q.x, y: q.y, w: half, h: half,
      fill: isTarget ? { color: p.accent, transparency: 88 } : { color: "FFFFFF" },
      line: { color: MID_GRAY, width: 0.75 },
    });
    const label = str(quadrants[idx] ?? "");
    if (label) {
      s.addText(label.toUpperCase(), {
        x: q.x + 0.15, y: q.y + 0.12, w: half - 0.3, h: 0.4,
        fontSize: 10, bold: true, color: p.primary, fontFace: "Inter", charSpacing: 3,
      });
    }
  });
  // Axis labels
  s.addText(str(c.axisX).toUpperCase(), {
    x: gridX, y: gridY + size + 0.1, w: size, h: 0.3,
    fontSize: 9, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 3, align: "center",
  });
  s.addText(str(c.axisY).toUpperCase(), {
    x: gridX - 0.5, y: gridY, w: 0.4, h: size,
    fontSize: 9, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 3, align: "center", valign: "middle", rotate: 270,
  });
  // Plotted items
  items.forEach((it) => {
    const xn = Math.max(0, Math.min(1, Number(it.x)));
    const yn = Math.max(0, Math.min(1, Number(it.y)));
    const px = gridX + xn * size;
    const py = gridY + (1 - yn) * size;
    s.addShape("ellipse", { x: px - 0.08, y: py - 0.08, w: 0.16, h: 0.16, fill: { color: p.primary }, line: { color: p.primary } });
    s.addText(str(it.label), {
      x: px + 0.12, y: py - 0.15, w: 2.0, h: 0.3,
      fontSize: 10, bold: true, color: p.ink, fontFace: "Inter",
    });
  });
}

// 10. MV-ICEBERG
function renderIceberg(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const above = arr(c.above);
  const below = arr(c.below);
  const waterline = str(c.waterline);
  const availH = 6.3 - y0;
  const aboveH = availH * 0.35;
  const belowH = availH * 0.62;
  // Above rows
  above.slice(0, 3).forEach((it, k) => {
    const rowW = (SLIDE_W - 1.2) / Math.min(above.length, 3);
    const x = 0.6 + k * rowW;
    s.addText(str(it.label), {
      x, y: y0 + 0.1, w: rowW - 0.2, h: 0.5,
      fontSize: 14, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x, y: y0 + 0.65, w: rowW - 0.2, h: aboveH - 0.7,
      fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
  // Waterline
  const wlY = y0 + aboveH;
  s.addShape("rect", { x: 0.4, y: wlY, w: SLIDE_W - 0.8, h: 0.03, fill: { color: p.accent }, line: { color: p.accent } });
  if (waterline) {
    s.addShape("rect", { x: SLIDE_W / 2 - 1.7, y: wlY - 0.15, w: 3.4, h: 0.3, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" } });
    s.addText(waterline.toUpperCase(), {
      x: SLIDE_W / 2 - 1.7, y: wlY - 0.15, w: 3.4, h: 0.3,
      fontSize: 10, bold: true, color: p.accent, fontFace: "Inter", align: "center", charSpacing: 5,
    });
  }
  // Below band tinted
  const belowY = wlY + 0.05;
  s.addShape("rect", { x: 0.4, y: belowY, w: SLIDE_W - 0.8, h: belowH, fill: { color: LIGHT_GRAY, transparency: 60 }, line: { color: LIGHT_GRAY, width: 0 } });
  const bCols = Math.min(below.length, 4) || 1;
  const bColW = (SLIDE_W - 1.2) / bCols;
  below.slice(0, bCols).forEach((it, k) => {
    const x = 0.6 + k * bColW;
    s.addText(str(it.label), {
      x, y: belowY + 0.2, w: bColW - 0.2, h: 0.5,
      fontSize: 13, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x, y: belowY + 0.75, w: bColW - 0.2, h: belowH - 0.9,
      fontSize: 10, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

// 11. MV-EDITORIAL-SPREAD
function renderEditorialSpread(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const title = str(c.title);
  const pullValue = str(c.pullValue);
  const pullUnit = str(c.pullUnit);
  const pullLabel = str(c.pullLabel);
  const bodyLeft = str(c.bodyLeft);
  const bodyRight = str(c.bodyRight);
  const folio = str(c.folio);
  const leftW = 5.0;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.6, w: SLIDE_W - 1.2, h: 0.4,
      fontSize: 11, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 5,
    });
  }
  s.addText(`${pullValue}${pullUnit}`, {
    x: 0.6, y: 1.3, w: leftW, h: 3.2,
    fontSize: 180, bold: true, color: p.accent, fontFace: "Inter",
  });
  s.addText(pullLabel, {
    x: 0.6, y: 4.6, w: leftW, h: 1.0,
    fontSize: 13, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 3,
  });
  s.addText(title, {
    x: leftW + 0.9, y: 1.3, w: SLIDE_W - leftW - 1.5, h: 1.4,
    fontSize: 26, bold: true, color: p.primary, fontFace: "Inter",
  });
  // hairline column rule
  const colGap = (SLIDE_W - leftW - 1.5) / 2;
  s.addShape("rect", { x: leftW + 0.9 + colGap - 0.02, y: 2.9, w: 0.01, h: 3.5, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
  s.addText(bodyLeft, {
    x: leftW + 0.9, y: 2.9, w: colGap - 0.15, h: 3.5,
    fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
  });
  s.addText(bodyRight, {
    x: leftW + 0.9 + colGap + 0.15, y: 2.9, w: colGap - 0.15, h: 3.5,
    fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
  });
  if (folio) {
    s.addShape("rect", { x: 0.6, y: 6.7, w: SLIDE_W - 1.2, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addText(folio.toUpperCase(), {
      x: 0.6, y: 6.75, w: SLIDE_W - 1.2, h: 0.3,
      fontSize: 9, color: p.ink, fontFace: "Inter", charSpacing: 4,
    });
  }
}

// 12. MV-SPLIT-MANIFESTO
function renderSplitManifesto(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const statement = str(c.statement);
  const signoff = str(c.signoff);
  const items = arr(c.items);
  const leftW = SLIDE_W * 0.42;
  // Left panel
  s.addShape("rect", { x: 0, y: 0, w: leftW, h: SLIDE_H, fill: { color: p.primary }, line: { color: p.primary } });
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.8, w: leftW - 1.0, h: 0.4,
      fontSize: 11, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 5,
    });
  }
  s.addText(statement, {
    x: 0.6, y: 1.4, w: leftW - 1.0, h: SLIDE_H - 2.6,
    fontSize: 30, bold: true, color: "FFFFFF", fontFace: "Inter", valign: "middle",
  });
  if (signoff) {
    s.addText(`— ${signoff}`, {
      x: 0.6, y: SLIDE_H - 1.0, w: leftW - 1.0, h: 0.4,
      fontSize: 12, color: "FFFFFF", fontFace: "Inter", charSpacing: 3,
    });
  }
  // Right proof points
  const rightX = leftW + 0.6;
  const rightW = SLIDE_W - rightX - 0.6;
  const n = Math.min(items.length, 4) || 1;
  const availH = SLIDE_H - 1.4;
  const rowH = availH / n;
  items.slice(0, n).forEach((it, k) => {
    const y = 0.8 + k * rowH;
    s.addShape("rect", { x: rightX, y, w: rightW, h: 0.03, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.title), {
      x: rightX, y: y + 0.2, w: rightW, h: 0.5,
      fontSize: 16, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x: rightX, y: y + 0.8, w: rightW, h: rowH - 1.0,
      fontSize: 12, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

// 13. MV-NUMBERS-TRIPTYCH
function renderNumbersTriptych(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  if (!items.length) return;
  const n = items.length;
  const marginX = 0.6;
  const colW = (SLIDE_W - marginX * 2) / n;
  const cellY = y0 + 0.3;
  const cellH = 6.2 - cellY;
  items.forEach((it, k) => {
    const x = marginX + k * colW;
    if (k > 0) {
      s.addShape("rect", { x: x - 0.005, y: cellY + 0.2, w: 0.01, h: cellH - 0.4, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    }
    s.addText([
      { text: str(it.value), options: { bold: true, color: p.primary } },
      { text: str(it.unit), options: { bold: true, color: p.accent } },
    ], {
      x: x + 0.2, y: cellY, w: colW - 0.4, h: cellH * 0.45,
      fontSize: 96, fontFace: "Inter",
    });
    s.addText(str(it.label).toUpperCase(), {
      x: x + 0.2, y: cellY + cellH * 0.5, w: colW - 0.4, h: 0.5,
      fontSize: 12, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 4,
    });
    s.addText(str(it.note), {
      x: x + 0.2, y: cellY + cellH * 0.62, w: colW - 0.4, h: 1.4,
      fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
    });
    if (it.source) {
      s.addText(str(it.source), {
        x: x + 0.2, y: cellY + cellH - 0.4, w: colW - 0.4, h: 0.3,
        fontSize: 8, italic: true, color: MID_GRAY, fontFace: "Inter",
      });
    }
  });
}

// 14. MV-TIMELINE-VERTICAL
function renderTimelineVertical(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const spineX = 1.4;
  const topY = y0 + 0.2;
  const bottomY = 6.4;
  s.addShape("rect", { x: spineX, y: topY, w: 0.03, h: bottomY - topY, fill: { color: p.accent }, line: { color: p.accent } });
  const n = items.length || 1;
  const rowH = (bottomY - topY) / n;
  items.forEach((it, k) => {
    const y = topY + k * rowH;
    s.addShape("ellipse", { x: spineX - 0.09, y: y + 0.15, w: 0.21, h: 0.21, fill: { color: p.primary }, line: { color: p.primary } });
    s.addText(str(it.date).toUpperCase(), {
      x: 0.4, y: y + 0.05, w: 0.95, h: 0.4,
      fontSize: 10, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 3, align: "right",
    });
    s.addText(str(it.label), {
      x: spineX + 0.35, y: y + 0.05, w: SLIDE_W - spineX - 1.0, h: 0.4,
      fontSize: 15, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x: spineX + 0.35, y: y + 0.5, w: SLIDE_W - spineX - 1.0, h: rowH - 0.55,
      fontSize: 11, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

// 15. MV-COMPARE-SLIDER
function renderCompareSlider(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const before = (c.before ?? {}) as Record<string, unknown>;
  const after = (c.after ?? {}) as Record<string, unknown>;
  const cellY = y0 + 0.2;
  const cellH = 6.2 - cellY;
  const midX = SLIDE_W / 2;
  // Before (left) - muted
  s.addText(str(before.label).toUpperCase(), {
    x: 0.6, y: cellY, w: midX - 0.9, h: 0.4,
    fontSize: 11, bold: true, color: MID_GRAY, fontFace: "Inter", charSpacing: 4,
  });
  s.addText(`${str(before.value)}${str(before.unit)}`, {
    x: 0.6, y: cellY + 0.5, w: midX - 0.9, h: 2.4,
    fontSize: 84, bold: true, color: DARK_GRAY, fontFace: "Inter",
  });
  s.addText(str(before.body), {
    x: 0.6, y: cellY + 3.2, w: midX - 0.9, h: cellH - 3.4,
    fontSize: 12, color: MID_GRAY, fontFace: "Inter", valign: "top",
  });
  // Divider line
  s.addShape("rect", { x: midX - 0.01, y: cellY + 0.2, w: 0.02, h: cellH - 0.4, fill: { color: p.accent }, line: { color: p.accent } });
  // Arrow marker
  const arrowY = cellY + cellH / 2;
  s.addShape("ellipse", { x: midX - 0.25, y: arrowY - 0.25, w: 0.5, h: 0.5, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText("→", {
    x: midX - 0.25, y: arrowY - 0.25, w: 0.5, h: 0.5,
    fontSize: 20, bold: true, color: "FFFFFF", fontFace: "Inter", align: "center", valign: "middle",
  });
  // After (right) - full color, accent top rule
  s.addShape("rect", { x: midX + 0.3, y: cellY, w: SLIDE_W - midX - 0.9, h: 0.03, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(str(after.label).toUpperCase(), {
    x: midX + 0.3, y: cellY + 0.1, w: SLIDE_W - midX - 0.9, h: 0.4,
    fontSize: 11, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 4,
  });
  s.addText(`${str(after.value)}${str(after.unit)}`, {
    x: midX + 0.3, y: cellY + 0.55, w: SLIDE_W - midX - 0.9, h: 2.7,
    fontSize: 110, bold: true, color: p.primary, fontFace: "Inter",
  });
  s.addText(str(after.body), {
    x: midX + 0.3, y: cellY + 3.4, w: SLIDE_W - midX - 0.9, h: cellH - 3.6,
    fontSize: 13, color: p.ink, fontFace: "Inter", valign: "top",
  });
}

// 16. MV-PULL-QUOTE-STACK
function renderPullQuoteStack(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const hero = (c.hero ?? {}) as Record<string, unknown>;
  const items = arr(c.items).slice(0, 2);
  // Decorative quote mark
  s.addText("\u201C", {
    x: 0.4, y: 0.2, w: 2.5, h: 2.5,
    fontSize: 240, bold: true, color: p.accent, fontFace: "Georgia", transparency: 70,
  } as unknown as PptxGenJS.TextPropsOptions);
  s.addText(str(hero.quote), {
    x: 0.8, y: 1.0, w: SLIDE_W - 1.6, h: 3.4,
    fontSize: 32, italic: true, color: p.primary, fontFace: "Georgia", valign: "middle",
  });
  const attrParts = [str(hero.name), str(hero.role), str(hero.org)].filter(Boolean);
  s.addText(attrParts.join(" · ").toUpperCase(), {
    x: 0.8, y: 4.4, w: SLIDE_W - 1.6, h: 0.4,
    fontSize: 11, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 4,
  });
  // Divider
  s.addShape("rect", { x: 0.8, y: 5.0, w: SLIDE_W - 1.6, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
  // Two smaller quotes
  const smallW = (SLIDE_W - 1.6 - 0.4) / 2;
  items.forEach((it, k) => {
    const x = 0.8 + k * (smallW + 0.4);
    s.addText(`"${str(it.quote)}"`, {
      x, y: 5.2, w: smallW, h: 1.2,
      fontSize: 14, italic: true, color: p.primary, fontFace: "Georgia", valign: "top",
    });
    const parts = [str(it.name), str(it.role), str(it.org)].filter(Boolean);
    s.addText(parts.join(" · ").toUpperCase(), {
      x, y: 6.5, w: smallW, h: 0.3,
      fontSize: 9, bold: true, color: p.ink, fontFace: "Inter", charSpacing: 3,
    });
    if (k === 0 && items.length > 1) {
      s.addShape("rect", { x: x + smallW + 0.19, y: 5.2, w: 0.01, h: 1.5, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    }
  });
}

// 17. MV-DEFINITION
function renderDefinition(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const term = str(c.term);
  const pronunciation = str(c.pronunciation);
  const pos = str(c.partOfSpeech);
  const definition = str(c.definition);
  const usage = str(c.usage);
  s.addText(term, {
    x: 0.8, y: 1.2, w: SLIDE_W - 1.6, h: 1.6,
    fontSize: 48, bold: true, color: p.primary, fontFace: "Inter",
  });
  s.addText([
    { text: pronunciation, options: { color: MID_GRAY, charSpacing: 3 } },
    { text: pos ? `   ${pos}` : "", options: { italic: true, color: p.accent, bold: true } },
  ], {
    x: 0.8, y: 2.9, w: SLIDE_W - 1.6, h: 0.4,
    fontSize: 14, fontFace: "Inter",
  });
  s.addText(definition, {
    x: 0.8, y: 3.6, w: SLIDE_W - 1.6, h: 2.0,
    fontSize: 22, color: p.ink, fontFace: "Inter", valign: "top",
  });
  s.addShape("rect", { x: 0.8, y: 5.9, w: 3.0, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
  s.addText(usage, {
    x: 0.8, y: 6.0, w: SLIDE_W - 1.6, h: 0.8,
    fontSize: 14, italic: true, color: MID_GRAY, fontFace: "Georgia",
  });
}

// 18. MV-PRINCIPLES
function renderPrinciples(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const rowH = (6.2 - y0) / items.length;
  items.forEach((it, k) => {
    const y = y0 + k * rowH;
    if (k > 0) {
      s.addShape("rect", { x: 0.6, y, w: SLIDE_W - 1.2, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    }
    // Oversized numeral behind
    s.addText(String(k + 1).padStart(2, "0"), {
      x: 0.6, y: y + 0.05, w: 2.4, h: rowH - 0.1,
      fontSize: 96, bold: true, color: p.accent, fontFace: "Inter", transparency: 82,
    } as unknown as PptxGenJS.TextPropsOptions);
    s.addText(str(it.statement), {
      x: 3.0, y: y + 0.15, w: SLIDE_W - 3.6, h: 0.7,
      fontSize: 26, bold: true, color: p.primary, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x: 3.0, y: y + 0.95, w: SLIDE_W - 3.6, h: rowH - 1.05,
      fontSize: 13, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

// 19. MV-COUNTDOWN (dark)
function renderCountdown(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const title = str(c.title);
  const items = arr(c.items).slice(0, 3);
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.8, y: 0.7, w: SLIDE_W - 1.6, h: 0.4,
      fontSize: 12, bold: true, color: p.accent, fontFace: "Inter", charSpacing: 5,
    });
  }
  if (title) {
    s.addText(title, {
      x: 0.8, y: 1.15, w: SLIDE_W - 1.6, h: 1.0,
      fontSize: 30, bold: true, color: "FFFFFF", fontFace: "Inter",
    });
  }
  const startY = 2.5;
  const rowH = (6.2 - startY) / Math.max(items.length, 1);
  items.forEach((it, k) => {
    const y = startY + k * rowH;
    const numeral = String(items.length - k); // 3, 2, 1
    if (k > 0) {
      s.addShape("rect", { x: 0.8, y, w: SLIDE_W - 1.6, h: 0.01, fill: { color: "FFFFFF", transparency: 80 }, line: { color: "FFFFFF", transparency: 80 } });
    }
    s.addText(numeral, {
      x: 0.8, y: y + 0.1, w: 2.0, h: rowH - 0.2,
      fontSize: 110, bold: true, color: p.accent, fontFace: "Inter",
    });
    s.addText(str(it.statement), {
      x: 3.0, y: y + 0.2, w: SLIDE_W - 3.6, h: 0.8,
      fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x: 3.0, y: y + 1.05, w: SLIDE_W - 3.6, h: rowH - 1.15,
      fontSize: 13, color: "FFFFFF", fontFace: "Inter", valign: "top", transparency: 20,
    } as unknown as PptxGenJS.TextPropsOptions);
  });
}

// 20. MV-HORIZON
function renderHorizon(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  if (!items.length) return;
  const bandH = (6.3 - y0) / items.length;
  const headlineColors = [p.primary, "4B5563", "9CA3AF"];
  const labelColors = [p.accent, "6B7280", "9CA3AF"];
  items.forEach((it, k) => {
    const y = y0 + k * bandH;
    if (k > 0) {
      s.addShape("rect", { x: 0.6, y, w: SLIDE_W - 1.2, h: 0.01, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    }
    s.addText(str(it.label).toUpperCase(), {
      x: 0.6, y: y + 0.2, w: 2.0, h: 0.5,
      fontSize: 14, bold: true, color: labelColors[k] ?? p.ink, fontFace: "Inter", charSpacing: 5,
    });
    s.addText(str(it.headline), {
      x: 2.8, y: y + 0.15, w: SLIDE_W - 3.4, h: 0.7,
      fontSize: 22, bold: true, color: headlineColors[k] ?? p.ink, fontFace: "Inter",
    });
    s.addText(str(it.body), {
      x: 2.8, y: y + 0.9, w: SLIDE_W - 3.4, h: bandH - 1.05,
      fontSize: 12, color: p.ink, fontFace: "Inter", valign: "top",
    });
  });
}

// ────────────────── Advanced variant renderers (Batch 3 — dashboard) ──────────────────

function numArr(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n));
}
function num(v: unknown, fb = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fb;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

// ── MV-DASH-SUMMARY ──
function renderDashSummary(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const primary = obj(c.primary);
  const secondary = obj(c.secondary);
  const balance = obj(c.balance);
  const bItems = arr(balance.items);
  const colW = 5.9;
  const rightX = 6.9;
  // Left column: two stat cards stacked
  [primary, secondary].forEach((card, i) => {
    const cy = y0 + i * 2.6;
    s.addShape("rect", { x: 0.6, y: cy, w: 2.2, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(card.label).toUpperCase(), { x: 0.6, y: cy + 0.15, w: colW, h: 0.3, fontSize: 11, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
    s.addText(`${str(card.value)}${str(card.unit) ? ` ${str(card.unit)}` : ""}`, { x: 0.6, y: cy + 0.5, w: colW, h: 1.1, fontSize: 60, bold: true, color: p.primary, fontFace: "Inter" });
    // Sparkline via native line chart
    const series = numArr(card.series);
    if (series.length >= 2) {
      try {
        s.addChart(
          "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          [{ name: "series", labels: series.map((_, i) => String(i + 1)), values: series }],
          { x: 0.6, y: cy + 1.7, w: colW, h: 0.7, chartColors: [p.accent], lineSize: 2, showLegend: false, showTitle: false, catAxisHidden: true, valAxisHidden: true, showValue: false },
        );
      } catch { /* no-op */ }
    }
  });
  // Right: balance panel
  s.addShape("rect", { x: rightX, y: y0, w: 2.2, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText("BALANCE", { x: rightX, y: y0 + 0.15, w: colW, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  s.addText(`${str(balance.value)}${str(balance.unit) ? ` ${str(balance.unit)}` : ""}`, { x: rightX, y: y0 + 0.55, w: colW, h: 1.6, fontSize: 96, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(str(balance.label), { x: rightX, y: y0 + 2.2, w: colW, h: 0.4, fontSize: 14, color: DARK_GRAY, fontFace: "Inter" });
  bItems.slice(0, 4).forEach((it, i) => {
    const ry = y0 + 2.9 + i * 0.55;
    s.addShape("line", { x: rightX, y: ry, w: colW, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addText(str(it.label).toUpperCase(), { x: rightX, y: ry + 0.08, w: colW - 1.5, h: 0.4, fontSize: 11, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
    s.addText(str(it.value), { x: rightX + colW - 1.5, y: ry + 0.05, w: 1.5, h: 0.4, fontSize: 18, bold: true, color: p.primary, fontFace: "Inter", align: "right" });
  });
}

// ── MV-DASH-DONUT-TRIO ──
function renderDashDonutTrio(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const colW = (SLIDE_W - 1.2) / Math.max(items.length, 1);
  items.forEach((it, i) => {
    const cx = 0.6 + i * colW;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    s.addShape("rect", { x: cx, y: y0, w: colW - 0.4, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "d", labels: ["value", "rest"], values: [pct, 100 - pct] }],
        { x: cx + (colW - 3) / 2, y: y0 + 0.3, w: 3, h: 3, chartColors: [p.accent, LIGHT_GRAY], showLegend: false, showTitle: false, dataLabelPosition: "outEnd", showValue: false, holeSize: 70 },
      );
    } catch { /* no-op */ }
    s.addText(`${Math.round(pct)}%`, { x: cx, y: y0 + 1.4, w: colW - 0.4, h: 0.8, fontSize: 36, bold: true, color: p.primary, fontFace: "Inter", align: "center" });
    s.addText(str(it.label).toUpperCase(), { x: cx, y: y0 + 3.5, w: colW - 0.4, h: 0.35, fontSize: 12, bold: true, color: p.primary, charSpacing: 3, fontFace: "Inter", align: "center" });
    s.addText(str(it.body), { x: cx + 0.2, y: y0 + 3.9, w: colW - 0.8, h: 1.2, fontSize: 12, color: DARK_GRAY, fontFace: "Inter", align: "center" });
  });
}

// ── MV-DASH-SALES-CHART ──
function renderDashSalesChart(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const series = arr(c.series).map((pt) => ({ label: str(pt.label), value: num(pt.value) }));
  const stat = obj(c.stat);
  const chartW = 8.0;
  try {
    s.addChart(
      "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "series", labels: series.map((p) => p.label), values: series.map((p) => p.value) }],
      { x: 0.6, y: y0 + 0.1, w: chartW, h: 4.6, chartColors: [p.accent], lineSize: 3, showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 10, catAxisLabelColor: DARK_GRAY, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, valAxisLabelColor: DARK_GRAY, showValue: false },
    );
  } catch { /* no-op */ }
  const rx = 9.0;
  s.addShape("rect", { x: rx, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(str(c.kicker).toUpperCase(), { x: rx, y: y0 + 0.15, w: 3.5, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  s.addText(str(c.headline), { x: rx, y: y0 + 0.5, w: 3.7, h: 1.8, fontSize: 22, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, { x: rx, y: y0 + 2.5, w: 3.7, h: 1.0, fontSize: 44, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(str(stat.label), { x: rx, y: y0 + 3.4, w: 3.7, h: 0.4, fontSize: 12, color: DARK_GRAY, fontFace: "Inter" });
  if (str(stat.delta)) {
    s.addText(str(stat.delta).toUpperCase(), { x: rx, y: y0 + 3.9, w: 3.7, h: 0.4, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  }
}

// ── MV-DASH-GAUGE-ROW ──
function renderDashGaugeRow(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  const cols = Math.max(items.length, 1);
  const colW = (SLIDE_W - 1.2) / cols;
  const gaugeSize = Math.min(2.6, colW - 0.4);
  items.forEach((it, i) => {
    const cx = 0.6 + i * colW;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    try {
      // Half-doughnut simulated via doughnut chart with 50% invisible bottom
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "g", labels: ["v", "r", "hidden"], values: [pct / 2, (100 - pct) / 2, 50] }],
        { x: cx + (colW - gaugeSize) / 2, y: y0 + 0.3, w: gaugeSize, h: gaugeSize, chartColors: [p.accent, LIGHT_GRAY, "FFFFFF"], chartColorsOpacity: 100, showLegend: false, showTitle: false, holeSize: 65, firstSliceAng: 270 },
      );
    } catch { /* no-op */ }
    s.addText(`${Math.round(pct)}%`, { x: cx, y: y0 + gaugeSize * 0.55, w: colW, h: 0.7, fontSize: 32, bold: true, color: p.primary, fontFace: "Inter", align: "center" });
    s.addText(str(it.label).toUpperCase(), { x: cx + 0.1, y: y0 + gaugeSize + 0.5, w: colW - 0.2, h: 0.5, fontSize: 11, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter", align: "center" });
  });
}

// ── MV-DASH-PERFORMANCE ──
function renderDashPerformance(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const bars = arr(c.bars).map((b) => ({ label: str(b.label), value: num(b.value) }));
  const stat = obj(c.stat);
  const legend = arr(c.legend);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "bars", labels: bars.map((b) => b.label), values: bars.map((b) => b.value) }],
      { x: 0.6, y: y0 + 0.1, w: 6.6, h: 4.6, barDir: "col", chartColors: [p.primary], showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 10, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10 },
    );
  } catch { /* no-op */ }
  const rx = 7.6;
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, { x: rx, y: y0 + 0.3, w: 5.0, h: 1.6, fontSize: 72, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(str(stat.label), { x: rx, y: y0 + 1.9, w: 5.0, h: 0.5, fontSize: 13, color: DARK_GRAY, fontFace: "Inter" });
  legend.slice(0, 4).forEach((l, i) => {
    const ry = y0 + 2.7 + i * 0.55;
    s.addShape("line", { x: rx, y: ry, w: 5.0, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addShape("rect", { x: rx, y: ry + 0.18, w: 0.2, h: 0.2, fill: { color: i === 0 ? p.accent : p.primary }, line: { color: i === 0 ? p.accent : p.primary } });
    s.addText(str(l.label), { x: rx + 0.35, y: ry + 0.1, w: 3.0, h: 0.4, fontSize: 14, bold: true, color: p.primary, fontFace: "Inter" });
    s.addText(str(l.value), { x: rx + 3.4, y: ry + 0.1, w: 1.6, h: 0.4, fontSize: 14, bold: true, color: DARK_GRAY, fontFace: "Inter", align: "right" });
  });
}

// ── MV-DASH-REPORT-CARDS ──
function renderDashReportCards(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  const cardW = 5.9;
  items.forEach((it, i) => {
    const cx = 0.6 + i * 6.4;
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    s.addShape("rect", { x: cx, y: y0, w: 2.2, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText((negative ? "REDUCTION" : "GROWTH"), { x: cx, y: y0 + 0.15, w: cardW, h: 0.3, fontSize: 11, bold: true, color: negative ? "E53D2E" : p.accent, charSpacing: 3, fontFace: "Inter" });
    s.addText(delta, { x: cx, y: y0 + 0.55, w: cardW, h: 1.6, fontSize: 66, bold: true, color: p.primary, fontFace: "Inter" });
    s.addText(str(it.label), { x: cx, y: y0 + 2.2, w: cardW, h: 0.9, fontSize: 15, color: DARK_GRAY, fontFace: "Inter" });
    const series = numArr(it.series);
    if (series.length >= 2) {
      try {
        s.addChart(
          "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          [{ name: "s", labels: series.map((_, k) => String(k + 1)), values: series }],
          { x: cx, y: y0 + 3.3, w: cardW, h: 1.1, chartColors: [p.accent], lineSize: 2, showLegend: false, showTitle: false, catAxisHidden: true, valAxisHidden: true, showValue: false },
        );
      } catch { /* no-op */ }
    }
    s.addText(str(it.meta).toUpperCase(), { x: cx, y: y0 + 4.5, w: cardW, h: 0.35, fontSize: 10, bold: true, color: MID_GRAY, charSpacing: 3, fontFace: "Inter" });
  });
  // vertical hairline divider
  s.addShape("line", { x: 6.55, y: y0, w: 0, h: 4.8, line: { color: LIGHT_GRAY, width: 1 } });
}

// ── MV-DASH-GROWTH-COLUMNS ──
function renderDashGrowthColumns(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "growth", labels: items.map((it) => str(it.year)), values: items.map((it) => num(it.value)) }],
      { x: 0.6, y: y0 + 0.4, w: SLIDE_W - 1.2, h: 4.6, barDir: "col", chartColors: [p.primary], showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 12, catAxisLabelColor: DARK_GRAY, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, valAxisLabelColor: DARK_GRAY, showValue: true, dataLabelFontFace: "Inter", dataLabelFontSize: 12, dataLabelColor: p.primary, dataLabelPosition: "outEnd" },
    );
  } catch { /* no-op */ }
  // Highlight final column with accent overlay by drawing a tag above it
  if (items.length > 0) {
    const last = items[items.length - 1];
    const cellW = (SLIDE_W - 1.2) / items.length;
    const cx = 0.6 + (items.length - 1) * cellW + cellW * 0.5 - 1;
    s.addText(`${str(last.value)}${str(last.unit) ? ` ${str(last.unit)}` : ""}`, { x: cx, y: y0 + 0.05, w: 2, h: 0.5, fontSize: 20, bold: true, color: p.accent, fontFace: "Inter", align: "center" });
  }
}

// ── MV-DASH-BREAKDOWN ──
function renderDashBreakdown(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 4);
  const rowH = Math.min(1.35, (5.5 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    const pct = Math.max(0, Math.min(100, num(it.percent)));
    s.addShape("line", { x: 0.6, y: ry, w: SLIDE_W - 1.2, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addText(str(it.label), { x: 0.6, y: ry + 0.15, w: 5.0, h: 0.5, fontSize: 20, bold: true, color: p.primary, fontFace: "Inter" });
    if (delta) s.addText(delta.toUpperCase(), { x: 5.6, y: ry + 0.2, w: 1.6, h: 0.4, fontSize: 11, bold: true, color: negative ? "E53D2E" : p.accent, charSpacing: 3, fontFace: "Inter" });
    s.addText(`${str(it.value)}${str(it.unit) ? ` ${str(it.unit)}` : ""}`, { x: 8.5, y: ry + 0.05, w: 4.2, h: 0.6, fontSize: 28, bold: true, color: p.primary, fontFace: "Inter", align: "right" });
    // progress bar
    const barY = ry + rowH - 0.35;
    const barW = SLIDE_W - 1.2 - 0.8;
    s.addShape("rect", { x: 0.6, y: barY, w: barW, h: 0.12, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addShape("rect", { x: 0.6, y: barY, w: (barW * pct) / 100, h: 0.12, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(`${pct}%`, { x: SLIDE_W - 1.2 - 0.6, y: barY - 0.08, w: 0.6, h: 0.3, fontSize: 12, bold: true, color: p.accent, fontFace: "Inter", align: "right" });
  });
}

// ── MV-DASH-REGION-STATS ──
function renderDashRegionStats(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const stat = obj(c.stat);
  const items = arr(c.items).slice(0, 6);
  s.addShape("rect", { x: 0.6, y: y0, w: 2.2, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, { x: 0.6, y: y0 + 0.4, w: 5.5, h: 2.6, fontSize: 120, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(str(stat.label).toUpperCase(), { x: 0.6, y: y0 + 3.2, w: 5.5, h: 0.5, fontSize: 12, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
  const rx = 6.8;
  const rowH = Math.min(0.85, (5.5 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    const pct = Math.max(0, Math.min(100, num(it.percent)));
    s.addShape("line", { x: rx, y: ry, w: SLIDE_W - rx - 0.6, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addText(str(it.label), { x: rx, y: ry + 0.1, w: 4.0, h: 0.4, fontSize: 15, bold: true, color: p.primary, fontFace: "Inter" });
    if (delta) s.addText(delta.toUpperCase(), { x: SLIDE_W - 2.0, y: ry + 0.13, w: 1.4, h: 0.35, fontSize: 11, bold: true, color: negative ? "E53D2E" : p.accent, charSpacing: 3, fontFace: "Inter", align: "right" });
    const barW = SLIDE_W - rx - 0.6;
    s.addShape("rect", { x: rx, y: ry + rowH - 0.22, w: barW, h: 0.08, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addShape("rect", { x: rx, y: ry + rowH - 0.22, w: (barW * pct) / 100, h: 0.08, fill: { color: p.accent }, line: { color: p.accent } });
  });
}

// ────────────────── Advanced variant renderers (Batch 4 — graph) ──────────────────

// ── MV-GRAPH-YEAR-SERIES ──
function renderGraphYearSeries(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  // left rail
  s.addShape("rect", { x: 0.6, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(str(c.kicker || "Trend").toUpperCase(), { x: 0.6, y: y0 + 0.15, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  s.addText(str(c.headline), { x: 0.6, y: y0 + 0.55, w: 3.4, h: 3.6, fontSize: 22, bold: true, color: p.primary, fontFace: "Inter", valign: "top" });
  // bars via native chart
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "years", labels: items.map((it) => str(it.year)), values: items.map((it) => num(it.value)) }],
      { x: 4.2, y: y0 + 0.1, w: SLIDE_W - 4.8, h: 4.6, barDir: "col", chartColors: [p.primary], showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 11, catAxisLabelColor: DARK_GRAY, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, valAxisLabelColor: DARK_GRAY, showValue: true, dataLabelFontFace: "Inter", dataLabelFontSize: 10, dataLabelColor: p.primary, dataLabelPosition: "outEnd" },
    );
  } catch { /* no-op */ }
  // accent tag over last year
  if (items.length) {
    const cellW = (SLIDE_W - 4.8) / items.length;
    const cx = 4.2 + (items.length - 1) * cellW + cellW / 2 - 1;
    const last = items[items.length - 1];
    s.addText(`${str(last.value)}${str(last.unit) ? ` ${str(last.unit)}` : ""}`, { x: cx, y: y0 - 0.05, w: 2, h: 0.5, fontSize: 20, bold: true, color: p.accent, fontFace: "Inter", align: "center" });
  }
}

// ── MV-GRAPH-AXIS-BARS ──
function renderGraphAxisBars(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const bars = arr(c.bars);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "monthly", labels: bars.map((b) => str(b.label)), values: bars.map((b) => num(b.value)) }],
      { x: 0.6, y: y0 + 0.1, w: SLIDE_W - 1.2, h: 4.4, barDir: "col", chartColors: [p.primary], showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 11, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, valAxisLabelColor: DARK_GRAY, valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY }, showValue: false },
    );
  } catch { /* no-op */ }
  if (str(c.legend)) {
    s.addShape("rect", { x: 0.6, y: y0 + 4.7, w: 0.2, h: 0.2, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(c.legend).toUpperCase(), { x: 0.9, y: y0 + 4.65, w: SLIDE_W - 1.5, h: 0.35, fontSize: 11, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
  }
}

// ── MV-GRAPH-CATEGORY-BARS ──
function renderGraphCategoryBars(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const stat = obj(c.stat);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "cats", labels: items.map((it) => str(it.label)), values: items.map((it) => num(it.value)) }],
      { x: 0.6, y: y0 + 0.1, w: 8.0, h: 4.6, barDir: "bar", chartColors: [p.primary], showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 12, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, showValue: true, dataLabelFontFace: "Inter", dataLabelFontSize: 11, dataLabelColor: p.primary, dataLabelPosition: "outEnd" },
    );
  } catch { /* no-op */ }
  const rx = 9.0;
  s.addShape("rect", { x: rx, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, { x: rx, y: y0 + 0.4, w: 3.7, h: 2.4, fontSize: 96, bold: true, color: p.primary, fontFace: "Inter" });
  s.addText(str(stat.label).toUpperCase(), { x: rx, y: y0 + 3.0, w: 3.7, h: 0.5, fontSize: 12, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
}

// ── MV-GRAPH-DUAL-DONUT ──
function renderGraphDualDonut(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  items.forEach((it, i) => {
    const cx = 0.6 + i * 6.4;
    const cardW = 5.9;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    s.addShape("rect", { x: cx, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.meta).toUpperCase(), { x: cx, y: y0 + 0.15, w: cardW, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "d", labels: ["v", "r"], values: [pct, 100 - pct] }],
        { x: cx + (cardW - 3) / 2, y: y0 + 0.5, w: 3, h: 3, chartColors: [p.accent, LIGHT_GRAY], showLegend: false, showTitle: false, holeSize: 70 },
      );
    } catch { /* no-op */ }
    s.addText(`${Math.round(pct)}%`, { x: cx, y: y0 + 1.7, w: cardW, h: 0.8, fontSize: 44, bold: true, color: p.primary, fontFace: "Inter", align: "center" });
    s.addText(str(it.label).toUpperCase(), { x: cx, y: y0 + 3.7, w: cardW, h: 0.4, fontSize: 12, bold: true, color: p.primary, charSpacing: 3, fontFace: "Inter", align: "center" });
    s.addText(str(it.body), { x: cx + 0.2, y: y0 + 4.15, w: cardW - 0.4, h: 1.0, fontSize: 13, color: DARK_GRAY, fontFace: "Inter", align: "center" });
  });
  s.addShape("line", { x: 6.55, y: y0, w: 0, h: 5.0, line: { color: LIGHT_GRAY, width: 1 } });
}

// ── MV-GRAPH-RINGS ──
function renderGraphRings(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 4);
  // Row of 4 mini doughnuts (concentric is awkward in pptxgenjs — this is the clean fallback)
  const chartW = 7.0;
  const each = chartW / Math.max(items.length, 1);
  items.forEach((it, i) => {
    const cx = 0.6 + i * each;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    const color = i === 0 ? p.accent : p.primary;
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "r", labels: ["v", "r"], values: [pct, 100 - pct] }],
        { x: cx, y: y0 + 0.5, w: each - 0.2, h: each - 0.2, chartColors: [color, LIGHT_GRAY], showLegend: false, showTitle: false, holeSize: 65 },
      );
    } catch { /* no-op */ }
    s.addText(`${pct}%`, { x: cx, y: y0 + each * 0.4, w: each - 0.2, h: 0.5, fontSize: 20, bold: true, color: p.primary, fontFace: "Inter", align: "center" });
  });
  // Legend right side
  const lx = 8.0;
  s.addShape("rect", { x: lx, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText("BREAKDOWN", { x: lx, y: y0 + 0.15, w: 4.7, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  items.forEach((it, i) => {
    const ry = y0 + 0.7 + i * 0.9;
    const color = i === 0 ? p.accent : p.primary;
    s.addShape("line", { x: lx, y: ry, w: 4.7, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addShape("rect", { x: lx, y: ry + 0.18, w: 0.2, h: 0.2, fill: { color }, line: { color } });
    s.addText(str(it.label), { x: lx + 0.35, y: ry + 0.1, w: 3.0, h: 0.4, fontSize: 14, bold: true, color: p.primary, fontFace: "Inter" });
    s.addText(`${num(it.value)}%`, { x: lx + 3.4, y: ry + 0.1, w: 1.3, h: 0.4, fontSize: 14, bold: true, color: p.accent, fontFace: "Inter", align: "right" });
    s.addText(str(it.body), { x: lx + 0.35, y: ry + 0.45, w: 4.3, h: 0.35, fontSize: 11, color: DARK_GRAY, fontFace: "Inter" });
  });
}

// ── MV-GRAPH-TASK-CARDS ──
function renderGraphTaskCards(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const cardW = (SLIDE_W - 1.2 - 0.6) / 3;
  items.forEach((it, i) => {
    const cx = 0.6 + i * (cardW + 0.3);
    const done = num(it.done);
    const total = Math.max(1, num(it.total, 100));
    const pct = Math.min(100, Math.round((done / total) * 100));
    s.addShape("rect", { x: cx, y: y0, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.label).toUpperCase(), { x: cx, y: y0 + 0.15, w: cardW, h: 0.3, fontSize: 11, bold: true, color: DARK_GRAY, charSpacing: 3, fontFace: "Inter" });
    s.addText(`${pct}%`, { x: cx, y: y0 + 0.55, w: cardW, h: 1.5, fontSize: 64, bold: true, color: p.primary, fontFace: "Inter" });
    s.addText("of 100%", { x: cx + 2.4, y: y0 + 1.4, w: 2, h: 0.4, fontSize: 12, color: MID_GRAY, fontFace: "Inter" });
    s.addText(`${done.toLocaleString()} / ${total.toLocaleString()}`, { x: cx, y: y0 + 2.1, w: cardW, h: 0.35, fontSize: 11, color: MID_GRAY, fontFace: "Inter" });
    const barW = cardW - 0.1;
    s.addShape("rect", { x: cx, y: y0 + 2.6, w: barW, h: 0.12, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addShape("rect", { x: cx, y: y0 + 2.6, w: (barW * pct) / 100, h: 0.12, fill: { color: p.accent }, line: { color: p.accent } });
    s.addText(str(it.body), { x: cx, y: y0 + 2.95, w: cardW, h: 1.4, fontSize: 13, color: DARK_GRAY, fontFace: "Inter" });
  });
}

// ── MV-GRAPH-DECADE-AREA ──
function renderGraphDecadeArea(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  // Custom title zone with kicker + headline
  s.addShape("rect", { x: 0.6, y: 0.55, w: 2.0, h: 0.04, fill: { color: p.accent }, line: { color: p.accent } });
  s.addText(str(c.kicker || "Trajectory").toUpperCase(), { x: 0.6, y: 0.7, w: SLIDE_W - 1.2, h: 0.3, fontSize: 11, bold: true, color: p.accent, charSpacing: 3, fontFace: "Inter" });
  s.addText(str(c.headline || c.title), { x: 0.6, y: 1.05, w: SLIDE_W - 1.2, h: 1.1, fontSize: 28, bold: true, color: p.primary, fontFace: "Inter" });
  const y0 = 2.2;
  const series = arr(c.series);
  const callout = obj(c.callout);
  try {
    s.addChart(
      "area" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "decade", labels: series.map((pt) => str(pt.label)), values: series.map((pt) => num(pt.value)) }],
      { x: 0.6, y: y0, w: SLIDE_W - 1.2, h: 4.6, chartColors: [p.accent], chartColorsOpacity: 30, lineSize: 3, showLegend: false, showTitle: false, catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 11, catAxisLabelColor: DARK_GRAY, valAxisLabelFontFace: "Inter", valAxisLabelFontSize: 10, valAxisLabelColor: DARK_GRAY, showValue: false },
    );
  } catch { /* no-op */ }
  // Callout box (positioned above chart, roughly at callout year x-slot)
  const idx = series.findIndex((pt) => str(pt.label) === str(callout.year));
  if (idx >= 0 && series.length > 1) {
    const chartL = 0.6, chartW = SLIDE_W - 1.2;
    const cx = chartL + (idx / (series.length - 1)) * chartW;
    const boxX = Math.max(0.6, Math.min(SLIDE_W - 3.6, cx - 1.5));
    s.addShape("rect", { x: boxX, y: y0 + 0.3, w: 3.0, h: 0.9, fill: { color: "FFFFFF" }, line: { color: p.accent, width: 2 } });
    s.addText(str(callout.year), { x: boxX + 0.1, y: y0 + 0.35, w: 2.8, h: 0.35, fontSize: 14, bold: true, color: p.primary, fontFace: "Inter", align: "center" });
    s.addText(str(callout.note), { x: boxX + 0.1, y: y0 + 0.68, w: 2.8, h: 0.5, fontSize: 11, color: DARK_GRAY, fontFace: "Inter", align: "center" });
  }
}

// ── MV-GRAPH-PERCENT-COMPARE ──
function renderGraphPercentCompare(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  const rowH = Math.min(1.3, (5.4 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const cur = Math.max(0, Math.min(100, num(it.current)));
    const bench = Math.max(0, Math.min(100, num(it.benchmark)));
    s.addShape("line", { x: 0.6, y: ry, w: SLIDE_W - 1.2, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addText(str(it.label), { x: 0.6, y: ry + 0.15, w: 5.0, h: 0.5, fontSize: 18, bold: true, color: p.primary, fontFace: "Inter" });
    s.addText(`${cur}%`, { x: 8.0, y: ry + 0.1, w: 2.0, h: 0.6, fontSize: 32, bold: true, color: p.accent, fontFace: "Inter", align: "right" });
    s.addText(`${bench}%`, { x: 10.4, y: ry + 0.2, w: 2.0, h: 0.5, fontSize: 22, bold: true, color: MID_GRAY, fontFace: "Inter", align: "right" });
    const barW = SLIDE_W - 1.2;
    const barY = ry + 0.8;
    s.addShape("rect", { x: 0.6, y: barY, w: barW, h: 0.08, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addShape("rect", { x: 0.6, y: barY, w: (barW * cur) / 100, h: 0.08, fill: { color: p.accent }, line: { color: p.accent } });
    s.addShape("rect", { x: 0.6, y: barY + 0.14, w: barW, h: 0.08, fill: { color: LIGHT_GRAY }, line: { color: LIGHT_GRAY } });
    s.addShape("rect", { x: 0.6, y: barY + 0.14, w: (barW * bench) / 100, h: 0.08, fill: { color: p.primary }, line: { color: p.primary } });
    if (str(it.range)) s.addText(str(it.range).toUpperCase(), { x: 0.6, y: ry + rowH - 0.32, w: SLIDE_W - 1.2, h: 0.3, fontSize: 10, bold: true, color: MID_GRAY, charSpacing: 3, fontFace: "Inter" });
  });
}
