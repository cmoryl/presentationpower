/**
 * Regression tests for the PPTX ingestion pipeline
 * (src/lib/pptx-import.functions.ts).
 *
 * These build minimal .pptx zip fixtures in-memory using JSZip, feed them
 * through `parsePptxBuffer`, and assert that charts, tables, and diagrams
 * round-trip their visual metadata (series colors, labels, legends,
 * typography, layout hints, connector styles).
 *
 * If a test here fails, it means chart/diagram fidelity regressed — the
 * assertion name points at exactly which field (color, legend, axis,
 * numberFormat, font, layoutHint, connector).
 */

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parsePptxBuffer } from "@/lib/pptx-import";

// ─── Fixture XML builders ─────────────────────────────────────────────────

const THEME_ACCENTS = ["003FC7", "A1FBF9", "C2A3FF", "FFEB66", "A6FA87", "FF9B70"];
const THEME_HEADING_FONT = "Geist Sans";
const THEME_BODY_FONT = "Geist";

function themeXml(): string {
  const accents = THEME_ACCENTS.map(
    (hex, i) => `<a:accent${i + 1}><a:srgbClr val="${hex}"/></a:accent${i + 1}>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test">
 <a:themeElements>
  <a:clrScheme name="Test">
   <a:dk1><a:srgbClr val="03002C"/></a:dk1>
   <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
   ${accents}
  </a:clrScheme>
  <a:fontScheme name="Test">
   <a:majorFont><a:latin typeface="${THEME_HEADING_FONT}"/></a:majorFont>
   <a:minorFont><a:latin typeface="${THEME_BODY_FONT}"/></a:minorFont>
  </a:fontScheme>
 </a:themeElements>
</a:theme>`;
}

function slideEnvelope(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <p:cSld><p:spTree>${inner}</p:spTree></p:cSld>
</p:sld>`;
}

function relsXml(entries: Array<{ id: string; type: string; target: string }>): string {
  const body = entries
    .map((e) => `<Relationship Id="${e.id}" Type="${e.type}" Target="${e.target}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
}

/**
 * Build a c:chartSpace with a column chart (two series, per-series srgb
 * colors, category axis / value axis titles, legend at bottom, currency
 * numberFormat, and a c:txPr specifying font family + color).
 */
function columnChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <c:chart>
  <c:title><c:tx><c:rich><a:p><a:r><a:t>Regional Revenue</a:t></a:r></a:p></c:rich></c:tx></c:title>
  <c:plotArea>
   <c:barChart>
    <c:barDir val="col"/>
    <c:grouping val="clustered"/>
    <c:ser>
     <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>FY24</c:v></c:pt></c:strCache></c:strRef></c:tx>
     <c:spPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></c:spPr>
     <c:cat><c:strRef><c:strCache>
      <c:pt idx="0"><c:v>NA</c:v></c:pt>
      <c:pt idx="1"><c:v>EU</c:v></c:pt>
      <c:pt idx="2"><c:v>APAC</c:v></c:pt>
     </c:strCache></c:strRef></c:cat>
     <c:val><c:numRef><c:numCache>
      <c:formatCode>$#,##0</c:formatCode>
      <c:pt idx="0"><c:v>120</c:v></c:pt>
      <c:pt idx="1"><c:v>95</c:v></c:pt>
      <c:pt idx="2"><c:v>60</c:v></c:pt>
     </c:numCache></c:numRef></c:val>
    </c:ser>
    <c:ser>
     <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>FY25</c:v></c:pt></c:strCache></c:strRef></c:tx>
     <c:spPr><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></c:spPr>
     <c:val><c:numRef><c:numCache>
      <c:pt idx="0"><c:v>140</c:v></c:pt>
      <c:pt idx="1"><c:v>110</c:v></c:pt>
      <c:pt idx="2"><c:v>85</c:v></c:pt>
     </c:numCache></c:numRef></c:val>
    </c:ser>
    <c:axId val="1"/><c:axId val="2"/>
   </c:barChart>
   <c:catAx>
    <c:axId val="1"/>
    <c:title><c:tx><c:rich><a:p><a:r><a:t>Region</a:t></a:r></a:p></c:rich></c:tx></c:title>
   </c:catAx>
   <c:valAx>
    <c:axId val="2"/>
    <c:title><c:tx><c:rich><a:p><a:r><a:t>USD</a:t></a:r></a:p></c:rich></c:tx></c:title>
   </c:valAx>
  </c:plotArea>
  <c:legend><c:legendPos val="b"/></c:legend>
  <c:txPr>
   <a:bodyPr/>
   <a:p><a:pPr><a:defRPr>
    <a:solidFill><a:srgbClr val="123456"/></a:solidFill>
    <a:latin typeface="Custom Sans"/>
   </a:defRPr></a:pPr></a:p>
  </c:txPr>
 </c:chart>
</c:chartSpace>`;
}

/**
 * Pie chart with per-datapoint srgb colors (c:dPt) — the code path used
 * for pie/doughnut segment fidelity.
 */
function pieChartXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
 <c:chart><c:plotArea><c:pieChart>
  <c:ser>
   <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Share</c:v></c:pt></c:strCache></c:strRef></c:tx>
   <c:dPt><c:idx val="0"/><c:spPr><a:solidFill><a:srgbClr val="112233"/></a:solidFill></c:spPr></c:dPt>
   <c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="445566"/></a:solidFill></c:spPr></c:dPt>
   <c:dPt><c:idx val="2"/><c:spPr><a:solidFill><a:srgbClr val="778899"/></a:solidFill></c:spPr></c:dPt>
   <c:cat><c:strRef><c:strCache>
    <c:pt idx="0"><c:v>A</c:v></c:pt>
    <c:pt idx="1"><c:v>B</c:v></c:pt>
    <c:pt idx="2"><c:v>C</c:v></c:pt>
   </c:strCache></c:strRef></c:cat>
   <c:val><c:numRef><c:numCache>
    <c:formatCode>0%</c:formatCode>
    <c:pt idx="0"><c:v>0.5</c:v></c:pt>
    <c:pt idx="1"><c:v>0.3</c:v></c:pt>
    <c:pt idx="2"><c:v>0.2</c:v></c:pt>
   </c:numCache></c:numRef></c:val>
  </c:ser>
 </c:pieChart></c:plotArea></c:chart>
</c:chartSpace>`;
}

