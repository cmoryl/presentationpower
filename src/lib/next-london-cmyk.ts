// -----------------------------------------------------------------------------
// NEXT 2026 London signage — CMYK output path with vibrant correction.
//
// House rule (unchanged): brand RGB is NEVER silently converted to CMYK. The
// default `.svg`/`.ai` masters stay DeviceRGB and the RIP separates. This module
// exists for the explicit, opt-in "CMYK master" a printer asks for — the
// operator chooses it, it is labelled in the filename and manifest, and every
// stop is resolved as follows:
//
//   1. APPROVED BUILD — if the colour is a brand colour with a signed-off CMYK
//      build (NEXT 2026 division registry), that build is used verbatim.
//   2. VIBRANT CONVERSION — otherwise a chroma-preserving conversion runs:
//      a small saturation/value pre-compensation for dot gain, skeletal black
//      only (no black under saturated colour, so aqua/violet stay clean), UCR,
//      and a 300% total-area-coverage clamp for offset.
//   3. 100K RULE — near-neutral blacks print as 0/0/0/K, never as a four-colour
//      build, matching the print contract for body copy.
// -----------------------------------------------------------------------------

import { parseColor } from "@/lib/pdf-gradient-shading";

export type Cmyk = { c: number; m: number; y: number; k: number };

export type CmykBuild = Cmyk & {
  /** True when the values came from a signed-off brand build, not a conversion. */
  approved: boolean;
  /** Total area coverage, in percent. Offset ceiling is 300. */
  tac: number;
};

/** Maximum total ink for offset + digital/POD. */
export const CMYK_TAC_LIMIT = 3.0;

/**
 * Signed-off CMYK builds. Keys are lowercase hex.
 * Source: TransPerfect NEXT 2026 division brand & copy registry, plus the
 * master brand core (Blue 500 / Blue 800 / white / 100K text).
 */
const APPROVED: Record<string, Cmyk> = {
  // Master brand core
  "#003fc7": { c: 1, m: 0.83, y: 0, k: 0.06 },
  "#03002c": { c: 1, m: 1, y: 0.4, k: 0.6 },
  "#ffffff": { c: 0, m: 0, y: 0, k: 0 },
  "#000000": { c: 0, m: 0, y: 0, k: 1 },
  // NEXT 2026 division registry
  "#13b1f3": { c: 0.92, m: 0.27, y: 0, k: 0.05 },
  "#a6fa87": { c: 0.34, m: 0, y: 0.46, k: 0.02 },
  "#ff9b70": { c: 0, m: 0.39, y: 0.56, k: 0 },
  "#3bbeb6": { c: 0.69, m: 0, y: 0.04, k: 0.25 },
  "#58ed21": { c: 0.63, m: 0, y: 0.86, k: 0.07 },
  "#ff5757": { c: 0, m: 0.66, y: 0.66, k: 0 },
  "#ffeb66": { c: 0, m: 0.08, y: 0.6, k: 0 },
  "#ec388a": { c: 0, m: 0.76, y: 0.42, k: 0.07 },
  "#c2a3ff": { c: 0.24, m: 0.36, y: 0, k: 0 },
  "#5ce1e6": { c: 0.6, m: 0.02, y: 0, k: 0.1 },
  // Secondary accents
  "#a1fbf9": { c: 0.33, m: 0, y: 0.06, k: 0 },
  "#e53d2e": { c: 0, m: 0.83, y: 0.85, k: 0 },
};

function clamp01(n: number): number {
  return !Number.isFinite(n) ? 0 : n < 0 ? 0 : n > 1 ? 1 : n;
}

