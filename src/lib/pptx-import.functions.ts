// Server function: parse an uploaded .pptx into slide records + high-fidelity
// extras (embedded images per slide, theme accent colors). Text, images, and
// theme are returned; the caller then re-authors each slide onto a
// TransPerfect module variant via pptx-mapping (preserving imagery where the
// slide had a picture, and preserving theme colors as a deck-level override).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type ParsedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  /** Per-slide embedded images, in reading order. Base64 data URLs. */
  images: string[];
};

export type ParsedTheme = {
  /** Hex (e.g. `#003FC7`) — first accent, used as `primary` override. */
  accent1?: string;
  /** Hex — second accent, used as `accent`. */
  accent2?: string;
  /** Hex — background dark 1 (dk1). */
  dark1?: string;
  /** Body font family, if resolvable. */
  bodyFont?: string;
  /** Heading font family, if resolvable. */
  headingFont?: string;
};

export type ParsedDeck = {
  filename: string;
  slideCount: number;
  slides: ParsedSlide[];
  theme: ParsedTheme;
  /** Total base64 image payload size (bytes). Useful for UI. */
  imagePayloadBytes: number;
  /** True if some images were skipped (over the per-image or total cap). */
  imagesTruncated: boolean;
};

const InputSchema = z.object({
  filename: z.string().min(1).max(300),
  // Base64-encoded .pptx bytes. Capped at ~30MB base64 (~22MB raw).
  data: z.string().min(1).max(40_000_000),
});

// Caps to keep localStorage usable. Users can raise these later if needed.
const MAX_PER_IMAGE_BYTES = 900_000; // ~900KB per image (base64 payload)
const MAX_TOTAL_IMAGE_BYTES = 10_000_000; // ~10MB across the whole deck
const MAX_IMAGES_PER_SLIDE = 6;

export const importPowerpoint = createServerFn({ method: "POST" })
  .inputValidator((v) => InputSchema.parse(v))
  .handler(async ({ data }): Promise<ParsedDeck> => {
    const buf = Buffer.from(data.data, "base64");
    return parsePptxBuffer(buf, data.filename);
  });

