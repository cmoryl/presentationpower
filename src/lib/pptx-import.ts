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
export type ConnectorStyle = {
  /** Stroke color resolved through theme (hex, e.g. "#003FC7"). */
  color?: string;
  /** Line width in points (EMU / 12700). */
  widthPt?: number;
  /** DrawingML preset dash value: solid, dash, dashDot, sysDash, dot, etc. */
  dashStyle?: string;
  /** Head arrowhead type: triangle, stealth, arrow, oval, diamond, none. */
  headArrow?: string;
  /** Tail arrowhead type. */
  tailArrow?: string;
};
export type ParsedDiagram = {
  kind: "smartart" | "shape-group";
  nodes: ParsedDiagramNode[];
  /** Layout family inferred from SmartArt layoutDef or shape geometry. */
  layoutHint?: DiagramLayoutHint;
  /** Every connector line style discovered in the diagram, in reading order. */
  connectors?: ConnectorStyle[];
  /** Dominant/aggregated connector style — used by renderers/exporters. */
  connectorStyle?: ConnectorStyle;
};

// ─── Faithful slide layout (positions / z-order / styling) ─────────────
// Everything below is what lets us render an imported slide 1:1 the way it
// looks in PowerPoint. Frames are in inches (EMU / 914400). Coordinates use
// slide-space (already flattened through any parent group transforms).

export type LayoutFrame = {
  x: number; y: number; w: number; h: number;
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
};
export type LayoutSrcRect = { l: number; t: number; r: number; b: number };
export type LayoutFill =
  | { kind: "solid"; color: string; opacity?: number }
  | { kind: "gradient"; stops: Array<{ pos: number; color: string; opacity?: number }>; angle: number; radial?: boolean }
  | { kind: "image"; embedId?: string; path?: string; srcRect?: LayoutSrcRect; opacity?: number; tile?: boolean; duotone?: [string, string] }
  | { kind: "pattern"; preset: string; fg?: string; bg?: string }
  | { kind: "none" };
export type LayoutLine = {
  color?: string;
  widthPt?: number;
  dashStyle?: string;
  headArrow?: string;
  tailArrow?: string;
  /** butt | rnd | sq. */
  cap?: "flat" | "rnd" | "sq";
  /** sng | dbl | thickThin | thinThick | tri. */
  cmpd?: "sng" | "dbl" | "thickThin" | "thinThick" | "tri";
  /** round | bevel | miter. */
  join?: "round" | "bevel" | "miter";
};
/** Shape / text / image effects lifted from `<a:effectLst>` or `<a:effectDag>`. */
export type LayoutEffect = {
  outerShadow?: { color: string; blurPx?: number; distPx?: number; dirDeg?: number; opacity?: number };
  innerShadow?: { color: string; blurPx?: number; distPx?: number; dirDeg?: number; opacity?: number };
  glow?: { color: string; radPx: number };
  softEdge?: { radPx: number };
  reflection?: boolean;
  /** Blur radius in px for `a:blur`. */
  blur?: number;
};
export type LayoutRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  sizePt?: number;
  color?: string;
  font?: string;
  /** Character spacing in 1/100th pt. */
  spacingPct?: number;
  /** all | small | none. */
  cap?: "all" | "small" | "none";
  /** Baseline offset % (negative → subscript, positive → superscript). */
  baselinePct?: number;
  /** URL for `a:hlinkClick`. */
  hlink?: string;
};
export type LayoutPara = {
  align?: "l" | "ctr" | "r" | "just";
  level?: number;
  bullet?: "char" | "auto" | "none";
  /** Actual bullet character when `bullet === "char"` (e.g. "•" "▪" "●"). */
  bulletChar?: string;
  /** Bullet auto-num type (arabicPeriod, romanUcPeriod, etc.). */
  bulletAutoNum?: string;
  bulletFont?: string;
  bulletColor?: string;
  /** Left margin in inches (paragraph marL). */
  marLIn?: number;
  /** First-line indent in inches (positive → indent, negative → hanging). */
  indentIn?: number;
  /** Space before / after in points. */
  spcBeforePt?: number;
  spcAfterPt?: number;
  /** Line spacing — either a multiplier (`{ mult: 1.15 }`) or points (`{ pt: 18 }`). */
  lineSpacing?: { mult: number } | { pt: number };
  runs: LayoutRun[];
};
export type LayoutTextBody = {
  paras: LayoutPara[];
  anchor?: "t" | "ctr" | "b";
  /** Body insets in inches (default 0.1 / 0.05 / 0.1 / 0.05). */
  insets?: { l: number; t: number; r: number; b: number };
  /** `normAutofit` scale (0-1) applied to run size. */
  fontScale?: number;
  /** `normAutofit` line-spacing reduction (0-1). */
  lnSpcReduction?: number;
  /** True when body uses `spAutoFit` (shrink shape to text). */
  spAutoFit?: boolean;
  /** Text rotation in degrees. */
  rotDeg?: number;
  /** Text wrap on/off. */
  wrap?: boolean;
  /** vert270 | vert | wordArtVert | eaVert etc — vertical text direction. */
  vert?: string;
  /** Number of columns. */
  numCol?: number;
};
export type TableCell = {
  text: LayoutTextBody;
  fill?: LayoutFill;
  borders?: { l?: LayoutLine; t?: LayoutLine; r?: LayoutLine; b?: LayoutLine };
  /** cell margins in inches. */
  margins?: { l: number; t: number; r: number; b: number };
  colSpan?: number;
  rowSpan?: number;
  /** True when this cell is spanned/merged over. */
  hMerge?: boolean;
  vMerge?: boolean;
  /** Vertical anchor override for the cell. */
  anchor?: "t" | "ctr" | "b";
};
export type LayoutShape =
  | { kind: "text"; z: number; frame: LayoutFrame; fill?: LayoutFill; line?: LayoutLine; prst?: string; text: LayoutTextBody; isTitle?: boolean; effect?: LayoutEffect; opacity?: number; customPath?: CustomPath }
  | { kind: "image"; z: number; frame: LayoutFrame; embedId?: string; path?: string; line?: LayoutLine; srcRect?: LayoutSrcRect; prst?: string; opacity?: number; tile?: boolean; effect?: LayoutEffect; customPath?: CustomPath; duotone?: [string, string] }
  | { kind: "line"; z: number; frame: LayoutFrame; line?: LayoutLine; prst?: string; effect?: LayoutEffect }
  | { kind: "table"; z: number; frame: LayoutFrame; header: string[]; rows: string[][]; cellGrid?: TableCell[][]; colWidthsIn?: number[]; rowHeightsIn?: number[]; firstRow?: boolean; bandRow?: boolean; firstCol?: boolean; bandCol?: boolean }
  | { kind: "chart"; z: number; frame: LayoutFrame; chartRelId?: string; chart?: ParsedChart }
  | { kind: "diagram"; z: number; frame: LayoutFrame };

/** Custom shape path — captured from `<a:custGeom>` as normalized 0-1 coords. */
export type CustomPath = {
  /** Path commands with normalized coords (0-1). */
  d: string;
  /** True when `<a:pathFill val="none"/>` — stroke-only. */
  strokeOnly?: boolean;
};


export type SlideLayout = {
  size: { w: number; h: number };
  background?: LayoutFill;
  shapes: LayoutShape[];
};

export type ParsedMedia = {
  /** video | audio | ole | other — coarse bucket for downstream renderers. */
  kind: "video" | "audio" | "ole" | "other";
  /** MIME string (best effort from extension). */
  mime: string;
  /** Original archive path (e.g. ppt/media/media1.mp4) for debugging + storage rewriting. */
  path: string;
  /** Base64 data URL. Subject to per-file / per-slide byte caps. */
  dataUrl: string;
  /** rId that pointed at this asset when linked from the slide XML. */
  embedId?: string;
  /** Byte length of the raw asset (pre-base64). */
  bytes: number;
};

export type ParsedHyperlink = {
  /** rId as it appears on r:id inside a:hlinkClick / a:hlinkHover. */
  rId: string;
  /** Absolute URL, mailto:, or internal slide reference (ppaction://hlinksldjump). */
  target: string;
  /** True when the rel Type ended in /hyperlink — false for internal jumps. */
  external: boolean;
};

export type ParsedComment = {
  authorName?: string;
  authorInitials?: string;
  text: string;
  /** ISO datetime when the comment was authored. */
  createdAt?: string;
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
  /** r:embed rIds parallel to `images[]` for cross-reference to storage paths. */
  imageEmbedIds: string[];
  /** Faithful 1:1 layout capture (positions, styling, z-order). */
  layout?: SlideLayout;
  /** Video / audio / OLE embeds referenced by the slide. */
  media: ParsedMedia[];
  /** Every hyperlink target discovered on the slide, in rel order. */
  hyperlinks: ParsedHyperlink[];
  /** Author comments attached to this slide, in file order. */
  comments: ParsedComment[];
  /** True when the slide is hidden from presentation (`<p:sld show="0">`). */
  hidden: boolean;
  /** Transition preset name (e.g. `fade`, `push`, `wipe`) when declared. */
  transition?: string;
  /** True when the slide XML declares a `<p:timing>` (animation) block. */
  hasAnimation: boolean;
};

export type ParsedTheme = {
  /** accent1..accent6 in slot order — used to resolve c:schemeClr references. */
  accents: string[];
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
  accent5?: string;
  accent6?: string;
  dark1?: string;
  dark2?: string;
  light1?: string;
  light2?: string;
  hlink?: string;
  folHlink?: string;
  bodyFont?: string;
  headingFont?: string;
  /** Theme-level background fill styles (bgFillStyleLst) — resolves `p:bgRef@idx`. */
  bgFillStyleLst?: LayoutFill[];
  /** Fill styles (fillStyleLst) — resolves style/fillRef. */
  fillStyleLst?: LayoutFill[];
  /** Line styles (lnStyleLst) — resolves style/lnRef. */
  lineStyleLst?: LayoutLine[];
  /** Effect styles (effectStyleLst) — resolves style/effectRef. */
  effectStyleLst?: LayoutEffect[];
};

export type ParsedDeckMetadata = {
  title?: string;
  subject?: string;
  creator?: string;
  lastModifiedBy?: string;
  keywords?: string;
  description?: string;
  category?: string;
  created?: string;
  modified?: string;
  revision?: string;
  application?: string;
  appVersion?: string;
  company?: string;
  manager?: string;
  template?: string;
  presentationFormat?: string;
};

export type ParsedEmbeddedFont = {
  /** Font family name from the presentation's font table. */
  typeface: string;
  /** Discovered variants (regular/bold/italic/boldItalic) and their asset paths. */
  variants: Array<{
    style: "regular" | "bold" | "italic" | "boldItalic";
    path: string;
    mime: string;
    /** Inline data URL (present when the font fit the per-file + per-deck budget). */
    dataUrl?: string;
    /** Byte length of the raw font asset. */
    bytes?: number;
  }>;
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
    media: number;
    comments: number;
    hyperlinks: number;
    hiddenSlides: number;
  };
  /** docProps/core.xml + docProps/app.xml — author, dates, application, company. */
  metadata: ParsedDeckMetadata;
  /** Every embedded font in ppt/fonts/ paired with its typeface. */
  embeddedFonts: ParsedEmbeddedFont[];
  /** Custom XML parts (customXml/item*.xml) preserved verbatim for round-tripping. */
  customXmlParts: Array<{ path: string; xml: string }>;
};



const MAX_PER_IMAGE_BYTES = 15_000_000;
const MAX_TOTAL_IMAGE_BYTES = 180_000_000;
const MAX_IMAGES_PER_SLIDE = 160;


// Zip-bomb / resource-exhaustion caps for untrusted .pptx uploads.
const MAX_ZIP_ENTRIES = 5000;
const MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024; // 300 MB expanded

