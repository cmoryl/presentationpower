// -----------------------------------------------------------------------------
// Analytic gradients as EDITABLE Illustrator gradients (PDF shading patterns).
//
// WHY: a ground painted with the `sh` operator, or tessellated into a Gouraud
// mesh (Shading Type 4), is not an editable gradient when the file is opened in
// Illustrator. `sh` arrives as a shading object with no path to select, and a
// mesh arrives as a gradient MESH — a grid of colour points a designer cannot
// retune by dragging a stop or typing a new brand hex.
//
// A shading PATTERN (PatternType 2) used as the fill of a real rectangle is the
// construct Illustrator itself writes when it saves a gradient-filled path. Open
// that file and you get a rectangle whose fill is a live gradient: stops,
// angle and colours all editable, in RGB or in CMYK, with no flattening.
//
// Analytic only — Shading Type 2 (axial) and Type 3 (radial). Never a mesh.
// -----------------------------------------------------------------------------

import { PDFDict, PDFName, type PDFDocument, type PDFPage, type PDFRef } from "pdf-lib";

/** One gradient stop: 0–1 position and 3 (RGB) or 4 (CMYK) 0–1 components. */
export type ShadingStop = { offset: number; color: number[] };

export type GradientSpec =
  | { kind: "axial"; from: { x: number; y: number }; to: { x: number; y: number } }
  | {
      kind: "radial";
      centre: { x: number; y: number };
      /** Radii in points. Unequal radii give the elliptical halo grounds. */
      rx: number;
      ry: number;
    };

export type ShadingSpace = "rgb" | "cmyk";

const r3 = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0);

/**
 * Normalise stops: sorted, de-duplicated positions, first at 0 and last at 1,
 * and always at least two — a one-stop "gradient" is a flat fill, which is the
 * very thing we are avoiding.
 */
function normalize(stops: ShadingStop[]): ShadingStop[] {
  const clean = stops
    .filter((s) => Array.isArray(s.color) && s.color.length >= 3)
    .map((s) => ({
      offset: Math.max(0, Math.min(1, Number.isFinite(s.offset) ? s.offset : 0)),
      color: s.color.map((c) => r3(Math.max(0, Math.min(1, c)))),
    }))
    .sort((a, b) => a.offset - b.offset);
  if (clean.length === 0) return [];
  if (clean.length === 1) {
    return [
      { offset: 0, color: clean[0]!.color },
      { offset: 1, color: clean[0]!.color },
    ];
  }
  clean[0]!.offset = 0;
  clean[clean.length - 1]!.offset = 1;
  // Strictly increasing bounds: PDF readers reject a zero-width sub-domain.
  for (let i = 1; i < clean.length; i += 1) {
    if (clean[i]!.offset <= clean[i - 1]!.offset) {
      clean[i]!.offset = Math.min(1, clean[i - 1]!.offset + 1e-4);
    }
  }
  return clean;
}

/** Stitched exponential function across the stops — one live gradient ramp. */
function stitchingFunction(doc: PDFDocument, stops: ShadingStop[]) {
  const parts = [];
  const bounds: number[] = [];
  const encode: number[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    parts.push(
      doc.context.obj({
        FunctionType: 2,
        Domain: [0, 1],
        C0: stops[i]!.color,
        C1: stops[i + 1]!.color,
        N: 1,
      }),
    );
    encode.push(0, 1);
    if (i > 0) bounds.push(r3(stops[i]!.offset));
  }
  if (parts.length === 1) return parts[0]!;
  return doc.context.obj({
    FunctionType: 3,
    Domain: [0, 1],
    Functions: parts,
    Bounds: bounds,
    Encode: encode,
  });
}

/**
 * Register an editable gradient as a page-level shading pattern and return the
 * resource name to fill paths with (`/Pattern cs /<name> scn`).
 */
export function registerGradientPattern(
  doc: PDFDocument,
  page: PDFPage,
  spec: GradientSpec,
  stopsIn: ShadingStop[],
  space: ShadingSpace = "rgb",
  resourceName = "P0",
): { name: PDFName; ref: PDFRef } {
  const stops = normalize(stopsIn);
  if (stops.length < 2) throw new Error("gradient needs at least one colour stop");
  const comps = space === "cmyk" ? 4 : 3;
  for (const s of stops) {
    if (s.color.length !== comps) {
      throw new Error(`gradient stop has ${s.color.length} components, expected ${comps}`);
    }
  }

  const fn = stitchingFunction(doc, stops);
  const shading =
    spec.kind === "axial"
      ? doc.context.obj({
          Type: PDFName.of("Shading"),
          ShadingType: 2,
          ColorSpace: PDFName.of(space === "cmyk" ? "DeviceCMYK" : "DeviceRGB"),
          Coords: [r3(spec.from.x), r3(spec.from.y), r3(spec.to.x), r3(spec.to.y)],
          Extend: [true, true],
          Function: fn,
        })
      : doc.context.obj({
          Type: PDFName.of("Shading"),
          ShadingType: 3,
          ColorSpace: PDFName.of(space === "cmyk" ? "DeviceCMYK" : "DeviceRGB"),
          // Unit circle: the pattern matrix below scales it to the real ellipse,
          // so an unequal-radius halo stays one live radial gradient.
          Coords: [0, 0, 0, 0, 0, 1],
          Extend: [true, true],
          Function: fn,
        });
  const shadingRef = doc.context.register(shading);

  const matrix =
    spec.kind === "radial"
      ? [r3(Math.max(spec.rx, 1e-3)), 0, 0, r3(Math.max(spec.ry, 1e-3)), r3(spec.centre.x), r3(spec.centre.y)]
      : [1, 0, 0, 1, 0, 0];

  const pattern = doc.context.obj({
    Type: PDFName.of("Pattern"),
    PatternType: 2,
    Matrix: matrix,
    Shading: shadingRef,
  });
  const patternRef = doc.context.register(pattern);

  const resources = page.node.lookupMaybe(PDFName.of("Resources"), PDFDict) ?? doc.context.obj({});
  if (!page.node.has(PDFName.of("Resources"))) {
    page.node.set(PDFName.of("Resources"), resources);
  }
  const patterns = resources.lookupMaybe(PDFName.of("Pattern"), PDFDict) ?? doc.context.obj({});
  if (!resources.has(PDFName.of("Pattern"))) {
    resources.set(PDFName.of("Pattern"), patterns);
  }
  const name = PDFName.of(resourceName);
  patterns.set(name, patternRef);
  return { name, ref: patternRef };
}

/**
 * Raw-string writers (the London `.ai` masters are assembled byte by byte, not
 * through pdf-lib). Returns the pattern dictionary body; the caller registers it
 * as an object and points `/Pattern << /P0 n 0 R >>` at it.
 */
export function patternDictBody(shadingObjNum: number, matrix?: number[]): string {
  const m = matrix ?? [1, 0, 0, 1, 0, 0];
  return (
    `<< /Type /Pattern /PatternType 2 /Matrix [${m.map(r3).join(" ")}] ` +
    `/Shading ${shadingObjNum} 0 R >>`
  );
}

/** Content-stream operators that fill a rectangle with a registered pattern. */
export function patternFillOps(
  name: string,
  box: { x: number; y: number; w: number; h: number },
): string {
  return (
    `q /Pattern cs /${name} scn ` +
    `${r3(box.x)} ${r3(box.y)} ${r3(box.w)} ${r3(box.h)} re f Q\n`
  );
}
