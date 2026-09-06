// TransPerfect NEXT 2026 — London signage TEXT OUTLINING.
//
// Print masters must not depend on a font being installed on the vendor's
// machine. A `<text>` element or a PDF `Tj` with an un-embedded /Font resource
// re-flows the moment the RIP substitutes a face — the same defect we already
// fixed in the PowerPoint library. So every headline, QR caption and
// step-and-repeat text tile ships as OUTLINED VECTOR PATHS, measured with the
// font's real glyph advances rather than an estimated character width.
//
// The face is Geist Bold, shipped with the app at /fonts/Geist-Bold.ttf.

import { parse, type Font } from "opentype.js";

/** Path to the shipped signage face, relative to the site root. */
export const LONDON_SIGNAGE_FONT_URL = "/fonts/Geist-Bold.ttf";
const LONDON_SIGNAGE_FONT_FILE = "public/fonts/Geist-Bold.ttf";

export type LondonSignageFace = {
  /** PostScript-ish name used in master metadata. */
  name: string;
  font: Font;
  unitsPerEm: number;
};

/** Alias used by the builders. */
export type Face = LondonSignageFace;

let cached: LondonSignageFace | null = null;
let pending: Promise<LondonSignageFace> | null = null;

export const LONDON_SIGNAGE_FONT_MISSING =
  "Signage font unavailable — refusing to build a master with substituted text";

function wrap(buffer: ArrayBuffer): LondonSignageFace {
  const font = parse(buffer);
  return { name: "Geist-Bold", font, unitsPerEm: font.unitsPerEm };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

/**
 * Load (once) the Geist Bold face used by every London signage master. Resolves
 * from the shipped font file in the browser and from disk under Node.
 */
export async function loadLondonSignageFace(): Promise<LondonSignageFace> {
  if (cached) return cached;
  if (pending) return pending;
  pending = (async () => {
    const nodeProcess = (globalThis as { process?: { versions?: { node?: string } } }).process;
    if (nodeProcess?.versions?.node) {
      try {
        const fs = await import("node:fs/promises");
        cached = wrap(toArrayBuffer(await fs.readFile(LONDON_SIGNAGE_FONT_FILE)));
        return cached;
      } catch {
        /* fall through to fetch */
      }
    }
    const res = await fetch(LONDON_SIGNAGE_FONT_URL);
    if (!res.ok) throw new Error(LONDON_SIGNAGE_FONT_MISSING);
    cached = wrap(await res.arrayBuffer());
    return cached;
  })().catch((error) => {
    pending = null;
    throw error instanceof Error && error.message === LONDON_SIGNAGE_FONT_MISSING
      ? error
      : new Error(LONDON_SIGNAGE_FONT_MISSING);
  });
  return pending;
}

/** True once the face is in memory and the synchronous builders can run. */
export function londonSignageFaceReady(): boolean {
  return cached !== null;
}

/**
 * The loaded face, for the synchronous artwork builders. Under Node it reads the
 * file on first use; in the browser the caller must have awaited
 * `loadLondonSignageFace()` first. It NEVER falls back to live text.
 */
export function londonSignageFace(): LondonSignageFace {
  if (cached) return cached;
  throw new Error(LONDON_SIGNAGE_FONT_MISSING);
}

/** Test seam: install a face synchronously (also used by warm-up helpers). */
export function setLondonSignageFace(face: LondonSignageFace | null): void {
  cached = face;
  pending = null;
}

export type OutlineTextOptions = {
  /** Cap-to-cap type size, in millimetres (the SVG/PDF user unit is mm). */
  sizeMm: number;
  /** Letter spacing as a fraction of the size, matching CSS/`Tc` behaviour. */
  trackingEm?: number;
  anchor?: "start" | "middle" | "end";
  /** Anchor point, in mm on the artboard (y down, at the baseline). */
  x: number;
  y: number;
  /**
   * Vertical copy is laid out horizontally here and rotated by the caller's
   * transform, so the flag is carried for parity with the live-text path.
   */
  vertical?: boolean;
};

export type OutlinedText = {
  /** SVG path data in mm, y down, ready for `<path d>` or `svgPathToPdfOps`. */
  d: string;
  /** True advance width in mm, from the font's own glyph metrics. */
  advanceMm: number;
};

/**
 * Outline one run of text with the real glyph advances. Empty text yields an
 * empty path so callers can skip the layer.
 */
export function outlineText(
  face: LondonSignageFace,
  text: string,
  options: OutlineTextOptions,
): OutlinedText {
  const { sizeMm, x, y } = options;
  const trackingEm = options.trackingEm ?? 0;
  const trackMm = sizeMm * trackingEm;
  const scale = sizeMm / face.unitsPerEm;
  const glyphs = face.font.stringToGlyphs(text);
  const advanceMm = glyphs.reduce(
    (sum, glyph) => sum + (glyph.advanceWidth ?? 0) * scale + trackMm,
    0,
  );
  if (glyphs.length === 0) return { d: "", advanceMm: 0 };

  const anchor = options.anchor ?? "start";
  const startX = anchor === "middle" ? x - advanceMm / 2 : anchor === "end" ? x - advanceMm : x;

  let penX = startX;
  const parts: string[] = [];
  for (const glyph of glyphs) {
    const path = glyph.getPath(penX, y, sizeMm);
    const d = path.toPathData(3);
    if (d) parts.push(d);
    penX += (glyph.advanceWidth ?? 0) * scale + trackMm;
  }
  return { d: parts.join(" "), advanceMm };
}