export async function parsePptxBuffer(buf: Buffer | Uint8Array, filename: string): Promise<ParsedDeck> {
  if (buf.length < 32) throw new Error("File is empty or invalid.");
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error("Not a PowerPoint file (missing zip signature).");
  }
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`Archive has too many entries (${entries.length}). Aborting to prevent zip bomb.`);
  }
  let uncompressedTotal = 0;
  for (const e of entries) {
    // JSZip exposes uncompressed size on the internal record; fall back safely.
    const size = (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    uncompressedTotal += size;
    if (uncompressedTotal > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("Archive expands to too large a size. Aborting to prevent zip bomb.");
    }
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: false,
    trimValues: true,
    // XXE hardening: disable entity expansion + DOCTYPE processing.
    processEntities: false,
    htmlEntities: false,
  });


  const theme = await extractTheme(zip, parser);
  const slideSize = await extractSlideSize(zip, parser);

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  if (slideFiles.length === 0) throw new Error("No slides found in this .pptx.");

  const slides: ParsedSlide[] = [];
  let totalImageBytes = 0;
  let imagesTruncated = false;
  const countedImageBudgetKeys = new Set<string>();
  let chartTotal = 0;
  let tableTotal = 0;
  let diagramTotal = 0;
  let mediaTotal = 0;
  let hyperlinkTotal = 0;
  let commentTotal = 0;
  let hiddenSlidesTotal = 0;
  let totalMediaBytes = 0;
  const MAX_TOTAL_MEDIA_BYTES = 200_000_000; // 200 MB media budget across the deck
  const MAX_PER_MEDIA_BYTES = 60_000_000;    // 60 MB per single asset

  // Deck-level presentation.xml → hidden slide flags + slide id order
  const presDoc = await readXmlSafe(zip, parser, "ppt/presentation.xml");


  const parentCache = new Map<string, ParentSlideData>();

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

    // ── Slide rels (needed for images + charts + diagrams + parents) ────
    const relsPath = `ppt/slides/_rels/slide${slideNumber(slidePath)}.xml.rels`;
    let relsDoc: unknown = null;
    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async("string");
      relsDoc = parser.parse(relsXml);
    }
    const relTargetsByType = extractRelTargetsByType(relsDoc);

    // ── Resolve slideLayout + slideMaster parent chain ──────────────────
    const parents = await resolveParents(zip, parser, slidePath, relsDoc, parentCache, theme);


    // ── Embedded images ─────────────────────────────────────────────────
    // We keep two parallel arrays so a downstream faithful renderer can map
    // a shape's r:embed rId → the base64/data-url (or, later, a signed
    // storage path).
    const images: string[] = [];
    const imageEmbedIds: string[] = [];
    if (relsDoc) {
      const imageTargets = relTargetsByType.image;
      const embedIds = extractEmbedIds(doc);
      // De-duplicate while preserving reading order + include stragglers.
      const orderedIds: string[] = [];
      const seen = new Set<string>();
      for (const id of embedIds) {
        if (!seen.has(id) && imageTargets[id]) { orderedIds.push(id); seen.add(id); }
      }
      for (const id of Object.keys(imageTargets)) if (!seen.has(id)) { orderedIds.push(id); seen.add(id); }

      for (const id of orderedIds.slice(0, MAX_IMAGES_PER_SLIDE)) {
        if (totalImageBytes >= MAX_TOTAL_IMAGE_BYTES) { imagesTruncated = true; break; }
        const target = imageTargets[id];
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
        if (!countedImageBudgetKeys.has(resolved)) {
          if (totalImageBytes + dataUrl.length > MAX_TOTAL_IMAGE_BYTES) { imagesTruncated = true; continue; }
          countedImageBudgetKeys.add(resolved);
          totalImageBytes += dataUrl.length;
        }
        images.push(dataUrl);
        imageEmbedIds.push(id);
      }
    }

    // Slide layouts and masters carry their own relationship files, so their
    // rIds are not visible in the slide's image rels. Promote those inherited
    // images into the slide image payload with synthetic parent-scoped ids so
    // downstream storage/path rewriting can hydrate master backgrounds, logos,
    // footer art, and layout-level image fills automatically.
    const appendParentImages = (parent?: ParentSlideData) => {
      if (!parent?.images?.length) return;
      for (const img of parent.images) {
        if (imageEmbedIds.includes(img.embedId)) continue;
        if (images.length >= MAX_IMAGES_PER_SLIDE) { imagesTruncated = true; break; }
        if (img.dataUrl.length > MAX_PER_IMAGE_BYTES) { imagesTruncated = true; continue; }
        const budgetKey = img.sourcePath ?? img.embedId;
        if (!countedImageBudgetKeys.has(budgetKey)) {
          if (totalImageBytes + img.dataUrl.length > MAX_TOTAL_IMAGE_BYTES) { imagesTruncated = true; continue; }
          countedImageBudgetKeys.add(budgetKey);
          totalImageBytes += img.dataUrl.length;
        }
        images.push(img.dataUrl);
        imageEmbedIds.push(img.embedId);
      }
    };
    appendParentImages(parents.master);
    appendParentImages(parents.layout);

    // ── Charts ──────────────────────────────────────────────────────────
    const charts: ParsedChart[] = [];
    const chartsByRelId: Record<string, ParsedChart> = {};
    for (const [relId, target] of Object.entries(relTargetsByType.chart)) {
      const resolved = resolveRelPath(slidePath, target);
      const entry = zip.files[resolved];
      if (!entry) continue;
      try {
        const cxml = await entry.async("string");
        const cdoc = parser.parse(cxml);
        const parsedCharts = extractChartsFromChartXml(cdoc, theme);
        for (const c of parsedCharts) charts.push(c);
        if (parsedCharts[0]) chartsByRelId[relId] = parsedCharts[0];
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
    const drawingTargets = Object.values(relTargetsByType.diagramDrawing);
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
        // Pull connector styles from the paired diagramDrawing (dsp:cxnSp) —
        // this is where the fully-rendered SmartArt geometry lives (color,
        // stroke width, dash, arrowheads). Preserve them so downstream
        // journey/funnel/pillar renderers can honor the original look.
        let connectors: ConnectorStyle[] = [];
        const drawingTarget = drawingTargets[di];
        if (drawingTarget) {
          const drawingPath = resolveRelPath(slidePath, drawingTarget);
          const drawingEntry = zip.files[drawingPath];
          if (drawingEntry) {
            try {
              const xml = await drawingEntry.async("string");
              const drawDoc = parser.parse(xml);
              walk(drawDoc, (value, key) => {
                if (key !== "dsp:cxnSp" && key !== "cxnSp") return;
                const arr = Array.isArray(value) ? value : [value];
                for (const c of arr) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const spPr = (c as any)?.["dsp:spPr"] ?? (c as any)?.["spPr"] ?? (c as any)?.["p:spPr"];
                  const st = readConnectorStyle(spPr, theme);
                  if (st) connectors.push(st);
                }
              });
            } catch { /* ignore malformed drawing */ }
          }
        }
        const connectorStyle = aggregateConnectorStyle(connectors);
        diagrams.push({
          kind: "smartart",
          nodes,
          layoutHint,
          connectors: connectors.length ? connectors : undefined,
          connectorStyle,
        });
      } catch { /* skip */ }
    }
    // Grouped custom shapes → lightweight diagram fallback (only when there
    // is a real group of shapes carrying non-title, non-bullet text).
    const groupDiagram = extractGroupShapeDiagram(doc, theme);

    if (groupDiagram && groupDiagram.nodes.length >= 2) diagrams.push(groupDiagram);

    chartTotal += charts.length;
    tableTotal += tables.length;
    diagramTotal += diagrams.length;

    // ── Faithful layout (positions / z-order / styling) ─────────────────
    let layout: SlideLayout | undefined;
    try {
      layout = extractSlideLayout(xml, slideSize, imageEmbedIds, parents, theme);
      // Attach parsed chart data to chart shapes by rel id
      if (layout) {
        for (const sh of layout.shapes) {
          if (sh.kind === "chart" && sh.chartRelId && chartsByRelId[sh.chartRelId]) {
            sh.chart = chartsByRelId[sh.chartRelId];
          }
        }
      }
    } catch { /* layout is best-effort; parsed text/images still return */ }





    // ── Media (video / audio / OLE embeds) ──────────────────────────────
    const media: ParsedMedia[] = [];
    const mediaBucketEntries: Array<[string, string, ParsedMedia["kind"]]> = [
      ...Object.entries(relTargetsByType.video).map(([id, t]) => [id, t, "video"] as [string, string, ParsedMedia["kind"]]),
      ...Object.entries(relTargetsByType.audio).map(([id, t]) => [id, t, "audio"] as [string, string, ParsedMedia["kind"]]),
      ...Object.entries(relTargetsByType.media).map(([id, t]) => [id, t, "other"] as [string, string, ParsedMedia["kind"]]),
      ...Object.entries(relTargetsByType.oleObject).map(([id, t]) => [id, t, "ole"] as [string, string, ParsedMedia["kind"]]),
    ];
    for (const [rId, target, kind] of mediaBucketEntries) {
      // Skip external links (video pointing at http://...) — no bytes to embed.
      if (/^https?:\/\//i.test(target)) continue;
      const resolved = resolveRelPath(slidePath, target);
      const entry = zip.files[resolved];
      if (!entry) continue;
      if (totalMediaBytes >= MAX_TOTAL_MEDIA_BYTES) break;
      try {
        const bin = await entry.async("uint8array");
        if (bin.byteLength === 0 || bin.byteLength > MAX_PER_MEDIA_BYTES) continue;
        if (totalMediaBytes + bin.byteLength > MAX_TOTAL_MEDIA_BYTES) continue;
        const mime = guessMime(resolved) ?? "application/octet-stream";
        const dataUrl = `data:${mime};base64,${uint8ToBase64(bin)}`;
        media.push({ kind, mime, path: resolved, dataUrl, embedId: rId, bytes: bin.byteLength });
        totalMediaBytes += bin.byteLength;
      } catch { /* skip malformed media */ }
    }

    // ── Hyperlinks (rId → target) ───────────────────────────────────────
    const hyperlinks: ParsedHyperlink[] = Object.entries(relTargetsByType.hyperlink).map(
      ([rId, { target, external }]) => ({ rId, target, external }),
    );

    // ── Comments ────────────────────────────────────────────────────────
    const comments = await readSlideComments(zip, parser, slideNumber(slidePath));

    // ── Slide-level metadata (hidden, transition, animation) ────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sldRoot = (doc as any)?.["p:sld"] ?? {};
    const hidden = String(sldRoot?.["@_show"] ?? "1") === "0";
    if (hidden) hiddenSlidesTotal++;
    const transition = readTransitionKind(sldRoot?.["p:transition"]);
    const hasAnimation = Boolean(sldRoot?.["p:timing"]);

    mediaTotal += media.length;
    hyperlinkTotal += hyperlinks.length;
    commentTotal += comments.length;

    slides.push({
      index: i,
      title: cap(title, 240) || `Slide ${i + 1}`,
      bullets: bodyParas.map((b) => cap(b, 400)).slice(0, 16),
      notes: cap(notes, 2000),
      images,
      imageEmbedIds,
      charts,
      tables,
      diagrams,
      layout,
      media,
      hyperlinks,
      comments,
      hidden,
      transition,
      hasAnimation,
    });
  }

  const metadata = await readDeckMetadata(zip, parser);
  const embeddedFonts = await readEmbeddedFonts(zip, parser, presDoc);
  const customXmlParts = await readCustomXmlParts(zip);

  return {
    filename,
    slideCount: slides.length,
    slides,
    theme,
    imagePayloadBytes: totalImageBytes,
    imagesTruncated,
    graphicsSummary: {
      charts: chartTotal,
      tables: tableTotal,
      diagrams: diagramTotal,
      media: mediaTotal,
      comments: commentTotal,
      hyperlinks: hyperlinkTotal,
      hiddenSlides: hiddenSlidesTotal,
    },
    metadata,
    embeddedFonts,
    customXmlParts,
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
  diagramDrawing: Record<string, string>;
  video: Record<string, string>;
  audio: Record<string, string>;
  media: Record<string, string>;
  oleObject: Record<string, string>;
  /** hyperlink rels: rId → {target, external}. Attached to a:hlinkClick / a:hlinkHover. */
  hyperlink: Record<string, { target: string; external: boolean }>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRelTargetsByType(relsDoc: any): RelBuckets {
  const out: RelBuckets = {
    image: {}, chart: {}, diagramData: {}, diagramLayout: {}, diagramDrawing: {},
    video: {}, audio: {}, media: {}, oleObject: {}, hyperlink: {},
  };
  if (!relsDoc) return out;
  const rels = relsDoc?.Relationships?.Relationship;
  const arr = Array.isArray(rels) ? rels : rels ? [rels] : [];
  for (const r of arr) {
    const type = String(r?.["@_Type"] ?? "");
    const id = r?.["@_Id"] as string | undefined;
    const target = r?.["@_Target"] as string | undefined;
    const mode = String(r?.["@_TargetMode"] ?? "");
    if (!id || !target) continue;
    if (/\/image$/i.test(type) || /\/image\b/i.test(type)) out.image[id] = target;
    else if (/\/chart$/i.test(type)) out.chart[id] = target;
    else if (/\/diagramData$/i.test(type)) out.diagramData[id] = target;
    else if (/\/diagramLayout$/i.test(type)) out.diagramLayout[id] = target;
    else if (/\/diagramDrawing$/i.test(type)) out.diagramDrawing[id] = target;
    else if (/\/video$/i.test(type)) out.video[id] = target;
    else if (/\/audio$/i.test(type)) out.audio[id] = target;
    else if (/\/media$/i.test(type)) out.media[id] = target;
    else if (/\/oleObject$/i.test(type) || /\/package$/i.test(type)) out.oleObject[id] = target;
    else if (/\/hyperlink$/i.test(type)) out.hyperlink[id] = { target, external: mode === "External" };
  }
  return out;
}


function extractEmbedIds(doc: unknown): string[] {
  const ids: string[] = [];
  walk(doc, (value, key) => {
    if (key !== "a:blip" && key !== "blip") return;
    const arr = Array.isArray(value) ? value : [value];
    for (const b of arr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (b as any)?.["@_r:embed"] ?? (b as any)?.["@_embed"];
      if (typeof id === "string") ids.push(id);
    }
  });
  return ids;
}

function extractEmbedIdsFromOrderedNode(node: PNode | undefined): string[] {
  const ids: string[] = [];
  const visit = (n: PNode | undefined) => {
    if (!n) return;
    const tag = pTag(n);
    if (tag === "a:blip" || tag === "blip") {
      const id = pAttrs(n)["@_r:embed"] ?? pAttrs(n)["@_embed"];
      if (id) ids.push(id);
    }
    for (const child of pChildren(n)) visit(child);
  };
  visit(node);
  return ids;
}

function resolveRelPath(slidePath: string, target: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return target;
  if (target.startsWith("/")) return target.replace(/^\/+/, "");
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
    case "bmp": return "image/bmp";
    case "tif":
    case "tiff": return "image/tiff";
    case "emf": return "image/x-emf";
    case "wmf": return "image/x-wmf";
    case "mp4": return "video/mp4";
    case "m4v": return "video/mp4";
    case "mov": return "video/quicktime";
    case "webm": return "video/webm";
    case "avi": return "video/x-msvideo";
    case "wmv": return "video/x-ms-wmv";
    case "mp3": return "audio/mpeg";
    case "m4a": return "audio/mp4";
    case "wav": return "audio/wav";
    case "ogg": return "audio/ogg";
    case "aac": return "audio/aac";
    case "wma": return "audio/x-ms-wma";
    case "ttf": return "font/ttf";
    case "otf": return "font/otf";
    case "woff": return "font/woff";
    case "woff2": return "font/woff2";
    case "fntdata": return "application/vnd.ms-fontobject";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls": return "application/vnd.ms-excel";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "bin": return "application/octet-stream";
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
function readConnectorStyle(spPr: any, theme: ParsedTheme): ConnectorStyle | undefined {
  const ln = spPr?.["a:ln"];
  if (!ln) return undefined;
  const style: ConnectorStyle = {};
  const color = readFillColor(ln?.["a:solidFill"], theme)
    ?? readFillColor(ln?.["a:gradFill"]?.["a:gsLst"]?.["a:gs"]?.[0], theme);
  if (color) style.color = color;
  const w = Number(ln?.["@_w"]);
  if (Number.isFinite(w) && w > 0) style.widthPt = Math.round((w / 12700) * 100) / 100;
  const dash = ln?.["a:prstDash"]?.["@_val"];
  if (typeof dash === "string") style.dashStyle = dash;
  const head = ln?.["a:headEnd"]?.["@_type"];
  if (typeof head === "string") style.headArrow = head;
  const tail = ln?.["a:tailEnd"]?.["@_type"];
  if (typeof tail === "string") style.tailArrow = tail;
  return Object.keys(style).length ? style : undefined;
}

function aggregateConnectorStyle(list: ConnectorStyle[]): ConnectorStyle | undefined {
  if (!list.length) return undefined;
  const tally = <K extends keyof ConnectorStyle>(k: K): ConnectorStyle[K] | undefined => {
    const counts = new Map<string, number>();
    for (const c of list) {
      const v = c[k];
      if (v === undefined || v === null) continue;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: string | undefined; let n = 0;
    for (const [k2, v] of counts) if (v > n) { best = k2; n = v; }
    if (best === undefined) return undefined;
    return (k === "widthPt" ? Number(best) : best) as ConnectorStyle[K];
  };
  const out: ConnectorStyle = {
    color: tally("color") as string | undefined,
    widthPt: tally("widthPt") as number | undefined,
    dashStyle: tally("dashStyle") as string | undefined,
    headArrow: tally("headArrow") as string | undefined,
    tailArrow: tally("tailArrow") as string | undefined,
  };
  // Strip undefined
  for (const k of Object.keys(out) as (keyof ConnectorStyle)[]) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : undefined;
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
    if (scheme === "dk1" || scheme === "tx1") return theme.dark1;
    if (scheme === "dk2" || scheme === "tx2") return theme.dark2 ?? theme.dark1;
    if (scheme === "lt1" || scheme === "bg1") return theme.light1;
    if (scheme === "lt2" || scheme === "bg2") return theme.light2 ?? theme.light1;
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
    if (typeof v === "number") return String(v);
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
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
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
  // Tally shape-preset geometries to infer the diagram family. PowerPoint
  // authors commonly build custom "process" strips out of chevrons / arrows,
  // cycles out of circles + curved connectors, hierarchies out of rectangles
  // joined by straight connectors, pyramids out of triangles, and venn
  // diagrams out of overlapping ellipses. We use the dominant preset as a
  // hint when the parent slide isn't a real SmartArt.
  const prstTally: Record<string, number> = {};
  let hasConnector = false;
  for (const sp of sps) {
    const info = readShape(sp);
    const text = info.paragraphs.map((p) => p.trim()).filter(Boolean).join(" ").trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prst = (sp as any)?.["p:spPr"]?.["a:prstGeom"]?.["@_prst"] as string | undefined;
    if (prst) prstTally[prst] = (prstTally[prst] ?? 0) + 1;
    if (!text) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const color = readShapeColor((sp as any)?.["p:spPr"], theme);
    nodes.push({ text: cap(text, 200), level: 0, color });
  }
  // Detect connector shapes (p:cxnSp) inside the same group — a strong hint
  // for hierarchies (org charts) and processes. We also collect each connector's
  // line style so downstream variants can honor original color/weight/arrowheads.
  const cxnsRaw = bestGroup?.["p:cxnSp"];
  const cxnArr = Array.isArray(cxnsRaw) ? cxnsRaw : cxnsRaw ? [cxnsRaw] : [];
  if (cxnArr.length) hasConnector = true;
  const connectors: ConnectorStyle[] = [];
  for (const c of cxnArr) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = readConnectorStyle((c as any)?.["p:spPr"], theme);
    if (st) connectors.push(st);
  }
  if (nodes.length < 2) return null;
  const layoutHint = inferShapeGroupLayoutHint(prstTally, hasConnector);
  const connectorStyle = aggregateConnectorStyle(connectors);
  return { kind: "shape-group", nodes, layoutHint, connectors: connectors.length ? connectors : undefined, connectorStyle };
}

/**
 * Read the SmartArt layout definition's `uniqueId` and coarsely classify it.
 * Microsoft's built-in layouts follow a stable naming convention such as
 * `urn:microsoft.com/office/officeart/2005/8/layout/orgChart1`,
 * `.../hierarchy1`, `.../basicProcess`, `.../continuousCycle`,
 * `.../pyramid1`, `.../linearVenn`, `.../basicMatrix`, `.../basicTimeline`.
 */
function readSmartArtLayoutHint(ldoc: unknown): DiagramLayoutHint | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uid = (ldoc as any)?.["dgm:layoutDef"]?.["@_uniqueId"];
  if (typeof uid !== "string") return undefined;
  const last = uid.split("/").pop()?.toLowerCase() ?? "";
  if (!last) return undefined;
  if (/timeline/.test(last)) return "timeline";
  if (/funnel/.test(last)) return "funnel";
  if (/pyramid/.test(last)) return "pyramid";
  if (/venn/.test(last)) return "venn";
  if (/matrix/.test(last)) return "matrix";
  if (/radial/.test(last)) return "radial";
  if (/cycle/.test(last)) return "cycle";
  if (/orgchart|hierarchy|hierlist|hierlabel/.test(last)) return "hierarchy";
  if (/process|chevron|arrow|step|phase/.test(last)) return "process";
  if (/list|target|block/.test(last)) return "list";
  return undefined;
}

/**
 * Infer a layout family from the dominant `prstGeom` preset counts in a
 * grouped shape family. Only fires when a preset is clearly dominant
 * (accounts for ≥ 50% of shapes) so mixed decorative groups don't get
 * mis-routed.
 */
function inferShapeGroupLayoutHint(
  prstTally: Record<string, number>,
  hasConnector: boolean,
): DiagramLayoutHint | undefined {
  const entries = Object.entries(prstTally);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return hasConnector ? "hierarchy" : undefined;
  entries.sort((a, b) => b[1] - a[1]);
  const [topName, topCount] = entries[0];
  const dominant = topCount / total >= 0.5;
  if (!dominant) return hasConnector ? "hierarchy" : undefined;
  const n = topName.toLowerCase();
  if (/chevron|rightarrow|leftarrow|pentagon|arrow/.test(n)) return "process";
  if (/triangle/.test(n)) return "pyramid";
  if (/ellipse|oval|circle/.test(n)) return hasConnector ? "cycle" : "venn";
  if (/rect|round/.test(n)) return hasConnector ? "hierarchy" : "list";
  if (/star|diamond/.test(n)) return "radial";
  return undefined;
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

    // Extract fmtScheme with the ordered parser so we can materialize
    // bgFillStyleLst / fillStyleLst as LayoutFill[] using the existing readFill().
    let bgFillStyleLst: LayoutFill[] | undefined;
    let fillStyleLst: LayoutFill[] | undefined;
    let lineStyleLst: LayoutLine[] | undefined;
    try {
      const orderParser = new XMLParser({
        ignoreAttributes: false, attributeNamePrefix: "@_", preserveOrder: true,
        trimValues: true, processEntities: false, htmlEntities: false,
      });
      const root = orderParser.parse(xml) as PNode[];
      const themeRoot = root.find((n) => pTag(n) === "a:theme");
      const els = themeRoot ? pFind(themeRoot, "a:themeElements") : undefined;
      const fmt = els ? pFind(els, "a:fmtScheme") : undefined;
      const bgLst = fmt ? pFind(fmt, "a:bgFillStyleLst") : undefined;
      const fLst = fmt ? pFind(fmt, "a:fillStyleLst") : undefined;
      const lnLst = fmt ? pFind(fmt, "a:lnStyleLst") : undefined;
      const collectFills = (node: PNode | undefined): LayoutFill[] | undefined => {
        if (!node) return undefined;
        const out: LayoutFill[] = [];
        for (const child of pChildren(node)) {
          // wrap child as if it were an spPr with a single fill kid
          const wrap = { spPr: [child] } as unknown as PNode;
          const f = readFill(wrap, []);
          if (f) out.push(f);
        }
        return out.length ? out : undefined;
      };
      bgFillStyleLst = collectFills(bgLst);
      fillStyleLst = collectFills(fLst);
      if (lnLst) {
        const lines: LayoutLine[] = [];
        for (const child of pFindAll(lnLst, "a:ln")) {
          const wrap = { spPr: [child] } as unknown as PNode;
          const ln = readLine(wrap);
          if (ln) lines.push(ln);
        }
        lineStyleLst = lines.length ? lines : undefined;
      }
    } catch { /* fmtScheme is optional; theme still usable without it */ }

    const dark1 = readSchemeColor(scheme?.["a:dk1"]);
    const dark2 = readSchemeColor(scheme?.["a:dk2"]);
    const light1 = readSchemeColor(scheme?.["a:lt1"]);
    const light2 = readSchemeColor(scheme?.["a:lt2"]);
    const hlink = readSchemeColor(scheme?.["a:hlink"]);
    const folHlink = readSchemeColor(scheme?.["a:folHlink"]);

    return {
      accents,
      accent1: accents[0],
      accent2: accents[1],
      accent3: accents[2],
      accent4: accents[3],
      accent5: accents[4],
      accent6: accents[5],
      dark1: dark1 ?? dark2,
      dark2: dark2 ?? dark1,
      light1: light1 ?? light2,
      light2: light2 ?? light1,
      hlink,
      folHlink,
      headingFont: fontScheme?.["a:majorFont"]?.["a:latin"]?.["@_typeface"],
      bodyFont: fontScheme?.["a:minorFont"]?.["a:latin"]?.["@_typeface"],
      bgFillStyleLst,
      fillStyleLst,
      lineStyleLst,
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

// ─── Slide size + faithful layout extraction ────────────────────────────
const EMU_PER_INCH = 914400;
const DEFAULT_SLIDE_SIZE = { w: 13.333, h: 7.5 };

async function extractSlideSize(zip: JSZip, parser: XMLParser): Promise<{ w: number; h: number }> {
  const entry = zip.files["ppt/presentation.xml"];
  if (!entry) return { ...DEFAULT_SLIDE_SIZE };
  try {
    const doc = parser.parse(await entry.async("string"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sz = (doc as any)?.["p:presentation"]?.["p:sldSz"];
    const cx = Number(sz?.["@_cx"]);
    const cy = Number(sz?.["@_cy"]);
    if (cx > 0 && cy > 0) return { w: cx / EMU_PER_INCH, h: cy / EMU_PER_INCH };
  } catch { /* fall through */ }
  return { ...DEFAULT_SLIDE_SIZE };
}

// preserveOrder:true output shape helpers ------------------------------
// Each node is `{ tagName: [childNode, ...], ":@"?: {...attrs} }`.
// Text nodes: `{ "#text": "..." }`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNode = any;
function pTag(n: PNode): string | undefined {
  if (!n || typeof n !== "object") return undefined;
  for (const k of Object.keys(n)) if (k !== ":@") return k;
  return undefined;
}
function pChildren(n: PNode): PNode[] {
  const t = pTag(n);
  const c = t ? n[t] : undefined;
  return Array.isArray(c) ? c : [];
}
function pAttrs(n: PNode): Record<string, string> { return n?.[":@"] ?? {}; }
function pFind(n: PNode, name: string): PNode | undefined {
  return pChildren(n).find((c) => pTag(c) === name);
}
function pFindAll(n: PNode, name: string): PNode[] {
  return pChildren(n).filter((c) => pTag(c) === name);
}
function pDeepFind(nodes: PNode[] | PNode, name: string): PNode | undefined {
  const arr = Array.isArray(nodes) ? nodes : [nodes];
  for (const n of arr) {
    if (pTag(n) === name) return n;
    const found = pDeepFind(pChildren(n), name);
    if (found) return found;
  }
  return undefined;
}
function pText(n: PNode): string {
  const arr = pChildren(n);
  let out = "";
  for (const c of arr) {
    if (c && typeof c === "object" && "#text" in c) out += String((c as { "#text": unknown })["#text"] ?? "");
    else out += pText(c);
  }
  return out;
}

type PptxClrMap = Record<string, string>;
const DEFAULT_CLR_MAP: PptxClrMap = {
  bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2",
  accent1: "accent1", accent2: "accent2", accent3: "accent3", accent4: "accent4", accent5: "accent5", accent6: "accent6",
  hlink: "hlink", folHlink: "folHlink",
};

function readClrMap(node: PNode | undefined, fallback?: PptxClrMap): PptxClrMap | undefined {
  if (!node) return fallback;
  const override = pFind(node, "p:clrMapOvr");
  const mapNode = override ? (pFind(override, "a:overrideClrMapping") ?? pFind(override, "a:masterClrMapping")) : undefined;
  if (!mapNode || pTag(mapNode) === "a:masterClrMapping") return fallback;
  const attrs = pAttrs(mapNode);
  const next: PptxClrMap = { ...(fallback ?? DEFAULT_CLR_MAP) };
  for (const [k, v] of Object.entries(attrs)) {
    const key = k.replace(/^@_/, "");
    if (v) next[key] = v;
  }
  return next;
}

function remapSchemeColor(color: string | undefined, clrMap?: PptxClrMap): string | undefined {
  if (!color || !clrMap) return color;
  return color.replace(/var\(--pptx-([\w]+)\)/g, (_m, key: string) => `var(--pptx-${clrMap[key] ?? key})`);
}

function remapFillScheme(fill: LayoutFill | undefined, clrMap?: PptxClrMap): LayoutFill | undefined {
  if (!fill || !clrMap) return fill;
  if (fill.kind === "solid") return { ...fill, color: remapSchemeColor(fill.color, clrMap) ?? fill.color };
  if (fill.kind === "gradient") return { ...fill, stops: fill.stops.map((s) => ({ ...s, color: remapSchemeColor(s.color, clrMap) ?? s.color })) };
  if (fill.kind === "pattern") return { ...fill, fg: remapSchemeColor(fill.fg, clrMap), bg: remapSchemeColor(fill.bg, clrMap) };
  return fill;
}

function remapLineScheme(line: LayoutLine | undefined, clrMap?: PptxClrMap): LayoutLine | undefined {
  if (!line || !clrMap) return line;
  return { ...line, color: remapSchemeColor(line.color, clrMap) };
}

function readFrame(spPr: PNode | undefined): LayoutFrame | undefined {
  if (!spPr) return undefined;
  const xfrm = pFind(spPr, "a:xfrm");
  if (!xfrm) return undefined;
  const a = pAttrs(xfrm);
  const off = pFind(xfrm, "a:off");
  const ext = pFind(xfrm, "a:ext");
  const oa = off ? pAttrs(off) : {};
  const ea = ext ? pAttrs(ext) : {};
  const x = Number(oa["@_x"] ?? 0) / EMU_PER_INCH;
  const y = Number(oa["@_y"] ?? 0) / EMU_PER_INCH;
  const w = Number(ea["@_cx"] ?? 0) / EMU_PER_INCH;
  const h = Number(ea["@_cy"] ?? 0) / EMU_PER_INCH;
  if (!(w > 0 && h > 0)) return undefined;
  const rot = a["@_rot"] ? Number(a["@_rot"]) / 60000 : undefined;
  return {
    x, y, w, h,
    rot: rot && !Number.isNaN(rot) ? rot : undefined,
    flipH: a["@_flipH"] === "1" || undefined,
    flipV: a["@_flipV"] === "1" || undefined,
  };
}

function readColorNodeAlpha(colorNode: PNode | undefined): number | undefined {
  if (!colorNode) return undefined;
  const alpha = pFind(colorNode, "a:alpha");
  if (!alpha) return undefined;
  const v = pAttrs(alpha)["@_val"];
  if (!v) return undefined;
  const n = Number(v) / 100000;
  return isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
}

// ─── Color transforms (lumMod / lumOff / shade / tint / satMod / alpha) ───
// PPTX color modifiers live as children of the color node. For srgb we can
// compute the transformed hex inline; for scheme colors (resolved later by
// the renderer), we encode modifiers as a `?lm=..&lo=..` query suffix on the
// `var(--pptx-*)` token so `FaithfulSlideCanvas` can apply them at paint.

type ColorMods = {
  lumMod?: number; // 0..1
  lumOff?: number; // 0..1
  shade?: number;  // 0..1
  tint?: number;   // 0..1
  satMod?: number; // multiplier
  alpha?: number;  // 0..1
};

function readColorMods(colorNode: PNode | undefined): ColorMods | undefined {
  if (!colorNode) return undefined;
  const num = (tag: string): number | undefined => {
    const n = pFind(colorNode, tag);
    if (!n) return undefined;
    const v = pAttrs(n)["@_val"];
    if (!v) return undefined;
    const parsed = Number(v) / 100000;
    return isFinite(parsed) ? parsed : undefined;
  };
  const mods: ColorMods = {
    lumMod: num("a:lumMod"),
    lumOff: num("a:lumOff"),
    shade: num("a:shade"),
    tint: num("a:tint"),
    satMod: num("a:satMod"),
    alpha: num("a:alpha"),
  };
  const any = Object.values(mods).some((v) => v !== undefined);
  return any ? mods : undefined;
}

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = s === 0 ? l : hue2rgb(h + 1 / 3);
  const g = s === 0 ? l : hue2rgb(h);
  const b = s === 0 ? l : hue2rgb(h - 1 / 3);
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Apply PPTX color modifiers to a hex color. Order: satMod → lumMod/lumOff → shade/tint. */
export function applyColorMods(hex: string, mods: ColorMods): string {
  let [h, s, l] = hexToHsl(hex);
  if (mods.satMod !== undefined) s = Math.max(0, Math.min(1, s * mods.satMod));
  if (mods.lumMod !== undefined) l = Math.max(0, Math.min(1, l * mods.lumMod));
  if (mods.lumOff !== undefined) l = Math.max(0, Math.min(1, l + mods.lumOff));
  let out = hslToHex(h, s, l);
  // shade: blend toward black; tint: blend toward white
  if (mods.shade !== undefined) {
    const m = out.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16) * mods.shade;
    const g = parseInt(m.slice(2, 4), 16) * mods.shade;
    const b = parseInt(m.slice(4, 6), 16) * mods.shade;
    const to = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0").toUpperCase();
    out = `#${to(r)}${to(g)}${to(b)}`;
  }
  if (mods.tint !== undefined) {
    const m = out.replace("#", "");
    const t = mods.tint;
    const r = parseInt(m.slice(0, 2), 16) * t + 255 * (1 - t);
    const g = parseInt(m.slice(2, 4), 16) * t + 255 * (1 - t);
    const b = parseInt(m.slice(4, 6), 16) * t + 255 * (1 - t);
    const to = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0").toUpperCase();
    out = `#${to(r)}${to(g)}${to(b)}`;
  }
  return out;
}

function encodeSchemeMods(mods: ColorMods): string {
  const parts: string[] = [];
  if (mods.lumMod !== undefined) parts.push(`lm=${Math.round(mods.lumMod * 1000)}`);
  if (mods.lumOff !== undefined) parts.push(`lo=${Math.round(mods.lumOff * 1000)}`);
  if (mods.shade !== undefined) parts.push(`sh=${Math.round(mods.shade * 1000)}`);
  if (mods.tint !== undefined) parts.push(`tn=${Math.round(mods.tint * 1000)}`);
  if (mods.satMod !== undefined) parts.push(`sm=${Math.round(mods.satMod * 1000)}`);
  if (mods.alpha !== undefined) parts.push(`al=${Math.round(mods.alpha * 1000)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function readColorFromNode(n: PNode | undefined): string | undefined {
  if (!n) return undefined;
  const srgb = pFind(n, "a:srgbClr");
  if (srgb) {
    const v = pAttrs(srgb)["@_val"];
    if (v && /^[0-9a-fA-F]{6}$/.test(v)) {
      const base = `#${v.toUpperCase()}`;
      const mods = readColorMods(srgb);
      return mods ? applyColorMods(base, mods) : base;
    }
  }
  const sch = pFind(n, "a:schemeClr");
  if (sch) {
    const v = pAttrs(sch)["@_val"];
    if (v) {
      const mods = readColorMods(sch);
      return `var(--pptx-${v})${mods ? encodeSchemeMods(mods) : ""}`;
    }
  }
  const sys = pFind(n, "a:sysClr");
  if (sys) {
    const last = pAttrs(sys)["@_lastClr"];
    if (last && /^[0-9a-fA-F]{6}$/.test(last)) return `#${last.toUpperCase()}`;
  }
  return undefined;
}

// Alpha is stored inside the color node itself (a:srgbClr / a:schemeClr).
function readAlphaOfSolid(solidFill: PNode | undefined): number | undefined {
  if (!solidFill) return undefined;
  const srgb = pFind(solidFill, "a:srgbClr");
  const sch = pFind(solidFill, "a:schemeClr");
  return readColorNodeAlpha(srgb) ?? readColorNodeAlpha(sch);
}

function readSrcRect(blipFill: PNode | undefined): LayoutSrcRect | undefined {
  if (!blipFill) return undefined;
  const s = pFind(blipFill, "a:srcRect");
  if (!s) return undefined;
  const a = pAttrs(s);
  const l = a["@_l"] ? Number(a["@_l"]) / 100000 : 0;
  const t = a["@_t"] ? Number(a["@_t"]) / 100000 : 0;
  const r = a["@_r"] ? Number(a["@_r"]) / 100000 : 0;
  const b = a["@_b"] ? Number(a["@_b"]) / 100000 : 0;
  if (l === 0 && t === 0 && r === 0 && b === 0) return undefined;
  const clamp = (n: number) => Math.max(0, Math.min(0.99, n));
  return { l: clamp(l), t: clamp(t), r: clamp(r), b: clamp(b) };
}

function readDuotone(blipFill: PNode | undefined): [string, string] | undefined {
  if (!blipFill) return undefined;
  const blip = pFind(blipFill, "a:blip");
  if (!blip) return undefined;
  const duo = pFind(blip, "a:duotone");
  if (!duo) return undefined;
  const children = pChildren(duo);
  const colors: string[] = [];
  for (const c of children) {
    const col = readColorFromNode({ [pTag(c) ?? ""]: [c] } as PNode);
    // simpler — just try direct
  }
  // Simpler: scan direct srgb/scheme children
  const raw: string[] = [];
  for (const c of children) {
    const tag = pTag(c);
    if (tag === "a:srgbClr" || tag === "a:schemeClr" || tag === "a:sysClr") {
      const wrap = { duo: [c] } as unknown as PNode;
      const col = readColorFromNode(wrap);
      if (col) raw.push(col);
    }
  }
  if (raw.length >= 2) return [raw[0], raw[1]];
  return undefined;
}

function readFill(
  spPr: PNode | undefined,
  imageEmbedIds: string[],
  embedIdMap?: Record<string, string>,
): LayoutFill | undefined {
  if (!spPr) return undefined;
  const kids = pChildren(spPr);
  for (const k of kids) {
    const t = pTag(k);
    if (t === "a:solidFill") {
      const c = readColorFromNode(k);
      if (c) return { kind: "solid", color: c, opacity: readAlphaOfSolid(k) };
    }
    if (t === "a:noFill") return { kind: "none" };
    if (t === "a:gradFill") {
      const gsLst = pFind(k, "a:gsLst");
      const stops: Array<{ pos: number; color: string; opacity?: number }> = [];
      if (gsLst) {
        for (const g of pFindAll(gsLst, "a:gs")) {
          const pos = Number(pAttrs(g)["@_pos"] ?? 0) / 100000;
          const color = readColorFromNode(g);
          if (color) stops.push({ pos, color, opacity: readAlphaOfSolid(g) });
        }
      }
      const lin = pFind(k, "a:lin");
      const path = pFind(k, "a:path");
      const angle = lin ? (Number(pAttrs(lin)["@_ang"] ?? 0) / 60000) : 0;
      const radial = path ? pAttrs(path)["@_path"] === "circle" || pAttrs(path)["@_path"] === "rect" : false;
      if (stops.length) return { kind: "gradient", stops, angle, radial: radial || undefined };
    }
    if (t === "a:pattFill") {
      const preset = pAttrs(k)["@_prst"] ?? "pct50";
      const fg = pFind(k, "a:fgClr");
      const bg = pFind(k, "a:bgClr");
      return {
        kind: "pattern",
        preset,
        fg: fg ? readColorFromNode(fg) : undefined,
        bg: bg ? readColorFromNode(bg) : undefined,
      };
    }
    if (t === "a:blipFill") {
      const blip = pFind(k, "a:blip");
      const rawEmbed = blip ? pAttrs(blip)["@_r:embed"] ?? pAttrs(blip)["@_embed"] : undefined;
      const embed = rawEmbed ? (embedIdMap?.[rawEmbed] ?? rawEmbed) : undefined;
      if (embed) {
        void imageEmbedIds;
        const srcRect = readSrcRect(k);
        const tile = !!pFind(k, "a:tile");
        const duotone = readDuotone(k);
        let opacity: number | undefined;
        if (blip) {
          const alphaMod = pFind(blip, "a:alphaModFix");
          if (alphaMod) {
            const v = pAttrs(alphaMod)["@_amt"];
            if (v) {
              const n = Number(v) / 100000;
              if (isFinite(n) && n >= 0 && n <= 1) opacity = n;
            }
          }
        }
        return { kind: "image", embedId: embed, srcRect, opacity, tile: tile || undefined, duotone };
      }
    }
  }
  return undefined;
}

function replacePhClr(color: string | undefined, phColor: string | undefined): string | undefined {
  if (!color || !phColor) return color;
  const m = /^var\(--pptx-phClr\)(\?.*)?$/.exec(color);
  if (!m) return color;
  // If the reference color already carries modifiers, keep it intact rather
  // than producing two query suffixes. Otherwise preserve modifiers from the
  // theme style's phClr slot.
  if (phColor.includes("?")) return phColor;
  return `${phColor}${m[1] ?? ""}`;
}

function substitutePhClrInFill(fill: LayoutFill | undefined, phColor: string | undefined): LayoutFill | undefined {
  if (!fill || !phColor) return fill;
  if (fill.kind === "solid") return { ...fill, color: replacePhClr(fill.color, phColor) ?? fill.color };
  if (fill.kind === "gradient") {
    return {
      ...fill,
      stops: fill.stops.map((s) => ({ ...s, color: replacePhClr(s.color, phColor) ?? s.color })),
    };
  }
  if (fill.kind === "pattern") {
    return {
      ...fill,
      fg: replacePhClr(fill.fg, phColor),
      bg: replacePhClr(fill.bg, phColor),
    };
  }
  return fill;
}

function substitutePhClrInLine(line: LayoutLine | undefined, phColor: string | undefined): LayoutLine | undefined {
  if (!line || !phColor) return line;
  return { ...line, color: replacePhClr(line.color, phColor) };
}

function fillStyleSlot(theme: ParsedTheme | undefined, idx: number, background: boolean): LayoutFill | undefined {
  if (!theme || !(idx > 0)) return undefined;
  const list = idx >= 1001 ? theme.bgFillStyleLst : background ? (theme.bgFillStyleLst ?? theme.fillStyleLst) : theme.fillStyleLst;
  if (!list?.length) return undefined;
  const slot = idx >= 1001 ? idx - 1001 : Math.max(0, idx - 1);
  if (slot < 0) return undefined;
  return list[Math.min(slot, list.length - 1)];
}

function lineStyleSlot(theme: ParsedTheme | undefined, idx: number): LayoutLine | undefined {
  if (!theme?.lineStyleLst?.length || !(idx > 0)) return undefined;
  const slot = Math.max(0, idx - 1);
  return theme.lineStyleLst[Math.min(slot, theme.lineStyleLst.length - 1)];
}

function readFillRef(style: PNode | undefined, theme?: ParsedTheme): LayoutFill | undefined {
  const fillRef = style ? pFind(style, "a:fillRef") : undefined;
  if (!fillRef) return undefined;
  const idx = Number(pAttrs(fillRef)["@_idx"] ?? 0);
  const phColor = readColorFromNode(fillRef);
  const picked = fillStyleSlot(theme, idx, false);
  if (picked) return substitutePhClrInFill(picked, phColor);
  if (phColor) return { kind: "solid", color: phColor };
  return undefined;
}

function readMappedFillRef(style: PNode | undefined, theme: ParsedTheme | undefined, clrMap?: PptxClrMap): LayoutFill | undefined {
  return remapFillScheme(readFillRef(style, theme), clrMap);
}

function readLineRef(style: PNode | undefined, theme?: ParsedTheme): LayoutLine | undefined {
  const lnRef = style ? pFind(style, "a:lnRef") : undefined;
  if (!lnRef) return undefined;
  const idx = Number(pAttrs(lnRef)["@_idx"] ?? 0);
  const phColor = readColorFromNode(lnRef);
  const picked = lineStyleSlot(theme, idx);
  if (picked) return substitutePhClrInLine(picked, phColor);
  if (phColor) return { color: phColor };
  return undefined;
}

function readMappedLineRef(style: PNode | undefined, theme: ParsedTheme | undefined, clrMap?: PptxClrMap): LayoutLine | undefined {
  return remapLineScheme(readLineRef(style, theme), clrMap);
}

function readBgRef(bgRef: PNode | undefined, theme?: ParsedTheme): LayoutFill | undefined {
  if (!bgRef) return undefined;
  const idx = Number(pAttrs(bgRef)["@_idx"] ?? 0);
  if (!(idx > 0)) return undefined;
  const phColor = readColorFromNode(bgRef);
  const picked = fillStyleSlot(theme, idx, true);
  if (picked) return substitutePhClrInFill(picked, phColor);
  if (phColor) return { kind: "solid", color: phColor };
  return undefined;
}

function readMappedBgRef(bgRef: PNode | undefined, theme: ParsedTheme | undefined, clrMap?: PptxClrMap): LayoutFill | undefined {
  return remapFillScheme(readBgRef(bgRef, theme), clrMap);
}

function readLine(spPr: PNode | undefined): LayoutLine | undefined {
  if (!spPr) return undefined;
  const ln = pFind(spPr, "a:ln");
  if (!ln) return undefined;
  const a = pAttrs(ln);
  const widthEmu = Number(a["@_w"] ?? 0);
  const widthPt = widthEmu > 0 ? widthEmu / 12700 : undefined;
  const solid = pFind(ln, "a:solidFill");
  const color = solid ? readColorFromNode(solid) : undefined;
  const dash = pFind(ln, "a:prstDash");
  const dashStyle = dash ? pAttrs(dash)["@_val"] : undefined;
  const head = pFind(ln, "a:headEnd");
  const tail = pFind(ln, "a:tailEnd");
  const capRaw = a["@_cap"];
  const cmpdRaw = a["@_cmpd"];
  const joinChild = pChildren(ln).find((c) => {
    const tg = pTag(c);
    return tg === "a:round" || tg === "a:bevel" || tg === "a:miter";
  });
  const joinTag = joinChild ? pTag(joinChild) : undefined;
  const join =
    joinTag === "a:round" ? "round" :
    joinTag === "a:bevel" ? "bevel" :
    joinTag === "a:miter" ? "miter" : undefined;
  return {
    color,
    widthPt,
    dashStyle,
    headArrow: head ? pAttrs(head)["@_type"] : undefined,
    tailArrow: tail ? pAttrs(tail)["@_type"] : undefined,
    cap: capRaw === "flat" || capRaw === "rnd" || capRaw === "sq" ? capRaw : undefined,
    cmpd: cmpdRaw === "sng" || cmpdRaw === "dbl" || cmpdRaw === "thickThin" || cmpdRaw === "thinThick" || cmpdRaw === "tri" ? cmpdRaw : undefined,
    join,
  };
}

function readEffects(spPr: PNode | undefined): LayoutEffect | undefined {
  if (!spPr) return undefined;
  const effectLst = pFind(spPr, "a:effectLst") ?? pFind(spPr, "a:effectDag");
  if (!effectLst) return undefined;
  const out: LayoutEffect = {};
  const outerShdw = pFind(effectLst, "a:outerShdw");
  if (outerShdw) {
    const a = pAttrs(outerShdw);
    const col = readColorFromNode(outerShdw) ?? "#000000";
    const alpha = readAlphaOfSolid(outerShdw);
    out.outerShadow = {
      color: col,
      blurPx: a["@_blurRad"] ? Number(a["@_blurRad"]) / 12700 : undefined,
      distPx: a["@_dist"] ? Number(a["@_dist"]) / 12700 : undefined,
      dirDeg: a["@_dir"] ? Number(a["@_dir"]) / 60000 : undefined,
      opacity: alpha,
    };
  }
  const innerShdw = pFind(effectLst, "a:innerShdw");
  if (innerShdw) {
    const a = pAttrs(innerShdw);
    const col = readColorFromNode(innerShdw) ?? "#000000";
    const alpha = readAlphaOfSolid(innerShdw);
    out.innerShadow = {
      color: col,
      blurPx: a["@_blurRad"] ? Number(a["@_blurRad"]) / 12700 : undefined,
      distPx: a["@_dist"] ? Number(a["@_dist"]) / 12700 : undefined,
      dirDeg: a["@_dir"] ? Number(a["@_dir"]) / 60000 : undefined,
      opacity: alpha,
    };
  }
  const glow = pFind(effectLst, "a:glow");
  if (glow) {
    const rad = pAttrs(glow)["@_rad"] ? Number(pAttrs(glow)["@_rad"]) / 12700 : 8;
    const col = readColorFromNode(glow) ?? "#FFFFFF";
    out.glow = { color: col, radPx: rad };
  }
  const softEdge = pFind(effectLst, "a:softEdge");
  if (softEdge) {
    const rad = pAttrs(softEdge)["@_rad"] ? Number(pAttrs(softEdge)["@_rad"]) / 12700 : 0;
    out.softEdge = { radPx: rad };
  }
  if (pFind(effectLst, "a:reflection")) out.reflection = true;
  const blur = pFind(effectLst, "a:blur");
  if (blur) {
    const rad = pAttrs(blur)["@_rad"] ? Number(pAttrs(blur)["@_rad"]) / 12700 : 0;
    out.blur = rad;
  }
  return Object.keys(out).length ? out : undefined;
}

function readCustomPath(spPr: PNode | undefined): CustomPath | undefined {
  if (!spPr) return undefined;
  const cust = pFind(spPr, "a:custGeom");
  if (!cust) return undefined;
  const pathLst = pFind(cust, "a:pathLst");
  if (!pathLst) return undefined;
  const paths = pFindAll(pathLst, "a:path");
  if (!paths.length) return undefined;
  const commands: string[] = [];
  let strokeOnly = false;
  for (const path of paths) {
    const pa = pAttrs(path);
    const w = Number(pa["@_w"] ?? 100000);
    const h = Number(pa["@_h"] ?? 100000);
    const stroke = pa["@_stroke"];
    const fillAttr = pa["@_fill"];
    if (stroke === "1" && fillAttr === "none") strokeOnly = true;
    const norm = (x: number, base: number) => (base > 0 ? x / base : 0).toFixed(4);
    for (const cmd of pChildren(path)) {
      const tag = pTag(cmd);
      const pts = pFindAll(cmd, "a:pt").map((pt) => {
        const a = pAttrs(pt);
        return [Number(a["@_x"] ?? 0), Number(a["@_y"] ?? 0)] as [number, number];
      });
      if (tag === "a:moveTo" && pts[0]) commands.push(`M${norm(pts[0][0], w)},${norm(pts[0][1], h)}`);
      else if (tag === "a:lnTo" && pts[0]) commands.push(`L${norm(pts[0][0], w)},${norm(pts[0][1], h)}`);
      else if (tag === "a:cubicBezTo" && pts.length === 3) {
        commands.push(
          `C${norm(pts[0][0], w)},${norm(pts[0][1], h)} ${norm(pts[1][0], w)},${norm(pts[1][1], h)} ${norm(pts[2][0], w)},${norm(pts[2][1], h)}`,
        );
      } else if (tag === "a:quadBezTo" && pts.length === 2) {
        commands.push(`Q${norm(pts[0][0], w)},${norm(pts[0][1], h)} ${norm(pts[1][0], w)},${norm(pts[1][1], h)}`);
      } else if (tag === "a:close") {
        commands.push("Z");
      }
    }
  }
  if (!commands.length) return undefined;
  return { d: commands.join(" "), strokeOnly: strokeOnly || undefined };
}

function readTextBody(txBody: PNode | undefined): LayoutTextBody | undefined {
  if (!txBody) return undefined;
  const bodyPr = pFind(txBody, "a:bodyPr");
  const bpa = bodyPr ? pAttrs(bodyPr) : {};
  const anchorRaw = bpa["@_anchor"];
  const anchor = anchorRaw === "t" || anchorRaw === "ctr" || anchorRaw === "b" ? anchorRaw : undefined;
  const inIn = (v: unknown, fallback: number) => (v !== undefined && v !== null ? Number(v) / EMU_PER_INCH : fallback);
  const insets = bodyPr ? {
    l: inIn(bpa["@_lIns"], 0.1),
    t: inIn(bpa["@_tIns"], 0.05),
    r: inIn(bpa["@_rIns"], 0.1),
    b: inIn(bpa["@_bIns"], 0.05),
  } : undefined;
  const rot = bpa["@_rot"] ? Number(bpa["@_rot"]) / 60000 : undefined;
  const wrapRaw = bpa["@_wrap"];
  const wrap = wrapRaw === "none" ? false : wrapRaw === "square" ? true : undefined;
  const vert = bpa["@_vert"] ? String(bpa["@_vert"]) : undefined;
  const numCol = bpa["@_numCol"] ? Number(bpa["@_numCol"]) : undefined;
  const normAF = bodyPr ? pFind(bodyPr, "a:normAutofit") : undefined;
  const spAutoFit = bodyPr ? !!pFind(bodyPr, "a:spAutoFit") : undefined;
  let fontScale: number | undefined;
  let lnSpcReduction: number | undefined;
  if (normAF) {
    const a = pAttrs(normAF);
    if (a["@_fontScale"]) fontScale = Number(a["@_fontScale"]) / 100000;
    if (a["@_lnSpcReduction"]) lnSpcReduction = Number(a["@_lnSpcReduction"]) / 100000;
  }
  const paras: LayoutPara[] = [];
  for (const p of pFindAll(txBody, "a:p")) {
    const pPr = pFind(p, "a:pPr");
    const pAttr = pPr ? pAttrs(pPr) : {};
    const alignRaw = pAttr["@_algn"];
    const align = alignRaw === "l" || alignRaw === "ctr" || alignRaw === "r" || alignRaw === "just" ? alignRaw : undefined;
    const level = pAttr["@_lvl"] ? Number(pAttr["@_lvl"]) : undefined;
    const marLIn = pAttr["@_marL"] ? Number(pAttr["@_marL"]) / EMU_PER_INCH : undefined;
    const indentIn = pAttr["@_indent"] ? Number(pAttr["@_indent"]) / EMU_PER_INCH : undefined;
    let bullet: "char" | "auto" | "none" | undefined;
    let bulletChar: string | undefined;
    let bulletAutoNum: string | undefined;
    let bulletFont: string | undefined;
    let bulletColor: string | undefined;
    if (pPr) {
      const buChar = pFind(pPr, "a:buChar");
      const buAuto = pFind(pPr, "a:buAutoNum");
      const buFont = pFind(pPr, "a:buFont");
      const buClr = pFind(pPr, "a:buClr");
      if (buChar) {
        bullet = "char";
        bulletChar = pAttrs(buChar)["@_char"];
      } else if (buAuto) {
        bullet = "auto";
        bulletAutoNum = pAttrs(buAuto)["@_type"];
      } else if (pFind(pPr, "a:buNone")) {
        bullet = "none";
      }
      if (buFont) bulletFont = pAttrs(buFont)["@_typeface"];
      if (buClr) bulletColor = readColorFromNode(buClr);
    }
    let spcBeforePt: number | undefined;
    let spcAfterPt: number | undefined;
    let lineSpacing: LayoutPara["lineSpacing"] | undefined;
    if (pPr) {
      const spcBef = pFind(pPr, "a:spcBef");
      const spcAft = pFind(pPr, "a:spcAft");
      const lnSpc = pFind(pPr, "a:lnSpc");
      const readSpcPts = (n: PNode | undefined): number | undefined => {
        if (!n) return undefined;
        const pts = pFind(n, "a:spcPts");
        if (pts) return Number(pAttrs(pts)["@_val"] ?? 0) / 100;
        return undefined;
      };
      spcBeforePt = readSpcPts(spcBef);
      spcAfterPt = readSpcPts(spcAft);
      if (lnSpc) {
        const pct = pFind(lnSpc, "a:spcPct");
        const pts = pFind(lnSpc, "a:spcPts");
        if (pct) lineSpacing = { mult: Number(pAttrs(pct)["@_val"] ?? 100000) / 100000 };
        else if (pts) lineSpacing = { pt: Number(pAttrs(pts)["@_val"] ?? 0) / 100 };
      }
    }
    const runs: LayoutRun[] = [];
    for (const child of pChildren(p)) {
      const t = pTag(child);
      if (t === "a:r") {
        const rPr = pFind(child, "a:rPr");
        const ra = rPr ? pAttrs(rPr) : {};
        const tNode = pFind(child, "a:t");
        const text = tNode ? pText(tNode) : "";
        if (!text) continue;
        const solid = rPr ? pFind(rPr, "a:solidFill") : undefined;
        const latin = rPr ? pFind(rPr, "a:latin") : undefined;
        const hlink = rPr ? pFind(rPr, "a:hlinkClick") : undefined;
        const strike = ra["@_strike"];
        const cap = ra["@_cap"];
        const spc = ra["@_spc"] ? Number(ra["@_spc"]) / 100 : undefined; // in points
        const baseline = ra["@_baseline"] ? Number(ra["@_baseline"]) / 1000 : undefined; // percent
        runs.push({
          text,
          bold: ra["@_b"] === "1" || undefined,
          italic: ra["@_i"] === "1" || undefined,
          underline: ra["@_u"] && ra["@_u"] !== "none" ? true : undefined,
          strike: strike && strike !== "noStrike" ? true : undefined,
          sizePt: ra["@_sz"] ? Number(ra["@_sz"]) / 100 : undefined,
          color: solid ? readColorFromNode(solid) : undefined,
          font: latin ? pAttrs(latin)["@_typeface"] : undefined,
          spacingPct: spc,
          cap: cap === "all" || cap === "small" || cap === "none" ? cap : undefined,
          baselinePct: baseline,
          hlink: hlink ? pAttrs(hlink)["@_r:id"] : undefined,
        });
      } else if (t === "a:br") {
        runs.push({ text: "\n" });
      }
    }
    paras.push({
      align, level,
      bullet, bulletChar, bulletAutoNum, bulletFont, bulletColor,
      marLIn, indentIn,
      spcBeforePt, spcAfterPt, lineSpacing,
      runs,
    });
  }
  return { paras, anchor, insets, fontScale, lnSpcReduction, spAutoFit, rotDeg: rot, wrap, vert, numCol };
}

function transformFrame(child: LayoutFrame, group: PNode | undefined): LayoutFrame {
  if (!group) return child;
  const gxfrm = pFind(group, "a:xfrm");
  if (!gxfrm) return child;
  const off = pFind(gxfrm, "a:off");
  const ext = pFind(gxfrm, "a:ext");
  const chOff = pFind(gxfrm, "a:chOff");
  const chExt = pFind(gxfrm, "a:chExt");
  if (!off || !ext || !chOff || !chExt) return child;
  const oa = pAttrs(off); const ea = pAttrs(ext);
  const coa = pAttrs(chOff); const cea = pAttrs(chExt);
  const gx = Number(oa["@_x"] ?? 0) / EMU_PER_INCH;
  const gy = Number(oa["@_y"] ?? 0) / EMU_PER_INCH;
  const gw = Number(ea["@_cx"] ?? 0) / EMU_PER_INCH;
  const gh = Number(ea["@_cy"] ?? 0) / EMU_PER_INCH;
  const cx = Number(coa["@_x"] ?? 0) / EMU_PER_INCH;
  const cy = Number(coa["@_y"] ?? 0) / EMU_PER_INCH;
  const cw = Number(cea["@_cx"] ?? 0) / EMU_PER_INCH;
  const ch = Number(cea["@_cy"] ?? 0) / EMU_PER_INCH;
  if (!(cw > 0 && ch > 0 && gw > 0 && gh > 0)) return child;
  const sx = gw / cw; const sy = gh / ch;
  return {
    x: gx + (child.x - cx) * sx,
    y: gy + (child.y - cy) * sy,
    w: child.w * sx,
    h: child.h * sy,
    rot: child.rot,
    flipH: child.flipH,
    flipV: child.flipV,
  };
}

function readTableCells(tbl: PNode): { grid: TableCell[][]; colWidths: number[]; rowHeights: number[]; firstRow?: boolean; bandRow?: boolean; firstCol?: boolean; bandCol?: boolean } {
  const grid: TableCell[][] = [];
  const colWidths: number[] = [];
  const rowHeights: number[] = [];
  const tblPr = pFind(tbl, "a:tblPr");
  const tp = tblPr ? pAttrs(tblPr) : {};
  const firstRow = tp["@_firstRow"] === "1" || undefined;
  const bandRow = tp["@_bandRow"] === "1" || undefined;
  const firstCol = tp["@_firstCol"] === "1" || undefined;
  const bandCol = tp["@_bandCol"] === "1" || undefined;
  const tblGrid = pFind(tbl, "a:tblGrid");
  if (tblGrid) {
    for (const gc of pFindAll(tblGrid, "a:gridCol")) {
      const w = Number(pAttrs(gc)["@_w"] ?? 0) / EMU_PER_INCH;
      colWidths.push(w);
    }
  }
  for (const tr of pFindAll(tbl, "a:tr")) {
    const h = Number(pAttrs(tr)["@_h"] ?? 0) / EMU_PER_INCH;
    rowHeights.push(h);
    const row: TableCell[] = [];
    for (const tc of pFindAll(tr, "a:tc")) {
      const tcA = pAttrs(tc);
      const gridSpan = tcA["@_gridSpan"] ? Number(tcA["@_gridSpan"]) : undefined;
      const rowSpan = tcA["@_rowSpan"] ? Number(tcA["@_rowSpan"]) : undefined;
      const hMerge = tcA["@_hMerge"] === "1" || undefined;
      const vMerge = tcA["@_vMerge"] === "1" || undefined;
      const tcPr = pFind(tc, "a:tcPr");
      const tcpa = tcPr ? pAttrs(tcPr) : {};
      const anchorRaw = tcpa["@_anchor"];
      const anchor = anchorRaw === "t" || anchorRaw === "ctr" || anchorRaw === "b" ? anchorRaw : undefined;
      let fill: LayoutFill | undefined;
      let borders: TableCell["borders"] = undefined;
      let margins: TableCell["margins"] = undefined;
      if (tcPr) {
        fill = readFill(tcPr, []);
        const readSide = (tag: string): LayoutLine | undefined => {
          const s = pFind(tcPr, tag);
          if (!s) return undefined;
          const a = pAttrs(s);
          const wEmu = Number(a["@_w"] ?? 0);
          const solid = pFind(s, "a:solidFill");
          return {
            widthPt: wEmu > 0 ? wEmu / 12700 : undefined,
            color: solid ? readColorFromNode(solid) : undefined,
          };
        };
        const l = readSide("a:lnL"); const t = readSide("a:lnT");
        const r = readSide("a:lnR"); const b = readSide("a:lnB");
        if (l || t || r || b) borders = { l, t, r, b };
        const inIn = (v: unknown, fb: number) => v !== undefined ? Number(v) / EMU_PER_INCH : fb;
        if (tcpa["@_marL"] || tcpa["@_marT"] || tcpa["@_marR"] || tcpa["@_marB"]) {
          margins = {
            l: inIn(tcpa["@_marL"], 0.1),
            t: inIn(tcpa["@_marT"], 0.05),
            r: inIn(tcpa["@_marR"], 0.1),
            b: inIn(tcpa["@_marB"], 0.05),
          };
        }
      }
      const tx = pFind(tc, "a:txBody");
      const text = readTextBody(tx) ?? { paras: [] };
      row.push({
        text, fill, borders, margins,
        colSpan: gridSpan, rowSpan,
        hMerge, vMerge, anchor,
      });
    }
    grid.push(row);
  }
  return { grid, colWidths, rowHeights, firstRow, bandRow, firstCol, bandCol };
}

function walkSpTree(
  nodes: PNode[],
  zRef: { z: number },
  group: PNode | undefined,
  out: LayoutShape[],
  imageEmbedIds: string[],
  parents?: ResolvedParents,
  embedIdMap?: Record<string, string>,
  theme?: ParsedTheme,
  clrMap?: PptxClrMap,
) {
  for (const node of nodes) {
    const t = pTag(node);
    if (!t) continue;
    if (t === "p:sp") {
      const spPr = pFind(node, "p:spPr");
      const nvSpPr = pFind(node, "p:nvSpPr");
      const nvPr = nvSpPr ? pFind(nvSpPr, "p:nvPr") : undefined;
      const ph = nvPr ? pFind(nvPr, "p:ph") : undefined;
      const phType = ph ? pAttrs(ph)["@_type"] : undefined;
      const phIdx = ph ? pAttrs(ph)["@_idx"] : undefined;
      const phProtos = ph && parents ? lookupPlaceholderChain(parents, phType, phIdx) : [];

      let frame = readFrame(spPr);
      if (!frame && phProtos.length) {
        for (const proto of phProtos) { if (proto.frame) { frame = { ...proto.frame }; break; } }
      }
      if (!frame) continue;
      if (group) frame = transformFrame(frame, group);

      const style = pFind(node, "p:style");
      const prstGeom = spPr ? pFind(spPr, "a:prstGeom") : undefined;
      let prst = prstGeom ? pAttrs(prstGeom)["@_prst"] : undefined;
      let fill = remapFillScheme(readFill(spPr, imageEmbedIds, embedIdMap), clrMap) ?? readMappedFillRef(style, theme, clrMap);
      let line = remapLineScheme(readLine(spPr), clrMap) ?? readMappedLineRef(style, theme, clrMap);
      const effect = readEffects(spPr);
      const customPath = readCustomPath(spPr);
      for (const proto of phProtos) {
        if (!prst && proto.prst) prst = proto.prst;
        if (!fill && proto.fill) fill = proto.fill;
        if (!line && proto.line) line = proto.line;
      }

      const txBody = pFind(node, "p:txBody");
      let text = readTextBody(txBody) ?? { paras: [] };
      if (phProtos.length) text = applyPlaceholderTextInheritance(text, phType, phProtos, parents);

      const isTitle = phType === "title" || phType === "ctrTitle" || undefined;
      const opacity = spPr ? readShapeOpacity(spPr) : undefined;
      out.push({ kind: "text", z: zRef.z++, frame, fill, line, prst, text, isTitle, effect, opacity, customPath });
    } else if (t === "p:pic") {
      const spPr = pFind(node, "p:spPr");
      let frame = readFrame(spPr);
      if (!frame) continue;
      if (group) frame = transformFrame(frame, group);
      const blipFill = pFind(node, "p:blipFill");
      const blip = blipFill ? pFind(blipFill, "a:blip") : undefined;
      const rawEmbedId = blip ? (pAttrs(blip)["@_r:embed"] ?? pAttrs(blip)["@_embed"]) : undefined;
      const embedId = rawEmbedId ? (embedIdMap?.[rawEmbedId] ?? rawEmbedId) : undefined;
      const srcRect = readSrcRect(blipFill);
      const tile = blipFill ? !!pFind(blipFill, "a:tile") : undefined;
      const prstGeom = spPr ? pFind(spPr, "a:prstGeom") : undefined;
      const prst = prstGeom ? pAttrs(prstGeom)["@_prst"] : undefined;
      const style = pFind(node, "p:style");
      const customPath = readCustomPath(spPr);
      const effect = readEffects(spPr);
      const duotone = readDuotone(blipFill);
      let opacity: number | undefined;
      if (blip) {
        const alphaMod = pFind(blip, "a:alphaModFix");
        if (alphaMod) {
          const v = pAttrs(alphaMod)["@_amt"];
          if (v) {
            const n = Number(v) / 100000;
            if (isFinite(n) && n >= 0 && n <= 1) opacity = n;
          }
        }
      }
      out.push({ kind: "image", z: zRef.z++, frame, embedId, line: remapLineScheme(readLine(spPr), clrMap) ?? readMappedLineRef(style, theme, clrMap), srcRect, prst, opacity, tile: tile || undefined, effect, customPath, duotone });

    } else if (t === "p:cxnSp") {
      const spPr = pFind(node, "p:spPr");
      let frame = readFrame(spPr);
      if (!frame) continue;
      if (group) frame = transformFrame(frame, group);
      const prstGeom = spPr ? pFind(spPr, "a:prstGeom") : undefined;
      const prst = prstGeom ? pAttrs(prstGeom)["@_prst"] : undefined;
      const style = pFind(node, "p:style");
      const effect = readEffects(spPr);
      out.push({ kind: "line", z: zRef.z++, frame, line: remapLineScheme(readLine(spPr), clrMap) ?? readMappedLineRef(style, theme, clrMap), prst, effect });
    } else if (t === "p:grpSp") {
      const grpSpPr = pFind(node, "p:grpSpPr");
      walkSpTree(pChildren(node), zRef, grpSpPr ?? group, out, imageEmbedIds, parents, embedIdMap, theme, clrMap);
    } else if (t === "p:graphicFrame") {
      const xfrm = pFind(node, "p:xfrm");
      let frame: LayoutFrame | undefined;
      if (xfrm) {
        const off = pFind(xfrm, "a:off");
        const ext = pFind(xfrm, "a:ext");
        const oa = off ? pAttrs(off) : {}; const ea = ext ? pAttrs(ext) : {};
        const x = Number(oa["@_x"] ?? 0) / EMU_PER_INCH;
        const y = Number(oa["@_y"] ?? 0) / EMU_PER_INCH;
        const w = Number(ea["@_cx"] ?? 0) / EMU_PER_INCH;
        const h = Number(ea["@_cy"] ?? 0) / EMU_PER_INCH;
        if (w > 0 && h > 0) frame = { x, y, w, h };
      }
      if (!frame) continue;
      if (group) frame = transformFrame(frame, group);
      const graphic = pFind(node, "a:graphic");
      const gData = graphic ? pFind(graphic, "a:graphicData") : undefined;
      const gKids = gData ? pChildren(gData) : [];
      const gTag = gKids[0] ? pTag(gKids[0]) : undefined;
      if (gTag === "a:tbl" || pDeepFind(gKids, "a:tbl")) {
        const tbl = pDeepFind(gKids, "a:tbl");
        const header: string[] = [];
        const rows: string[][] = [];
        let cellGrid: TableCell[][] | undefined;
        let colWidthsIn: number[] | undefined;
        let rowHeightsIn: number[] | undefined;
        let firstRow: boolean | undefined; let bandRow: boolean | undefined;
        let firstCol: boolean | undefined; let bandCol: boolean | undefined;
        if (tbl) {
          const parsed = readTableCells(tbl);
          cellGrid = parsed.grid;
          colWidthsIn = parsed.colWidths.length ? parsed.colWidths : undefined;
          rowHeightsIn = parsed.rowHeights.length ? parsed.rowHeights : undefined;
          firstRow = parsed.firstRow; bandRow = parsed.bandRow;
          firstCol = parsed.firstCol; bandCol = parsed.bandCol;
          parsed.grid.forEach((row, idx) => {
            const flat = row.map((c) =>
              (c.text.paras ?? []).map((p) => p.runs.map((r) => r.text).join("")).join(" ").trim(),
            );
            if (idx === 0) header.push(...flat);
            else rows.push(flat);
          });
        }
        out.push({
          kind: "table", z: zRef.z++, frame, header, rows,
          cellGrid, colWidthsIn, rowHeightsIn,
          firstRow, bandRow, firstCol, bandCol,
        });
      } else if (gTag && /chart/i.test(gTag)) {
        // <a:graphicData><c:chart r:id="rIdX"/></a:graphicData>
        const chartNode = gKids[0] ? pFind(gKids[0], "c:chart") ?? pDeepFind(gKids, "c:chart") : undefined;
        const chartAttrs = chartNode ? pAttrs(chartNode) : {};
        const chartRelId = chartAttrs["@_r:id"] ?? chartAttrs["@_id"];
        out.push({ kind: "chart", z: zRef.z++, frame, chartRelId });

      } else if (gTag && /diagram|dgm/i.test(gTag)) {
        out.push({ kind: "diagram", z: zRef.z++, frame });
      } else {
        out.push({ kind: "diagram", z: zRef.z++, frame });
      }
    }
  }
}

/** Shape-level opacity from `<p:spPr>` (some producers emit it on solidFill alpha which is already read). */
function readShapeOpacity(_spPr: PNode): number | undefined {
  // Placeholder — actual alpha comes through fill; kept for future extension.
  return undefined;
}

function extractSlideLayout(
  xml: string,
  size: { w: number; h: number },
  imageEmbedIds: string[],
  parents?: ResolvedParents,
  theme?: ParsedTheme,
): SlideLayout {
  const orderParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    trimValues: true,
    processEntities: false,
    htmlEntities: false,
  });
  const root = orderParser.parse(xml) as PNode[];
  const sld = root.find((n) => pTag(n) === "p:sld");
  const sldNode = sld ?? root[0];
  const cSld = sldNode ? pFind(sldNode, "p:cSld") : undefined;
  const spTree = cSld ? pFind(cSld, "p:spTree") : undefined;
  const shapes: LayoutShape[] = [];

  // Background: slide → layout → master.
  // Both <p:bgPr> (direct fill) and <p:bgRef idx="..."> (theme reference)
  // are honored; idx>1000 → theme.bgFillStyleLst, else → theme.fillStyleLst.
  const readBg = (node: PNode | undefined): LayoutFill | undefined => {
    if (!node) return undefined;
    const bg = pFind(node, "p:bg");
    if (!bg) return undefined;
    const bgPr = pFind(bg, "p:bgPr");
    if (bgPr) return readFill(bgPr, imageEmbedIds);
    const refFill = readBgRef(pFind(bg, "p:bgRef"), theme);
    if (refFill) return refFill;
    return undefined;
  };
  let background: LayoutFill | undefined = readBg(cSld);
  if (!background) background = parents?.layout?.background;
  if (!background) background = parents?.master?.background;

  // Prepend master → layout decor so it renders beneath slide-level shapes.
  // These carry brand furniture (logos, footer bars, dividers, page numbers)
  // that PowerPoint inherits from the slideMaster / slideLayout onto every
  // slide. Slide-level shapes then draw on top.
  const zRef = { z: 0 };
  const pushDecor = (src?: LayoutShape[]) => {
    if (!src?.length) return;
    for (const sh of src) shapes.push({ ...sh, z: zRef.z++ });
  };
  pushDecor(parents?.master?.decor);
  pushDecor(parents?.layout?.decor);

  if (spTree) {
    walkSpTree(pChildren(spTree), zRef, undefined, shapes, imageEmbedIds, parents, undefined, theme);
  }
  return { size, background, shapes };
}

// ─── Slide master / layout inheritance ─────────────────────────────────
// Placeholders inherit frame, fill, line and default text styling from
// their slideLayout and slideMaster ancestors. Without this pass, imported
// slides render placeholder shapes with no position or typography.

type PhProto = {
  key: string;         // `${type}|${idx}`
  type: string;        // "title" | "ctrTitle" | "body" | "subTitle" | "" | ...
  idx: string;         // "" if unspecified
  frame?: LayoutFrame;
  fill?: LayoutFill;
  line?: LayoutLine;
  prst?: string;
  // Per-level default run styling harvested from txBody > lstStyle > lvlXpPr > defRPr
  lvlDefaults?: Map<number, RunDefaults>;
};

type RunDefaults = { sizePt?: number; color?: string; font?: string; bold?: boolean; italic?: boolean };

type ParentSlideData = {
  background?: LayoutFill;
  placeholders: PhProto[];
  /** Parent-scoped image payloads (slideLayout/slideMaster relationships). */
  images?: Array<{ embedId: string; dataUrl: string; sourcePath?: string }>;
  /** Map local parent rIds → synthetic slide-level embedIds. */
  embedIdMap?: Record<string, string>;
  /** Non-placeholder decorative shapes (logos, page numbers, dividers, footer
   *  bars) captured from the layout / master spTree. Placeholder shapes are
   *  handled via PhProto inheritance instead. Image shapes are dropped because
   *  parent embed rIds don't match the slide's imageEmbedIds mapping. */
  decor?: LayoutShape[];
  // Master-level fallback text styles: title / body / other, keyed by level.
  txStyles?: {
    title?: Map<number, RunDefaults>;
    body?: Map<number, RunDefaults>;
    other?: Map<number, RunDefaults>;
  };
};

type ResolvedParents = { layout?: ParentSlideData; master?: ParentSlideData };

async function resolveParents(
  zip: JSZip,
  parser: XMLParser,
  slidePath: string,
  relsDoc: unknown,
  cache: Map<string, ParentSlideData>,
  theme: ParsedTheme,
): Promise<ResolvedParents> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rels = (relsDoc as any)?.Relationships?.Relationship;
  const arr = Array.isArray(rels) ? rels : rels ? [rels] : [];
  const layoutRel = arr.find((r) => /\/slideLayout$/i.test(String(r?.["@_Type"] ?? "")));
  if (!layoutRel?.["@_Target"]) return {};
  const layoutPath = resolveRelPath(slidePath, String(layoutRel["@_Target"]));
  const layoutData = await loadParent(zip, parser, layoutPath, cache, theme);
  if (!layoutData) return {};

  // Layout rels → master
  const layoutRelsPath = layoutPath.replace(/([^/]+)$/, "_rels/$1.rels");
  let masterData: ParentSlideData | undefined;
  if (zip.files[layoutRelsPath]) {
    const rxml = await zip.files[layoutRelsPath].async("string");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rdoc = parser.parse(rxml) as any;
    const rrels = rdoc?.Relationships?.Relationship;
    const rarr = Array.isArray(rrels) ? rrels : rrels ? [rrels] : [];
    const masterRel = rarr.find((r: unknown) => {
      const rec = r as Record<string, unknown>;
      return /\/slideMaster$/i.test(String(rec?.["@_Type"] ?? ""));
    });
    const masterTarget = masterRel ? (masterRel as Record<string, unknown>)["@_Target"] : undefined;
    if (masterTarget) {
      const masterPath = resolveRelPath(layoutPath, String(masterTarget));
      masterData = await loadParent(zip, parser, masterPath, cache, theme);
    }
  }
  return { layout: layoutData, master: masterData };
}

