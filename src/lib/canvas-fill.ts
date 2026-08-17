// Shared advanced-fill model for canvas surfaces / shape blocks.
//
// A surface can be painted three ways: a flat colour, a two-stop gradient
// (linear or radial), or a background image. The same spec drives the on-screen
// renderer (CSS) and the PPTX exporter (native gradient tag / picture), so what
// an author sees is what PowerPoint receives.

export type CanvasFillKind = "solid" | "gradient" | "image";

export type CanvasGradientFill = {
  kind: "linear" | "radial";
  /** CSS angle in degrees (0 = to top, 90 = to right). */
  angleDeg: number;
  from: string;
  to: string;
};

export type CanvasFillSpec = {
  fillKind?: CanvasFillKind;
  fill?: string;
  gradient?: CanvasGradientFill;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
};

export const DEFAULT_CANVAS_GRADIENT: CanvasGradientFill = {
  kind: "linear",
  angleDeg: 135,
  from: "#003FC7",
  to: "#A1FBF9",
};

export function canvasFillKind(spec: CanvasFillSpec): CanvasFillKind {
  if (spec.fillKind) return spec.fillKind;
  return "solid";
}

/** CSS `background` shorthand for a fill spec. */
export function canvasFillCss(spec: CanvasFillSpec, fallback = "rgba(255,255,255,0.16)"): string {
  const kind = canvasFillKind(spec);
  if (kind === "gradient") {
    const g = spec.gradient ?? DEFAULT_CANVAS_GRADIENT;
    return g.kind === "radial"
      ? `radial-gradient(circle at 30% 30%, ${g.from}, ${g.to})`
      : `linear-gradient(${Math.round(g.angleDeg)}deg, ${g.from}, ${g.to})`;
  }
  if (kind === "image" && spec.imageUrl) {
    const fit = spec.imageFit ?? "cover";
    return `${spec.fill ?? "transparent"} url("${spec.imageUrl}") center / ${fit} no-repeat`;
  }
  return spec.fill ?? fallback;
}

/**
 * CSS gradient angle → OOXML linear gradient angle. CSS measures clockwise from
 * "to top"; OOXML `lin@ang` measures clockwise from "to right".
 */
export function cssAngleToOoxml(angleDeg: number): number {
  return ((Math.round(angleDeg) - 90) % 360 + 360) % 360;
}
