/**
 * Server-side VISUAL validation of a generated .pptx.
 *
 * `pptx-validate.ts` proves the package *structure* (slide count, identities,
 * media relationships). This module answers the other half of the question:
 * does each exported slide actually LOOK like what the editor shows — in the
 * appearance (light or dark) the deck asked for?
 *
 * How it works, and why this way:
 *  · The client rasterizes every slide twice from the live renderer — once
 *    light, once dark — and posts both PNGs as references alongside the file.
 *  · The server opens the real package, finds each slide's largest embedded
 *    picture (the design plate the exporter placed for that slide), decodes it
 *    and reduces both sides to a coarse colour signature.
 *  · A slide passes when the plate matches its EXPECTED mode reference. If it
 *    instead matches the opposite mode more closely, that is the classic
 *    "dark slide exported light" drift and is reported as an error rather than
 *    a fuzzy similarity warning.
 *
 * Pure and DOM-free: bytes in, plain report out. Runs in the server route and
 * in unit tests alike. PNG is decoded here in TypeScript (no native deps);
 * JPEG plates cannot be decoded in this runtime, so those slides are reported
 * as skipped instead of silently passing.
 */
import JSZip from "jszip";

export type VisualMode = "light" | "dark";

export type VisualReferenceSlide = {
  slideId: string;
  variantId: string;
  /** The appearance the editor renders this slide in. */
  expectedMode: VisualMode;
  /** PNG bytes of the live renderer in each appearance. */
  light: Uint8Array | null;
  dark: Uint8Array | null;
};

export type VisualExpectation = {
  slides: VisualReferenceSlide[];
  /** Minimum signature similarity (0–1) for a slide to pass. Default 0.82. */
  threshold?: number;
};

export type VisualSlideCheck = {
  index: number;
  slideId: string;
  variantId: string;
  expectedMode: VisualMode;
  /** Similarity against the expected-mode reference (0–1), null when skipped. */
  similarity: number | null;
  /** Similarity against the opposite-mode reference (0–1), null when absent. */
  oppositeSimilarity: number | null;
  /** Mean luminance of the exported plate (0–1), null when skipped. */
  plateLuminance: number | null;
  /** Appearance the exported plate reads as, from its own luminance. */
  renderedMode: VisualMode | null;
  status: "match" | "mode-mismatch" | "drift" | "skipped";
  detail: string;
};

export type VisualValidationIssue = {
  level: "error" | "warning";
  code: "no-plate" | "undecodable" | "mode-mismatch" | "drift" | "missing-reference";
  message: string;
};

export type VisualValidationReport = {
  ok: boolean;
  threshold: number;
  checked: number;
  skipped: number;
  slides: VisualSlideCheck[];
  issues: VisualValidationIssue[];
};

export const MAX_VISUAL_REFERENCE_BYTES = 8 * 1024 * 1024;

// ── PNG decoding (8/16-bit, non-interlaced) ───────────────────────────────

type Rgba = { width: number; height: number; data: Uint8Array };