/** Slide XML containing a title, a `<a:tbl>` table, and a graphicFrame chart ref. */
function slideWithChartAndTableXml(chartRelId: string): string {
  const title = `<p:sp>
    <p:nvSpPr><p:cNvPr id="1" name="T"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
    <p:spPr/>
    <p:txBody><a:bodyPr/><a:p><a:r><a:t>Fidelity Test</a:t></a:r></a:p></p:txBody>
   </p:sp>`;
  const table = `<p:graphicFrame>
    <p:nvGraphicFramePr><p:cNvPr id="2" name="Tbl"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
    <p:xfrm/>
    <a:graphic><a:graphicData>
     <a:tbl>
      <a:tblGrid><a:gridCol w="1"/><a:gridCol w="1"/></a:tblGrid>
      <a:tr h="1">
       <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Metric</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>
       <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Value</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>
      </a:tr>
      <a:tr h="1">
       <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>Revenue</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>
       <a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>$1.2B</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>
      </a:tr>
     </a:tbl>
    </a:graphicData></a:graphic>
   </p:graphicFrame>`;
  const chart = `<p:graphicFrame>
    <p:nvGraphicFramePr><p:cNvPr id="3" name="C"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
    <p:xfrm/>
    <a:graphic><a:graphicData>
     <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
              r:id="${chartRelId}"/>
    </a:graphicData></a:graphic>
   </p:graphicFrame>`;
  return slideEnvelope(title + table + chart);
}

/**
 * Slide XML with a grouped shape diagram: four chevrons + three connectors.
 * Hits `extractGroupShapeDiagram` → layoutHint "process" and a connector
 * style with theme-accent color and 2pt width.
 */
function slideWithShapeGroupDiagramXml(): string {
  const chevron = (idx: number, text: string) => `<p:sp>
    <p:nvSpPr><p:cNvPr id="${100 + idx}" name="C${idx}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr>
     <a:prstGeom prst="chevron"><a:avLst/></a:prstGeom>
     <a:solidFill><a:srgbClr val="AA00AA"/></a:solidFill>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody>
   </p:sp>`;
  const connector = (idx: number) => `<p:cxnSp>
    <p:nvCxnSpPr><p:cNvPr id="${200 + idx}" name="L${idx}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
    <p:spPr>
     <a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>
     <a:ln w="25400"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:prstDash val="dash"/>
      <a:headEnd type="triangle"/>
     </a:ln>
    </p:spPr>
   </p:cxnSp>`;
  const grp = `<p:grpSp>
    <p:nvGrpSpPr><p:cNvPr id="10" name="G"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr/>
    ${chevron(1, "Discover")}
    ${chevron(2, "Define")}
    ${chevron(3, "Design")}
    ${chevron(4, "Deliver")}
    ${connector(1)}
    ${connector(2)}
    ${connector(3)}
   </p:grpSp>`;
  return slideEnvelope(grp);
}

/**
 * Minimal SmartArt: diagramData with three nodes, diagramLayout with a
 * `basicProcess` uniqueId, and diagramDrawing with one styled connector.
 */
