// Server function: parse an uploaded .pptx into slide records + high-fidelity
// extras. In addition to text, embedded images, and theme colors, the parser
// also extracts structured graphical elements per slide:
//   - charts   (from ppt/charts/chartN.xml)   → typed series + categories
//   - tables   (from a:tbl inside slide XML)  → rows × cells of text
//   - diagrams (SmartArt from ppt/diagrams/*) → hierarchical text nodes
//   - shapeText (grouped custom shapes)       → text runs for callout blocks
// Downstream, pptx-mapping re-authors each slide onto a native TransPerfect
// graph/table/process variant when structured graphics are detected, instead
// of collapsing to a text-only callout.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type ParsedChartSeries = {
  label: string;
  values: number[];
  /** Series stroke/fill color in `#RRGGBB` form (from c:spPr on c:ser), when declared. */
  color?: string;
  /** Per-datapoint colors — used for pie/doughnut segments and any c:dPt overrides. */
  pointColors?: string[];
};
export type ParsedChart = {
  /** bar | column | line | area | pie | doughnut | scatter | radar | other */
  kind: "bar" | "column" | "line" | "area" | "pie" | "doughnut" | "scatter" | "radar" | "other";
  title?: string;
  categories: string[];
  series: ParsedChartSeries[];
  /** True if the chart declared stacked/percentStacked grouping. */
  stacked?: boolean;
  /** Legend visibility + position (r/l/t/b/tr) — undefined when unspecified. */
  legend?: { visible: boolean; position?: "r" | "l" | "t" | "b" | "tr" };
  /** Category / value axis titles read from c:catAx/c:title and c:valAx/c:title. */
  axis?: { category?: string; value?: string };
  /** Excel-style number format code (e.g. "0%", "#,##0", "$#,##0"). */
  numberFormat?: string;
  /** Inferred unit character from numberFormat, e.g. "%" or "$". */
  unit?: string;
  /** Source typography — latin font family + primary text color. */
  font?: { family?: string; color?: string };
};

export type ParsedTable = {
  /** Header row (first row of the a:tbl, unstyled — presenter usually bolds it). */
  header: string[];
  rows: string[][];
};

/** SmartArt / diagram node with hierarchy depth (0 = root). */
export type ParsedDiagramNode = {
  text: string;
  level: number;
  /** Node fill color (from prSet/style/solidFill or the shape's spPr) when declared. */
  color?: string;
};
/**
 * High-level layout family inferred from either the SmartArt
 * `layoutDef/@uniqueId` or, for grouped custom shapes, the dominant
 * `prstGeom` present on the group. Downstream mapping (`pptx-mapping.ts`)
 * routes onto native process / timeline / hierarchy / cycle / pyramid /
 * venn / matrix variants.
 */
export type DiagramLayoutHint =
  | "process"
  | "timeline"
  | "cycle"
  | "hierarchy"
  | "pyramid"
  | "venn"
  | "matrix"
  | "radial"
  | "funnel"
  | "list";
export type ParsedDiagram = {
  kind: "smartart" | "shape-group";
  nodes: ParsedDiagramNode[];
  /** Layout family inferred from SmartArt layoutDef or shape geometry. */
  layoutHint?: DiagramLayoutHint;
};

export type ParsedSlide = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  /** Per-slide embedded images, in reading order. Base64 data URLs. */
  images: string[];
  /** Extracted chart definitions in slide reading order. */
  charts: ParsedChart[];
  /** Extracted tables in slide reading order. */
  tables: ParsedTable[];
  /** Extracted diagrams (SmartArt + grouped custom shapes) in reading order. */
  diagrams: ParsedDiagram[];
};

export type ParsedTheme = {
  /** accent1..accent6 in slot order — used to resolve c:schemeClr references. */
  accents: string[];
  accent1?: string;
  accent2?: string;
  dark1?: string;
  light1?: string;
  bodyFont?: string;
  headingFont?: string;
};

export type ParsedDeck = {
  filename: string;
  slideCount: number;
  slides: ParsedSlide[];
  theme: ParsedTheme;
  imagePayloadBytes: number;
  imagesTruncated: boolean;
  /** Aggregate counts across the deck — handy for UX feedback. */
  graphicsSummary: {
    charts: number;
    tables: number;
    diagrams: number;
  };
};