async function loadParent(
  zip: JSZip,
  _parser: XMLParser,
  path: string,
  cache: Map<string, ParentSlideData>,
  theme: ParsedTheme,
): Promise<ParentSlideData | undefined> {
  const cached = cache.get(path);
  if (cached) return cached;
  const entry = zip.files[path];
  if (!entry) return undefined;
  const xml = await entry.async("string");
  const orderParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    trimValues: true,
    processEntities: false,
    htmlEntities: false,
  });
  const root = orderParser.parse(xml) as PNode[];
  const rootNode = root.find((n) => {
    const t = pTag(n);
    return t === "p:sldLayout" || t === "p:sldMaster";
  }) ?? root[0];
  const isMaster = pTag(rootNode) === "p:sldMaster";
  const cSld = rootNode ? pFind(rootNode, "p:cSld") : undefined;
  const spTree = cSld ? pFind(cSld, "p:spTree") : undefined;

  const relsPath = path.replace(/([^/]+)$/, "_rels/$1.rels");
  let parentImageEmbedIds: string[] = [];
  const parentEmbedIdMap: Record<string, string> = {};
  const parentImages: Array<{ embedId: string; dataUrl: string; sourcePath?: string }> = [];
  if (zip.files[relsPath]) {
    try {
      const relXml = await zip.files[relsPath].async("string");
      const relDoc = _parser.parse(relXml);
      const relBuckets = extractRelTargetsByType(relDoc);
      parentImageEmbedIds = extractEmbedIdsFromOrderedNode(rootNode);
      for (const id of parentImageEmbedIds) {
        const target = relBuckets.image[id];
        if (!target) continue;
        const resolved = resolveRelPath(path, target);
        const mediaFile = zip.files[resolved];
        const mime = guessMime(resolved);
        if (!mediaFile || !mime) continue;
        const bytes = await mediaFile.async("uint8array");
        const dataUrl = `data:${mime};base64,${uint8ToBase64(bytes)}`;
        const syntheticId = `parent:${path}:${id}`;
        parentEmbedIdMap[id] = syntheticId;
        parentImages.push({ embedId: syntheticId, dataUrl, sourcePath: resolved });
      }
    } catch {
      // Parent image extraction is best-effort; missing/bad rels should not
      // block text/chart extraction from the slide itself.
    }
  }

  const readParentBg = (node: PNode | undefined): LayoutFill | undefined => {
    if (!node) return undefined;
    const bg = pFind(node, "p:bg");
    if (!bg) return undefined;
    const bgPr = pFind(bg, "p:bgPr");
    if (bgPr) return readFill(bgPr, parentImageEmbedIds, parentEmbedIdMap);
    const refFill = readBgRef(pFind(bg, "p:bgRef"), theme);
    if (refFill) return refFill;
    return undefined;
  };

  // Background
  let background: LayoutFill | undefined;
  if (cSld) background = readParentBg(cSld);

  const placeholders: PhProto[] = [];
  if (spTree) {
    for (const node of pChildren(spTree)) {
      if (pTag(node) !== "p:sp") continue;
      const nvSpPr = pFind(node, "p:nvSpPr");
      const nvPr = nvSpPr ? pFind(nvSpPr, "p:nvPr") : undefined;
      const ph = nvPr ? pFind(nvPr, "p:ph") : undefined;
      if (!ph) continue;
      const phType = String(pAttrs(ph)["@_type"] ?? "");
      const phIdx = String(pAttrs(ph)["@_idx"] ?? "");
      const spPr = pFind(node, "p:spPr");
      const style = pFind(node, "p:style");
      const frame = readFrame(spPr);
      const fill = readFill(spPr, parentImageEmbedIds, parentEmbedIdMap) ?? readFillRef(style, theme);
      const line = readLine(spPr) ?? readLineRef(style, theme);
      const prstGeom = spPr ? pFind(spPr, "a:prstGeom") : undefined;
      const prst = prstGeom ? pAttrs(prstGeom)["@_prst"] : undefined;
      const txBody = pFind(node, "p:txBody");
      const lvlDefaults = txBody ? readLstStyleDefaults(pFind(txBody, "a:lstStyle")) : undefined;
      placeholders.push({
        key: `${phType}|${phIdx}`,
        type: phType,
        idx: phIdx,
        frame,
        fill,
        line,
        prst,
        lvlDefaults,
      });
    }
  }

  let txStyles: ParentSlideData["txStyles"];
  if (isMaster) {
    const tx = rootNode ? pFind(rootNode, "p:txStyles") : undefined;
    if (tx) {
      txStyles = {
        title: readTxStyleLevels(pFind(tx, "p:titleStyle")),
        body: readTxStyleLevels(pFind(tx, "p:bodyStyle")),
        other: readTxStyleLevels(pFind(tx, "p:otherStyle")),
      };
    }
  }

  // Decorative (non-placeholder) shapes from the layout/master. These carry
  // brand furniture like logos, footer bars, page numbers, colored panels and
  // master/layout image art. Parent rIds are mapped to synthetic slide-level
  // embedIds above so image shapes and image fills can be stored/rendered.
  const decor: LayoutShape[] = [];
  if (spTree) {
    const zRef = { z: 0 };
    const collected: LayoutShape[] = [];
    walkSpTree(pChildren(spTree), zRef, undefined, collected, parentImageEmbedIds, undefined, parentEmbedIdMap, theme);
    // Re-walk raw nodes to know which are placeholders — walkSpTree doesn't
    // expose that. Cheaper: build a set of ph frames from `placeholders` and
    // drop shapes whose frame matches.
    const phFrames = new Set(placeholders
      .filter((p) => p.frame)
      .map((p) => `${p.frame!.x},${p.frame!.y},${p.frame!.w},${p.frame!.h}`));
    for (const sh of collected) {
      const key = `${sh.frame.x},${sh.frame.y},${sh.frame.w},${sh.frame.h}`;
      if (phFrames.has(key)) continue;
      decor.push(sh);
    }
  }

  const data: ParentSlideData = {
    background,
    placeholders,
    decor,
    txStyles,
    images: parentImages,
    embedIdMap: parentEmbedIdMap,
  };
  cache.set(path, data);
  return data;
}