const SMARTART_DATA_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
 <dgm:ptLst>
  <dgm:pt type="node"><dgm:t><a:p><a:r><a:t>Plan</a:t></a:r></a:p></dgm:t>
   <dgm:spPr><a:solidFill><a:srgbClr val="003FC7"/></a:solidFill></dgm:spPr></dgm:pt>
  <dgm:pt type="node"><dgm:t><a:p><a:r><a:t>Build</a:t></a:r></a:p></dgm:t>
   <dgm:spPr><a:solidFill><a:srgbClr val="A1FBF9"/></a:solidFill></dgm:spPr></dgm:pt>
  <dgm:pt type="node"><dgm:t><a:p><a:r><a:t>Ship</a:t></a:r></a:p></dgm:t></dgm:pt>
 </dgm:ptLst>
</dgm:dataModel>`;

const SMARTART_LAYOUT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dgm:layoutDef xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"
               uniqueId="urn:microsoft.com/office/officeart/2005/8/layout/basicProcess"/>`;

const SMARTART_DRAWING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dsp:drawing xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
 <dsp:spTree>
  <dsp:cxnSp>
   <dsp:spPr>
    <a:ln w="19050"><a:solidFill><a:srgbClr val="0088FF"/></a:solidFill><a:prstDash val="solid"/>
     <a:tailEnd type="stealth"/>
    </a:ln>
   </dsp:spPr>
  </dsp:cxnSp>
  <dsp:cxnSp>
   <dsp:spPr>
    <a:ln w="19050"><a:solidFill><a:srgbClr val="0088FF"/></a:solidFill><a:prstDash val="solid"/>
     <a:tailEnd type="stealth"/>
    </a:ln>
   </dsp:spPr>
  </dsp:cxnSp>
 </dsp:spTree>
