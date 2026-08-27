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
//
// EDGE CASES this module is responsible for (Illustrator is strict about all
// of them, and each one used to produce a wrong or dead gradient):
//   * one stop            → Illustrator refuses a stitching function with no
//                           segments; emit a flat Type 2 ramp instead.
//   * zero stops          → never emit an invalid dictionary; fall back to black.
//   * unsorted offsets    → /Bounds MUST be non-decreasing or the file is
//                           rejected; stops are sorted.
//   * duplicate offsets   → a zero-width segment makes /Bounds non-increasing;
//                           coincident stops are nudged apart by EPS.
//   * offsets outside 0–1 → clamped; /Domain stays [0 1].
//   * offsets not spanning
//     the full domain     → the ramp is re-anchored to 0 and 1 so Illustrator's
//                           gradient slider matches the printed ramp.
//   * NaN / Infinity      → dropped (offset) or clamped (channel).
//   * out-of-gamut or
//     0–255 colour input  → parseColor / clampChannel normalise into 0–1
//                           DeviceRGB. We never write DeviceN, Separation, Lab
//                           or ICCBased here: brand RGB must not be silently
//                           converted to CMYK (print does that at the RIP).
//   * 8-digit hex / rgba()→ alpha is dropped, not baked into the colour, so the
//                           stop keeps its exact brand value.
// -----------------------------------------------------------------------------

export type GradientStop = { offset: number; rgb: [number, number, number] };

/** Smallest offset gap Illustrator still reads as two distinct stops. */
const EPS = 1e-4;

function f3(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const v = Math.round(n * 1000) / 1000;
  // "-0" and exponential notation are both invalid PDF numeric syntax.
  if (Object.is(v, -0) || Math.abs(v) < 1e-6) return "0";
  return String(v);
}

