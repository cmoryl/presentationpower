// Server function: parse an uploaded .pptx into text-only slide records.
// We only extract titles, paragraphs (as bullets), and speaker notes.
// Layout, colors, fonts, and images are intentionally discarded — the caller
// re-authors each slide onto a TransPerfect module variant via pptx-mapping.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type ParsedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
};

export type ParsedDeck = {
  filename: string;
  slideCount: number;
  slides: ParsedSlide[];
};

const InputSchema = z.object({
  filename: z.string().min(1).max(300),
  // Base64-encoded .pptx bytes. Capped at ~30MB base64 (~22MB raw).
  data: z.string().min(1).max(40_000_000),
});

export const importPowerpoint = createServerFn({ method: "POST" })
  .inputValidator((v) => InputSchema.parse(v))
  .handler(async ({ data }): Promise<ParsedDeck> => {
    const buf = Buffer.from(data.data, "base64");
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

    const slideFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => slideNumber(a) - slideNumber(b));

    if (slideFiles.length === 0) {
      throw new Error("No slides found in this .pptx.");
    }

    const slides: ParsedSlide[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.files[slideFiles[i]].async("string");
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

      // Notes
      const notesFile = `ppt/notesSlides/notesSlide${slideNumber(slideFiles[i])}.xml`;
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

      slides.push({
        index: i,
        title: cap(title, 240) || `Slide ${i + 1}`,
        bullets: bodyParas.map((b) => cap(b, 400)).slice(0, 16),
        notes: cap(notes, 2000),
      });
    }

    return { filename: data.filename, slideCount: slides.length, slides };
  });

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