function readLstStyleDefaults(lstStyle: PNode | undefined): Map<number, RunDefaults> | undefined {
  if (!lstStyle) return undefined;
  const out = new Map<number, RunDefaults>();
  for (const child of pChildren(lstStyle)) {
    const tag = pTag(child);
    if (!tag) continue;
    const m = tag.match(/^a:(?:def|lvl(\d+))pPr$/);
    if (!m) continue;
    const level = m[1] ? Number(m[1]) - 1 : 0;
    const defRPr = pFind(child, "a:defRPr");
    if (defRPr) {
      const rd = readRunDefaults(defRPr);
      if (rd) out.set(level, rd);
    }
  }
  return out.size ? out : undefined;
}

function readTxStyleLevels(styleNode: PNode | undefined): Map<number, RunDefaults> | undefined {
  if (!styleNode) return undefined;
  const out = new Map<number, RunDefaults>();
  for (const child of pChildren(styleNode)) {
    const tag = pTag(child);
    if (!tag) continue;
    const m = tag.match(/^a:(?:def|lvl(\d+))pPr$/);
    if (!m) continue;
    const level = m[1] ? Number(m[1]) - 1 : 0;
    const defRPr = pFind(child, "a:defRPr");
    if (defRPr) {
      const rd = readRunDefaults(defRPr);
      if (rd) out.set(level, rd);
    }
  }
  return out.size ? out : undefined;
}

