/**
 * Mean luminance of a slide ground where the logo sits, so the exporter picks
 * the colour lockup over a PALE photo and the white lockup only over a dark one.
 * Browser-only (canvas); returns false (keep current choice) when unavailable.
 */
const cache = new Map<string, Promise<boolean>>();

export function isLightLuma(r: number, g: number, b: number): boolean {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.45;
}

export function groundIsLightAt(dataUrl: string, position: string): Promise<boolean> {
  const key = `${position}|${dataUrl.length}|${dataUrl.slice(-64)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = new Promise<boolean>((resolve) => {
    if (typeof document === "undefined") return resolve(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = 96;
        const H = 54;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, W, H);
        const top = position.startsWith("bottom") ? H - 12 : 0;
        const left = position.endsWith("right") ? W - 30 : position.endsWith("center") ? 33 : 0;
        const d = ctx.getImageData(left, top, 30, 12).data;
        let r = 0;
        let g = 0;
        let b = 0;
        const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]!;
          g += d[i + 1]!;
          b += d[i + 2]!;
        }
        resolve(isLightLuma(r / n, g / n, b / n));
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl.startsWith("data:") || dataUrl.startsWith("http") ? dataUrl : `data:${dataUrl}`;
  });
  cache.set(key, p);
  return p;
}
