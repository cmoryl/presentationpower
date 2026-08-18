// -----------------------------------------------------------------------------
// GROUND PNG — download-quality raster of one pure background composition.
//
// The library galleries paint `pack.ground(seed)` as live CSS planes, which is
// perfect on screen but not something a reviewer can hand to a designer. This
// rebuilds the very same plane offscreen at true slide size and captures it to
// a PNG at a requested pixel multiplier, so a downloaded file is byte-for-byte
// the composition shown in the lightbox — no scrim, no mask, no scaffold, no
// text: pure background, exactly as `ground()` authored it.
//
// A capture bleed is used for the same reason as the pack rasterizer: html-to-
// image renders into an SVG <foreignObject> whose viewport clips blurred orb
// edges and feathered masks that touch the boundary. We capture wider and crop
// the exact 16:9 stage rect back out.
// -----------------------------------------------------------------------------

import type { StylePack } from "./style-packs";

const W = 1280;
const H = 720;
const BLEED = 64;

/** Offered download resolutions, all 16:9 and all derived from one composition. */
export const GROUND_PNG_SIZES = [
  { id: "hd", label: "1280 × 720", ratio: 1, hint: "Slide-native" },
  { id: "2k", label: "2560 × 1440", ratio: 2, hint: "Retina / print deck" },
  { id: "4k", label: "3840 × 2160", ratio: 3, hint: "Large format" },
] as const;

export type GroundPngSizeId = (typeof GROUND_PNG_SIZES)[number]["id"];

/** The CSS layer list behind a composition — handy to copy into other tooling. */
export function groundCss(pack: StylePack, seed: string): string {
  return `background-color: ${pack.tokens.surface};\nbackground: ${pack
    .ground(seed)
    .join(",\n  ")};`;
}

async function crop(dataUrl: string, ratio: number): Promise<string | null> {
  const img = new Image();
  const ok = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
  if (!ok) return null;
  const canvas = document.createElement("canvas");
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  const inset = BLEED * ratio;
  ctx.drawImage(img, inset, inset, W * ratio, H * ratio, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Rasterizes one pure `ground()` composition to a PNG data URL.
 * Returns null on SSR or when the capture fails; callers surface a message
 * rather than downloading a blank file.
 */
export async function rasterizeGroundPng(
  pack: StylePack,
  seed: string,
  ratio = 2,
): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const shell = document.createElement("div");
  shell.setAttribute("aria-hidden", "true");
  shell.style.position = "fixed";
  shell.style.left = "-10000px";
  shell.style.top = "0";
  shell.style.pointerEvents = "none";
  shell.style.zIndex = "-1";

  // The captured node is the bleed frame; the stage sits centred inside it.
  const frame = document.createElement("div");
  frame.style.position = "relative";
  frame.style.width = `${W + BLEED * 2}px`;
  frame.style.height = `${H + BLEED * 2}px`;
  frame.style.backgroundColor = pack.tokens.surface;
  frame.style.overflow = "hidden";

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = `${BLEED}px`;
  host.style.top = `${BLEED}px`;
  host.style.width = `${W}px`;
  host.style.height = `${H}px`;
  host.style.overflow = "hidden";
  host.style.backgroundColor = pack.tokens.surface;
  host.style.background = pack.ground(seed).join(", ");

  frame.appendChild(host);
  shell.appendChild(frame);
  document.body.appendChild(shell);
  try {
    const { toPng } = await import("html-to-image");
    const raw = await toPng(frame, {
      width: W + BLEED * 2,
      height: H + BLEED * 2,
      pixelRatio: ratio,
      backgroundColor: pack.tokens.surface,
      // Pure background: no text, so font inlining is pointless and can abort
      // the capture by flooding the network.
      skipFonts: true,
    });
    if (!raw) return null;
    return await crop(raw, ratio);
  } catch (err) {
    console.error("[ground-png] capture failed", err);
    return null;
  } finally {
    shell.remove();
  }
}

/** Triggers a browser download for a data URL. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** `r07-stats-take3-2560x1440.png` — stable, sortable, self-describing. */
export function groundFileName(
  code: string,
  scene: string,
  take: number,
  ratio: number,
): string {
  return `${code.toLowerCase()}-${scene}-take${take + 1}-${W * ratio}x${H * ratio}.png`;
}
