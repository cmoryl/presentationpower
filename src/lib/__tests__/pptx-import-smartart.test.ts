/**
 * End-to-end re-extraction regression tests for SmartArt / diagram frames.
 *
 * Imported decks used to show blank boxes wherever PowerPoint painted a
 * SmartArt graphic (device mockups, process chains, matrices): the geometry
 * lives in `ppt/diagrams/drawing*.xml`, which the importer ignored, so a
 * `graphicFrame` collapsed into a single empty `diagram` shape.
 *
 * Each test here builds a minimal .pptx in memory with JSZip and runs it
 * through `parsePptxBuffer` — the same entry point re-extraction uses — and
 * asserts that node boxes, labels, fills and diagram-internal pictures come
 * back as real layered shapes positioned inside the frame.
 *
 * If one of these fails, SmartArt content is going blank again on import.
 */

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parsePptxBuffer } from "@/lib/pptx-import";

const EMU_PER_IN = 914400;
const FRAME = { xIn: 1, yIn: 1, wIn: 6, hIn: 3 };

// A 1x1 transparent PNG, used for diagram-internal pictures.
const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/S8lFP4AAAAASUVORK5CYII=";

function relsXml(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${inner}</Relationships>`;
}

/** Slide holding a single diagram graphicFrame that points at rId1/rId2. */
function diagramSlideXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <p:cSld><p:spTree>
  <p:graphicFrame>
   <p:nvGraphicFramePr/>
   <p:xfrm>
    <a:off x="${FRAME.xIn * EMU_PER_IN}" y="${FRAME.yIn * EMU_PER_IN}"/>
    <a:ext cx="${FRAME.wIn * EMU_PER_IN}" cy="${FRAME.hIn * EMU_PER_IN}"/>
   </p:xfrm>
   <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram">
    <dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"
                r:dm="rId1" r:lo="rId2" r:qs="rId3" r:cs="rId4"/>
   </a:graphicData></a:graphic>
  </p:graphicFrame>
 </p:spTree></p:cSld>
</p:sld>`;
}

/** Slide holding an OLE-style graphicFrame that only carries a preview <p:pic>. */
function olePreviewSlideXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <p:cSld><p:spTree>
  <p:graphicFrame>
   <p:nvGraphicFramePr/>
   <p:xfrm>
    <a:off x="${FRAME.xIn * EMU_PER_IN}" y="${FRAME.yIn * EMU_PER_IN}"/>
    <a:ext cx="${FRAME.wIn * EMU_PER_IN}" cy="${FRAME.hIn * EMU_PER_IN}"/>
   </p:xfrm>
   <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/presentationml/2006/ole">
    <p:oleObj spid="_x0000_s1026">
     <p:pic>
      <p:nvPicPr><p:cNvPr id="9" name="Object Preview"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
      <p:blipFill><a:blip r:embed="rId9"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
      <p:spPr>
       <a:xfrm>
        <a:off x="${FRAME.xIn * EMU_PER_IN}" y="${FRAME.yIn * EMU_PER_IN}"/>
        <a:ext cx="${FRAME.wIn * EMU_PER_IN}" cy="${FRAME.hIn * EMU_PER_IN}"/>
       </a:xfrm>
      </p:spPr>
     </p:pic>
    </p:oleObj>
   </a:graphicData></a:graphic>
  </p:graphicFrame>
 </p:spTree></p:cSld>
