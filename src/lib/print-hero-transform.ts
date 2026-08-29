/**
 * Shared hero image transform + adjustment model for print templates.
 *
 * Every print hero (page masthead `content.heroMedia` and the reusable hero
 * *section* family) now carries the same photo-editor controls: zoom, pan,
 * straighten/rotate, flip, and non-destructive tone adjustments. The values are
 * stored on the document, so the same crop renders identically in the editor,
 * the preview, and PDF/PPTX export.
 *
 * Nothing here is destructive — we never re-encode the source photo. Zoom/pan
 * map onto CSS `transform` (with the focal point as the transform origin so
 * zooming pushes into the subject, exactly like a crop tool), and the tone
 * controls map onto CSS `filter`. Both are captured faithfully by the
 * html2canvas-based export pipeline.
 */
import type { CSSProperties } from "react";

export type PrintHeroAdjust = {
  /** 1 = fit the frame, up to 4x punch-in. Anchored on the focal point. */
  zoom?: number;
  /** Fine pan in % of frame size, applied after the focal point. */
  offsetX?: number;
  offsetY?: number;
  /** Straighten / rotate, -180..180 degrees. */
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  /** Tone: 1 = untouched. */
  brightness?: number; // 0..2
  contrast?: number; // 0..2
  saturation?: number; // 0..2
  /** 0..1 mixes. */
  grayscale?: number;
  sepia?: number;
  /** Softening in px at page scale. */
  blurPx?: number;
};

export const HERO_ADJUST_DEFAULTS: Required<
  Pick<
    PrintHeroAdjust,
    | "zoom"
    | "offsetX"
    | "offsetY"
    | "rotate"
    | "brightness"
    | "contrast"
    | "saturation"
    | "grayscale"
    | "sepia"
    | "blurPx"
  >
> = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  grayscale: 0,
  sepia: 0,
  blurPx: 0,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const HERO_ZOOM_MIN = 1;
export const HERO_ZOOM_MAX = 4;

/** Normalised, clamped adjustment values with defaults filled in. */
export function resolveHeroAdjust(a: PrintHeroAdjust | undefined) {
  const d = HERO_ADJUST_DEFAULTS;
  return {
    zoom: clamp(num(a?.zoom, d.zoom), HERO_ZOOM_MIN, HERO_ZOOM_MAX),
    offsetX: clamp(num(a?.offsetX, d.offsetX), -50, 50),
    offsetY: clamp(num(a?.offsetY, d.offsetY), -50, 50),
    rotate: clamp(num(a?.rotate, d.rotate), -180, 180),
    flipX: a?.flipX === true,
    flipY: a?.flipY === true,
    brightness: clamp(num(a?.brightness, d.brightness), 0, 2),
    contrast: clamp(num(a?.contrast, d.contrast), 0, 2),
    saturation: clamp(num(a?.saturation, d.saturation), 0, 2),
    grayscale: clamp(num(a?.grayscale, d.grayscale), 0, 1),
    sepia: clamp(num(a?.sepia, d.sepia), 0, 1),
    blurPx: clamp(num(a?.blurPx, d.blurPx), 0, 24),
  };
}

function num(v: unknown, fallback: number) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** True when the user has left every control at its default. */
export function isHeroAdjustDefault(a: PrintHeroAdjust | undefined): boolean {
  const r = resolveHeroAdjust(a);
  const d = HERO_ADJUST_DEFAULTS;
  return (
    r.zoom === d.zoom &&
    r.offsetX === d.offsetX &&
    r.offsetY === d.offsetY &&
    r.rotate === d.rotate &&
    !r.flipX &&
    !r.flipY &&
    r.brightness === d.brightness &&
    r.contrast === d.contrast &&
    r.saturation === d.saturation &&
    r.grayscale === d.grayscale &&
    r.sepia === d.sepia &&
    r.blurPx === d.blurPx
  );
}

/** CSS `filter` string for the tone controls, or undefined when untouched. */
export function heroFilterCss(a: PrintHeroAdjust | undefined): string | undefined {
  const r = resolveHeroAdjust(a);
  const parts: string[] = [];
  if (r.brightness !== 1) parts.push(`brightness(${round(r.brightness)})`);
  if (r.contrast !== 1) parts.push(`contrast(${round(r.contrast)})`);
  if (r.saturation !== 1) parts.push(`saturate(${round(r.saturation)})`);
  if (r.grayscale > 0) parts.push(`grayscale(${round(r.grayscale)})`);
  if (r.sepia > 0) parts.push(`sepia(${round(r.sepia)})`);
  if (r.blurPx > 0) parts.push(`blur(${round(r.blurPx)}px)`);
  return parts.length ? parts.join(" ") : undefined;
}

/** CSS `transform` string for zoom / pan / rotate / flip, or undefined. */
export function heroTransformCss(a: PrintHeroAdjust | undefined): string | undefined {
  const r = resolveHeroAdjust(a);
  const parts: string[] = [];
  if (r.offsetX !== 0 || r.offsetY !== 0)
    parts.push(`translate(${round(r.offsetX)}%, ${round(r.offsetY)}%)`);
  if (r.rotate !== 0) parts.push(`rotate(${round(r.rotate)}deg)`);
  if (r.zoom !== 1) parts.push(`scale(${round(r.zoom)})`);
  if (r.flipX || r.flipY) parts.push(`scale(${r.flipX ? -1 : 1}, ${r.flipY ? -1 : 1})`);
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * Full style patch for a cover-fitted hero image.
 *
 * `focal` is the object-position the layout already solved (focal point / auto
 * crop). We reuse it as the transform origin so zoom punches into the subject
 * rather than the geometric centre.
 *
 * A rotated crop needs extra image to cover the corners, so we quietly grow the
 * base scale — otherwise straightening a photo exposes the page behind it.
 */
export function heroImageStyle(
  a: PrintHeroAdjust | undefined,
  focal: string | undefined,
): CSSProperties {
  const r = resolveHeroAdjust(a);
  const rad = (Math.abs(r.rotate) * Math.PI) / 180;
  const coverBoost = r.rotate !== 0 ? Math.cos(rad) + Math.sin(rad) : 1;
  const zoom = r.zoom * coverBoost;
  const transform = heroTransformCss({ ...a, zoom });
  const filter = heroFilterCss(a);
  const style: CSSProperties = {};
  if (transform) {
    style.transform = transform;
    style.transformOrigin = focal ?? "50% 50%";
    // Keep the transformed layer on its own compositing surface so the band's
    // mask and scrims still clip it cleanly.
    style.willChange = "transform";
  }
  if (filter) style.filter = filter;
  return style;
}

function round(v: number) {
  return Math.round(v * 1000) / 1000;
}

/**
 * Wheel/trackpad delta → new zoom. Scales by delta magnitude (never a fixed
 * factor per event) and normalises `deltaMode`, so one trackpad flick doesn't
 * slam the crop to maximum zoom.
 */
export function zoomFromWheel(zoom: number, event: WheelEvent): number {
  const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
  return clamp(zoom * Math.exp(-dy * 0.0016), HERO_ZOOM_MIN, HERO_ZOOM_MAX);
}
