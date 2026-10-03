// -----------------------------------------------------------------------------
// Export text layer
//
// The old "layered" export rebuilt every module out of hand-written OOXML
// shapes. That could only ever approximate the design system, and in practice
// exports looked nothing like the build (missing tiles, imagery, icons, wrong
// grid).
//
// This module supports the optional text-editable plate utility used by focused
// capture workflows. It is exact by construction for text geometry:
//   1. Mount the REAL renderer offscreen at 1920×1080 (ExactSlideStage).
//   2. Measure every visible run of text in the DOM — position, size, font,
//      colour, spacing, alignment.
//   3. Make that text invisible (without touching layout) and rasterize the
//      slide. The plate therefore carries every designed pixel EXCEPT glyphs:
//      gradients, glass tiles, photographs, icons, rules, motifs, the lockup.
//   4. Emit the measured runs as native PowerPoint text boxes over the plate.
//
// Result: the plate is pixel-identical to the build and eligible plain text is
// editable in PowerPoint. The default fully-layered module export does NOT use
// this utility: it captures a decor-only plate and runs the native OOXML module
// renderers so shapes, pictures, icons, logos and text remain separate objects.
// -----------------------------------------------------------------------------

import { isAuthoringChrome } from "./export-chrome-suppress";
import { mapFontFamily } from "./pptx-font-map";
import { STAGE_H, STAGE_W } from "./export-quality";
import {
  inlineTextNodes,
  linePitch,
  measureInlineLines,
  measureLines,
  type InlineLine,
  type MeasuredLine,
} from "./export-text-lines";

export interface TextRun {
  /** Content-box geometry in stage pixels (1920×1080 space). */
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  /**
   * True when the element's untrimmed direct text began/ended with whitespace.
   * `text` itself is trimmed, so without these flags a real word gap between
   * two sibling fragments ("business " + "review") is lost on export and
   * PowerPoint renders "businessreview".
   */
  leadWs: boolean;
  trailWs: boolean;
  /** Rendered pixel font size at stage scale. */
  fontSizePx: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** rrggbb, no leading #. */
  color: string;
  /** 0-100 PowerPoint transparency derived from the CSS colour alpha. */
  transparency: number;
  align: "left" | "center" | "right" | "justify";
  /** Rendered line height in pixels (0 when normal/unknown). */
  lineHeightPx: number;
  letterSpacingPx: number;
  /** Single visual line (no wrapping needed in PowerPoint). */
  singleLine: boolean;
  /**
   * The visual lines the BROWSER produced, measured off the settled DOM. When
   * present with 2+ entries the exporter bakes them as explicit breaks so
   * PowerPoint cannot re-wrap the paragraph with its own metrics.
   */
  lines?: MeasuredLine[];
  /** Median vertical pitch between measured lines (stage px, 0 when unknown). */
  linePitchPx?: number;
  /**
   * Mixed-style paragraph: visual lines of styled segments in reading order.
   * `segStyles[i]` is the character style of segment owner `i`. When present
   * the run already contains its inline children's text; they are not
   * captured as separate runs.
   */
  segLines?: InlineLine[];
  segStyles?: Array<{
    fontSizePx: number;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: string;
    letterSpacingPx: number;
    textTransform: string;
  }>;
  /** Vertical placement inside the box. */
  valign: "top" | "middle";
  /** Paragraph-level metrics (stage px) read off the settled DOM. */
  paragraph: {
    /** CSS text-indent of the first line. */
    textIndentPx: number;
    /** Effective left / right inset inside the element (padding). */
    padLeftPx: number;
    padRightPx: number;
    /** Space before / after from the collapsed-margin box. */
    spaceBeforePx: number;
    spaceAfterPx: number;
    /** CSS white-space, overflow-wrap and hyphens as rendered. */
    whiteSpace: string;
    overflowWrap: string;
    hyphens: string;
    /** List item marker text, when the element is a list item. */
    listMarker: string | null;
  };
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "svg", "SVG"]);

let probeCtx: CanvasRenderingContext2D | null | undefined;