</p:sld>`;
}

type DrawingOpts = { withPicture?: boolean };

/**
 * Rendered SmartArt geometry in the `dsp:` namespace: two labelled node
 * boxes (one filled, one plain), optionally a diagram-internal picture.
 */
function drawingXml(opts: DrawingOpts = {}): string {
  const pic = opts.withPicture
    ? `<dsp:pic>
        <dsp:nvPicPr><dsp:cNvPr id="7" name="Node art"/><dsp:cNvPicPr/></dsp:nvPicPr>
        <dsp:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></dsp:blipFill>
        <dsp:spPr><a:xfrm><a:off x="0" y="1371600"/><a:ext cx="1371600" cy="1371600"/></a:xfrm></dsp:spPr>
       </dsp:pic>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<dsp:drawing xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <dsp:spTree>
  <dsp:nvGrpSpPr/><dsp:grpSpPr/>
  <dsp:sp>
   <dsp:nvSpPr><dsp:cNvPr id="1" name="Node 1"/><dsp:cNvSpPr/></dsp:nvSpPr>
   <dsp:spPr>
    <a:xfrm><a:off x="0" y="0"/><a:ext cx="2743200" cy="1371600"/></a:xfrm>
    <a:prstGeom prst="roundRect"/>
    <a:solidFill><a:srgbClr val="003FC7"/></a:solidFill>
   </dsp:spPr>
   <dsp:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="en-US"/><a:t>Match Type</a:t></a:r></a:p></dsp:txBody>
  </dsp:sp>
  <dsp:sp>
   <dsp:nvSpPr><dsp:cNvPr id="2" name="Node 2"/><dsp:cNvSpPr/></dsp:nvSpPr>
   <dsp:spPr>
    <a:xfrm><a:off x="2743200" y="0"/><a:ext cx="2743200" cy="1371600"/></a:xfrm>
    <a:prstGeom prst="rect"/>
   </dsp:spPr>
   <dsp:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="en-US"/><a:t>TM Match</a:t></a:r></a:p></dsp:txBody>
  </dsp:sp>
  ${pic}
 </dsp:spTree>
</dsp:drawing>`;
}

type DeckOpts = {
  /** Omit the diagramDrawing relationship + part (older/stripped decks). */
  withoutDrawing?: boolean;
  /** Include a diagram-internal picture and its relationship. */
  withPicture?: boolean;
  /** Use the OLE preview slide instead of the SmartArt slide. */
  olePreview?: boolean;
};

async function buildDeck(opts: DeckOpts = {}): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
  );
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
  );
  zip.file("ppt/slides/slide1.xml", opts.olePreview ? olePreviewSlideXml() : diagramSlideXml());

  if (opts.olePreview) {
    zip.file(
      "ppt/slides/_rels/slide1.xml.rels",
      relsXml(
        `<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/preview1.png"/>`,
      ),
    );
    zip.file("ppt/media/preview1.png", PNG_1PX_BASE64, { base64: true });
    return (await zip.generateAsync({ type: "uint8array" })) as Uint8Array;
  }

  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    relsXml(
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="../diagrams/data1.xml"/>
       <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout" Target="../diagrams/layout1.xml"/>
       ${
         opts.withoutDrawing
           ? ""
           : `<Relationship Id="rId5" Type="http://schemas.microsoft.com/office/2007/relationships/diagramDrawing" Target="../diagrams/drawing1.xml"/>`
       }`,
    ),
  );
  zip.file(
    "ppt/diagrams/data1.xml",
    `<?xml version="1.0"?><dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`,
  );
  zip.file(
    "ppt/diagrams/layout1.xml",
    `<?xml version="1.0"?><dgm:layoutDef xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" uniqueId="urn:process"/>`,
  );
  if (!opts.withoutDrawing) {
    zip.file("ppt/diagrams/drawing1.xml", drawingXml({ withPicture: opts.withPicture }));
    if (opts.withPicture) {
      zip.file(
        "ppt/diagrams/_rels/drawing1.xml.rels",
        relsXml(
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/node1.png"/>`,
        ),
      );
      zip.file("ppt/media/node1.png", PNG_1PX_BASE64, { base64: true });
    }
  }
  return (await zip.generateAsync({ type: "uint8array" })) as Uint8Array;
}

type AnyShape = Record<string, any>;

async function extractShapes(opts: DeckOpts = {}): Promise<AnyShape[]> {
  const buf = await buildDeck(opts);
  const parsed = await parsePptxBuffer(buf, "smartart-fixture.pptx");
  return (parsed.slides[0]?.layout?.shapes ?? []) as AnyShape[];
}

function shapeText(shape: AnyShape): string {
  const paras: AnyShape[] = shape.text?.paras ?? [];
  return paras
    .map((p) => (p.runs ?? []).map((r: AnyShape) => r.text ?? "").join(""))
    .join(" ")
    .trim();
}

function allText(shapes: AnyShape[]): string[] {
  return shapes.map(shapeText).filter(Boolean);
}

