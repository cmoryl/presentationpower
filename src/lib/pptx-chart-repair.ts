// -----------------------------------------------------------------------------
// Chart XML repair
//
// pptxgenjs emits chart parts that PowerPoint's strict validator rejects, which
// is what produced "PowerPoint found a problem with content in <file>.pptx" and
// the repair dialog on open. Three defects, all reproducible in the generated
// package:
//
//   1. THREE `<c:axId>` children inside `<c:barChart>` / `<c:lineChart>` when
//      the chart has only a category and a value axis. CT_BarChart allows at
//      most two axIds unless a `<c:serAx>` exists — the third one is the error
//      the validator reports as "Invalid content ... 'c:axId'".
//   2. A `<c:auto>` element inside `<c:valAx>`. `auto` belongs to CT_CatAx /
//      CT_DateAx only.
//   3. `<c:grouping>` missing from `lineChart` / `areaChart`, and children in
//      the wrong order (grouping/varyColors must precede `<c:ser>`).
//
// This pass runs on the zip in `pptx-native-xml.ts`, so it fixes the file that
// actually ships without patching the vendored library.
// -----------------------------------------------------------------------------

/** Plot types whose axId count must match the number of real axes. */
const PLOT_TYPES = [
  "barChart",
  "bar3DChart",
  "lineChart",
  "line3DChart",
  "areaChart",
  "area3DChart",
  "radarChart",
  "scatterChart",
  "bubbleChart",
];

const GROUPED_PLOTS: Record<string, string> = {
  lineChart: "standard",
  line3DChart: "standard",
  areaChart: "standard",
  area3DChart: "standard",
  barChart: "clustered",
  bar3DChart: "clustered",
};

function plotBlockRe(type: string): RegExp {
  return new RegExp(`<c:${type}>([\\s\\S]*?)</c:${type}>`, "g");
}

/** Axis references allowed by each plot schema (independent of combo-chart axes). */
function plotAxisLimit(type: string): number {
  return type === "bar3DChart" || type === "line3DChart" || type === "area3DChart" ? 3 : 2;
}

/** Trim the axId list of one plot block to the axes the chart really declares. */
function fixAxIds(block: string, allowed: number): string {
  const ids = block.match(/<c:axId val="\d+"\s*\/>/g);
  if (!ids || ids.length <= allowed) return block;
  let seen = 0;
  return block.replace(/<c:axId val="\d+"\s*\/>/g, (m) => {
    seen += 1;
    return seen <= allowed ? m : "";
  });
}

/** Ensure `<c:grouping>` exists and sits before the first `<c:ser>`. */
function fixGrouping(block: string, type: string): string {
  const want = GROUPED_PLOTS[type];
  if (!want) return block;
  if (/<c:grouping\s+val="[^"]*"\s*\/>/.test(block)) {
    // Present but possibly after <c:ser>: hoist it.
    const g = /<c:grouping\s+val="[^"]*"\s*\/>/.exec(block)![0];
    const serIdx = block.indexOf("<c:ser>");
    if (serIdx >= 0 && block.indexOf(g) > serIdx) {
      const without = block.replace(g, "");
      const at = without.indexOf("<c:ser>");
      return `${without.slice(0, at)}${g}${without.slice(at)}`;
    }
    return block;
  }
  const g = `<c:grouping val="${want}"/>`;
  const barDir = /<c:barDir\s+val="[^"]*"\s*\/>/.exec(block);
  if (barDir) return block.replace(barDir[0], `${barDir[0]}${g}`);
  return `${g}${block}`;
}

/**
 * CT_*Ser child sequence. PowerPoint's validator enforces it, and pptxgenjs
 * emits `<c:dLbls>` AFTER `<c:cat>`/`<c:val>` on the line series of a
 * multi-type (bar + line) chart, which trips the repair dialog. Reordering is
 * safe: every one of these elements is optional and position-independent in
 * meaning.
 */
const SER_ORDER = [
  "c:idx",
  "c:order",
  "c:tx",
  "c:spPr",
  "c:invertIfNegative",
  "c:pictureOptions",
  "c:marker",
  "c:dPt",
  "c:dLbls",
  "c:trendline",
  "c:errBars",
  "c:cat",
  "c:xVal",
  "c:val",
  "c:yVal",
  "c:bubbleSize",
  "c:bubble3D",
  "c:shape",
  "c:smooth",
  "c:extLst",
];

