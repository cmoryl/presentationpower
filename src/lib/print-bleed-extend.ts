// -----------------------------------------------------------------------------
// Bleed extension for print rasters.
//
// THE BUG THIS FIXES
// ------------------
// The print PDF export used to compute `pageWidth = trim + 2×bleed` and then
// place the trim-authored capture across the WHOLE page:
//
//     pdf.addImage(png, "PNG", 0, 0, pageWidth, pageHeight)
//
// That scales the entire design up by (trim + 2×bleed) / trim — ~3% at 0.125in
// on Letter. The TrimBox written by the X-4 wrapper is numerically correct, so
// the file passes inspection, but every element has drifted outward and the
// outer ~1.5% per edge is cut off at trim. A printer would accept the file and
// deliver the wrong thing. Silent, physical, unrecoverable after the press run.
//
// THE FIX
// -------
// Capture at exact TRIM pixel size, place it at (bleed, bleed) at exact trim
// dimensions — so nothing scales and nothing drifts — then fill the bleed band
// by extending the outermost pixels of the raster outward (edge clamp): four
// edge strips stretched perpendicular to their edge, four corner blocks from
// the corner pixels.
//
// Edge clamp is not a substitute for artwork authored past trim. It is exact
// for the common case (a full-bleed background whose colour/gradient is
// continuous at the trim edge) and visibly smeared where a hard detail runs off
// the edge. `bleedIsApproximate` flags that so callers can warn. Real bleed
// requires the authoring canvas itself to become trim + bleed, which is a
// change to the layout model, not to this file.
// -----------------------------------------------------------------------------

export interface BleedExtendResult {
  /** Data URL covering trim + 2×bleed, content unscaled at trim position. */
  dataUrl: string;
  /** Page width in px of the returned raster. */
  widthPx: number;
  heightPx: number;
  /** Bleed band width in px on each side. */
  bleedPx: number;
  /**
   * True whenever bleedPx > 0 — the bleed band is edge-clamped, not authored.
   * Exact for continuous backgrounds, approximate for hard detail at the edge.
   */
  bleedIsApproximate: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("print-bleed-extend: raster failed to decode."));
    img.src = src;
  });
}

/**
 * Place a trim-sized raster on a trim + 2×bleed canvas without scaling it, and
 * fill the bleed band by clamping the edge pixels outward.
 *
 * `bleedPx` of 0 returns the input untouched (no canvas round-trip, no
 * re-encode, so digital/no-bleed exports keep byte-identical rasters).
 */
export async function extendRasterForBleed(
  trimDataUrl: string,
  opts: { bleedPx: number; mime?: "image/png" | "image/jpeg"; quality?: number },
): Promise<BleedExtendResult> {
  const bleedPx = Math.max(0, Math.round(opts.bleedPx));
  const img = await loadImage(trimDataUrl);
  const tw = img.naturalWidth;
  const th = img.naturalHeight;

  if (bleedPx === 0) {
    return {
      dataUrl: trimDataUrl,
      widthPx: tw,
      heightPx: th,
      bleedPx: 0,
      bleedIsApproximate: false,
    };
  }

  const pw = tw + bleedPx * 2;
  const ph = th + bleedPx * 2;
  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("print-bleed-extend: 2D context unavailable.");
  ctx.imageSmoothingEnabled = false;

  // Sample depth for the clamp. A single pixel row can carry canvas
  // antialiasing at the very edge, so pull from a couple of pixels in and
  // stretch that — steadier colour, same geometry.
  const s = Math.min(2, Math.max(1, Math.floor(Math.min(tw, th) / 4)));

  // Edges: source strip (s px deep, just inside trim) → bleed band.
  // Top
  ctx.drawImage(img, 0, 0, tw, s, bleedPx, 0, tw, bleedPx);
  // Bottom
  ctx.drawImage(img, 0, th - s, tw, s, bleedPx, ph - bleedPx, tw, bleedPx);
  // Left
  ctx.drawImage(img, 0, 0, s, th, 0, bleedPx, bleedPx, th);
  // Right
  ctx.drawImage(img, tw - s, 0, s, th, pw - bleedPx, bleedPx, bleedPx, th);
  // Corners, from the corresponding corner block.
  ctx.drawImage(img, 0, 0, s, s, 0, 0, bleedPx, bleedPx);
  ctx.drawImage(img, tw - s, 0, s, s, pw - bleedPx, 0, bleedPx, bleedPx);
  ctx.drawImage(img, 0, th - s, s, s, 0, ph - bleedPx, bleedPx, bleedPx);
  ctx.drawImage(img, tw - s, th - s, s, s, pw - bleedPx, ph - bleedPx, bleedPx, bleedPx);

  // The design itself, 1:1 at the trim position. Drawn last so the clamp can
  // never bleed back over live content.
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, bleedPx, bleedPx, tw, th);

  const mime = opts.mime ?? "image/png";
  const dataUrl =
    mime === "image/jpeg" ? canvas.toDataURL(mime, opts.quality ?? 0.92) : canvas.toDataURL(mime);

  return { dataUrl, widthPx: pw, heightPx: ph, bleedPx, bleedIsApproximate: true };
}