async function inflate(zlibBytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([zlibBytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function readU32(b: Uint8Array, at: number): number {
  return ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
}

/** Decode a PNG to RGBA. Returns null for shapes we deliberately don't handle. */
export async function decodePng(bytes: Uint8Array): Promise<Rgba | null> {
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  let at = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let alphaTable: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  while (at + 8 <= bytes.length) {
    const len = readU32(bytes, at);
    const type = String.fromCharCode(bytes[at + 4]!, bytes[at + 5]!, bytes[at + 6]!, bytes[at + 7]!);
    const body = bytes.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      width = readU32(body, 0);
      height = readU32(body, 4);
      bitDepth = body[8]!;
      colorType = body[9]!;
      interlace = body[12]!;
    } else if (type === "PLTE") {
      palette = body.slice();
    } else if (type === "tRNS") {
      alphaTable = body.slice();
    } else if (type === "IDAT") {
      idat.push(body.slice());
    } else if (type === "IEND") {
      break;
    }
    at += 12 + len;
  }

  if (!width || !height || interlace !== 0) return null;
  if (bitDepth !== 8 && bitDepth !== 16) return null;
  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  if (colorType === 3 && !palette) return null;

  let total = 0;
  for (const c of idat) total += c.length;
  const joined = new Uint8Array(total);
  let off = 0;
  for (const c of idat) {
    joined.set(c, off);
    off += c.length;
  }

  let raw: Uint8Array;
  try {
    raw = await inflate(joined);
  } catch {
    return null;
  }

  const sampleBytes = bitDepth === 16 ? 2 : 1;
  const bpp = channels * sampleBytes;
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height) return null;

  const out = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const rowAt = y * (stride + 1);
    const filter = raw[rowAt]!;
    line.set(raw.subarray(rowAt + 1, rowAt + 1 + stride));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? line[i - bpp]! : 0;
      const b = prev[i]!;
      const c = i >= bpp ? prev[i - bpp]! : 0;
      let v = line[i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    prev.set(line);

    for (let x = 0; x < width; x += 1) {
      const s = x * bpp;
      const d = (y * width + x) * 4;
      const at8 = (ch: number) => line[s + ch * sampleBytes]!;
      if (colorType === 3) {
        const idx = at8(0);
        const p = palette!;
        out[d] = p[idx * 3] ?? 0;
        out[d + 1] = p[idx * 3 + 1] ?? 0;
        out[d + 2] = p[idx * 3 + 2] ?? 0;
        out[d + 3] = alphaTable?.[idx] ?? 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = at8(0);
        out[d] = g;
        out[d + 1] = g;
        out[d + 2] = g;
        out[d + 3] = colorType === 4 ? at8(1) : 255;
      } else {
        out[d] = at8(0);
        out[d + 1] = at8(1);
        out[d + 2] = at8(2);
        out[d + 3] = colorType === 6 ? at8(3) : 255;
      }
    }
  }

  return { width, height, data: out };
}

// ── Signatures ────────────────────────────────────────────────────────────

const GRID_W = 32;
const GRID_H = 18;

export type VisualSignature = { cells: Float64Array; luminance: number };

/**
 * Reduce an image to a 32×18 mean-colour grid, compositing any transparency
 * over white so an alpha plate and an opaque one stay comparable.
 */
export function signatureOf(img: Rgba): VisualSignature {
  const cells = new Float64Array(GRID_W * GRID_H * 3);
  const counts = new Float64Array(GRID_W * GRID_H);
  for (let y = 0; y < img.height; y += 1) {
    const gy = Math.min(GRID_H - 1, Math.floor((y / img.height) * GRID_H));
    for (let x = 0; x < img.width; x += 1) {
      const gx = Math.min(GRID_W - 1, Math.floor((x / img.width) * GRID_W));
      const s = (y * img.width + x) * 4;
      const a = img.data[s + 3]! / 255;
      const cell = gy * GRID_W + gx;
      cells[cell * 3] += img.data[s]! * a + 255 * (1 - a);
      cells[cell * 3 + 1] += img.data[s + 1]! * a + 255 * (1 - a);
      cells[cell * 3 + 2] += img.data[s + 2]! * a + 255 * (1 - a);
      counts[cell] += 1;
    }
  }
  let lum = 0;
  for (let c = 0; c < GRID_W * GRID_H; c += 1) {
    const n = counts[c] || 1;
    cells[c * 3] /= n;
    cells[c * 3 + 1] /= n;
    cells[c * 3 + 2] /= n;
    lum += (0.2126 * cells[c * 3]! + 0.7152 * cells[c * 3 + 1]! + 0.0722 * cells[c * 3 + 2]!) / 255;
  }
  return { cells, luminance: lum / (GRID_W * GRID_H) };
}

/** 0–1 similarity between two signatures (1 = identical colour layout). */
export function compareSignatures(a: VisualSignature, b: VisualSignature): number {
  let sum = 0;
  const n = GRID_W * GRID_H;
  for (let c = 0; c < n; c += 1) {
    const dr = a.cells[c * 3]! - b.cells[c * 3]!;
    const dg = a.cells[c * 3 + 1]! - b.cells[c * 3 + 1]!;
    const db = a.cells[c * 3 + 2]! - b.cells[c * 3 + 2]!;
    sum += Math.sqrt(dr * dr + dg * dg + db * db) / 441.6729559300637;
  }
  return Math.max(0, 1 - sum / n);
}

// ── Package plate extraction ──────────────────────────────────────────────

function slideNumber(name: string): number {
  const m = /slide(\d+)\.xml$/.exec(name);
  return m ? Number(m[1]) : 0;
}

function mediaTargets(relsXml: string): string[] {
  const out: string[] = [];
  const re = /Target="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml))) {
    const target = m[1] ?? "";
    if (!/media\//.test(target)) continue;
    out.push(target.replace(/^(\.\.\/)+/, "ppt/").replace(/&amp;/g, "&"));
  }
  return out;
}

/**
 * The slide's design plate: its largest embedded picture. The exporter places
 * the full-bleed ground/exact plate first and everything else (icons, logos,
 * inset tiles) is smaller, so "largest" is a stable way to find the artwork
 * that carries the slide's appearance.
 */
async function largestPlate(
  zip: JSZip,
  slidePart: string,
): Promise<{ path: string; bytes: Uint8Array } | null> {
  const relsName = `ppt/slides/_rels/${slidePart.split("/").pop()}.rels`;
  const relsFile = zip.files[relsName];
  if (!relsFile) return null;
  const refs = mediaTargets(await relsFile.async("string"));
  let best: { path: string; bytes: Uint8Array } | null = null;
  for (const ref of refs) {
    const file = zip.files[ref];
    if (!file) continue;
    const bytes = await file.async("uint8array");
    if (!best || bytes.length > best.bytes.length) best = { path: ref, bytes };
  }
  return best;
}

// ── Validation ────────────────────────────────────────────────────────────

export async function validatePptxVisuals(
  bytes: Uint8Array,
  expected: VisualExpectation,
): Promise<VisualValidationReport> {
  const threshold = expected.threshold ?? 0.82;
  const issues: VisualValidationIssue[] = [];
  const slides: VisualSlideCheck[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return {
      ok: false,
      threshold,
      checked: 0,
      skipped: expected.slides.length,
      slides: [],
      issues: [
        {
          level: "error",
          code: "undecodable",
          message: "The generated file is not a readable PowerPoint package.",
        },
      ],
    };
  }

  const slideParts = Object.keys(zip.files)
    .filter((n) => !zip.files[n]?.dir && /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  for (let i = 0; i < expected.slides.length; i += 1) {
    const want = expected.slides[i]!;
    const base: VisualSlideCheck = {
      index: i,
      slideId: want.slideId,
      variantId: want.variantId,
      expectedMode: want.expectedMode,
      similarity: null,
      oppositeSimilarity: null,
      plateLuminance: null,
      renderedMode: null,
      status: "skipped",
      detail: "",
    };

    const wantedRef = want.expectedMode === "dark" ? want.dark : want.light;
    const otherRef = want.expectedMode === "dark" ? want.light : want.dark;
    if (!wantedRef) {
      issues.push({
        level: "warning",
        code: "missing-reference",
        message: `Slide ${i + 1} (${want.variantId}) had no ${want.expectedMode} editor render to compare against.`,
      });
      slides.push({ ...base, detail: "No editor reference render was supplied." });
      continue;
    }

    const part = slideParts[i];
    const plate = part ? await largestPlate(zip, part) : null;
    if (!plate) {
      issues.push({
        level: "warning",
        code: "no-plate",
        message: `Slide ${i + 1} (${want.variantId}) has no embedded artwork to compare visually.`,
      });
      slides.push({ ...base, detail: "The exported slide embeds no picture." });
      continue;
    }

    const plateImg = await decodePng(plate.bytes);
    const refImg = await decodePng(wantedRef);
    if (!plateImg || !refImg) {
      issues.push({
        level: "warning",
        code: "undecodable",
        message: `Slide ${i + 1} (${want.variantId}) artwork could not be decoded for visual comparison (${plate.path.split("/").pop()}).`,
      });
      slides.push({
        ...base,
        detail: plateImg
          ? "The editor reference could not be decoded."
          : "The exported artwork is not in a format this check can decode.",
      });
      continue;
    }

    const plateSig = signatureOf(plateImg);
    const refSig = signatureOf(refImg);
    const similarity = compareSignatures(plateSig, refSig);
    let oppositeSimilarity: number | null = null;
    if (otherRef) {
      const otherImg = await decodePng(otherRef);
      if (otherImg) oppositeSimilarity = compareSignatures(plateSig, signatureOf(otherImg));
    }

    const renderedMode: VisualMode = plateSig.luminance < 0.5 ? "dark" : "light";
    const check: VisualSlideCheck = {
      ...base,
      similarity,
      oppositeSimilarity,
      plateLuminance: plateSig.luminance,
      renderedMode,
      status: "match",
      detail: `${Math.round(similarity * 100)}% match with the ${want.expectedMode} editor render.`,
    };

    const swapped =
      renderedMode !== want.expectedMode &&
      (oppositeSimilarity === null || oppositeSimilarity > similarity);
    if (swapped) {
      check.status = "mode-mismatch";
      check.detail = `Exported ${renderedMode} but the editor renders this slide ${want.expectedMode}.`;
      issues.push({
        level: "error",
        code: "mode-mismatch",
        message: `Slide ${i + 1} (${want.variantId}) exported in ${renderedMode} mode but the editor renders it ${want.expectedMode}.`,
      });
    } else if (similarity < threshold) {
      check.status = "drift";
      check.detail = `Only ${Math.round(similarity * 100)}% match with the ${want.expectedMode} editor render (needs ${Math.round(threshold * 100)}%).`;
      issues.push({
        level: "warning",
        code: "drift",
        message: `Slide ${i + 1} (${want.variantId}) looks different from the editor (${Math.round(similarity * 100)}% match).`,
      });
    }
    slides.push(check);
  }

  const checked = slides.filter((s) => s.status !== "skipped").length;
  return {
    ok: !issues.some((i) => i.level === "error"),
    threshold,
    checked,
    skipped: slides.length - checked,
    slides,
    issues,
  };
}
