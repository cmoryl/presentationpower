// -----------------------------------------------------------------------------
// Live PDF gradients that Illustrator opens as EDITABLE GRADIENTS.
//
// WHY: grounds were written as free-form Gouraud triangle meshes (PDF Shading
// Type 4). RIPs and PDF viewers render those correctly, but Illustrator's PDF
// importer re-interprets them — it either flattens the mesh or shows the wrong
// colour ramp, which is exactly the "gradients look wrong in .ai" symptom.
//
// Every ground in the kit is analytic: a straight axis (linear) or a centred
// halo (radial). Those map 1:1 onto PDF Shading Type 2 / Type 3 with a Type 3
// stitching function over Type 2 exponential ramps — the same construct
// Illustrator itself writes for a live gradient, so it round-trips exactly.
// -----------------------------------------------------------------------------

export type GradientStop = { offset: number; rgb: [number, number, number] };

function f3(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function rgb(c: [number, number, number]): string {
  return `${f3(c[0])} ${f3(c[1])} ${f3(c[2])}`;
}

/** Evenly spaced stops from hex-derived 0–1 RGB triples. */
export function evenStops(colors: [number, number, number][]): GradientStop[] {
  const last = Math.max(colors.length - 1, 1);
  return colors.map((c, i) => ({ offset: i / last, rgb: c }));
}

/**
 * Type 3 stitching function over the stop ramp. Returned as a direct
 * dictionary (function types 2 and 3 are dictionaries, not streams), so it can
 * live inline inside the shading dictionary — no extra indirect objects.
 */
export function stitchingFunction(stops: GradientStop[]): string {
  const ordered = [...stops].sort((a, b) => a.offset - b.offset);
  if (ordered.length === 1) {
    const only = ordered[0]!;
    return `<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(only.rgb)}] /C1 [${rgb(only.rgb)}] /N 1 >>`;
  }
  const segments: string[] = [];
  const bounds: string[] = [];
  const encode: string[] = [];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i]!;
    const b = ordered[i + 1]!;
    segments.push(
      `<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(a.rgb)}] /C1 [${rgb(b.rgb)}] /N 1 >>`,
    );
    encode.push("0 1");
    if (i > 0) bounds.push(f3(a.offset));
  }
  return (
    `<< /FunctionType 3 /Domain [0 1] /Functions [${segments.join(" ")}] ` +
    `/Bounds [${bounds.join(" ")}] /Encode [${encode.join(" ")}] >>`
  );
}

/** PDF Shading Type 2 (axial). Coordinates are in PDF user space (y up). */
export function axialShadingDict(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stops: GradientStop[],
): string {
  return (
    `<< /Type /Shading /ShadingType 2 /ColorSpace /DeviceRGB ` +
    `/Coords [${f3(from.x)} ${f3(from.y)} ${f3(to.x)} ${f3(to.y)}] ` +
    `/Extend [true true] /Function ${stitchingFunction(stops)} >>`
  );
}

/** PDF Shading Type 3 (radial) — a halo from `center` out to `radius`. */
export function radialShadingDict(
  center: { x: number; y: number },
  radius: number,
  stops: GradientStop[],
): string {
  return (
    `<< /Type /Shading /ShadingType 3 /ColorSpace /DeviceRGB ` +
    `/Coords [${f3(center.x)} ${f3(center.y)} 0 ${f3(center.x)} ${f3(center.y)} ${f3(radius)}] ` +
    `/Extend [true true] /Function ${stitchingFunction(stops)} >>`
  );
}
