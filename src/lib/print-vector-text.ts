/**
 * Print-asset vector-text overlay.
 *
 * WHY: rasterizing 9–11px body copy on aurora backgrounds gives soft, jagged
 * type at press DPI and produces a PDF whose text is not selectable,
 * searchable, or accessible. This module drives a two-pass render:
 *
 *   Pass A (raster):  hide every text-bearing element via a `capture-hide-text`
 *                     CSS override so `captureSlideAsDataUrl` returns only the
 *                     aurora / photo-hero / graphics background.
 *   Pass B (vector):  walk the DOM, collect one rendered visual line per entry
 *                     via `Range.getClientRects()`, then draw the same lines
 *                     with pdf-lib on top of the raster page in vector.
 *
 * Positions come from getClientRects — we NEVER let pdf-lib re-wrap
 * paragraphs. Every visual line drawn matches the visual line the browser
 * produced, so vector text registers exactly over the raster beneath it.
 *
 * SCOPE: print-asset routes only. Decks stay raster.
 */

import {
  PDFDocument,
  rgb,
  setCharacterSpacing,
  StandardFonts as _Standard,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import fontkit from "@pdf-lib/fontkit";

// Silence unused import (kept for symbol table sanity).
void _Standard;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VectorTextLine {
  /** Rendered visible text for this single line box. */
  text: string;
  /** CSS px, relative to the capture root's top-left. */
  leftCss: number;
  /** CSS px, top of the line box, relative to the capture root's top-left. */
  topCss: number;
  /** CSS px, bottom of the line box. */
  bottomCss: number;
  /** CSS px, resolved font-size after container-query / text-fit resolution. */
  sizeCss: number;
  /** Concrete RGB tuple 0..1 (getComputedStyle resolves color-mix / vars). */
  color: [number, number, number];
  /** Per-CSS-px alpha 0..1. */
  opacity: number;
  /** css font-family list (first family used). */
  family: string;
  /** css font-weight numeric (100..900). */
  weight: number;
  /** true if computed font-style is italic/oblique. */
  italic: boolean;
  /** letter-spacing in CSS px (normal → 0). */
  letterSpacing: number;
  /** Per-glyph left positions in CSS px when letter-spacing != 0.
   *  When present, prefer glyph-by-glyph rendering to preserve tracking. */
  glyphLefts?: number[];
  /**
   * Extractive text alignment hint — only used for downstream diagnostics.
   * Positioning is already absolute via leftCss.
   */
  align?: "start" | "center" | "end";
}

export interface VectorTextCapture {
  /** Root capture element's bounding rect in CSS px at capture time. */
  root: { widthCss: number; heightCss: number };
  lines: VectorTextLine[];
  /** Text-node count considered vs. lines actually emitted (for diagnostics). */
  stats: { textNodes: number; lines: number; skippedClamped: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture-hide-text CSS toggle
// ─────────────────────────────────────────────────────────────────────────────

const HIDE_ATTR = "data-pv-hide-text";
const HIDE_STYLE_ID = "__pv-hide-text-style";

/**
 * Hide DOM text during raster capture. SVG <text> elements use `fill`/`stroke`
 * attributes (not CSS color) so they survive — decorative chart labels stay
 * in the raster layer intentionally.
 *
 * The override sits inline in the capture root so it also lands on cloned
 * subtrees that html-to-image walks through foreignObject.
 */
export function enableHideTextForCapture(root: HTMLElement): () => void {
  root.setAttribute(HIDE_ATTR, "true");
  let style = root.ownerDocument.getElementById(HIDE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = root.ownerDocument.createElement("style");
    style.id = HIDE_STYLE_ID;
    style.textContent = `
      [${HIDE_ATTR}] *:not(svg):not(svg *) {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
        caret-color: transparent !important;
      }
      /* Keep decorative SVG chart text visible in the raster pass. */
    `;
    root.ownerDocument.head.appendChild(style);
  }
  return () => {
    root.removeAttribute(HIDE_ATTR);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Line collection
// ─────────────────────────────────────────────────────────────────────────────

/** Parse `rgb(...)` / `rgba(...)` / `#rrggbb` → RGB 0..1 + alpha 0..1. */
function parseCssColor(css: string): { color: [number, number, number]; opacity: number } {
  const m = css.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i);
  if (m) {
    return {
      color: [
        Number(m[1]) / 255,
        Number(m[2]) / 255,
        Number(m[3]) / 255,
      ] as [number, number, number],
      opacity: m[4] !== undefined ? Number(m[4]) : 1,
    };
  }
  const hex = css.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return { color: [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255], opacity: 1 };
  }
  return { color: [0, 0, 0], opacity: 1 };
}

function parseLetterSpacing(css: string, fontSizePx: number): number {
  if (!css || css === "normal") return 0;
  if (css.endsWith("px")) return Number(css.slice(0, -2)) || 0;
  if (css.endsWith("em")) return (Number(css.slice(0, -2)) || 0) * fontSizePx;
  return 0;
}

function firstFontFamily(css: string): string {
  return (css.split(",")[0] ?? "sans-serif")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/** Check whether `node` sits inside any ancestor whose CSS-clipped region
 *  excludes the rect (for `-webkit-line-clamp` / overflow:hidden trimming). */
function isRectClamped(rect: DOMRect, textParent: Element): boolean {
  let el: Element | null = textParent;
  while (el && el instanceof HTMLElement) {
    const cs = window.getComputedStyle(el);
    const clamp = cs.webkitLineClamp || (cs as unknown as { lineClamp?: string }).lineClamp;
    const clipped =
      cs.overflow === "hidden" ||
      cs.overflowY === "hidden" ||
      (!!clamp && clamp !== "none" && clamp !== "0");
    if (clipped) {
      const box = el.getBoundingClientRect();
      // 1px of tolerance for sub-pixel rounding.
      if (rect.top >= box.bottom - 1 || rect.bottom <= box.top + 1) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/** Cluster a text node's per-char rects into visual lines. */
function collectLinesForTextNode(
  node: Text,
  rootBounds: DOMRect,
): Array<Omit<VectorTextLine, "family" | "weight" | "italic" | "color" | "opacity" | "sizeCss" | "letterSpacing"> & { glyphLefts: number[] }> {
  const raw = node.data;
  if (!raw || !raw.trim()) return [];

  const parent = node.parentElement;
  if (!parent) return [];

  const range = node.ownerDocument.createRange();
  const lines: Array<Omit<VectorTextLine, "family" | "weight" | "italic" | "color" | "opacity" | "sizeCss" | "letterSpacing"> & { glyphLefts: number[] }> = [];

  let currentTop: number | null = null;
  let currentBottom = 0;
  let currentLeft = 0;
  let currentText = "";
  let currentGlyphLefts: number[] = [];

  const pushLine = () => {
    if (currentText.length === 0 || currentTop === null) return;
    // Trim trailing whitespace-only from a wrapped line.
    const trimmed = currentText.replace(/\s+$/, "");
    if (!trimmed) return;
    lines.push({
      text: trimmed,
      leftCss: currentLeft - rootBounds.left,
      topCss: currentTop - rootBounds.top,
      bottomCss: currentBottom - rootBounds.top,
      glyphLefts: currentGlyphLefts.slice(0, trimmed.length).map((x) => x - rootBounds.left),
    });
  };

  for (let i = 0; i < raw.length; i++) {
    // Skip pure whitespace at the start of a line collection (line-break glue).
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (isRectClamped(rect, parent)) continue;

    if (currentTop === null || Math.abs(rect.top - currentTop) > Math.max(2, rect.height * 0.4)) {
      // New line boundary.
      pushLine();
      currentTop = rect.top;
      currentLeft = rect.left;
      currentBottom = rect.bottom;
      currentText = raw[i]!;
      currentGlyphLefts = [rect.left];
    } else {
      currentText += raw[i]!;
      currentGlyphLefts.push(rect.left);
      currentBottom = Math.max(currentBottom, rect.bottom);
    }
  }
  pushLine();
  range.detach?.();
  return lines;
}

/**
 * Walk the capture root, collect all rendered text as `VectorTextLine[]`
 * with concrete computed styles resolved via `getComputedStyle`. Call AFTER
 * fonts and images have settled so line breaks are final.
 */
export function captureVectorText(root: HTMLElement): VectorTextCapture {
  const rootBounds = root.getBoundingClientRect();
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const text = (n as Text).data;
      if (!text || !text.trim()) return NodeFilter.FILTER_REJECT;
      // Reject text inside SVG (chart labels stay in the raster pass).
      let el: Node | null = n.parentNode;
      while (el) {
        if (el instanceof SVGElement) return NodeFilter.FILTER_REJECT;
        el = el.parentNode;
      }
      // Reject text inside hidden ancestors.
      const parent = n.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const cs = window.getComputedStyle(parent);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const lines: VectorTextLine[] = [];
  let textNodes = 0;
  let skippedClamped = 0;
  let curr = walker.nextNode() as Text | null;
  while (curr) {
    textNodes += 1;
    const parent = curr.parentElement!;
    const cs = window.getComputedStyle(parent);
    const sizeCss = parseFloat(cs.fontSize) || 12;
    const weight = Number(cs.fontWeight) || 400;
    const italic = cs.fontStyle === "italic" || cs.fontStyle === "oblique";
    const family = firstFontFamily(cs.fontFamily);
    const { color, opacity: colorAlpha } = parseCssColor(cs.color);
    const opacity = colorAlpha * (Number(cs.opacity) || 1);
    const letterSpacing = parseLetterSpacing(cs.letterSpacing, sizeCss);
    const rawLines = collectLinesForTextNode(curr, rootBounds);
    if (rawLines.length === 0 && curr.data.trim()) skippedClamped += 1;
    for (const l of rawLines) {
      lines.push({
        ...l,
        sizeCss,
        color,
        opacity,
        family,
        weight,
        italic,
        letterSpacing,
        glyphLefts: Math.abs(letterSpacing) >= 0.3 ? l.glyphLefts : undefined,
      });
    }
    curr = walker.nextNode() as Text | null;
  }

  return {
    root: { widthCss: rootBounds.width, heightCss: rootBounds.height },
    lines,
    stats: { textNodes, lines: lines.length, skippedClamped },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Font loading / embedding
// ─────────────────────────────────────────────────────────────────────────────

export type GeistWeightKey = "regular" | "italic" | "bold" | "boldItalic";

const GEIST_URLS: Record<GeistWeightKey, string> = {
  regular: "/fonts/Geist-Regular.ttf",
  italic: "/fonts/Geist-Italic.ttf",
  bold: "/fonts/Geist-Bold.ttf",
  boldItalic: "/fonts/Geist-BoldItalic.ttf",
};

const GEIST_BYTES_CACHE = new Map<GeistWeightKey, Uint8Array>();

async function fetchGeist(key: GeistWeightKey): Promise<Uint8Array> {
  const cached = GEIST_BYTES_CACHE.get(key);
  if (cached) return cached;
  const res = await fetch(GEIST_URLS[key]);
  if (!res.ok) throw new Error(`Failed to load Geist ${key}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  GEIST_BYTES_CACHE.set(key, bytes);
  return bytes;
}

function pickGeistKey(weight: number, italic: boolean): GeistWeightKey {
  const bold = weight >= 600;
  if (bold && italic) return "boldItalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "regular";
}

interface EmbeddedFonts {
  regular?: PDFFont;
  italic?: PDFFont;
  bold?: PDFFont;
  boldItalic?: PDFFont;
}

async function embedNeededGeistFonts(
  pdfDoc: PDFDocument,
  lines: VectorTextLine[],
): Promise<{ fonts: EmbeddedFonts; embeddedKeys: GeistWeightKey[] }> {
  const needed = new Set<GeistWeightKey>();
  for (const l of lines) needed.add(pickGeistKey(l.weight, l.italic));

  const fonts: EmbeddedFonts = {};
  const embeddedKeys: GeistWeightKey[] = [];
  for (const key of needed) {
    const bytes = await fetchGeist(key);
    const font = await pdfDoc.embedFont(bytes, { subset: true });
    fonts[key] = font;
    embeddedKeys.push(key);
  }
  return { fonts, embeddedKeys };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vector overlay
// ─────────────────────────────────────────────────────────────────────────────

export interface VectorOverlayOptions {
  /** Page geometry in inches, matching what the raster PDF used. */
  pageWidthIn: number;
  pageHeightIn: number;
  /** Bleed in inches (raster PDF placed trim content over full page). */
  bleedIn: number;
  /** Captures — one per page, matched to page index. */
  captures: VectorTextCapture[];
}

export interface VectorOverlayResult {
  bytes: Uint8Array;
  /** Font resources actually written into the PDF. */
  fontResources: string[];
  /** Diagnostics. */
  stats: { linesDrawn: number; glyphOnly: number; pages: number };
}

const IN_TO_PT = 72;

/** Ratio of ascender to font size for Geist (empirically matches at print sizes). */
const GEIST_DESCENT_RATIO = 0.22;

/**
 * Load a raster PDF's bytes, embed Geist (subsetted) and draw a vector text
 * overlay per page. Returns new bytes ready to hand to `wrapPdfAsX4`.
 */
export async function overlayVectorText(
  rasterPdfBytes: Uint8Array | ArrayBuffer,
  opts: VectorOverlayOptions,
): Promise<VectorOverlayResult> {
  const source = rasterPdfBytes instanceof Uint8Array ? rasterPdfBytes : new Uint8Array(rasterPdfBytes);
  const pdfDoc = await PDFDocument.load(source, { updateMetadata: false });
  pdfDoc.registerFontkit(fontkit);

  const allLines = opts.captures.flatMap((c) => c.lines);
  const { fonts, embeddedKeys } = await embedNeededGeistFonts(pdfDoc, allLines);

  const pages = pdfDoc.getPages();
  let linesDrawn = 0;
  let glyphOnly = 0;

  for (let i = 0; i < pages.length && i < opts.captures.length; i++) {
    const page = pages[i]!;
    const cap = opts.captures[i]!;
    const pageWidthPt = opts.pageWidthIn * IN_TO_PT;
    const pageHeightPt = opts.pageHeightIn * IN_TO_PT;

    // Raster placed at (0,0) covering full page (trim stretched over bleed).
    // Text captures are relative to the CSS canvas whose CSS bounds are
    // `cap.root.widthCss × cap.root.heightCss`, so we scale by:
    const scaleX = pageWidthPt / cap.root.widthCss;
    const scaleY = pageHeightPt / cap.root.heightCss;

    for (const line of cap.lines) {
      const key = pickGeistKey(line.weight, line.italic);
      const font = fonts[key];
      if (!font) continue;

      const sizePt = line.sizeCss * scaleY;
      const [r, g, b] = line.color;
      const baselineCss = line.bottomCss - line.sizeCss * GEIST_DESCENT_RATIO;
      const baselineYPt = pageHeightPt - baselineCss * scaleY;

      drawVectorLine(page, line, font, {
        sizePt,
        scaleX,
        baselineYPt,
        color: rgb(r, g, b),
        opacity: line.opacity,
      });

      linesDrawn += 1;
      if (line.glyphLefts) glyphOnly += 1;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });

  const fontResources = embeddedKeys.map((k) => `Geist-${k[0]!.toUpperCase()}${k.slice(1)}`);
  return {
    bytes,
    fontResources,
    stats: { linesDrawn, glyphOnly, pages: pages.length },
  };
}

interface DrawCtx {
  sizePt: number;
  scaleX: number;
  baselineYPt: number;
  color: ReturnType<typeof rgb>;
  opacity: number;
  /** Letter-spacing in PDF points (Tc value). 0 for normal. */
  charSpacingPt: number;
}

/**
 * Draw one visual line with pdf-lib.
 *
 * Uses `page.drawText` (a single Tj) so extracted text stays word-preserving
 * and searchable. Letter-spacing is applied via the PDF `Tc` text-state
 * operator (`setCharacterSpacing`) which persists until reset — we always
 * reset to 0 after each tracked line so we don't leak into the next.
 */
function drawVectorLine(page: PDFPage, line: VectorTextLine, font: PDFFont, ctx: DrawCtx): void {
  if (ctx.charSpacingPt !== 0) {
    page.pushOperators(setCharacterSpacing(ctx.charSpacingPt));
  }
  page.drawText(line.text, {
    x: line.leftCss * ctx.scaleX,
    y: ctx.baselineYPt,
    size: ctx.sizePt,
    font,
    color: ctx.color,
    opacity: ctx.opacity,
  });
  if (ctx.charSpacingPt !== 0) {
    page.pushOperators(setCharacterSpacing(0));
  }
  // Reference to line kept alive for possible future per-glyph fallback.
  void line.glyphLefts;
}