/** Split a series body into top-level `<c:tag>…</c:tag>` / `<c:tag/>` chunks. */
function serChildren(ser: string): Array<{ tag: string; xml: string }> {
  const out: Array<{ tag: string; xml: string }> = [];
  const re = /<(c:[A-Za-z0-9]+)(\s[^>]*?)?(\/)?>/g;
  let m: RegExpExecArray | null;
  let cursor = 0;
  while ((m = re.exec(ser))) {
    if (m.index < cursor) continue; // inside a child we already consumed
    const tag = m[1];
    if (m[3]) {
      out.push({ tag, xml: m[0] });
      cursor = m.index + m[0].length;
    } else {
      const close = ser.indexOf(`</${tag}>`, m.index);
      if (close === -1) return [];
      const end = close + tag.length + 3;
      out.push({ tag, xml: ser.slice(m.index, end) });
      cursor = end;
    }
    re.lastIndex = cursor;
  }
  return out;
}

/** Re-sequence every `<c:ser>` body into schema order. Idempotent. */
function fixSerOrder(xml: string): string {
  return xml.replace(/<c:ser>([\s\S]*?)<\/c:ser>/g, (all, inner: string) => {
    const kids = serChildren(inner);
    if (!kids.length) return all;
    // Bail out if anything but whitespace sits outside a recognised element.
    const consumed = kids.reduce((n, k) => n + k.xml.replace(/\s+/g, "").length, 0);
    if (consumed !== inner.replace(/\s+/g, "").length) return all;
    const rank = (tag: string) => {
      const i = SER_ORDER.indexOf(tag);
      return i === -1 ? SER_ORDER.length : i;
    };
    const sorted = kids
      .map((k, i) => ({ ...k, i }))
      .sort((a, b) => rank(a.tag) - rank(b.tag) || a.i - b.i);
    const next = sorted.map((k) => k.xml).join("");
    return next === inner.trim() ? all : `<c:ser>${next}</c:ser>`;
  });
}

/**
 * `invertIfNegative` belongs to bar-series only. pptxgenjs also emits it on
 * line/area/radar/scatter/bubble series, where desktop PowerPoint rejects the
 * chart part and offers to repair the presentation.
 */
function fixPlotSeries(xml: string, type: string): string {
  if (type === "barChart" || type === "bar3DChart") return fixSerOrder(xml);
  return fixSerOrder(
    xml.replace(/<c:ser>([\s\S]*?)<c:invertIfNegative\b[^>]*\/>[\s\S]*?<\/c:ser>/g, (all) =>
      all.replace(/<c:invertIfNegative\b[^>]*\/>/g, ""),
    ),
  );
}

/**
 * ST_LineWidth is an integer EMU in [0, 20116800]. pptxgenjs's multi-type chart
 * path has been observed emitting `w="3.99e+28"` on a series marker outline —
 * scientific notation is not even lexically valid for the type, so PowerPoint
 * rejects the part. Clamp every line width in the chart to a legal integer.
 */
const MAX_LINE_W = 20116800;

function fixLineWidths(xml: string): string {
  return xml.replace(
    /(<a:ln\b[^>]*?\sw=")([^"]+)(")/g,
    (all, pre: string, raw: string, post: string) => {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= MAX_LINE_W) return all;
      // A nonsense value carries no design intent, and clamping it to the legal
      // maximum floods the plot area with a 22-inch stroke (seen in a real
      // PowerPoint render), so fall back to a 1pt hairline instead.
      const safe = Number.isFinite(n) && n >= 0 && n <= MAX_LINE_W ? Math.round(n) : 12700;
      return `${pre}${safe}${post}`;
    },
  );
}

/** Marker size is restricted to 2–72 by ST_MarkerSize. */
function fixMarkerSizes(xml: string): string {
  return xml.replace(/<c:size\s+val="([^"]+)"\s*\/>/g, (all, raw: string) => {
    const value = Number(raw);
    if (Number.isInteger(value) && value >= 2 && value <= 72) return all;
    const safe = Number.isFinite(value) ? Math.max(2, Math.min(72, Math.round(value))) : 2;
    return `<c:size val="${safe}"/>`;
  });
}