/** Plain helper — parses a .pptx buffer into a ParsedDeck. Reusable from other server functions. */
export async function parsePptxBuffer(buf: Buffer | Uint8Array, filename: string): Promise<ParsedDeck> {
    if (buf.length < 32) throw new Error("File is empty or invalid.");
    // PPTX is a zip; magic bytes PK\x03\x04
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
      throw new Error("Not a PowerPoint file (missing zip signature).");
    }
    const zip = await JSZip.loadAsync(buf);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      preserveOrder: false,
      trimValues: true,
    });


    // ── Theme ─────────────────────────────────────────────────────────────
    const theme = await extractTheme(zip, parser);

    const slideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => slideNumber(a) - slideNumber(b));

    if (slideFiles.length === 0) {
      throw new Error("No slides found in this .pptx.");
    }

    const slides: ParsedSlide[] = [];
    let totalImageBytes = 0;
    let imagesTruncated = false;

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const xml = await zip.files[slidePath].async("string");
      const doc = parser.parse(xml);
      const shapes = extractShapes(doc);
      let title = "";
      const bodyParas: string[] = [];
      for (const sh of shapes) {
        const clean = sh.paragraphs.map((p) => p.trim()).filter(Boolean);
        if (sh.isTitle && !title && clean.length > 0) {
          title = clean.join(" ").trim();
        } else {
          bodyParas.push(...clean);
        }
      }
      if (!title && bodyParas.length > 0) {
        // Promote the shortest early paragraph as title heuristic.
        title = bodyParas.shift() ?? "";
      }

      // ── Speaker notes ────────────────────────────────────────────────
      const notesFile = `ppt/notesSlides/notesSlide${slideNumber(slidePath)}.xml`;
      let notes = "";
      if (zip.files[notesFile]) {
        const nxml = await zip.files[notesFile].async("string");
        const ndoc = parser.parse(nxml);
        const nshapes = extractShapes(ndoc);
        notes = nshapes
          .flatMap((s) => s.paragraphs)
          .map((p) => p.trim())
          .filter(Boolean)
          .join("\n");
      }

      // ── Embedded images ──────────────────────────────────────────────
      const images: string[] = [];
      const relsPath = `ppt/slides/_rels/slide${slideNumber(slidePath)}.xml.rels`;
      if (zip.files[relsPath]) {
        const relsXml = await zip.files[relsPath].async("string");
        const relsDoc = parser.parse(relsXml);
        const imageTargets = extractImageRelTargets(relsDoc);
        // The order of embeds inside the slide XML determines reading order.
        const embedIds = extractEmbedIds(doc);
        const ordered = embedIds
          .map((id) => imageTargets[id])
          .filter((t): t is string => Boolean(t));
        // Also fall back to any image rels not referenced (rare).
        const seen = new Set(ordered);
        for (const t of Object.values(imageTargets)) if (!seen.has(t)) ordered.push(t);

        for (const target of ordered.slice(0, MAX_IMAGES_PER_SLIDE)) {
          if (totalImageBytes >= MAX_TOTAL_IMAGE_BYTES) {
            imagesTruncated = true;
            break;
          }
          // rels targets look like "../media/image3.png"
          const resolved = resolveRelPath(slidePath, target);
          const entry = zip.files[resolved];
          if (!entry) continue;
          const bin = await entry.async("uint8array");
          if (bin.byteLength === 0) continue;
          const mime = guessMime(resolved);
          if (!mime) continue;
          const b64 = uint8ToBase64(bin);
          const dataUrl = `data:${mime};base64,${b64}`;
          if (dataUrl.length > MAX_PER_IMAGE_BYTES) {
            imagesTruncated = true;
            continue;
          }
          if (totalImageBytes + dataUrl.length > MAX_TOTAL_IMAGE_BYTES) {
            imagesTruncated = true;
            continue;
          }
          images.push(dataUrl);
          totalImageBytes += dataUrl.length;
        }
      }

      slides.push({
        index: i,
        title: cap(title, 240) || `Slide ${i + 1}`,
        bullets: bodyParas.map((b) => cap(b, 400)).slice(0, 16),
        notes: cap(notes, 2000),
        images,
      });
    }

    return {
      filename,
      slideCount: slides.length,
      slides,
      theme,
      imagePayloadBytes: totalImageBytes,
      imagesTruncated,
    };
}


function slideNumber(path: string): number {
  const m = path.match(/(\d+)\.xml$/);
  return m ? Number(m[1]) : 0;
}