function normalizeHex(input: string): string {
  const [r, g, b] = parseColor(input);
  const hx = (n: number) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

function tacOf(v: Cmyk): number {
  return v.c + v.m + v.y + v.k;
}

function limitTac(v: Cmyk): Cmyk {
  const total = tacOf(v);
  if (total <= CMYK_TAC_LIMIT) return v;
  // Pull back the chromatic inks only — black carries the density.
  const chroma = v.c + v.m + v.y;
  const room = Math.max(0, CMYK_TAC_LIMIT - v.k);
  const f = chroma > 0 ? room / chroma : 0;
  return { c: v.c * f, m: v.m * f, y: v.y * f, k: v.k };
}

/**
 * Chroma-preserving RGB → CMYK. `vibrance` scales the pre-compensation; 1 is
 * the tuned default used by the signage exports, 0 gives a plain conversion.
 */
export function vibrantCmyk(input: string, vibrance = 1): Cmyk {
  let [r, g, b] = parseColor(input);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  // 100K rule: near-neutral dark stays a single black.
  if (chroma < 0.04 && max < 0.22) return { c: 0, m: 0, y: 0, k: clamp01(1 - max) };
  if (chroma < 0.02 && max > 0.98) return { c: 0, m: 0, y: 0, k: 0 };

  // Dot-gain pre-compensation: lift saturation and value a touch so the printed
  // sheet reads as vividly as the screen master instead of going muddy.
  if (chroma > 0.02 && vibrance > 0) {
    const sat = chroma / (max || 1);
    const satBoost = 1 + 0.1 * vibrance * (1 - sat);
    const mid = (max + min) / 2;
    const scale = (v: number) => clamp01(mid + (v - mid) * satBoost);
    r = scale(r);
    g = scale(g);
    b = scale(b);
    const lift = 1 + 0.025 * vibrance;
    const top = Math.max(r, g, b);
    if (top > 0) {
      const f = Math.min(lift, 1 / top);
      r *= f;
      g *= f;
      b *= f;
    }
  }

  const c0 = 1 - r;
  const m0 = 1 - g;
  const y0 = 1 - b;
  const kFloor = Math.min(c0, m0, y0);

  // Skeletal black: saturated colours get NO black (that is what kills the
  // vibrancy of aqua, lavender and the green ramps); neutrals get full GCR.
  const chromaNow = Math.max(r, g, b) - Math.min(r, g, b);
  const kf = clamp01(1 - chromaNow * 1.8);
  const k = kFloor * kf;
  const denom = 1 - k;
  const build: Cmyk =
    denom <= 0.0001
      ? { c: 0, m: 0, y: 0, k: 1 }
      : {
          c: clamp01((c0 - k) / denom),
          m: clamp01((m0 - k) / denom),
          y: clamp01((y0 - k) / denom),
          k: clamp01(k),
        };
  return limitTac(build);
}

/** Resolve one brand colour to its print build, approved build first. */
export function londonCmykBuild(input: string, vibrance = 1): CmykBuild {
  const hex = normalizeHex(input);
  const approved = APPROVED[hex];
  if (approved) return { ...approved, approved: true, tac: tacOf(approved) * 100 };
  const converted = vibrantCmyk(hex, vibrance);
  return { ...converted, approved: false, tac: tacOf(converted) * 100 };
}

/** Screen proxy for a CMYK build, so previews show what the press will hold. */
export function cmykToHex(v: Cmyk): string {
  const ch = (x: number, k: number) => clamp01((1 - clamp01(x)) * (1 - clamp01(k)));
  const hx = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hx(ch(v.c, v.k))}${hx(ch(v.m, v.k))}${hx(ch(v.y, v.k))}`;
}

/** `device-cmyk()` notation for the SVG masters, with an sRGB fallback. */
export function cmykCss(v: Cmyk): string {
  const p = (n: number) => (Math.round(clamp01(n) * 1000) / 10).toFixed(1);
  return `device-cmyk(${p(v.c)}% ${p(v.m)}% ${p(v.y)}% ${p(v.k)}%)`;
}

/** Human label for manifests and UI, e.g. "C92 M27 Y0 K5 · approved". */
export function cmykLabel(build: CmykBuild): string {
  const p = (n: number) => Math.round(clamp01(n) * 100);
  return `C${p(build.c)} M${p(build.m)} Y${p(build.y)} K${p(build.k)} · ${
    build.approved ? "approved build" : `converted, TAC ${Math.round(build.tac)}%`
  }`;
}

// ---------------------------------------------------------------------------
// DeviceCMYK PDF shading — the same live-gradient construct as the RGB path
// ---------------------------------------------------------------------------

export type CmykStop = { offset: number; cmyk: Cmyk };

function f3(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const v = Math.round(n * 1000) / 1000;
  if (Object.is(v, -0) || Math.abs(v) < 1e-6) return "0";
  return String(v);
}

function ink(v: Cmyk): string {
  return `${f3(clamp01(v.c))} ${f3(clamp01(v.m))} ${f3(clamp01(v.y))} ${f3(clamp01(v.k))}`;
}

/** Evenly spaced CMYK stops from brand colour strings. */
export function cmykStopsFromColors(colors: string[], vibrance = 1): CmykStop[] {
  if (colors.length === 0) return [{ offset: 0, cmyk: { c: 0, m: 0, y: 0, k: 1 } }];
  const last = Math.max(colors.length - 1, 1);
  return colors.map((hex, i) => ({ offset: i / last, cmyk: londonCmykBuild(hex, vibrance) }));
}

function stitching(stops: CmykStop[]): string {
  const ordered = [...stops].sort((a, b) => a.offset - b.offset);
  if (ordered.length === 1) {
    const only = ink(ordered[0]!.cmyk);
    return `<< /FunctionType 2 /Domain [0 1] /C0 [${only}] /C1 [${only}] /N 1 >>`;
  }
  if (ordered.length === 2) {
    return `<< /FunctionType 2 /Domain [0 1] /C0 [${ink(ordered[0]!.cmyk)}] /C1 [${ink(ordered[1]!.cmyk)}] /N 1 >>`;
  }
  const segments: string[] = [];
  const bounds: string[] = [];
  const encode: string[] = [];
  for (let i = 0; i < ordered.length - 1; i += 1) {
    segments.push(
      `<< /FunctionType 2 /Domain [0 1] /C0 [${ink(ordered[i]!.cmyk)}] /C1 [${ink(ordered[i + 1]!.cmyk)}] /N 1 >>`,
    );
    encode.push("0 1");
    if (i > 0) bounds.push(f3(ordered[i]!.offset));
  }
  return (
    `<< /FunctionType 3 /Domain [0 1] /Functions [${segments.join(" ")}] ` +
    `/Bounds [${bounds.join(" ")}] /Encode [${encode.join(" ")}] >>`
  );
}

/** PDF Shading Type 2 (axial) in DeviceCMYK. */
export function cmykAxialShadingDict(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stops: CmykStop[],
): string {
  const degenerate = Math.abs(to.x - from.x) < 1e-4 && Math.abs(to.y - from.y) < 1e-4;
  const end = degenerate ? { x: from.x, y: from.y + 1 } : to;
  return (
    `<< /Type /Shading /ShadingType 2 /ColorSpace /DeviceCMYK ` +
    `/Coords [${f3(from.x)} ${f3(from.y)} ${f3(end.x)} ${f3(end.y)}] ` +
    `/Extend [true true] /Function ${stitching(stops)} >>`
  );
}

/** PDF Shading Type 3 (radial) in DeviceCMYK. */
export function cmykRadialShadingDict(
  center: { x: number; y: number },
  radius: number,
  stops: CmykStop[],
): string {
  const r = Number.isFinite(radius) && radius > 1e-4 ? radius : 1;
  return (
    `<< /Type /Shading /ShadingType 3 /ColorSpace /DeviceCMYK ` +
    `/Coords [${f3(center.x)} ${f3(center.y)} 0 ${f3(center.x)} ${f3(center.y)} ${f3(r)}] ` +
    `/Extend [true true] /Function ${stitching(stops)} >>`
  );
}

/** PDF fill operator for a CMYK build (`k`, not `rg`). */
export function cmykFillOp(v: Cmyk): string {
  return `${ink(v)} k`;
}