const InputSchema = z.object({
  filename: z.string().min(1).max(300),
  data: z.string().min(1).max(140_000_000),
});

const MAX_PER_IMAGE_BYTES = 900_000;
const MAX_TOTAL_IMAGE_BYTES = 10_000_000;
const MAX_IMAGES_PER_SLIDE = 6;

export const importPowerpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => InputSchema.parse(v))
  .handler(async ({ data }): Promise<ParsedDeck> => {
    const buf = Buffer.from(data.data, "base64");
    return parsePptxBuffer(buf, data.filename);
  });

export async function parsePptxBuffer(buf: Buffer | Uint8Array, filename: string): Promise<ParsedDeck> {
  if (buf.length < 32) throw new Error("File is empty or invalid.");
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

  const theme = await extractTheme(zip, parser);

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  if (slideFiles.length === 0) throw new Error("No slides found in this .pptx.");

  const slides: ParsedSlide[] = [];
  let totalImageBytes = 0;
  let imagesTruncated = false;
  let chartTotal = 0;
  let tableTotal = 0;
  let diagramTotal = 0;

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const xml = await zip.files[slidePath].async("string");
    const doc = parser.parse(xml);

    // ── Text (title + body) ─────────────────────────────────────────────
    const shapes = extractShapes(doc);
    let title = "";
    const bodyParas: string[] = [];
    for (const sh of shapes) {
      const clean = sh.paragraphs.map((p) => p.trim()).filter(Boolean);
      if (sh.isTitle && !title && clean.length > 0) title = clean.join(" ").trim();
      else bodyParas.push(...clean);
    }
    if (!title && bodyParas.length > 0) title = bodyParas.shift() ?? "";

    // ── Speaker notes ───────────────────────────────────────────────────
    const notesFile = `ppt/notesSlides/notesSlide${slideNumber(slidePath)}.xml`;
    let notes = "";
    if (zip.files[notesFile]) {
      const nxml = await zip.files[notesFile].async("string");
      const ndoc = parser.parse(nxml);
      const nshapes = extractShapes(ndoc);
      notes = nshapes.flatMap((s) => s.paragraphs).map((p) => p.trim()).filter(Boolean).join("\n");
    }

    // ── Slide rels (needed for images + charts + diagrams) ──────────────
    const relsPath = `ppt/slides/_rels/slide${slideNumber(slidePath)}.xml.rels`;
    let relsDoc: unknown = null;
    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async("string");
      relsDoc = parser.parse(relsXml);
    }
    const relTargetsByType = extractRelTargetsByType(relsDoc);

    // ── Embedded images ─────────────────────────────────────────────────
    const images: string[] = [];
    if (relsDoc) {
      const imageTargets = relTargetsByType.image;
      const embedIds = extractEmbedIds(doc);
      const ordered = embedIds
        .map((id) => imageTargets[id])
        .filter((t): t is string => Boolean(t));
      const seen = new Set(ordered);
      for (const t of Object.values(imageTargets)) if (!seen.has(t)) ordered.push(t);

      for (const target of ordered.slice(0, MAX_IMAGES_PER_SLIDE)) {
        if (totalImageBytes >= MAX_TOTAL_IMAGE_BYTES) { imagesTruncated = true; break; }
        const resolved = resolveRelPath(slidePath, target);
        const entry = zip.files[resolved];
        if (!entry) continue;
        const bin = await entry.async("uint8array");
        if (bin.byteLength === 0) continue;
        const mime = guessMime(resolved);
        if (!mime) continue;
        const b64 = uint8ToBase64(bin);
        const dataUrl = `data:${mime};base64,${b64}`;
        if (dataUrl.length > MAX_PER_IMAGE_BYTES) { imagesTruncated = true; continue; }
        if (totalImageBytes + dataUrl.length > MAX_TOTAL_IMAGE_BYTES) { imagesTruncated = true; continue; }
        images.push(dataUrl);
        totalImageBytes += dataUrl.length;
      }
    }

    // ── Charts ──────────────────────────────────────────────────────────
    const charts: ParsedChart[] = [];
    for (const target of Object.values(relTargetsByType.chart)) {
      const resolved = resolveRelPath(slidePath, target);
      const entry = zip.files[resolved];
      if (!entry) continue;
      try {
        const cxml = await entry.async("string");
        const cdoc = parser.parse(cxml);
        const parsedCharts = extractChartsFromChartXml(cdoc, theme);
        for (const c of parsedCharts) charts.push(c);
      } catch { /* skip malformed chart */ }
    }


    // ── Tables ──────────────────────────────────────────────────────────
    const tables = extractTables(doc);

    // ── SmartArt diagrams ───────────────────────────────────────────────
    // Each SmartArt on the slide is expressed as a diagramData rel (the
    // text/hierarchy tree) plus a diagramLayout rel (the layout definition
    // whose `uniqueId` tells us if it's a process/cycle/hierarchy/etc.).
    // We pair them positionally — a slide rarely has more than one — and
    // read the layout's `uniqueId` to derive a `layoutHint`.
    const diagrams: ParsedDiagram[] = [];
    const layoutTargets = Object.values(relTargetsByType.diagramLayout);
    const dataTargets = Object.values(relTargetsByType.diagramData);
    for (let di = 0; di < dataTargets.length; di++) {
      const target = dataTargets[di];
      const resolved = resolveRelPath(slidePath, target);
      const entry = zip.files[resolved];
      if (!entry) continue;
      try {
        const dxml = await entry.async("string");
        const ddoc = parser.parse(dxml);
        const nodes = extractDiagramNodes(ddoc, theme);
        if (nodes.length === 0) continue;
        // Resolve paired layout file (if any) and read uniqueId.
        let layoutHint: DiagramLayoutHint | undefined;
        const layoutTarget = layoutTargets[di];
        if (layoutTarget) {
          const layoutPath = resolveRelPath(slidePath, layoutTarget);
          const layoutEntry = zip.files[layoutPath];
          if (layoutEntry) {
            try {
              const lxml = await layoutEntry.async("string");
              const ldoc = parser.parse(lxml);
              layoutHint = readSmartArtLayoutHint(ldoc);
            } catch { /* ignore malformed layout */ }
          }
        }
        // Fall back to inferring from node hierarchy if no layout hint.
        if (!layoutHint && nodes.some((n) => n.level > 0)) layoutHint = "hierarchy";
        diagrams.push({ kind: "smartart", nodes, layoutHint });
      } catch { /* skip */ }
    }
    // Grouped custom shapes → lightweight diagram fallback (only when there
    // is a real group of shapes carrying non-title, non-bullet text).
    const groupDiagram = extractGroupShapeDiagram(doc, theme);

    if (groupDiagram && groupDiagram.nodes.length >= 2) diagrams.push(groupDiagram);

    chartTotal += charts.length;
    tableTotal += tables.length;
    diagramTotal += diagrams.length;

    slides.push({
      index: i,
      title: cap(title, 240) || `Slide ${i + 1}`,
      bullets: bodyParas.map((b) => cap(b, 400)).slice(0, 16),
      notes: cap(notes, 2000),
      images,
      charts,
      tables,
      diagrams,
    });
  }

  return {
    filename,
    slideCount: slides.length,
    slides,
    theme,
    imagePayloadBytes: totalImageBytes,
    imagesTruncated,
    graphicsSummary: { charts: chartTotal, tables: tableTotal, diagrams: diagramTotal },
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

// ─── Rel targets grouped by type ─────────────────────────────────────────
type RelBuckets = {
  image: Record<string, string>;
  chart: Record<string, string>;
  diagramData: Record<string, string>;
  diagramLayout: Record<string, string>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRelTargetsByType(relsDoc: any): RelBuckets {
  const out: RelBuckets = { image: {}, chart: {}, diagramData: {}, diagramLayout: {} };
  if (!relsDoc) return out;
  const rels = relsDoc?.Relationships?.Relationship;
  const arr = Array.isArray(rels) ? rels : rels ? [rels] : [];
  for (const r of arr) {
    const type = String(r?.["@_Type"] ?? "");
    const id = r?.["@_Id"] as string | undefined;
    const target = r?.["@_Target"] as string | undefined;
    if (!id || !target) continue;
    if (/\/image$/i.test(type) || /\/image\b/i.test(type)) out.image[id] = target;
    else if (/\/chart$/i.test(type)) out.chart[id] = target;
    else if (/\/diagramData$/i.test(type)) out.diagramData[id] = target;
    else if (/\/diagramLayout$/i.test(type)) out.diagramLayout[id] = target;
  }
  return out;
}

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

function resolveRelPath(slidePath: string, target: string): string {
  const dir = slidePath.split("/").slice(0, -1).join("/");
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
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return null;
  }
}

function uint8ToBase64(u8: Uint8Array): string {
  return Buffer.from(u8).toString("base64");
}

// ─── Chart extraction ────────────────────────────────────────────────────
// Handles c:barChart (bar/column), c:lineChart, c:pieChart, c:doughnutChart,
// c:areaChart, c:scatterChart, c:radarChart. Multiple chart types in one
// chartSpace are returned as separate entries.

const CHART_KIND_MAP: Record<string, ParsedChart["kind"]> = {
  "c:barChart": "bar", // resolved to "column" if barDir=col below
  "c:lineChart": "line",
  "c:pieChart": "pie",
  "c:doughnutChart": "doughnut",
  "c:areaChart": "area",
  "c:scatterChart": "scatter",
  "c:radarChart": "radar",
};

function extractChartsFromChartXml(cdoc: unknown, theme: ParsedTheme): ParsedChart[] {
  const out: ParsedChart[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chart = (cdoc as any)?.["c:chartSpace"]?.["c:chart"];
  const plotArea = chart?.["c:plotArea"];
  const chartTitle = readChartTitle(chart?.["c:title"]);
  const legend = readLegend(chart?.["c:legend"]);
  const axis = readAxisTitles(plotArea);
  const chartFont = readTxPrFont(chart?.["c:txPr"], theme);
  if (!plotArea || typeof plotArea !== "object") return out;

  for (const key of Object.keys(plotArea)) {
    const baseKind = CHART_KIND_MAP[key];
    if (!baseKind) continue;
    const nodes = Array.isArray(plotArea[key]) ? plotArea[key] : [plotArea[key]];
    for (const node of nodes) {
      let kind = baseKind;
      if (key === "c:barChart") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dir = (node as any)?.["c:barDir"]?.["@_val"];
        kind = dir === "col" ? "column" : "bar";
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouping = (node as any)?.["c:grouping"]?.["@_val"] as string | undefined;
      const stacked = grouping === "stacked" || grouping === "percentStacked";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serRaw = (node as any)?.["c:ser"];
      const serArr = Array.isArray(serRaw) ? serRaw : serRaw ? [serRaw] : [];
      let categories: string[] = [];
      const series: ParsedChartSeries[] = [];
      let numberFormat: string | undefined;
      for (const s of serArr) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const label = readNumStrTitle((s as any)?.["c:tx"]) ?? `Series ${series.length + 1}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cats = readCategoryValues((s as any)?.["c:cat"]);
        if (cats.length && categories.length === 0) categories = cats;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vals = readNumValues((s as any)?.["c:val"]);
        if (!numberFormat) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          numberFormat = (s as any)?.["c:val"]?.["c:numRef"]?.["c:numCache"]?.["c:formatCode"];
          if (numberFormat && typeof numberFormat === "object" && "#text" in (numberFormat as object)) {
            numberFormat = String((numberFormat as { "#text": unknown })["#text"]);
          }
          if (typeof numberFormat !== "string") numberFormat = undefined;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const seriesColor = readShapeColor((s as any)?.["c:spPr"], theme);
        // Per-datapoint color overrides (pie/donut segments especially).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dPtRaw = (s as any)?.["c:dPt"];
        const dPts = Array.isArray(dPtRaw) ? dPtRaw : dPtRaw ? [dPtRaw] : [];
        let pointColors: string[] | undefined;
        if (dPts.length > 0) {
          pointColors = [];
          for (const p of dPts) {
            const idx = Number(p?.["c:idx"]?.["@_val"] ?? -1);
            const col = readShapeColor(p?.["c:spPr"], theme);
            if (Number.isFinite(idx) && idx >= 0 && col) pointColors[idx] = col;
          }
          // Compact undefineds → keep the array length matching declared points.
          if (pointColors.every((c) => !c)) pointColors = undefined;
        }
        if (vals.length > 0) {
          series.push({
            label,
            values: vals,
            color: seriesColor,
            pointColors,
          });
        }
      }
      if (series.length > 0) {
        const unit = inferUnitFromFormat(numberFormat);
        out.push({
          kind,
          title: chartTitle,
          categories: categories.length ? categories : series[0].values.map((_, i) => `Item ${i + 1}`),
          series,
          stacked,
          legend,
          axis,
          numberFormat,
          unit,
          font: chartFont,
        });
      }
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLegend(l: any): ParsedChart["legend"] {
  if (l == null) return undefined;
  const posRaw = l?.["c:legendPos"]?.["@_val"];
  const pos: "r" | "l" | "t" | "b" | "tr" | undefined =
    posRaw === "r" || posRaw === "l" || posRaw === "t" || posRaw === "b" || posRaw === "tr" ? posRaw : undefined;
  // c:overlay does not turn the legend off — a missing c:legend does.
  return { visible: true, position: pos };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAxisTitles(plotArea: any): ParsedChart["axis"] {
  if (!plotArea) return undefined;
  const catTitle = readChartTitle(plotArea?.["c:catAx"]?.["c:title"]);
  const valTitle = readChartTitle(plotArea?.["c:valAx"]?.["c:title"]);
  if (!catTitle && !valTitle) return undefined;
  return { category: catTitle, value: valTitle };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readTxPrFont(txPr: any, theme: ParsedTheme): ParsedChart["font"] | undefined {
  if (!txPr) return undefined;
  const defRPr = txPr?.["a:p"]?.["a:pPr"]?.["a:defRPr"] ?? txPr?.["a:bodyPr"]?.["a:defRPr"];
  const family = defRPr?.["a:latin"]?.["@_typeface"] ?? theme.bodyFont;
  const color = readFillColor(defRPr?.["a:solidFill"], theme) ?? theme.dark1;
  if (!family && !color) return undefined;
  return { family, color };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readShapeColor(spPr: any, theme: ParsedTheme): string | undefined {
  if (!spPr) return undefined;
  return (
    readFillColor(spPr?.["a:solidFill"], theme) ??
    readFillColor(spPr?.["a:gradFill"]?.["a:gsLst"]?.["a:gs"]?.[0], theme) ??
    readFillColor(spPr?.["a:ln"]?.["a:solidFill"], theme)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readFillColor(fill: any, theme: ParsedTheme): string | undefined {
  if (!fill) return undefined;
  const srgb = fill?.["a:srgbClr"]?.["@_val"];
  if (typeof srgb === "string" && /^[0-9a-fA-F]{6}$/.test(srgb)) return `#${srgb.toUpperCase()}`;
  const scheme = fill?.["a:schemeClr"]?.["@_val"];
  if (typeof scheme === "string") {
    const m = /^accent([1-6])$/.exec(scheme);
    if (m) {
      const idx = Number(m[1]) - 1;
      return theme.accents[idx];
    }
    if (scheme === "dk1" || scheme === "dk2" || scheme === "tx1") return theme.dark1;
    if (scheme === "lt1" || scheme === "lt2" || scheme === "bg1") return theme.light1;
  }
  const sys = fill?.["a:sysClr"]?.["@_lastClr"];
  if (typeof sys === "string" && /^[0-9a-fA-F]{6}$/.test(sys)) return `#${sys.toUpperCase()}`;
  return undefined;
}

function inferUnitFromFormat(fmt: string | undefined): string | undefined {
  if (!fmt) return undefined;
  if (/%/.test(fmt)) return "%";
  if (/\$/.test(fmt)) return "$";
  if (/€/.test(fmt)) return "€";
  if (/£/.test(fmt)) return "£";
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readChartTitle(t: any): string | undefined {
  if (!t) return undefined;
  const runs: string[] = [];
  walk(t, (v, k) => {
    if (k === "a:t") {
      if (typeof v === "string") runs.push(v);
      else if (v && typeof v === "object" && "#text" in v) runs.push(String(v["#text"]));
    }
  });
  const s = runs.join("").trim();
  return s.length ? s : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readNumStrTitle(tx: any): string | undefined {

  if (!tx) return undefined;
  // c:tx/c:strRef/c:strCache/c:pt/c:v  OR  c:tx/c:v

  const cache = tx?.["c:strRef"]?.["c:strCache"] ?? tx?.["c:numRef"]?.["c:numCache"];
  const pts = cache?.["c:pt"];
  const arr = Array.isArray(pts) ? pts : pts ? [pts] : [];
  if (arr.length > 0) {
    const v = arr[0]?.["c:v"];
    if (typeof v === "string") return v.trim();
    if (v && typeof v === "object" && "#text" in v) return String(v["#text"]).trim();
  }
  const rich = tx?.["c:rich"];
  if (rich) {
    const runs: string[] = [];
    walk(rich, (val, k) => {
      if (k === "a:t") {
        if (typeof val === "string") runs.push(val);
        else if (val && typeof val === "object" && "#text" in val) runs.push(String(val["#text"]));
      }
    });
    const s = runs.join("").trim();
    if (s) return s;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCategoryValues(cat: any): string[] {
  if (!cat) return [];
  const cache = cat?.["c:strRef"]?.["c:strCache"] ?? cat?.["c:numRef"]?.["c:numCache"] ?? cat?.["c:strLit"] ?? cat?.["c:numLit"];
  if (!cache) return [];
  const pts = cache?.["c:pt"];
  const arr = Array.isArray(pts) ? pts : pts ? [pts] : [];
  return arr.map((p) => {
    const v = p?.["c:v"];
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "#text" in v) return String(v["#text"]);
    return "";
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readNumValues(val: any): number[] {
  if (!val) return [];
  const cache = val?.["c:numRef"]?.["c:numCache"] ?? val?.["c:numLit"];
  if (!cache) return [];
  const pts = cache?.["c:pt"];
  const arr = Array.isArray(pts) ? pts : pts ? [pts] : [];
  return arr.map((p) => {
    const v = p?.["c:v"];
    const raw = typeof v === "string" ? v : (v && typeof v === "object" && "#text" in v) ? String(v["#text"]) : "";
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  });
}

// ─── Table extraction ────────────────────────────────────────────────────
function extractTables(doc: unknown): ParsedTable[] {
  const tables: ParsedTable[] = [];
  walk(doc, (value, key) => {
    if (key !== "a:tbl") return;
    const arr = Array.isArray(value) ? value : [value];
    for (const t of arr) {
      const rowsRaw = t?.["a:tr"];
      const rows = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw ? [rowsRaw] : [];
      const cells: string[][] = [];
      for (const row of rows) {
        const tcRaw = row?.["a:tc"];
        const tcArr = Array.isArray(tcRaw) ? tcRaw : tcRaw ? [tcRaw] : [];
        const cellTexts: string[] = [];
        for (const tc of tcArr) {
          const tx = tc?.["a:txBody"];
          const paras = tx?.["a:p"];
          const pArr = Array.isArray(paras) ? paras : paras ? [paras] : [];
          const s = pArr.map((p) => readParagraphText(p)).filter(Boolean).join(" ").trim();
          cellTexts.push(cap(s, 200));
        }
        cells.push(cellTexts);
      }
      if (cells.length >= 2 && cells[0].length >= 2) {
        const [header, ...rest] = cells;
        tables.push({ header, rows: rest.slice(0, 20) });
      }
    }
  });
  return tables;
}

// ─── SmartArt / diagram nodes ────────────────────────────────────────────
function extractDiagramNodes(ddoc: unknown, theme: ParsedTheme): ParsedDiagramNode[] {
  const nodes: ParsedDiagramNode[] = [];
  // dgm:dataModel/dgm:ptLst/dgm:pt (type="node") each with dgm:t/a:p/a:r/a:t
  // and dgm:prSet/@lvl or presLayoutVars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ptLst = (ddoc as any)?.["dgm:dataModel"]?.["dgm:ptLst"]?.["dgm:pt"];
  const arr = Array.isArray(ptLst) ? ptLst : ptLst ? [ptLst] : [];
  for (const pt of arr) {
    const type = pt?.["@_type"] as string | undefined;
    if (type && type !== "node" && type !== "asst") continue;
    const paras = pt?.["dgm:t"]?.["a:p"];
    const pArr = Array.isArray(paras) ? paras : paras ? [paras] : [];
    const text = pArr.map((p: unknown) => readParagraphText(p)).filter(Boolean).join(" ").trim();
    if (!text) continue;
    const lvl = Number(pt?.["dgm:prSet"]?.["@_custT"] ?? pt?.["dgm:prSet"]?.["@_lvl"] ?? 0);
    // dgm:spPr sometimes present on the point; fall back to prSet/style solidFill.
    const color =
      readShapeColor(pt?.["dgm:spPr"], theme) ??
      readFillColor(pt?.["dgm:prSet"]?.["dgm:style"]?.["a:fillRef"]?.["a:srgbClr"] ? pt?.["dgm:prSet"]?.["dgm:style"]?.["a:fillRef"] : undefined, theme);
    nodes.push({ text: cap(text, 200), level: Number.isFinite(lvl) ? lvl : 0, color });
  }
  return nodes.slice(0, 24);
}

// ─── Grouped custom shapes (lightweight diagram fallback) ────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGroupShapeDiagram(doc: unknown, theme: ParsedTheme): ParsedDiagram | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bestGroup: any | null = null;
  let bestCount = 0;
  walk(doc, (value, key) => {
    if (key !== "p:grpSp") return;
    const arr = Array.isArray(value) ? value : [value];
    for (const g of arr) {
      const sps = g?.["p:sp"];
      const spArr = Array.isArray(sps) ? sps : sps ? [sps] : [];
      if (spArr.length > bestCount) { bestCount = spArr.length; bestGroup = g; }
    }
  });
  if (!bestGroup || bestCount < 3) return null;
  const sps = Array.isArray(bestGroup["p:sp"]) ? bestGroup["p:sp"] : [bestGroup["p:sp"]];
  const nodes: ParsedDiagramNode[] = [];
  for (const sp of sps) {
    const info = readShape(sp);
    const text = info.paragraphs.map((p) => p.trim()).filter(Boolean).join(" ").trim();
    if (!text) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const color = readShapeColor((sp as any)?.["p:spPr"], theme);
    nodes.push({ text: cap(text, 200), level: 0, color });
  }
  if (nodes.length < 2) return null;
  return { kind: "shape-group", nodes };

}

// ─── Theme extraction ────────────────────────────────────────────────────
const EMPTY_THEME: ParsedTheme = { accents: [] };

async function extractTheme(zip: JSZip, parser: XMLParser): Promise<ParsedTheme> {
  const themeFile = Object.keys(zip.files).find((f) => /^ppt\/theme\/theme\d+\.xml$/.test(f));
  if (!themeFile) return { ...EMPTY_THEME };
  try {
    const xml = await zip.files[themeFile].async("string");
    const doc = parser.parse(xml);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheme = (doc as any)?.["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fontScheme = (doc as any)?.["a:theme"]?.["a:themeElements"]?.["a:fontScheme"];
    const accents = [
      readSchemeColor(scheme?.["a:accent1"]),
      readSchemeColor(scheme?.["a:accent2"]),
      readSchemeColor(scheme?.["a:accent3"]),
      readSchemeColor(scheme?.["a:accent4"]),
      readSchemeColor(scheme?.["a:accent5"]),
      readSchemeColor(scheme?.["a:accent6"]),
    ].filter((c): c is string => Boolean(c));
    return {
      accents,
      accent1: accents[0],
      accent2: accents[1],
      dark1: readSchemeColor(scheme?.["a:dk1"]) ?? readSchemeColor(scheme?.["a:dk2"]),
      light1: readSchemeColor(scheme?.["a:lt1"]) ?? readSchemeColor(scheme?.["a:lt2"]),
      headingFont: fontScheme?.["a:majorFont"]?.["a:latin"]?.["@_typeface"],
      bodyFont: fontScheme?.["a:minorFont"]?.["a:latin"]?.["@_typeface"],
    };
  } catch {
    return { ...EMPTY_THEME };
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