</dsp:drawing>`;

function slideWithSmartArtXml(
  dataRelId: string,
  layoutRelId: string,
  drawingRelId: string,
): string {
  const frame = `<p:graphicFrame>
    <p:nvGraphicFramePr><p:cNvPr id="20" name="SA"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
    <p:xfrm/>
    <a:graphic><a:graphicData>
     <dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"
                 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                 r:dm="${dataRelId}" r:lo="${layoutRelId}" r:qs="${dataRelId}" r:cs="${drawingRelId}"/>
    </a:graphicData></a:graphic>
   </p:graphicFrame>`;
  return slideEnvelope(frame);
}

// ─── Full fixture pptx zip ────────────────────────────────────────────────

const REL_CHART = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
const REL_DGM_DATA =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData";
const REL_DGM_LAYOUT =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout";
const REL_DGM_DRAWING = "http://schemas.microsoft.com/office/2007/relationships/diagramDrawing";

async function buildFixturePptx(): Promise<Buffer> {
  const zip = new JSZip();
  // Package sniffing is authoritative on [Content_Types].xml, so the fixture
  // must declare the presentation override like a real deck does.
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`,
  );
  zip.file("ppt/theme/theme1.xml", themeXml());

  // Slide 1 — chart + table
  zip.file("ppt/slides/slide1.xml", slideWithChartAndTableXml("rId1"));
  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    relsXml([{ id: "rId1", type: REL_CHART, target: "../charts/chart1.xml" }]),
  );
  zip.file("ppt/charts/chart1.xml", columnChartXml());

  // Slide 2 — pie chart with per-datapoint colors
  zip.file("ppt/slides/slide2.xml", slideWithChartAndTableXml("rId1"));
  zip.file(
    "ppt/slides/_rels/slide2.xml.rels",
    relsXml([{ id: "rId1", type: REL_CHART, target: "../charts/chart2.xml" }]),
  );
  zip.file("ppt/charts/chart2.xml", pieChartXml());

  // Slide 3 — shape-group process diagram
  zip.file("ppt/slides/slide3.xml", slideWithShapeGroupDiagramXml());
  zip.file("ppt/slides/_rels/slide3.xml.rels", relsXml([]));

  // Slide 4 — SmartArt process
  zip.file("ppt/slides/slide4.xml", slideWithSmartArtXml("rId1", "rId2", "rId3"));
  zip.file(
    "ppt/slides/_rels/slide4.xml.rels",
    relsXml([
      { id: "rId1", type: REL_DGM_DATA, target: "../diagrams/data1.xml" },
      { id: "rId2", type: REL_DGM_LAYOUT, target: "../diagrams/layout1.xml" },
      { id: "rId3", type: REL_DGM_DRAWING, target: "../diagrams/drawing1.xml" },
    ]),
  );
  zip.file("ppt/diagrams/data1.xml", SMARTART_DATA_XML);
  zip.file("ppt/diagrams/layout1.xml", SMARTART_LAYOUT_XML);
  zip.file("ppt/diagrams/drawing1.xml", SMARTART_DRAWING_XML);

  return await zip.generateAsync({ type: "nodebuffer" });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("pptx-import fidelity", () => {
  it("parses theme accents + font scheme", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    expect(deck.theme.accents).toEqual(THEME_ACCENTS.map((h) => `#${h.toUpperCase()}`));
    expect(deck.theme.bodyFont).toBe(THEME_BODY_FONT);
    expect(deck.theme.headingFont).toBe(THEME_HEADING_FONT);
    expect(deck.theme.dark1).toBe("#03002C");
  });

  it("round-trips column chart: title, kind, categories, series colors (srgb + theme scheme), legend, axis, numberFormat, unit, font", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    const slide = deck.slides[0];
    expect(slide.charts).toHaveLength(1);
    const chart = slide.charts[0];

    expect(chart.kind).toBe("column");
    expect(chart.title).toBe("Regional Revenue");
    expect(chart.categories).toEqual(["NA", "EU", "APAC"]);

    // Series labels + values
    expect(chart.series.map((s) => s.label)).toEqual(["FY24", "FY25"]);
    expect(chart.series[0].values).toEqual([120, 95, 60]);
    expect(chart.series[1].values).toEqual([140, 110, 85]);

    // Series colors — explicit srgb + resolved schemeClr(accent2)
    expect(chart.series[0].color).toBe("#FF0000");
    expect(chart.series[1].color).toBe(`#${THEME_ACCENTS[1]}`);

    // Legend + axis titles
    expect(chart.legend).toEqual({ visible: true, position: "b" });
    expect(chart.axis?.category).toBe("Region");
    expect(chart.axis?.value).toBe("USD");

    // Number format + inferred unit
    expect(chart.numberFormat).toBe("$#,##0");
    expect(chart.unit).toBe("$");

    // Typography from c:txPr
    expect(chart.font?.family).toBe("Custom Sans");
    expect(chart.font?.color).toBe("#123456");
  });

  it("preserves per-datapoint colors and % unit on pie charts", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    const chart = deck.slides[1].charts[0];
    expect(chart.kind).toBe("pie");
    expect(chart.series).toHaveLength(1);
    expect(chart.series[0].pointColors).toEqual(["#112233", "#445566", "#778899"]);
    expect(chart.numberFormat).toBe("0%");
    expect(chart.unit).toBe("%");
  });

  it("extracts tables with header + rows", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    const tables = deck.slides[0].tables;
    expect(tables).toHaveLength(1);
    expect(tables[0].header).toEqual(["Metric", "Value"]);
    expect(tables[0].rows).toEqual([["Revenue", "$1.2B"]]);
  });

  it("classifies a chevron shape-group as a process diagram + preserves connector style", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    const diagrams = deck.slides[2].diagrams;
    expect(diagrams).toHaveLength(1);
    const d = diagrams[0];
    expect(d.kind).toBe("shape-group");
    expect(d.layoutHint).toBe("process");
    expect(d.nodes.map((n) => n.text)).toEqual(["Discover", "Define", "Design", "Deliver"]);
    // Node fill preserved
    expect(d.nodes[0].color).toBe("#AA00AA");
    // Connector style — schemeClr(accent1) → resolved through theme, 25400 EMU = 2pt
    expect(d.connectorStyle?.color).toBe(`#${THEME_ACCENTS[0]}`);
    expect(d.connectorStyle?.widthPt).toBe(2);
    expect(d.connectorStyle?.dashStyle).toBe("dash");
    expect(d.connectorStyle?.headArrow).toBe("triangle");
    expect(d.connectors?.length).toBe(3);
  });

  it("classifies SmartArt basicProcess layout + reads node hierarchy, node color, and diagramDrawing connector style", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    const diagrams = deck.slides[3].diagrams;
    // shape-group extractor may not fire (no groups here) so we expect exactly one SmartArt entry
    const smart = diagrams.find((d) => d.kind === "smartart");
    expect(smart, "expected a SmartArt diagram on slide 4").toBeDefined();
    expect(smart!.layoutHint).toBe("process");
    expect(smart!.nodes.map((n) => n.text)).toEqual(["Plan", "Build", "Ship"]);
    expect(smart!.nodes[0].color).toBe("#003FC7");
    expect(smart!.nodes[1].color).toBe("#A1FBF9");
    expect(smart!.connectorStyle?.color).toBe("#0088FF");
    expect(smart!.connectorStyle?.widthPt).toBe(1.5);
    expect(smart!.connectorStyle?.tailArrow).toBe("stealth");
  });

  it("reports aggregate graphicsSummary counts", async () => {
    const deck = await parsePptxBuffer(await buildFixturePptx(), "fixture.pptx");
    expect(deck.slideCount).toBe(4);
    expect(deck.graphicsSummary.charts).toBe(2);
    expect(deck.graphicsSummary.tables).toBeGreaterThanOrEqual(2); // one per slide with the shared slide xml
    expect(deck.graphicsSummary.diagrams).toBeGreaterThanOrEqual(2);
  });
});
