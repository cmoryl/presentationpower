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
  /** 0-100 PowerPoint transparency derived from the CSS colour alpha. */
  transparency: number;
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

let probeCtx: CanvasRenderingContext2D | null | undefined;

/** Resolve ANY CSS colour (rgb, oklab, oklch, color-mix, lab…) to rgba. */
function resolveColor(color: string): { hex: string; alpha: number } | null {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map((p) => parseFloat(p));
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
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
  return `${hx(r)}${hx(g)}${hx(b)}`;
}

/**
 * PowerPoint resolves a single family name, and it will never have the web
 * font's internal name ("Geist Variable"), so normalise to the installed
 * brand family the rest of the exporter already uses.
 */
function firstFamily(stack: string): string {
  const first = (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
  if (!first) return "Geist";
  const cleaned = first.replace(/\s*(Variable|VF)$/i, "").trim();
  if (/^(ui-|system-ui|-apple-system|BlinkMacSystemFont)/i.test(cleaned)) return "Geist";
  if (/geist/i.test(cleaned)) return /mono/i.test(cleaned) ? "Geist Mono" : "Geist";
  return cleaned || "Geist";
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

    const paint = resolveColor(cs.color);
    if (!paint || paint.alpha < 0.06) continue;
    const color = paint.hex;

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
      transparency: Math.round((1 - paint.alpha) * 100),
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