function readRunDefaults(defRPr: PNode): RunDefaults | undefined {
  const a = pAttrs(defRPr);
  const rd: RunDefaults = {};
  if (a["@_sz"]) rd.sizePt = Number(a["@_sz"]) / 100;
  if (a["@_b"] === "1") rd.bold = true;
  if (a["@_i"] === "1") rd.italic = true;
  const solid = pFind(defRPr, "a:solidFill");
  const color = solid ? readColorFromNode(solid) : undefined;
  if (color) rd.color = color;
  const latin = pFind(defRPr, "a:latin");
  if (latin) {
    const tf = pAttrs(latin)["@_typeface"];
    if (tf) rd.font = tf;
  }
  return Object.keys(rd).length ? rd : undefined;
}

function lookupPlaceholderChain(
  parents: ResolvedParents,
  phType: string | undefined,
  phIdx: string | undefined,
): PhProto[] {
  const chain: PhProto[] = [];
  const norm = phType ?? "";
  const idxN = phIdx ?? "";
  for (const level of [parents.layout, parents.master]) {
    if (!level) continue;
    // 1) exact type+idx
    let hit = level.placeholders.find((p) => p.type === norm && p.idx === idxN);
    // 2) same type (any idx)
    if (!hit) hit = level.placeholders.find((p) => p.type === norm);
    // 3) title fallbacks
    if (!hit && (norm === "title" || norm === "ctrTitle")) {
      hit = level.placeholders.find((p) => p.type === "title" || p.type === "ctrTitle");
    }
    // 4) body fallbacks
    if (!hit && (norm === "body" || norm === "subTitle" || norm === "")) {
      hit = level.placeholders.find((p) => p.type === "body" || p.type === "");
    }
    if (hit) chain.push(hit);
  }
  return chain;
}

