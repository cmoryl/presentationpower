// -----------------------------------------------------------------------------
// Export text layer
//
// The old "layered" export rebuilt every module out of hand-written OOXML
// shapes. That could only ever approximate the design system, and in practice
// exports looked nothing like the build (missing tiles, imagery, icons, wrong
// grid).
//
// This module takes the opposite approach, and it is exact by construction:
//   1. Mount the REAL renderer offscreen at 1920×1080 (ExactSlideStage).
//   2. Measure every visible run of text in the DOM — position, size, font,
//      colour, spacing, alignment.
//   3. Make that text invisible (without touching layout) and rasterize the
//      slide. The plate therefore carries every designed pixel EXCEPT glyphs:
//      gradients, glass tiles, photographs, icons, rules, motifs, the lockup.
//   4. Emit the measured runs as native PowerPoint text boxes over the plate.
//
// Result: the PPTX is pixel-identical to the build and every word is still
// editable in PowerPoint.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";

export interface TextRun {
  /** Content-box geometry in stage pixels (1920×1080 space). */
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  /** Rendered pixel font size at stage scale. */
  fontSizePx: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** rrggbb, no leading #. */
  color: string;
  align: "left" | "center" | "right" | "justify";
  /** Rendered line height in pixels (0 when normal/unknown). */
  lineHeightPx: number;
  letterSpacingPx: number;
  /** Single visual line (no wrapping needed in PowerPoint). */
  singleLine: boolean;
  /** Vertical placement inside the box. */
  valign: "top" | "middle";
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "svg", "SVG"]);

function toHex(color: string): string | null {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  if (!Number.isFinite(r) || a < 0.06) return null;
  const hx = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
  return `${hx(r)}${hx(g)}${hx(b)}`;
}

function firstFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first || "Geist";
}

function applyTransform(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize")
    return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
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

function directText(el: Element): string {
  let out = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
  });
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Measure every visible text run inside a settled export stage.
 * Runs are returned in DOM order (paint order), in stage pixel space.
 */
export function extractTextRuns(stage: HTMLElement): { runs: TextRun[]; nodes: HTMLElement[] } {
  const stageRect = stage.getBoundingClientRect();
  // The stage may be rendered at a scale ≠ 1 in some hosts; normalise to the
  // canonical 1920×1080 space so px→inch conversion is one constant.
  const sx = stageRect.width ? STAGE_W / stageRect.width : 1;
  const sy = stageRect.height ? STAGE_H / stageRect.height : 1;

  const runs: TextRun[] = [];
  const nodes: HTMLElement[] = [];

  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;
  while (node) {
    const el = node;
    node = walker.nextNode() as HTMLElement | null;
    if (!(el instanceof HTMLElement)) continue;
    if (SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest("svg")) continue;

    const text = directText(el);
    if (!text) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity || "1") < 0.08) continue;
    // Painted / clipped glyph tricks and rotated copy stay in the raster so
    // the plate keeps the exact look; they just are not editable.
    if (isPaintedText(cs) || isRotatedOrSkewed(cs)) continue;

    const color = toHex(cs.color);
    if (!color) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;

    const x = (rect.left - stageRect.left + padL) * sx;
    const y = (rect.top - stageRect.top + padT) * sy;
    const w = Math.max(4, (rect.width - padL - padR) * sx);
    const h = Math.max(4, (rect.height - padT - padB) * sy);
    if (x > STAGE_W || y > STAGE_H) continue;

    const fontSizePx = (parseFloat(cs.fontSize) || 16) * sy;
    const lhRaw = parseFloat(cs.lineHeight);
    const lineHeightPx = Number.isFinite(lhRaw) ? lhRaw * sy : 0;
    const lsRaw = parseFloat(cs.letterSpacing);
    const letterSpacingPx = Number.isFinite(lsRaw) ? lsRaw * sx : 0;
    const weight = parseInt(cs.fontWeight, 10);
    const alignRaw = cs.textAlign;
    const align: TextRun["align"] =
      alignRaw === "center"
        ? "center"
        : alignRaw === "right" || alignRaw === "end"
          ? "right"
          : alignRaw === "justify"
            ? "justify"
            : "left";
    const singleLine = lineHeightPx > 0 ? h <= lineHeightPx * 1.6 : h <= fontSizePx * 2;

    runs.push({
      x,
      y,
      w,
      h,
      text: applyTransform(text, cs.textTransform),
      fontSizePx,
      fontFamily: firstFamily(cs.fontFamily),
      bold: Number.isFinite(weight) ? weight >= 600 : /bold/i.test(cs.fontWeight),
      italic: cs.fontStyle === "italic",
      underline: cs.textDecorationLine?.includes("underline") ?? false,
      color,
      align,
      lineHeightPx,
      letterSpacingPx,
      singleLine,
      valign: singleLine ? "middle" : "top",
    });
    nodes.push(el);
  }

  return { runs, nodes };
}

/**
 * Hide the measured runs without changing layout, so the raster plate keeps
 * every designed pixel except the glyphs the exporter will re-emit natively.
 */
export function hideTextRuns(nodes: HTMLElement[]): void {
  for (const el of nodes) {
    el.style.setProperty("color", "transparent", "important");
    el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    el.style.setProperty("text-shadow", "none", "important");
    el.style.setProperty("text-decoration-color", "transparent", "important");
    el.style.setProperty("caret-color", "transparent", "important");
  }
}
