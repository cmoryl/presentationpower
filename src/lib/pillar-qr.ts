// Real, scannable QR codes for print. Encoded with the qrcode library and
// emitted as vector geometry (SVG rects) so the code stays crisp at any
// large-format output size — no raster upscaling, no fake placeholder art.

import QR from "qrcode";

export type PillarQr = {
  /** Module count per side, including the quiet zone. */
  size: number;
  /** Row-major module matrix, true = dark module. */
  modules: boolean[];
  /** Single SVG path covering every dark module, in module units. */
  path: string;
};

const QUIET = 4;

/** Encode a payload into a print-safe QR matrix. Returns null for empty input. */
export function buildPillarQr(data: string): PillarQr | null {
  const payload = (data ?? "").trim();
  if (!payload) return null;
  let code: ReturnType<typeof QR.create>;
  try {
    // High error correction: signage gets scuffed, wrapped and viewed at angles.
    code = QR.create(payload, { errorCorrectionLevel: "H" });
  } catch {
    return null;
  }
  const src = code.modules;
  const n = src.size;
  const size = n + QUIET * 2;
  const modules = new Array<boolean>(size * size).fill(false);
  const parts: string[] = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!src.get(x, y)) continue;
      modules[(y + QUIET) * size + (x + QUIET)] = true;
      parts.push(`M${x + QUIET} ${y + QUIET}h1v1h-1z`);
    }
  }
  return { size, modules, path: parts.join("") };
}
