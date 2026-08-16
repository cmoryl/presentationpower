// -----------------------------------------------------------------------------
// Native PPTX emission of free-canvas blocks
//
// The canvas editor (FreeCanvasEditor) and the read-only CanvasBlockLayer both
// paint blocks through CanvasBlockView, in stage units (1920x1080). This module
// re-emits those very same blocks as NATIVE PowerPoint objects so an exported
// slide matches the editor 1:1:
//
//   * geometry  — stage units mapped straight to inches, so snapped positions,
//                 sizes and margins land on the same coordinate
//   * z-order   — blocks are emitted in the editor's paint order (`sortBlocks`),
//                 and always after the module content, exactly like the DOM
//                 layer that sits at z-40 over the variant
//   * surfaces  — shape blocks go through the canonical glass recipe
//                 (`getGlassTreatment` via `withDesignSurfaces`), so a glass
//                 panel exports as a translucent multi-stop gradient with the
//                 hairline ring and elevation, not a flat slab
//   * type      — font size / weight / tracking / leading / alignment / colour
//                 are converted from the editor's CSS values, so the copy is
//                 editable in PowerPoint at the build's own metrics
// -----------------------------------------------------------------------------

import type PptxGenJS from "pptxgenjs";

import type { CanvasBlock } from "./deck-store";
import { blockFontSize, sortBlocks } from "@/components/slide/CanvasBlockView";
import { STAGE_H, STAGE_W } from "./canvas-snap";
import { SLIDE_H_IN, SLIDE_W_IN, pxToPt } from "./export-surface";
import { rectRadiusAdj } from "./export-radius";
import { aspectFrame, getImageAspect } from "./export-image-aspect";

import { roundPicTag, withDesignSurfaces } from "./pptx-shape-normalize";
import { mapFontFamily } from "./pptx-font-map";

const IN_PER_UNIT_X = SLIDE_W_IN / STAGE_W;
const IN_PER_UNIT_Y = SLIDE_H_IN / STAGE_H;

/** Editor CSS: heading leading 1.02, everything else 1.28 (CanvasBlockView). */
function lineHeightFor(b: CanvasBlock): number {
  return b.kind === "heading" ? 1.02 : 1.28;
}

/** Editor CSS: heading tracking -0.03em, everything else -0.005em. */
function trackingEmFor(b: CanvasBlock): number {
  return b.kind === "heading" ? -0.03 : -0.005;
}

export interface ParsedColor {
  /** 6-digit uppercase hex, no `#`. */
  hex: string;
  /** 0-1. */
  alpha: number;
}

