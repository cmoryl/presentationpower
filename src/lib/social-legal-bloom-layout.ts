// Layout model for the Legal "bloom" ads.
//
// Every ad is described by two rectangles — the picture frame and the copy
// block — held as fractions of the trim, plus the two type sizes. The automatic
// layout below reproduces the composed look for each scene and trim; the board
// lets a person take that as a starting point and move or resize the pieces per
// ad AND per size, which is what the saved overrides carry.

import {
  bloomFrameAspect,
  bloomHeadline,
  bloomOptical,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";

/** A rectangle in fractions of the trim: x/w against width, y/h against height. */
export type BloomBox = { x: number; y: number; w: number; h: number };

export type BloomAdLayout = {
  picture: BloomBox;
  copy: BloomBox;
  /** Headline size as a fraction of the trim's short edge. */
  headPx: number;
  /** Supporting line size as a fraction of the trim's short edge. */
  supportPx: number;
  /** Lockup height as a fraction of the short edge, plus its corner offsets. */
  lockup: { x: number; y: number; h: number };
};

export type BloomMode = "beside" | "stacked" | "strip";

export function bloomMode(w: number, h: number): BloomMode {
  const ratio = w / h;
  return ratio >= 2.4 ? "strip" : ratio < 0.95 ? "stacked" : "beside";
}

/** The composed layout for a scene at a trim — the editor's starting point. */
export function bloomAutoLayout(
  scene: BloomScene,
  w: number,
  h: number,
  cut: BloomAperture,
  copySide: BloomSide,
): BloomAdLayout {
  void cut;
  const short = Math.min(w, h);
  const mode = bloomMode(w, h);
  const margin = short * (mode === "strip" ? 0.06 : 0.05);
  const gap = short * (mode === "stacked" ? 0.05 : 0.03);
  const inner = { x: margin, y: margin, w: w - margin * 2, h: h - margin * 2 };

  const frameAspect = bloomFrameAspect(scene.frame);
  const flex =
    mode === "stacked"
      ? 1
      : mode === "strip"
        ? frameAspect > 1.2
          ? 0.6
          : 0.52
        : frameAspect > 1.2
          ? 0.66
          : frameAspect < 0.9
            ? 0.54
            : 0.6;

  const optical = bloomOptical(bloomHeadline(scene).length);
  const colW = mode === "stacked" ? inner.w : inner.w * (1 - flex) - gap;
  const baseHead =
    mode === "strip" ? short * 0.155 : mode === "stacked" ? short * 0.105 : short * 0.098;
  const headPx = Math.min(baseHead * optical, colW * (mode === "stacked" ? 0.115 : 0.155));
  const supportPx = Math.max(10, Math.min(headPx * 0.3, short * 0.028));

  // The picture is fitted to the photograph's own aspect inside the space it
  // has, pulled towards that space so it fills the column rather than shrinking.
  const availW = mode === "stacked" ? inner.w : inner.w * flex * 0.99;
  const availH = inner.h * (mode === "stacked" ? 0.72 : mode === "strip" ? 1 : 0.98);
  const spaceAspect = availW / availH;
  const fitAspect = Math.min(Math.max(frameAspect, spaceAspect * 0.72), spaceAspect * 1.7);
  let boxW = availW;
  let boxH = boxW / fitAspect;
  if (boxH > availH) {
    boxH = availH;
    boxW = Math.min(availW, boxH * fitAspect);
  }

  let picture: BloomBox;
  let copy: BloomBox;

  if (mode === "stacked") {
    const copyH = inner.h - boxH - gap;
    copy = { x: inner.x / w, y: inner.y / h, w: inner.w / w, h: Math.max(copyH, inner.h * 0.2) / h };
    picture = {
      x: (inner.x + (inner.w - boxW) / 2) / w,
      y: (inner.y + Math.max(copyH, inner.h * 0.2) + gap) / h,
      w: boxW / w,
      h: boxH / h,
    };
  } else {
    const colPicW = inner.w * flex;
    const colPicX = copySide === "left" ? inner.x + inner.w - colPicW : inner.x;
    const colCopyX = copySide === "left" ? inner.x : inner.x + colPicW + gap;
    picture = {
      x: (colPicX + (colPicW - boxW) / 2) / w,
      y: (inner.y + (inner.h - boxH) / 2) / h,
      w: boxW / w,
      h: boxH / h,
    };
    copy = {
      x: colCopyX / w,
      y: inner.y / h,
      w: (inner.w - colPicW - gap) / w,
      h: inner.h / h,
    };
  }

  return {
    picture,
    copy,
    headPx: headPx / short,
    supportPx: supportPx / short,
    // the single-line lockup is wide (about 12:1), so it is set small.
    lockup: { x: (margin * 0.9) / w, y: (margin * 0.6) / h, h: Math.max(9, short * 0.018) / short },
  };
}

export function bloomLayoutKey(sceneId: string, sizeId: string) {
  return `${sceneId}|${sizeId}`;
}

export const BLOOM_LAYOUT_STORE = "tp-legal-bloom-layouts-v1";

export type BloomLayoutMap = Record<string, BloomAdLayout>;

export function readBloomLayouts(): BloomLayoutMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BLOOM_LAYOUT_STORE);
    return raw ? (JSON.parse(raw) as BloomLayoutMap) : {};
  } catch {
    return {};
  }
}

export function writeBloomLayouts(map: BloomLayoutMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOOM_LAYOUT_STORE, JSON.stringify(map));
  } catch {
    /* a full or blocked store just means the move is not remembered */
  }
}

/** Keeps a box inside the trim and never smaller than a readable sliver. */
export function clampBox(box: BloomBox): BloomBox {
  const w = Math.min(Math.max(box.w, 0.06), 1.4);
  const h = Math.min(Math.max(box.h, 0.06), 1.4);
  return {
    w,
    h,
    x: Math.min(Math.max(box.x, -0.3), 1 - 0.04),
    y: Math.min(Math.max(box.y, -0.3), 1 - 0.04),
  };
}