describe("SmartArt / diagram re-extraction", () => {
  it("recovers node boxes and their labels instead of a blank diagram frame", async () => {
    const shapes = await extractShapes();

    // The empty-frame fallback must not be what we get back.
    expect(shapes.some((s) => s.kind === "diagram")).toBe(false);
    expect(shapes.length).toBeGreaterThanOrEqual(2);
    expect(allText(shapes)).toEqual(expect.arrayContaining(["Match Type", "TM Match"]));
  });

  it("keeps node fills and geometry from the drawing part", async () => {
    const shapes = await extractShapes();
    const filled = shapes.find((s) => shapeText(s) === "Match Type");
    expect(filled).toBeDefined();
    expect(filled!.prst ?? "").toBe("roundRect");
    expect(JSON.stringify(filled!.fill ?? {}).toUpperCase()).toContain("003FC7");
  });

  it("maps diagram coordinates onto the graphicFrame rect", async () => {
    const shapes = await extractShapes();
    const nodes = shapes.filter((s) => shapeText(s));
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    for (const node of nodes) {
      const f = node.frame ?? {};
      expect(f.w).toBeGreaterThan(0);
      expect(f.h).toBeGreaterThan(0);
      // Every node must land inside the frame the deck placed the SmartArt in.
      expect(f.x).toBeGreaterThanOrEqual(FRAME.xIn - 0.01);
      expect(f.y).toBeGreaterThanOrEqual(FRAME.yIn - 0.01);
      expect(f.x + f.w).toBeLessThanOrEqual(FRAME.xIn + FRAME.wIn + 0.01);
      expect(f.y + f.h).toBeLessThanOrEqual(FRAME.yIn + FRAME.hIn + 0.01);
    }
    // The two side-by-side nodes must not be stacked on the same x.
    const xs = new Set(nodes.map((n) => Math.round((n.frame?.x ?? 0) * 100)));
    expect(xs.size).toBeGreaterThan(1);
  });

  it("hydrates diagram-internal pictures with collision-free embed ids", async () => {
    const buf = await buildDeck({ withPicture: true });
    const parsed = await parsePptxBuffer(buf, "smartart-picture.pptx");
    const slide = parsed.slides[0]!;

    // The picture is pulled into the slide payload so ingestion can store it.
    expect(slide.images.length).toBeGreaterThanOrEqual(1);
    const syntheticIds = slide.imageEmbedIds.filter((id) => /^dgm\d+-rId\d+$/.test(id));
    expect(syntheticIds.length).toBeGreaterThanOrEqual(1);
    expect(new Set(slide.imageEmbedIds).size).toBe(slide.imageEmbedIds.length);
    expect(slide.images.length).toBe(slide.imageEmbedIds.length);

    // ...and referenced by a real image shape in the layout.
    const shapes = (slide.layout?.shapes ?? []) as AnyShape[];
    const img = shapes.find((s) => s.kind === "image");
    expect(img).toBeDefined();
    expect(syntheticIds).toContain(img!.embedId);
  });

  it("re-extracting the same deck twice produces identical shapes", async () => {
    const buf = await buildDeck({ withPicture: true });
    const first = await parsePptxBuffer(buf, "smartart-fixture.pptx");
    const second = await parsePptxBuffer(buf, "smartart-fixture.pptx");
    expect(JSON.stringify(second.slides[0]?.layout?.shapes)).toBe(
      JSON.stringify(first.slides[0]?.layout?.shapes),
    );
  });

  it("imports the rendered preview for OLE-style graphicFrames", async () => {
    const shapes = await extractShapes({ olePreview: true });
    expect(shapes.some((s) => s.kind === "diagram")).toBe(false);
    expect(shapes.some((s) => s.kind === "image")).toBe(true);
  });

  it("still falls back to a diagram frame when no drawing part exists", async () => {
    const shapes = await extractShapes({ withoutDrawing: true });
    // No geometry is recoverable here — the placeholder frame is correct, but
    // it must be positioned rather than dropped.
    expect(shapes.length).toBe(1);
    expect(shapes[0]!.kind).toBe("diagram");
    expect(shapes[0]!.frame?.w).toBeCloseTo(FRAME.wIn, 2);
  });
});