function pickTxStyleKind(phType: string | undefined): "title" | "body" | "other" {
  if (phType === "title" || phType === "ctrTitle") return "title";
  if (phType === "body" || phType === "subTitle" || phType === "" || phType === undefined) return "body";
  return "other";
}

function applyPlaceholderTextInheritance(
  text: LayoutTextBody,
  phType: string | undefined,
  chain: PhProto[],
  parents?: ResolvedParents,
): LayoutTextBody {
  const kind = pickTxStyleKind(phType);
  const masterLevels = parents?.master?.txStyles?.[kind];
  if (!chain.length && !masterLevels) return text;
  const nextParas: LayoutPara[] = text.paras.map((p) => {
    const level = typeof p.level === "number" ? p.level : 0;
    // Collect defaults with precedence: layout ph lvl → master ph lvl → master txStyles lvl
    const defaults: RunDefaults = {};
    for (const proto of chain) {
      const d = proto.lvlDefaults?.get(level) ?? proto.lvlDefaults?.get(0);
      if (d) mergeDefaults(defaults, d);
    }
    if (masterLevels) {
      const d = masterLevels.get(level) ?? masterLevels.get(0);
      if (d) mergeDefaults(defaults, d);
    }
    if (Object.keys(defaults).length === 0) return p;
    const runs = p.runs.map((r) => ({
      ...r,
      sizePt: r.sizePt ?? defaults.sizePt,
      color: r.color ?? defaults.color,
      font: r.font ?? defaults.font,
      bold: r.bold ?? defaults.bold,
      italic: r.italic ?? defaults.italic,
    }));
    return { ...p, runs };
  });
  return { ...text, paras: nextParas };
}