function clampChannel(n: number): number {
  if (!Number.isFinite(n)) return 0;
  // Tolerate 0–255 input: anything above 1 is treated as an 8-bit channel.
  const v = n > 1 ? n / 255 : n;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function rgb(c: [number, number, number]): string {
  return `${f3(clampChannel(c[0]))} ${f3(clampChannel(c[1]))} ${f3(clampChannel(c[2]))}`;
}

/**
 * Parse any brand colour notation used across the signage/skin specs into a
 * 0–1 DeviceRGB triple: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() with
 * numeric or percentage channels. Alpha is intentionally discarded — a stop
 * must keep its exact hue; transparency is expressed with a separate soft mask,
 * never by pre-multiplying towards white (which shifted colours in Illustrator).
 */
export function parseColor(input: string): [number, number, number] {
  const raw = input.trim().toLowerCase();

  const fn = /^rgba?\(([^)]+)\)$/.exec(raw);
  if (fn) {
    const parts = fn[1]!.split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    const ch = parts.map((p) =>
      p.endsWith("%") ? clampChannel(parseFloat(p) / 100) : clampChannel(parseFloat(p)),
    );
    return [ch[0] ?? 0, ch[1] ?? 0, ch[2] ?? 0];
  }

  let h = raw.replace(/^#/, "").replace(/[^0-9a-f]/g, "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length >= 6) h = h.slice(0, 6);
  if (h.length !== 6) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Put an arbitrary stop list into the exact shape a PDF stitching function
 * requires: finite, clamped, sorted, strictly increasing offsets that span the
 * whole [0 1] domain. Returns at least one stop.
 */
export function normalizeStops(stops: GradientStop[]): GradientStop[] {
  const cleaned = stops
    .filter((s) => s && Number.isFinite(s.offset))
    .map((s) => ({
      offset: Math.max(0, Math.min(1, s.offset)),
      rgb: [clampChannel(s.rgb?.[0] ?? 0), clampChannel(s.rgb?.[1] ?? 0), clampChannel(s.rgb?.[2] ?? 0)] as [
        number,
        number,
        number,
      ],
    }))
    .sort((a, b) => a.offset - b.offset);

  if (cleaned.length === 0) return [{ offset: 0, rgb: [0, 0, 0] }];
  if (cleaned.length === 1) return cleaned;

  // Re-anchor to the full domain so Illustrator's slider matches the print ramp.
  const first = cleaned[0]!;
  const last = cleaned[cleaned.length - 1]!;
  const span = last.offset - first.offset;
  const spread =
    span > EPS
      ? cleaned.map((s) => ({ ...s, offset: (s.offset - first.offset) / span }))
      : cleaned.map((s, i) => ({ ...s, offset: i / (cleaned.length - 1) }));

  // Force strictly increasing offsets; coincident stops (hard-edge ramps) get
  // nudged by EPS instead of producing a zero-width /Bounds entry.
  const out: GradientStop[] = [];
  for (const s of spread) {
    const prev = out[out.length - 1];
    const offset = prev && s.offset <= prev.offset + EPS ? prev.offset + EPS : s.offset;
    out.push({ offset: Math.min(offset, 1), rgb: s.rgb });
  }
  // Guard the tail: nudging can push past 1 on very dense ramps.
  const overflow = out[out.length - 1]!.offset - 1;
  if (overflow > 0) {
    const shrink = 1 / (1 + overflow);
    for (const s of out) s.offset = Math.min(1, s.offset * shrink);
  }
  out[0]!.offset = 0;
  out[out.length - 1]!.offset = 1;
  return out;
}

/** Evenly spaced stops from hex-derived 0–1 RGB triples. */
export function evenStops(colors: [number, number, number][]): GradientStop[] {
  if (colors.length === 0) return [{ offset: 0, rgb: [0, 0, 0] }];
  const last = Math.max(colors.length - 1, 1);
  return normalizeStops(colors.map((c, i) => ({ offset: i / last, rgb: c })));
}

/** Evenly spaced stops straight from colour strings (hex, rgb(), rgba()). */
export function stopsFromColors(colors: string[]): GradientStop[] {
  return evenStops(colors.map((c) => parseColor(c)));
}

/**
 * Type 3 stitching function over the stop ramp. Returned as a direct
 * dictionary (function types 2 and 3 are dictionaries, not streams), so it can
 * live inline inside the shading dictionary — no extra indirect objects.
 */
export function stitchingFunction(stops: GradientStop[]): string {
  const ordered = normalizeStops(stops);
  if (ordered.length === 1) {
    const only = ordered[0]!;
    return `<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(only.rgb)}] /C1 [${rgb(only.rgb)}] /N 1 >>`;
  }
  if (ordered.length === 2) {
    // A two-stop ramp needs no stitching wrapper — Illustrator maps a bare
    // Type 2 straight onto a two-stop live gradient.
    const a = ordered[0]!;
    const b = ordered[1]!;
    return `<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(a.rgb)}] /C1 [${rgb(b.rgb)}] /N 1 >>`;
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
  // A degenerate axis renders as nothing in Illustrator; give it 1pt of length.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const end =
    Math.abs(dx) < EPS && Math.abs(dy) < EPS ? { x: from.x, y: from.y + 1 } : { x: to.x, y: to.y };
  return (
    `<< /Type /Shading /ShadingType 2 /ColorSpace /DeviceRGB ` +
    `/Coords [${f3(from.x)} ${f3(from.y)} ${f3(end.x)} ${f3(end.y)}] ` +
    `/Extend [true true] /Function ${stitchingFunction(stops)} >>`
  );
}

/** PDF Shading Type 3 (radial) — a halo from `center` out to `radius`. */
export function radialShadingDict(
  center: { x: number; y: number },
  radius: number,
  stops: GradientStop[],
): string {
  const r = Number.isFinite(radius) && radius > EPS ? radius : 1;
  return (
    `<< /Type /Shading /ShadingType 3 /ColorSpace /DeviceRGB ` +
    `/Coords [${f3(center.x)} ${f3(center.y)} 0 ${f3(center.x)} ${f3(center.y)} ${f3(r)}] ` +
    `/Extend [true true] /Function ${stitchingFunction(stops)} >>`
  );
}

/**
 * Read every colour a shading dictionary paints, in ramp order — the QA hook
 * that proves an exported `.ai` still carries the brand stops.
 */
export function readShadingStops(dict: string): [number, number, number][] {
  const out: [number, number, number][] = [];
  const re = /\/(C0|C1)\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dict))) {
    const nums = m[2]!.trim().split(/\s+/).map(Number);
    if (nums.length !== 3 || nums.some((n) => !Number.isFinite(n))) continue;
    const c: [number, number, number] = [nums[0]!, nums[1]!, nums[2]!];
    const prev = out[out.length - 1];
    // Consecutive segments share a stop (C1 of one == C0 of the next).
    if (prev && prev.every((v, i) => Math.abs(v - c[i]!) < 5e-3)) continue;
    out.push(c);
  }
  return out;
}