function cap(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

type ShapeInfo = { isTitle: boolean; paragraphs: string[] };

function extractShapes(doc: unknown): ShapeInfo[] {
  const shapes: ShapeInfo[] = [];
  walk(doc, (value, key) => {
    if (key !== "p:sp") return;
    const arr = Array.isArray(value) ? value : [value];
    for (const sp of arr) shapes.push(readShape(sp));
  });
  return shapes;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readShape(sp: any): ShapeInfo {
  const phType = sp?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"]?.["@_type"];
  const isTitle = phType === "title" || phType === "ctrTitle";
  const paragraphs: string[] = [];
  const tx = sp?.["p:txBody"];
  if (tx) {
    const paras = tx["a:p"];
    const arr = Array.isArray(paras) ? paras : paras ? [paras] : [];
    for (const p of arr) {
      const text = readParagraphText(p);
      if (text) paragraphs.push(text);
    }
  }
  return { isTitle, paragraphs };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readParagraphText(p: any): string {
  const parts: string[] = [];
  const runs = p?.["a:r"];
  const runArr = Array.isArray(runs) ? runs : runs ? [runs] : [];
  for (const r of runArr) {
    const t = r?.["a:t"];
    if (typeof t === "string") parts.push(t);
    else if (t && typeof t === "object" && "#text" in t) parts.push(String(t["#text"]));
  }
  const fld = p?.["a:fld"];
  const fldArr = Array.isArray(fld) ? fld : fld ? [fld] : [];
  for (const f of fldArr) {
    const t = f?.["a:t"];
    if (typeof t === "string") parts.push(t);
  }
  return parts.join("").replace(/\s+/g, " ").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walk(node: any, visit: (value: any, key: string) => void) {
  if (!node || typeof node !== "object") return;
  for (const key of Object.keys(node)) {
    const value = node[key];
    visit(value, key);
    if (value && typeof value === "object") walk(value, visit);
  }
}

// ─── Image extraction helpers ────────────────────────────────────────────

// Reads `<a:blip r:embed="rIdX"/>` in slide reading order.
function extractEmbedIds(doc: unknown): string[] {
  const ids: string[] = [];
  walk(doc, (value, key) => {
    if (key !== "a:blip") return;
    const arr = Array.isArray(value) ? value : [value];
    for (const b of arr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (b as any)?.["@_r:embed"] ?? (b as any)?.["@_embed"];
      if (typeof id === "string") ids.push(id);
    }
  });
  return ids;
}

// Reads a slide _rels file and returns { rIdX: "../media/imageN.png" } for
// every relationship whose Type is an image.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageRelTargets(relsDoc: any): Record<string, string> {
  const out: Record<string, string> = {};
  const rels = relsDoc?.Relationships?.Relationship;
  const arr = Array.isArray(rels) ? rels : rels ? [rels] : [];
  for (const r of arr) {
    const type = r?.["@_Type"] as string | undefined;
    const id = r?.["@_Id"] as string | undefined;
    const target = r?.["@_Target"] as string | undefined;
    if (!id || !target) continue;
    if (type && !/\/image$/i.test(type) && !/\/image\b/i.test(type)) continue;
    out[id] = target;
  }
  return out;
}

function resolveRelPath(slidePath: string, target: string): string {
  // slidePath: "ppt/slides/slide1.xml"; target: "../media/image1.png"
  const dir = slidePath.split("/").slice(0, -1).join("/"); // "ppt/slides"
  const segments = [...dir.split("/"), ...target.split("/")];
  const stack: string[] = [];
  for (const s of segments) {
    if (s === "" || s === ".") continue;
    if (s === "..") stack.pop();
    else stack.push(s);
  }
  return stack.join("/");
}

function guessMime(path: string): string | null {
  const ext = path.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return null; // skip emf/wmf/tiff — browsers can't render them anyway
  }
}

function uint8ToBase64(u8: Uint8Array): string {
  // Buffer is available in the Cloudflare Worker runtime with nodejs_compat.
  return Buffer.from(u8).toString("base64");
}

// ─── Theme extraction ────────────────────────────────────────────────────

async function extractTheme(zip: JSZip, parser: XMLParser): Promise<ParsedTheme> {
  const themeFile = Object.keys(zip.files).find((f) =>
    /^ppt\/theme\/theme\d+\.xml$/.test(f),
  );
  if (!themeFile) return {};
  try {
    const xml = await zip.files[themeFile].async("string");
    const doc = parser.parse(xml);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheme = (doc as any)?.["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
    const fontScheme = // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any)?.["a:theme"]?.["a:themeElements"]?.["a:fontScheme"];
    const theme: ParsedTheme = {
      accent1: readSchemeColor(scheme?.["a:accent1"]),
      accent2: readSchemeColor(scheme?.["a:accent2"]),
      dark1: readSchemeColor(scheme?.["a:dk1"]) ?? readSchemeColor(scheme?.["a:dk2"]),
      headingFont: fontScheme?.["a:majorFont"]?.["a:latin"]?.["@_typeface"],
      bodyFont: fontScheme?.["a:minorFont"]?.["a:latin"]?.["@_typeface"],
    };
    return theme;
  } catch {
    return {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSchemeColor(node: any): string | undefined {
  if (!node) return undefined;
  const srgb = node?.["a:srgbClr"]?.["@_val"];
  if (typeof srgb === "string" && /^[0-9a-fA-F]{6}$/.test(srgb)) return `#${srgb.toUpperCase()}`;
  const sys = node?.["a:sysClr"]?.["@_lastClr"];
  if (typeof sys === "string" && /^[0-9a-fA-F]{6}$/.test(sys)) return `#${sys.toUpperCase()}`;
  return undefined;
}