function mergeDefaults(target: RunDefaults, src: RunDefaults) {
  if (target.sizePt === undefined && src.sizePt !== undefined) target.sizePt = src.sizePt;
  if (target.color === undefined && src.color !== undefined) target.color = src.color;
  if (target.font === undefined && src.font !== undefined) target.font = src.font;
  if (target.bold === undefined && src.bold !== undefined) target.bold = src.bold;
  if (target.italic === undefined && src.italic !== undefined) target.italic = src.italic;
}


// ─── Deck-wide extra readers (metadata, comments, fonts, custom xml) ────

async function readXmlSafe(zip: JSZip, parser: XMLParser, path: string): Promise<unknown | null> {
  const entry = zip.files[path];
  if (!entry) return null;
  try {
    const xml = await entry.async("string");
    return parser.parse(xml);
  } catch { return null; }
}

function textOf(node: unknown): string | undefined {
  if (node == null) return undefined;
  if (typeof node === "string") return node.trim() || undefined;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    const t = (node as Record<string, unknown>)["#text"];
    return t == null ? undefined : String(t);
  }
  return undefined;
}

async function readDeckMetadata(zip: JSZip, parser: XMLParser): Promise<ParsedDeckMetadata> {
  const md: ParsedDeckMetadata = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core = (await readXmlSafe(zip, parser, "docProps/core.xml")) as any;
  if (core) {
    const cp = core["cp:coreProperties"] ?? core["coreProperties"] ?? {};
    md.title = textOf(cp["dc:title"]);
    md.subject = textOf(cp["dc:subject"]);
    md.creator = textOf(cp["dc:creator"]);
    md.description = textOf(cp["dc:description"]);
    md.keywords = textOf(cp["cp:keywords"]);
    md.category = textOf(cp["cp:category"]);
    md.lastModifiedBy = textOf(cp["cp:lastModifiedBy"]);
    md.revision = textOf(cp["cp:revision"]);
    md.created = textOf(cp["dcterms:created"]);
    md.modified = textOf(cp["dcterms:modified"]);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = (await readXmlSafe(zip, parser, "docProps/app.xml")) as any;
  if (app) {
    const ap = app["Properties"] ?? {};
    md.application = textOf(ap["Application"]);
    md.appVersion = textOf(ap["AppVersion"]);
    md.company = textOf(ap["Company"]);
    md.manager = textOf(ap["Manager"]);
    md.template = textOf(ap["Template"]);
    md.presentationFormat = textOf(ap["PresentationFormat"]);
  }
  return md;
}

async function readSlideComments(zip: JSZip, parser: XMLParser, slideNum: number): Promise<ParsedComment[]> {
  const out: ParsedComment[] = [];
  // Modern (PPT 2007+) comments live at ppt/comments/comment{N}.xml paired with slide index.
  const candidates = [
    `ppt/comments/comment${slideNum}.xml`,
    `ppt/comments/modernComment_${slideNum}.xml`,
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let commentsDoc: any = null;
  for (const p of candidates) {
    commentsDoc = await readXmlSafe(zip, parser, p);
    if (commentsDoc) break;
  }
  if (!commentsDoc) return out;
  const list = commentsDoc?.["p:cmLst"]?.["p:cm"] ?? commentsDoc?.["cmLst"]?.["cm"];
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authorsDoc: any = await readXmlSafe(zip, parser, "ppt/commentAuthors.xml");
  const authors = new Map<string, { name?: string; initials?: string }>();
  const aRaw = authorsDoc?.["p:cmAuthorLst"]?.["p:cmAuthor"];
  const aArr = Array.isArray(aRaw) ? aRaw : aRaw ? [aRaw] : [];
  for (const a of aArr) {
    const id = String(a?.["@_id"] ?? "");
    if (id) authors.set(id, { name: a?.["@_name"], initials: a?.["@_initials"] });
  }
  for (const c of arr) {
    const authorId = String(c?.["@_authorId"] ?? "");
    const author = authors.get(authorId) ?? {};
    const t = textOf(c?.["p:text"]) ?? "";
    if (!t) continue;
    out.push({
      authorName: author.name,
      authorInitials: author.initials,
      text: cap(t, 2000),
      createdAt: c?.["@_dt"],
    });
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readTransitionKind(tr: any): string | undefined {
  if (!tr || typeof tr !== "object") return undefined;
  for (const key of Object.keys(tr)) {
    if (key.startsWith("@_")) continue;
    // Strip namespace prefix (p:fade → fade).
    const name = key.includes(":") ? key.split(":").pop()! : key;
    if (name && name !== "extLst") return name;
  }
  return undefined;
}

async function readEmbeddedFonts(
  zip: JSZip,
  parser: XMLParser,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presDoc: any,
): Promise<ParsedEmbeddedFont[]> {
  const out: ParsedEmbeddedFont[] = [];
  if (!presDoc) return out;
  const fontLst = presDoc?.["p:presentation"]?.["p:embeddedFontLst"]?.["p:embeddedFont"];
  const arr = Array.isArray(fontLst) ? fontLst : fontLst ? [fontLst] : [];
  if (arr.length === 0) return out;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relsDoc: any = await readXmlSafe(zip, parser, "ppt/_rels/presentation.xml.rels");
  const relTargets: Record<string, string> = {};
  const rels = relsDoc?.Relationships?.Relationship;
  const rArr = Array.isArray(rels) ? rels : rels ? [rels] : [];
  for (const r of rArr) {
    const id = r?.["@_Id"];
    const target = r?.["@_Target"];
    if (id && target) relTargets[id] = target;
  }
  // Budget: keep the inline font payload small so the deck row stays lean.
  const MAX_FONT_BYTES = 1_500_000;
  const MAX_TOTAL_FONT_BYTES = 6_000_000;
  let usedBytes = 0;
  for (const f of arr) {
    const typeface = String(f?.["p:font"]?.["@_typeface"] ?? f?.["@_typeface"] ?? "").trim();
    if (!typeface) continue;
    const variants: ParsedEmbeddedFont["variants"] = [];
    const styleMap: Array<[string, "regular" | "bold" | "italic" | "boldItalic"]> = [
      ["p:regular", "regular"], ["p:bold", "bold"], ["p:italic", "italic"], ["p:boldItalic", "boldItalic"],
    ];
    for (const [k, style] of styleMap) {
      const rId = f?.[k]?.["@_r:id"];
      if (!rId || !relTargets[rId]) continue;
      const path = resolveRelPath("ppt/presentation.xml", relTargets[rId]);
      const mime = guessMime(path) ?? "application/octet-stream";
      let dataUrl: string | undefined;
      let bytes: number | undefined;
      const entry = zip.files[path];
      if (entry) {
        try {
          const bin = await entry.async("uint8array");
          bytes = bin.length;
          if (bin.length <= MAX_FONT_BYTES && usedBytes + bin.length <= MAX_TOTAL_FONT_BYTES) {
            dataUrl = `data:${mime};base64,${Buffer.from(bin).toString("base64")}`;
            usedBytes += bin.length;
          }
        } catch { /* skip unreadable font */ }
      }
      variants.push({ style, path, mime, dataUrl, bytes });
    }
    if (variants.length) out.push({ typeface, variants });
  }
  return out;
}

async function readCustomXmlParts(zip: JSZip): Promise<Array<{ path: string; xml: string }>> {
  const out: Array<{ path: string; xml: string }> = [];
  for (const path of Object.keys(zip.files)) {
    if (!/^customXml\/item\d+\.xml$/i.test(path)) continue;
    try {
      const xml = await zip.files[path].async("string");
      if (xml.length > 500_000) continue; // skip huge custom xml payloads
      out.push({ path, xml });
    } catch { /* skip */ }
  }
  return out;
}
