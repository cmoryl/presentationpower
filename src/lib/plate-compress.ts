/**
 * Re-encode a full-bleed design plate as JPEG when it is fully opaque.
 *
 * Plates are the slide's wash + glass + glow artwork. Soft gradients compress
 * ~8–15× better as high-quality JPEG than PNG with no visible change, and an
 * opaque plate loses nothing by dropping the alpha channel. Any plate with a
 * transparent pixel stays PNG (it is an overlay, not a ground).
 */
export async function compressOpaquePlate(dataUrl: string, quality = 0.9): Promise<string> {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:image/png")) return dataUrl;
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let p = 3; p < data.length; p += 4) {
      if (data[p] < 255) return dataUrl;
    }
    const jpeg = canvas.toDataURL("image/jpeg", quality);
    return jpeg.length < dataUrl.length ? jpeg : dataUrl;
  } catch {
    return dataUrl;
  }
}