/** Resolve ANY CSS colour (rgb, oklab, oklch, color-mix, lab…) to rgba. */
function resolveColor(color: string): { hex: string; alpha: number } | null {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((p) => parseFloat(p));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    if (Number.isFinite(r)) return { hex: hex3(r, g, b), alpha: a };
  }
  if (probeCtx === undefined) {
    try {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      probeCtx = c.getContext("2d", { willReadFrequently: true });
    } catch {
      probeCtx = null;
    }
  }
  if (!probeCtx) return null;
  try {
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = "#000000";
    probeCtx.fillStyle = color;
    probeCtx.fillRect(0, 0, 1, 1);
    const d = probeCtx.getImageData(0, 0, 1, 1).data;
    return { hex: hex3(d[0], d[1], d[2]), alpha: d[3] / 255 };
  } catch {
    return null;
  }
}

function hex3(r: number, g: number, b: number): string {
  const hx = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `${hx(r)}${hx(g)}${hx(b)}`;
}

/**
 * Composite a translucent glyph colour onto the backdrop it sits on, so the run
 * can be emitted OPAQUE.
 *
 * Why: muted eyebrows / footers paint at ~65% alpha, which pptxgenjs emits as
 * `<a:alpha>` inside the run colour. A run colour carrying alpha makes
 * renderers (LibreOffice, and the same code path PowerPoint uses for PDF/print)
 * lay the string out at its *untracked* width and clip the tail — that is how
 * "IN THEIR WORDS" shipped as "IN THEIR W" and "CONFIDENTIAL · INTERNAL REVIEW"
 * as "CONFIDENTIAL · INTERN". Flattening the alpha into the hex keeps the exact
 * on-screen tint with no transparency attribute at all.
 */
function blendOverBackdrop(
  el: Element,
  paint: { hex: string; alpha: number },
): { hex: string; transparency: number } {
  if (paint.alpha >= 0.995) return { hex: paint.hex, transparency: 0 };
  const num = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const over = (fg: { hex: string; alpha: number }, bg: string): string => {
    const mix = (i: number) => num(fg.hex, i) * fg.alpha + num(bg, i) * (1 - fg.alpha);
    return hex3(mix(0), mix(2), mix(4));
  };

  // Collect the ancestor background stack up to the first opaque plate.
  const layers: Array<{ hex: string; alpha: number }> = [];
  let base: string | null = null;
  let node: Element | null = el;
  while (node) {
    const bg = resolveColor(getComputedStyle(node).backgroundColor);
    if (bg && bg.alpha > 0.01) {
      if (bg.alpha >= 0.985) {
        base = bg.hex;
        break;
      }
      layers.push(bg);
    }
    node = node.parentElement;
  }
  // Glass / image backdrops have no opaque plate: fall back to the paper the
  // slide mode implies, derived from the glyph colour itself (dark ink ⇒ light
  // paper). Guessing here is far better than shipping an alpha channel, which
  // clips tracked copy in real renderers.
  if (!base) {
    const lum =
      (0.2126 * num(paint.hex, 0) + 0.7152 * num(paint.hex, 2) + 0.0722 * num(paint.hex, 4)) / 255;
    base = lum < 0.5 ? "FFFFFF" : "03002C";
  }
  // Composite outermost translucent layer first, then the glyph colour.
  let backdrop = base;
  for (let i = layers.length - 1; i >= 0; i -= 1) backdrop = over(layers[i]!, backdrop);
  return { hex: over(paint, backdrop), transparency: 0 };
}

/**
 * CSS `opacity` on an ancestor fades the glyphs but never shows up in the
 * element's own computed colour, so a decorative mark drawn at, say,
 * `opacity: .28` inside a wrapper used to export as fully saturated ink.
 * Multiply the whole ancestor chain (self included) so the composite below
 * blends the glyph at the alpha it is actually painted with on screen.
 */
function cumulativeOpacity(el: Element): number {
  let o = 1;
  let node: Element | null = el;
  while (node) {
    const v = parseFloat(getComputedStyle(node).opacity || "1");
    if (Number.isFinite(v)) o *= Math.max(0, Math.min(1, v));
    if (o <= 0.001) return 0;
    node = node.parentElement;
  }
  return o;
}

