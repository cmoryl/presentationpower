// London signage print geometry — one source of truth for the boxes a printer
// cares about: BLEED (the file size), TRIM (the cut), and SAFE (where copy and
// the lockup are allowed to live).
//
// The branding layer places the lockup against these exact numbers, so the
// print preview on the template page is not a decorative overlay: it draws the
// same rectangles the .svg / .ai masters are built from. If a guide shows copy
// crossing the safe line here, it crosses it on the signboard.

import { rasterSizeFor, recommendedPpi, type LondonPanel } from "@/lib/next-london-signage";

/** Safe inset from the TRIM edge, in mm: 4% of the short trim edge, min 20mm. */
export function londonSafeMm(panel: { trimW: number; trimH: number }): number {
  return Math.max(20, Math.min(panel.trimW, panel.trimH) * 0.04);
}

export type LondonBoxFrac = {
  /** Fractions of the BLEED box — directly usable as CSS percentages. */
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LondonPrintGeometry = {
  /** File size (what the RIP opens), in mm. */
  bleedW: number;
  bleedH: number;
  /** Finished signboard size, in mm. */
  trimW: number;
  trimH: number;
  /** Bleed per edge, in mm (may differ horizontally vs. vertically). */
  bleedEdgeX: number;
  bleedEdgeY: number;
  /** Safe inset from trim, in mm. */
  safeMm: number;
  /** Live (safe) area, in mm. */
  liveW: number;
  liveH: number;
  /** Trim size in inches, for RIP dialogs that speak inches. */
  trimWin: number;
  trimHin: number;
  /** Finished area in m² — what the venue is billed by. */
  areaM2: number;
  /** Issued raster tier and its pixel size at bleed. */
  ppi: number;
  rasterW: number;
  rasterH: number;
  /** True when the 6000px asset ceiling cut the tier's true pixel count. */
  rasterCapped: boolean;
  /** Boxes as fractions of the bleed box. */
  trim: LondonBoxFrac;
  safe: LondonBoxFrac;
};

export function londonPrintGeometry(panel: LondonPanel): LondonPrintGeometry {
  const bleedEdgeX = Math.max(0, (panel.bleedW - panel.trimW) / 2);
  const bleedEdgeY = Math.max(0, (panel.bleedH - panel.trimH) / 2);
  const safeMm = londonSafeMm(panel);
  const ppi = panel.rasterPpi || recommendedPpi(panel);
  const raster = rasterSizeFor(panel, ppi);
  const trueLongest = Math.round((Math.max(panel.bleedW, panel.bleedH) / 25.4) * ppi);

  const trim: LondonBoxFrac = {
    left: bleedEdgeX / panel.bleedW,
    top: bleedEdgeY / panel.bleedH,
    width: panel.trimW / panel.bleedW,
    height: panel.trimH / panel.bleedH,
  };
  const safe: LondonBoxFrac = {
    left: (bleedEdgeX + safeMm) / panel.bleedW,
    top: (bleedEdgeY + safeMm) / panel.bleedH,
    width: Math.max(0, panel.trimW - safeMm * 2) / panel.bleedW,
    height: Math.max(0, panel.trimH - safeMm * 2) / panel.bleedH,
  };

  return {
    bleedW: panel.bleedW,
    bleedH: panel.bleedH,
    trimW: panel.trimW,
    trimH: panel.trimH,
    bleedEdgeX,
    bleedEdgeY,
    safeMm,
    liveW: Math.max(0, panel.trimW - safeMm * 2),
    liveH: Math.max(0, panel.trimH - safeMm * 2),
    trimWin: panel.trimW / 25.4,
    trimHin: panel.trimH / 25.4,
    areaM2: (panel.trimW / 1000) * (panel.trimH / 1000),
    ppi,
    rasterW: raster.w,
    rasterH: raster.h,
    rasterCapped: trueLongest > Math.max(raster.w, raster.h) + 1,
    trim,
    safe,
  };
}

/** CSS percentage style for a box fraction. */
export function boxStyle(box: LondonBoxFrac): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  return {
    left: `${box.left * 100}%`,
    top: `${box.top * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };
}

/** Does an mm-space rect sit fully inside the safe area? */
export function insideSafe(
  geo: LondonPrintGeometry,
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  const l = geo.bleedEdgeX + geo.safeMm;
  const t = geo.bleedEdgeY + geo.safeMm;
  const r = l + geo.liveW;
  const b = t + geo.liveH;
  const eps = 0.5; // half a millimetre of tolerance — rounding, not a bust
  return (
    rect.x >= l - eps &&
    rect.y >= t - eps &&
    rect.x + rect.w <= r + eps &&
    rect.y + rect.h <= b + eps
  );
}
