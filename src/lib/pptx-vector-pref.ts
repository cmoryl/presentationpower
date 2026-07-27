// Runtime preference for SVG-first (vector) PPTX export.
// When true, `fetchAsDataUrl` in pptx-export skips SVG rasterization and
// hands the raw SVG data URI to pptxgenjs — PowerPoint 2019+/M365 render
// crisp vectors, and files are dramatically smaller for icon/map/logo-
// heavy decks. Set to false for older PowerPoint or Google Slides users
// where SVG imports are flattened unpredictably.
//
// Aurora backdrops always rasterize (Gaussian blur + feColorMatrix render
// inconsistently across viewers). Data-viz charts remain native OOXML.

const KEY = "pptx.preferVector.v1";
const DEFAULT = true;

export function getPreferVector(): boolean {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export function setPreferVector(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, v ? "true" : "false");
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("pptx:prefer-vector", { detail: v }));
  } catch {
    /* ignore */
  }
}

export const PREFER_VECTOR_EVENT = "pptx:prefer-vector";
