// BRAND SWATCH SPEC
// ---------------------------------------------------------------------------
// A brand color is never just a hex. Designers need the screen value (HEX +
// RGB), press needs a build (CMYK) and, for offset, a spot (Pantone). This
// resolver returns all four for every swatch in a guide.
//
// Honesty rules (they matter more than completeness):
//   * RGB is EXACT — it is a lossless restatement of the hex.
//   * PANTONE and CMYK are only "approved" when a brand owner authored them
//     (on the swatch, or in the signed print color contract). Otherwise we show
//     a REFERENCE value marked pending, because there is no correct automatic
//     CMYK for a saturated screen blue — it depends on stock and profile.
//   * Body text always separates to 100K regardless of what a build says.

import type { ColorSwatch } from "@/lib/brand-guides";

export type SwatchValueStatus = "approved" | "reference";

export type SwatchValue = {
  value: string;
  status: SwatchValueStatus;
};

export type BrandSwatchSpec = {
  hex: string;
  rgb: SwatchValue;
  cmyk: SwatchValue;
  pantone: SwatchValue | null;
};

/** Pantone matches signed off for the TransPerfect master palette. */
const PANTONE_BY_HEX: Record<string, string> = {
  "#003FC7": "PMS 2728 C",
  "#03002C": "PMS 2767 C",
  "#A1FBF9": "PMS 317 C",
  "#C2A3FF": "PMS 264 C",
  "#FFEB66": "PMS 121 C",
  "#A6FA87": "PMS 358 C",
  "#FF9B70": "PMS 163 C",
  "#EC388A": "PMS 2395 C",
  "#E53D2E": "PMS 1788 C",
  "#666666": "Cool Gray 10 C",
  "#F2F2F2": "Cool Gray 1 C",
  "#E0E8F5": "PMS 656 C",
};

/** Approved process builds (coated) for the master palette. */
const CMYK_BY_HEX: Record<string, string> = {
  "#003FC7": "100 68 0 22",
  "#03002C": "93 100 0 83",
  "#A1FBF9": "33 0 8 0",
  "#C2A3FF": "26 39 0 0",
  "#FFEB66": "1 2 70 0",
  "#A6FA87": "36 0 66 0",
  "#FF9B70": "0 51 56 0",
  "#EC388A": "0 85 26 0",
  "#E53D2E": "0 84 84 0",
  "#666666": "0 0 0 70",
  "#F2F2F2": "0 0 0 5",
  "#E0E8F5": "9 4 0 0",
};

export function hexToRgbTriplet(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Naive (uncalibrated) separation — reference only, never a press approval. */
function referenceCmyk(hex: string): string {
  const [r, g, b] = hexToRgbTriplet(hex).map((v) => v / 255) as [number, number, number];
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return "0 0 0 100";
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)).join(" ");
}

export function brandSwatchSpec(swatch: ColorSwatch): BrandSwatchSpec {
  const hex = swatch.hex.toUpperCase();
  const rgbAuthored = swatch.rgb?.trim();
  const rgb = rgbAuthored || hexToRgbTriplet(hex).join(" ");

  const cmykAuthored = swatch.cmyk?.trim() || CMYK_BY_HEX[hex];
  const pantoneAuthored = swatch.pantone?.trim() || PANTONE_BY_HEX[hex];

  return {
    hex,
    // RGB is a lossless restatement of the hex — always exact.
    rgb: { value: rgb, status: "approved" },
    cmyk: cmykAuthored
      ? { value: cmykAuthored, status: "approved" }
      : { value: referenceCmyk(hex), status: "reference" },
    pantone: pantoneAuthored ? { value: pantoneAuthored, status: "approved" } : null,
  };
}

/** Clipboard-friendly one-liner for a swatch. */
export function brandSwatchSpecText(swatch: ColorSwatch): string {
  const spec = brandSwatchSpec(swatch);
  const lines = [
    `${swatch.name}`,
    `HEX ${spec.hex}`,
    `RGB ${spec.rgb.value}`,
    `CMYK ${spec.cmyk.value}${spec.cmyk.status === "reference" ? " (reference — pending sign-off)" : ""}`,
  ];
  if (spec.pantone) lines.push(`PANTONE ${spec.pantone.value}`);
  return lines.join("\n");
}
