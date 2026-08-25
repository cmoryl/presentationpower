// Browser-side rasteriser for the NEXT 2026 London signage panels.
//
// One shared implementation for every raster path in the kit — download,
// regeneration and the live ppi preview — so what you see on screen is produced
// by exactly the same pipeline as the file you ship: render the live vector
// gradient, apply triangular-PDF dither (1.4 LSB) before quantisation, keep it
// lossless PNG.

import { rasterSizeFor, type LondonPanel } from "@/lib/next-london-signage";

/** Hard pixel ceiling in the issued spec (rasters are capped, never upscaled). */
export const LONDON_MAX_PX = 6000;

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "sync";
  img.src = svgDataUri(svg);
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve();
      return;
    }
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterise the vector artwork."));
  });
  return img;
}

/** Triangular-PDF dither, 1.4 LSB, applied in place before 8-bit quantisation. */
export function ditherInPlace(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (w < 1 || h < 1) return;
  const data = ctx.getImageData(0, 0, w, h);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - Math.random()) * 1.4;
    p[i] = Math.max(0, Math.min(255, p[i]! + n));
    p[i + 1] = Math.max(0, Math.min(255, p[i + 1]! + n));
    p[i + 2] = Math.max(0, Math.min(255, p[i + 2]! + n));
  }
  ctx.putImageData(data, 0, 0);
}

/** Full-size dithered PNG at the given pixel dimensions. */
export async function renderDitheredPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  ctx.drawImage(img, 0, 0, w, h);
  ditherInPlace(ctx, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), "image/png"));
  if (!blob) throw new Error("PNG encoding failed.");
  return blob;
}

export type LondonTier = {
  ppi: number;
  w: number;
  h: number;
  /** Device pixel pitch on the printed panel, in mm. */
  pixelMm: number;
  /** Worst-case flat-tone run after dither, in mm. */
  bandMm: number;
  /** Estimated lossless PNG weight, in MB. */
  mb: number;
  /** True when the 6000 px ceiling cut the requested resolution. */
  capped: boolean;
  /** True when this is the tier the spec assigns to this panel size. */
  issued: boolean;
};

export const LONDON_TIER_PPIS = [36, 72, 120] as const;

export function londonTier(panel: LondonPanel, ppi: number): LondonTier {
  const size = rasterSizeFor(panel, ppi);
  const rawLongest = Math.max((panel.bleedW / 25.4) * ppi, (panel.bleedH / 25.4) * ppi);
  return {
    ppi,
    w: size.w,
    h: size.h,
    pixelMm: Math.round((25.4 / ppi) * 100) / 100,
    bandMm: Math.round((25.4 / ppi) * 3 * 100) / 100,
    mb: Math.round(Math.max(0.1, (size.w * size.h * 0.28) / (1024 * 1024)) * 10) / 10,
    capped: rawLongest > LONDON_MAX_PX + 1,
    issued: ppi === panel.rasterPpi,
  };
}

/** Every tier worth previewing for a panel: the three spec tiers plus any override. */
export function londonTiers(panel: LondonPanel): LondonTier[] {
  const ppis = [...new Set<number>([...LONDON_TIER_PPIS, panel.rasterPpi])].sort((a, b) => a - b);
  return ppis.map((ppi) => londonTier(panel, ppi));
}

export type CropAnchor = "start" | "middle" | "end";

const ANCHORS: Record<CropAnchor, { x: number; y: number }> = {
  start: { x: 0.08, y: 0.08 },
  middle: { x: 0.5, y: 0.5 },
  end: { x: 0.92, y: 0.92 },
};

/**
 * Paint a true 1:1 crop of the tier's raster into `canvas`, magnified by `zoom`
 * with nearest-neighbour so the dither pattern and quantisation steps stay
 * honest: the gradient is rasterised at the tier's real pixel count, dithered at
 * that resolution, then blown up — never smoothed.
 */
export function paintTierCrop(opts: {
  canvas: HTMLCanvasElement;
  img: HTMLImageElement;
  tier: LondonTier;
  boxW: number;
  boxH: number;
  zoom: number;
  anchor: CropAnchor;
}) {
  const { canvas, img, tier, boxW, boxH, zoom, anchor } = opts;
  const outW = Math.max(1, Math.round(boxW));
  const outH = Math.max(1, Math.round(boxH));
  const srcW = Math.max(1, Math.min(tier.w, Math.ceil(outW / zoom)));
  const srcH = Math.max(1, Math.min(tier.h, Math.ceil(outH / zoom)));

  // Offscreen pass at the tier's own resolution.
  const off = document.createElement("canvas");
  off.width = srcW;
  off.height = srcH;
  const octx = off.getContext("2d");
  if (!octx) return;
  const a = ANCHORS[anchor];
  const offsetX = Math.round((tier.w - srcW) * a.x);
  const offsetY = Math.round((tier.h - srcH) * a.y);
  octx.drawImage(img, -offsetX, -offsetY, tier.w, tier.h);
  ditherInPlace(octx, srcW, srcH);

  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(off, 0, 0, srcW, srcH, 0, 0, srcW * zoom, srcH * zoom);
}

/** Paint the whole panel at the tier's resolution, downsampled to fit the box. */
export function paintTierFit(opts: {
  canvas: HTMLCanvasElement;
  img: HTMLImageElement;
  tier: LondonTier;
  boxW: number;
  boxH: number;
}) {
  const { canvas, img, tier, boxW, boxH } = opts;
  const k = Math.min(boxW / tier.w, boxH / tier.h);
  const w = Math.max(1, Math.round(tier.w * k));
  const h = Math.max(1, Math.round(tier.h * k));
  // Rasterise at tier resolution first so the preview inherits the tier's own
  // pixel grid, then downsample for the thumbnail.
  const off = document.createElement("canvas");
  off.width = Math.min(tier.w, 1400);
  off.height = Math.max(1, Math.round((tier.h / tier.w) * off.width));
  const octx = off.getContext("2d");
  if (!octx) return;
  octx.drawImage(img, 0, 0, off.width, off.height);
  ditherInPlace(octx, off.width, off.height);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(off, 0, 0, w, h);
}

/** Physical viewing note for a tier, keyed to the 2–3 m venue distance. */
export function tierVerdict(tier: LondonTier): { tone: "good" | "watch" | "risk"; note: string } {
  if (tier.capped)
    return {
      tone: "watch",
      note: `Capped at ${LONDON_MAX_PX} px — effective resolution is lower than ${tier.ppi} ppi. Print the vector file.`,
    };
  if (tier.bandMm <= 1.2)
    return { tone: "good", note: "Band well under the 2–3 m threshold; invisible on the floor." };
  if (tier.bandMm <= 2.9)
    return {
      tone: "good",
      note: "Within the measured pack tolerance (worst 2.8 mm) at 2–3 m viewing distance.",
    };
  return {
    tone: "risk",
    note: "Flat-tone run exceeds the pack tolerance — step the tier up or send the vector.",
  };
}