/**
 * PowerPoint resolves a single family name, and it will never have the web
 * font's internal name ("Geist Variable"), so map the whole CSS stack onto a
 * canonical brand family with defined fallbacks (see `pptx-font-map.ts`).
 */
function firstFamily(stack: string): string {
  return mapFontFamily(stack);
}

function applyTransform(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return text;
}

function isRotatedOrSkewed(cs: CSSStyleDeclaration): boolean {
  const t = cs.transform;
  if (!t || t === "none") return false;
  const nums = t.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!nums) return true; // unknown function → be conservative
  const v = nums[1].split(",").map((n) => parseFloat(n.trim()));
  if (v.length === 6) return Math.abs(v[1]) > 0.001 || Math.abs(v[2]) > 0.001;
  return Math.abs(v[1]) > 0.001 || Math.abs(v[4]) > 0.001;
}

/** True when the element paints its glyphs through a clip/gradient trick. */
function isPaintedText(cs: CSSStyleDeclaration): boolean {
  const fill = (cs as unknown as Record<string, string>)["webkitTextFillColor"];
  if (fill && /rgba\([^)]*,\s*0\s*\)/.test(fill)) return true;
  const clip =
    cs.backgroundClip || (cs as unknown as Record<string, string>)["webkitBackgroundClip"];
  return clip === "text";
}

const isInlineDisplay = (d: string) => d === "inline" || d === "contents";

function directText(el: Element): string {
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
  });
  return out.replace(/\s+/g, " ").trim();
}

/** Boundary whitespace of the untrimmed direct text (lost by `trim()`). */
function directTextBoundaryWs(el: Element): { lead: boolean; trail: boolean } {
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
  });
  const collapsed = out.replace(/\s+/g, " ");
  return { lead: /^\s/.test(collapsed), trail: /\s$/.test(collapsed) };
}

/**
 * Measure every visible text run inside a settled export stage.
 * Runs are returned in DOM order (paint order), in stage pixel space.
 */