/** Parse `#rgb`, `#rrggbb`, `rgb()`/`rgba()` → hex + alpha. */
export function parseCssColorToPptx(css: string | undefined | null): ParsedColor | null {
  if (!css) return null;
  const s = css.trim();
  const fn = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)/i);
  if (fn) {
    const to = (v: string) => Math.max(0, Math.min(255, Math.round(Number(v))));
    const hex = [to(fn[1]!), to(fn[2]!), to(fn[3]!)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    let alpha = 1;
    if (fn[4] !== undefined) {
      alpha = fn[4].endsWith("%") ? Number(fn[4].slice(0, -1)) / 100 : Number(fn[4]);
      if (!Number.isFinite(alpha)) alpha = 1;
    }
    return { hex, alpha: Math.max(0, Math.min(1, alpha)) };
  }
  const hex6 = s.match(/^#?([0-9a-f]{6})$/i);
  if (hex6) return { hex: hex6[1]!.toUpperCase(), alpha: 1 };
  const hex8 = s.match(/^#?([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (hex8) return { hex: hex8[1]!.toUpperCase(), alpha: parseInt(hex8[2]!, 16) / 255 };
  const hex3 = s.match(/^#?([0-9a-f]{3})$/i);
  if (hex3) {
    const [r, g, b] = hex3[1]!.split("");
    return { hex: `${r}${r}${g}${g}${b}${b}`.toUpperCase(), alpha: 1 };
  }
  return null;
}

export interface CanvasBlockFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Stage-unit rect → inches. Single source of truth for block placement. */
export function canvasBlockRectIn(b: CanvasBlock): CanvasBlockFrame {
  return {
    x: b.x * IN_PER_UNIT_X,
    y: b.y * IN_PER_UNIT_Y,
    w: Math.max(0.02, b.w * IN_PER_UNIT_X),
    h: Math.max(0.02, b.h * IN_PER_UNIT_Y),
  };
}

export interface CanvasTextPlacement {
  text: string;
  fontSize: number;
  fontFace: string;
  bold: boolean;
  color: string;
  transparency?: number;
  align: "left" | "center" | "right";
  charSpacing: number;
  lineSpacing: number;
}

/** The editor's CSS text style for a block, as native PPTX text properties. */
export function describeCanvasBlockText(
  b: CanvasBlock,
  inkHex: string,
): CanvasTextPlacement | null {
  if (!b.text || !b.text.trim()) return null;
  const px = blockFontSize(b);
  const fontSize = Math.round(pxToPt(px) * 10) / 10;
  const parsed = parseCssColorToPptx(b.color) ?? parseCssColorToPptx(inkHex) ?? { hex: "0B0B12", alpha: 1 };
  const weight = b.weight ?? (b.kind === "heading" ? 700 : 500);
  return {
    text: b.text,
    fontSize,
    fontFace: mapFontFamily(null),
    bold: weight >= 600,
    color: parsed.hex,
    transparency: parsed.alpha < 1 ? Math.round((1 - parsed.alpha) * 100) : undefined,
    align: b.align ?? "left",
    charSpacing: Math.round(trackingEmFor(b) * fontSize * 100) / 100,
    lineSpacing: Math.round(fontSize * lineHeightFor(b) * 10) / 10,
  };
}

export interface CanvasBlockExportTarget {
  addText: (text: string, opts: Record<string, unknown>) => unknown;
  addShape: (type: unknown, opts: Record<string, unknown>) => unknown;
  addImage: (opts: Record<string, unknown>) => unknown;
}

/**
 * Layers-panel export scope: blocks flagged `exportExcluded` stay on screen but
 * never reach the PPTX file. When at least one block is in scope we ship only
 * those, so "export: selection only" is honoured by every export path.
 */
export function canvasBlocksForExport(
  blocks: readonly CanvasBlock[] | undefined | null,
): CanvasBlock[] {
  if (!blocks || blocks.length === 0) return [];
  return blocks.filter((b) => !b.exportExcluded);
}

/**
 * Emit a slide's canvas blocks as native objects, in editor paint order, on top
 * of whatever the slide already carries (vector reconstruction, layered plate,
 * or design-exact plate). Returns the number of objects placed.
 *
 * Grouped blocks (layers panel → "group") are tagged so the OOXML
 * post-processor wraps them in a real <p:grpSp>: a grouped card arrives in
 * PowerPoint as one movable, resizable unit instead of loose shapes.
 */
export function placeCanvasBlocks(
  slide: PptxGenJS.Slide,
  blocks: readonly CanvasBlock[] | undefined | null,
  opts: { dark: boolean; accent?: string; inkHex: string },
): number {
  const scoped = canvasBlocksForExport(blocks);
  if (scoped.length === 0) return 0;
  // Route through the design-surface proxy so shape blocks get the same glass
  // gradient / hairline / elevation recipe the module cards use.
  const target = withDesignSurfaces(slide, {
    dark: opts.dark,
    accent: opts.accent,
  }) as unknown as CanvasBlockExportTarget;

  const groupIndex = new Map<string, number>();
  const nameFor = (b: CanvasBlock, base: string): string => {
    if (!b.groupId) return base;
    let n = groupIndex.get(b.groupId);
    if (n === undefined) {
      n = groupIndex.size + 1;
      groupIndex.set(b.groupId, n);
    }
    return `${groupTag(b.groupId, `TP Canvas group ${n}`)} ${base}`;
  };

  let placed = 0;
  sortBlocks(scoped).forEach((b, i) => {

    const r = canvasBlockRectIn(b);
    const opacity = b.opacity ?? 1;
    const frameTransparency = opacity < 1 ? Math.round((1 - opacity) * 100) : 0;

    if (b.kind === "shape") {
      const fill = parseCssColorToPptx(b.fill) ?? {
        hex: opts.dark ? "0A0830" : "FFFFFF",
        alpha: 0.16,
      };
      const stroke = parseCssColorToPptx(b.stroke);
      const radiusIn = Math.max(0, (b.radius ?? 28)) * IN_PER_UNIT_X;
      const combinedAlpha = fill.alpha * opacity;
      // Translucent neutral fills ARE the glass surface on screen; let the
      // canonical treatment own the gradient, ring and elevation.
      const wantsGlass = combinedAlpha < 0.9;
      target.addShape("roundRect", {
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        rectRadius: Math.min(radiusIn, Math.min(r.w, r.h) / 2),
        fill: { color: fill.hex, transparency: Math.round((1 - combinedAlpha) * 100) },
        line: stroke
          ? {
              color: stroke.hex,
              width: pxToPt(2),
              transparency: Math.round((1 - stroke.alpha * opacity) * 100),
            }
          : undefined,
        glass: wantsGlass,
        flat: !wantsGlass,
        objectName: `TP Canvas shape ${i + 1}`,
      });
      placed += 1;
      return;
    }

    if (b.kind === "image") {
      if (!b.src) return;
      const radiusIn = Math.max(0, b.radius ?? 24) * IN_PER_UNIT_X;
      const adj = Math.min(rectRadiusAdj(Math.min(radiusIn, Math.min(r.w, r.h) / 2), r.w, r.h), 50000);
      const isData = b.src.startsWith("data:");
      // Exact-ratio contract: a measured logo is placed at its own aspect
      // instead of being stretched into the block frame.
      const f = aspectFrame(getImageAspect(b.src), b.fit ?? "cover", r.x, r.y, r.w, r.h);
      target.addImage({
        ...(isData ? { data: b.src } : { path: b.src }),
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
        // `cover` crops to the frame; `contain` letterboxes — matching objectFit.
        sizing: f.exact
          ? undefined
          : {
              type: (b.fit ?? "cover") === "contain" ? "contain" : "cover",
              w: f.w,
              h: f.h,
            },
        transparency: frameTransparency || undefined,
        altText: b.alt || undefined,
        rounded: adj > 0,
        objectName: adj > 0 ? `${roundPicTag(adj)} TP Canvas image ${i + 1}` : `TP Canvas image ${i + 1}`,
      });
      placed += 1;
      return;
    }


    const t = describeCanvasBlockText(b, opts.inkHex);
    if (!t) return;
    const textTransparency =
      t.transparency !== undefined || frameTransparency
        ? Math.min(100, (t.transparency ?? 0) + frameTransparency)
        : undefined;
    target.addText(t.text, {
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      fontSize: t.fontSize,
      fontFace: t.fontFace,
      bold: t.bold,
      color: t.color,
      transparency: textTransparency,
      align: t.align,
      valign: "top",
      charSpacing: t.charSpacing,
      lineSpacing: t.lineSpacing,
      margin: 0,
      inset: 0,
      wrap: true,
      shrinkText: false,
      isTextBox: true,
      objectName: `TP Canvas ${b.kind} ${i + 1}`,
    });
    placed += 1;
  });
  return placed;
}