/**
 * pptxgenjs duplicates `showLeaderLines=0` inside a c15 extension whose payload
 * fails strict Office validation on bubble labels. The standard c:showLeaderLines
 * sibling already carries the same setting, so dropping this redundant block is
 * lossless and avoids the repair dialog.
 */
function stripRedundantLeaderLineExtension(xml: string): string {
  return xml.replace(
    /<c:extLst>\s*<c:ext\b[^>]*>\s*<c15:showLeaderLines\s+val="0"\s*\/>\s*<\/c:ext>\s*<\/c:extLst>/g,
    "",
  );
}

/** Strip elements that are invalid on a value axis. */
function fixValAx(xml: string): string {
  return xml.replace(/<c:valAx>([\s\S]*?)<\/c:valAx>/g, (all, inner: string) => {
    const cleaned = inner
      .replace(/<c:auto\s+val="[^"]*"\s*\/>/g, "")
      .replace(/<c:lblAlgn\s+val="[^"]*"\s*\/>/g, "")
      .replace(/<c:noMultiLvlLbl\s+val="[^"]*"\s*\/>/g, "");
    return cleaned === inner ? all : `<c:valAx>${cleaned}</c:valAx>`;
  });
}

/**
 * pptxgenjs writes the plot-area / chart-area fill from an unset color, which
 * resolves to pure black (`000000`) — every native chart shipped with an opaque
 * black plate behind the bars. The design paints its own ground, so any pure
 * black solid fill in a chart part becomes `noFill`; the brand palette never
 * uses 000000 (dark ink is 03002C), so this can only hit the phantom plate.
 */
function clearBlackPlates(xml: string): string {
  return xml.replace(
    /<a:solidFill><a:srgbClr val="000000"\s*\/><\/a:solidFill>/g,
    "<a:noFill/>",
  );
}

/**
 * Waterfall bridges are stacked bars where the lower "Base" series only lifts
 * the delta into place — on screen it is invisible. pptxgenjs cannot express a
 * transparent series, so the riser exported as a solid surface-coloured bar.
 * Strip its fill so the exported bridge floats exactly like the build.
 */
function hideWaterfallRisers(xml: string): string {
  let riserIdx: number | null = null;
  let out = xml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, (ser) => {
    if (!/<c:tx>[\s\S]*?<c:v>Base<\/c:v>/.test(ser)) return ser;
    const idx = ser.match(/<c:idx val="(\d+)"\s*\/>/)?.[1];
    if (idx != null) riserIdx = Number(idx);
    return ser.replace(
      /<c:spPr>[\s\S]*?<\/c:spPr>/,
      "<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>",
    );
  });
  // …and drop its legend key, otherwise PowerPoint prints a "Base" entry with a
  // blank swatch next to the real Increase/Decrease keys.
  if (riserIdx !== null && /<c:legend>/.test(out) && !/<c:legendEntry>/.test(out)) {
    out = out.replace(
      /(<c:legend>\s*(?:<c:legendPos[^>]*\/>)?)/,
      `$1<c:legendEntry><c:idx val="${riserIdx}"/><c:delete val="1"/></c:legendEntry>`,
    );
  }
  return out;
}



/**
 * Make one `ppt/charts/chartN.xml` schema-valid. Safe to run on already-valid
 * XML: every fix is conditional and idempotent.
 */
export function repairChartXml(xml: string): string {
  if (!xml.includes("c:chartSpace")) return xml;
  let out = xml;

  for (const type of PLOT_TYPES) {
    out = out.replace(plotBlockRe(type), (_all, inner: string) => {
      let block = fixGrouping(inner, type);
      block = fixAxIds(block, plotAxisLimit(type));
      block = fixPlotSeries(block, type);
      return `<c:${type}>${block}</c:${type}>`;
    });
  }

  out = fixValAx(out);
  out = fixLineWidths(out);
  out = fixMarkerSizes(out);
  out = stripRedundantLeaderLineExtension(out);
  out = clearBlackPlates(out);
  out = hideWaterfallRisers(out);
  return out;
}