export function extractTextRuns(
  stage: HTMLElement,
  /**
   * Measurement space in stage px. Defaults to the 1920×1080 deck stage; print
   * pages pass `trim inches × 144` so px→inch/pt conversion stays one constant.
   */
  space?: { w: number; h: number },
): { runs: TextRun[]; nodes: HTMLElement[] } {
  const stageRect = stage.getBoundingClientRect();
  const spaceW = space?.w ?? STAGE_W;
  const spaceH = space?.h ?? STAGE_H;
  // The stage may be rendered at a scale ≠ 1 in some hosts; normalise to the
  // measurement space so px→inch conversion is one constant.
  const sx = stageRect.width ? spaceW / stageRect.width : 1;
  const sy = stageRect.height ? spaceH / stageRect.height : 1;

  const runs: TextRun[] = [];
  const nodes: HTMLElement[] = [];
  // Inline children already folded into a parent's mixed-style paragraph.
  const consumed = new WeakSet<Element>();

  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;
  while (node) {
    const el = node;
    node = walker.nextNode() as HTMLElement | null;
    if (!(el instanceof HTMLElement)) continue;
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest("svg")) continue;
    // Authoring-only labels ("Safe area", "Bleed", handle hints) never export.
    if (isAuthoringChrome(el)) continue;
    if (consumed.has(el)) continue;

    let text = directText(el);
    if (!text) {
      // A paragraph built only from inline styled spans ("<span>Maintain </span>
      // <span>100%</span><span> accuracy…</span>") has no text of its own, so
      // each span used to float as its own box. Capture it as one paragraph
      // when every child is inline and at least two carry text.
      const kids = Array.from(el.children);
      const ecs = getComputedStyle(el);
      if (
        kids.length >= 2 &&
        !isInlineDisplay(ecs.display) &&
        kids.every((k) => isInlineDisplay(getComputedStyle(k).display)) &&
        kids.filter((k) => (k.textContent ?? "").trim()).length >= 2
      ) {
        text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!text) continue;
    }

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const chainAlpha = cumulativeOpacity(el);
    if (chainAlpha < 0.08) continue;
    // Painted / clipped glyph tricks and rotated copy stay in the raster so
    // the plate keeps the exact look; they just are not editable.
    if (isPaintedText(cs) || isRotatedOrSkewed(cs)) continue;

    const paint = resolveColor(cs.color);
    if (!paint || paint.alpha < 0.06) continue;
    const effective = { hex: paint.hex, alpha: paint.alpha * chainAlpha };
    if (effective.alpha < 0.06) continue;
    const flat = blendOverBackdrop(el, effective);
    const color = flat.hex;

    let rect: DOMRect = el.getBoundingClientRect();
    let textOnlyX = false;
    if (rect.width < 2 || rect.height < 2) continue;
    // An element that also holds a non-text child (an icon or arrow before the
    // label) must be placed from where its OWN text starts, not from the
    // element's left edge — otherwise the label is emitted on top of the icon
    // ("↑" drawn over "TREND").
    if (Array.from(el.children).some((c) => c.getBoundingClientRect().width > 0.5)) {
      const range = document.createRange();
      const tn = Array.from(el.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim(),
      );
      if (tn.length) {
        range.setStartBefore(tn[0]!);
        range.setEndAfter(tn[tn.length - 1]!);
        const tr = range.getBoundingClientRect();
        if (tr.width >= 2 && tr.height >= 2 && Array.from(range.getClientRects()).length <= 1) {
          rect = new DOMRect(tr.left, rect.top, tr.width, rect.height);
          textOnlyX = true;
        }
      }
    }

    // Flex/grid boxes centre their text with justify/align, not text-align, so
    // the element rect is the whole container (e.g. a step numeral filling a
    // circle). Place from the text's own single-line rect, centred, so
    // PowerPoint draws it where the browser does instead of top-left.
    let flexCentred = false;
    if (!textOnlyX && /flex|grid/.test(cs.display) && el.children.length === 0) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5);
      const tr = range.getBoundingClientRect();
      if (rects.length === 1 && tr.width >= 2 && tr.height >= 2 && (tr.width < rect.width - 4 || tr.height < rect.height - 4)) {
        const grow = tr.width * 0.2 + 8;
        rect = new DOMRect(tr.left - grow / 2, tr.top, tr.width + grow, tr.height);
        textOnlyX = true;
        flexCentred = true;
      }
    }

    const padL = textOnlyX ? 0 : parseFloat(cs.paddingLeft) || 0;
    const padR = textOnlyX ? 0 : parseFloat(cs.paddingRight) || 0;
    const padT = flexCentred ? 0 : parseFloat(cs.paddingTop) || 0;
    const padB = flexCentred ? 0 : parseFloat(cs.paddingBottom) || 0;

    const x = (rect.left - stageRect.left + padL) * sx;
    const y = (rect.top - stageRect.top + padT) * sy;
    const w = Math.max(4, (rect.width - padL - padR) * sx);
    const h = Math.max(4, (rect.height - padT - padB) * sy);
    if (x > spaceW || y > spaceH) continue;

    const fontSizePx = (parseFloat(cs.fontSize) || 16) * sy;
    const lhRaw = parseFloat(cs.lineHeight);
    const lineHeightPx = Number.isFinite(lhRaw) ? lhRaw * sy : 0;
    const lsRaw = parseFloat(cs.letterSpacing);
    const letterSpacingPx = Number.isFinite(lsRaw) ? lsRaw * sx : 0;
    const weight = parseInt(cs.fontWeight, 10);
    const alignRaw = cs.textAlign;
    const align: TextRun["align"] =
      flexCentred || alignRaw === "center"
        ? "center"
        : alignRaw === "right" || alignRaw === "end"
          ? "right"
          : alignRaw === "justify"
            ? "justify"
            : "left";
    const singleLine = lineHeightPx > 0 ? h <= lineHeightPx * 1.6 : h <= fontSizePx * 2;

    // Bake the browser's own line breaks for anything that renders on more than
    // one line. Justified copy keeps PowerPoint's layout: baking it would freeze
    // the browser's inter-word stretching into fixed strings.
    let lines: MeasuredLine[] | undefined;
    let linePitchPx = 0;
    if (!singleLine && align !== "justify") {
      const measured = measureLines(el, { left: stageRect.left, top: stageRect.top }, sx, sy);
      if (measured.length > 1) {
        lines = measured;
        linePitchPx = linePitch(measured);
      }
    }

    // Mixed-style paragraph: own text interleaved with inline styled children.
    let segLines: InlineLine[] | undefined;
    let segStyles: TextRun["segStyles"];
    const inl = inlineTextNodes(el);
    if (
      align !== "justify" &&
      inl.inlineEls.some((c) => (c.textContent ?? "").trim()) &&
      !inl.inlineEls.some((c) => {
        const ccs = getComputedStyle(c);
        return isPaintedText(ccs) || isRotatedOrSkewed(ccs);
      })
    ) {
      const measured = measureInlineLines(el, { left: stageRect.left, top: stageRect.top }, sx, sy);
      if (measured.lines.length) {
        segLines = measured.lines;
        segStyles = measured.owners.map((o) => {
          const ocs = getComputedStyle(o);
          const op = resolveColor(ocs.color) ?? paint;
          const oflat = blendOverBackdrop(o, { hex: op.hex, alpha: op.alpha * cumulativeOpacity(o) });
          const ow = parseInt(ocs.fontWeight, 10);
          const ols = parseFloat(ocs.letterSpacing);
          return {
            fontSizePx: (parseFloat(ocs.fontSize) || 16) * sy,
            fontFamily: firstFamily(ocs.fontFamily),
            bold: Number.isFinite(ow) ? ow >= 600 : /bold/i.test(ocs.fontWeight),
            italic: ocs.fontStyle === "italic",
            underline: ocs.textDecorationLine?.includes("underline") ?? false,
            color: oflat.hex,
            letterSpacingPx: Number.isFinite(ols) ? ols * sx : 0,
            textTransform: ocs.textTransform,
          };
        });
        inl.inlineEls.forEach((c) => {
          consumed.add(c);
          if (c instanceof HTMLElement) nodes.push(c);
        });
        text = segLines.map((l) => l.text).join(" ");
        if (segLines.length > 1) {
          lines = segLines;
          linePitchPx = linePitch(segLines);
        } else {
          lines = undefined;
          linePitchPx = 0;
        }
      }
    }

    const ws = directTextBoundaryWs(el);
    runs.push({
      x,
      y,
      w,
      h,
      text: applyTransform(text, cs.textTransform),
      leadWs: ws.lead,
      trailWs: ws.trail,
      fontSizePx,
      fontFamily: firstFamily(cs.fontFamily),
      bold: Number.isFinite(weight) ? weight >= 600 : /bold/i.test(cs.fontWeight),
      italic: cs.fontStyle === "italic",
      underline: cs.textDecorationLine?.includes("underline") ?? false,
      color,
      transparency: flat.transparency,
      align,
      lineHeightPx,
      letterSpacingPx,
      singleLine: segLines ? segLines.length === 1 : singleLine,
      lines,
      linePitchPx,
      segLines,
      segStyles,
      valign: (segLines ? segLines.length === 1 : singleLine) ? "middle" : "top",
      paragraph: {
        textIndentPx: (parseFloat(cs.textIndent) || 0) * sx,
        padLeftPx: padL * sx,
        padRightPx: padR * sx,
        spaceBeforePx: (parseFloat(cs.marginTop) || 0) * sy,
        spaceAfterPx: (parseFloat(cs.marginBottom) || 0) * sy,
        whiteSpace: cs.whiteSpace || "normal",
        overflowWrap: cs.overflowWrap || cs.wordBreak || "normal",
        hyphens: cs.hyphens || "manual",
        listMarker:
          cs.display === "list-item" || el.tagName === "LI"
            ? cs.listStyleType && cs.listStyleType !== "none"
              ? cs.listStyleType
              : "none"
            : null,
      },
    });
    nodes.push(el);
  }

  // Opt-in SVG copy: diagrams marked `data-export-text` (e.g. the quality dial)
  // ship their <text> labels as native, editable text boxes. Each <tspan> with
  // its own x is a visual line; otherwise the whole <text> is one line.
  for (const svgText of Array.from(stage.querySelectorAll<SVGTextElement>("svg[data-export-text] text"))) {
    const content = (svgText.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!content) continue;
    const cs = getComputedStyle(svgText);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const paint = resolveColor(cs.fill);
    if (!paint) continue;
    const fillOp = parseFloat(cs.fillOpacity);
    const alpha = paint.alpha * (Number.isFinite(fillOp) ? fillOp : 1) * cumulativeOpacity(svgText);
    if (alpha < 0.06) continue;
    const flat = blendOverBackdrop(svgText, { hex: paint.hex, alpha });
    const r = svgText.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const ctm = svgText.getScreenCTM();
    const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
    const fontSizePx = (parseFloat(cs.fontSize) || 16) * scale * sy;
    const tspans = Array.from(svgText.querySelectorAll("tspan")).filter((t) => (t.textContent ?? "").trim());
    const lineTexts = tspans.length > 1 ? tspans.map((t) => (t.textContent ?? "").trim()) : [content];
    const anchor = cs.textAnchor || svgText.getAttribute("text-anchor") || "start";
    const align: TextRun["align"] = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
    const weight = parseInt(cs.fontWeight, 10);
    const ls = parseFloat(cs.letterSpacing);
    // Pad the box so PowerPoint's slightly wider metrics never force a re-wrap.
    const padW = r.width * 0.12 + 6;
    const x0 = (r.left - stageRect.left) * sx;
    const xAdj = align === "center" ? x0 - (padW * sx) / 2 : align === "right" ? x0 - padW * sx : x0;
    const lineH = lineTexts.length > 1 ? (r.height * sy) / lineTexts.length : fontSizePx * 1.2;
    const lines: MeasuredLine[] | undefined =
      lineTexts.length > 1
        ? (lineTexts.map((t, k) => ({
            text: t,
            x: xAdj,
            y: (r.top - stageRect.top) * sy + k * lineH,
            w: (r.width + padW) * sx,
            h: lineH,
          })) as unknown as MeasuredLine[])
        : undefined;
    runs.push({
      x: xAdj,
      y: (r.top - stageRect.top) * sy,
      w: (r.width + padW) * sx,
      h: r.height * sy,
      text: applyTransform(lineTexts.join(" "), cs.textTransform),
      leadWs: false,
      trailWs: false,
      fontSizePx,
      fontFamily: firstFamily(cs.fontFamily),
      bold: Number.isFinite(weight) ? weight >= 600 : /bold/i.test(cs.fontWeight),
      italic: cs.fontStyle === "italic",
      underline: false,
      color: flat.hex,
      transparency: flat.transparency,
      align,
      lineHeightPx: lineH,
      letterSpacingPx: Number.isFinite(ls) ? ls * scale * sx : 0,
      singleLine: lineTexts.length === 1,
      lines,
      linePitchPx: lines ? lineH : 0,
      valign: lineTexts.length === 1 ? "middle" : "top",
      paragraph: {
        textIndentPx: 0,
        padLeftPx: 0,
        padRightPx: 0,
        spaceBeforePx: 0,
        spaceAfterPx: 0,
        whiteSpace: "pre",
        overflowWrap: "normal",
        hyphens: "manual",
        listMarker: null,
      },
    });
    nodes.push(svgText as unknown as HTMLElement);
    // Hide now: the diagram itself may be inlined as a picture before the
    // normal hide pass runs, and that picture must not carry the glyphs too.
    svgText.style.setProperty("fill", "transparent", "important");
    svgText.style.setProperty("stroke", "transparent", "important");
  }

  return { runs, nodes };
}

/**
 * Hide the measured runs without changing layout, so the raster plate keeps
 * every designed pixel except the glyphs the exporter will re-emit natively.
 */
export function hideTextRuns(nodes: HTMLElement[]): void {
  for (const el of nodes) {
    if (el instanceof SVGElement) {
      (el as SVGElement).style.setProperty("fill", "transparent", "important");
      (el as SVGElement).style.setProperty("stroke", "transparent", "important");
      continue;
    }
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    el.style.setProperty("text-shadow", "none", "important");
    el.style.setProperty("text-decoration-color", "transparent", "important");
    el.style.setProperty("caret-color", "transparent", "important");
  }
}
