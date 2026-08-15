// -----------------------------------------------------------------------------
// Shared intrinsic-aspect registry for exported imagery
//
// PowerPoint stretches a picture to whatever extent the file gives it, and
// pptxgenjs' `sizing: { type: "contain" }` only works when it can read the
// source's intrinsic size — which it cannot for base64 data URLs. Client logos
// therefore arrived squashed/stretched to their placeholder box.
//
// Every export path measures its imagery once through this registry and then
// computes an exact aspect-correct frame, so a given logo always lands at its
// own native ratio.
// -----------------------------------------------------------------------------

const aspects = new Map<string, number>();

/** Cached intrinsic ratio (w / h), or undefined when never measured. */
export function getImageAspect(src: string | null | undefined): number | undefined {
  if (!src) return undefined;
  const r = aspects.get(src);
  return r && Number.isFinite(r) && r > 0 ? r : undefined;
}

export function setImageAspect(src: string, w: number, h: number): void {
  if (w > 0 && h > 0) aspects.set(src, w / h);
}

/** Decode an image once (browser only) and cache its intrinsic ratio. */
export async function measureImageAspect(src: string | null | undefined): Promise<void> {
  if (!src || typeof document === "undefined" || aspects.has(src)) return;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = src;
    });
    setImageAspect(src, img.naturalWidth || img.width, img.naturalHeight || img.height);
  } catch {
    /* leave unmeasured — callers fall back to the box */
  }
}

/**
 * Aspect-correct rectangle for a picture inside a box.
 *
 * `contain` centers the artwork at its native ratio (logos, wordmarks);
 * `cover`/`fill` keep the box, which is what a full-bleed crop expects.
 * `exact` is true when the returned geometry already honours the ratio, so no
 * pptxgenjs `sizing` hint should be emitted alongside it.
 */
export function aspectFrame(
  ratio: number | undefined,
  fit: "cover" | "contain" | "fill" | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number; exact: boolean } {
  if (fit !== "contain" || !ratio || !Number.isFinite(ratio) || ratio <= 0 || w <= 0 || h <= 0) {
    return { x, y, w, h, exact: false };
  }
  const boxRatio = w / h;
  let fw = w;
  let fh = h;
  if (ratio > boxRatio) fh = w / ratio;
  else fw = h * ratio;
  return { x: x + (w - fw) / 2, y: y + (h - fh) / 2, w: fw, h: fh, exact: true };
}
