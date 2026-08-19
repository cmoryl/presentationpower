/**
 * Runtime validation of SmartArt / diagram recovery.
 *
 * A diagram frame that recovers no shapes, or nodes whose labels never reach a
 * rendered layer, must fail the import with an actionable message instead of
 * quietly landing an empty box in the editor.
 */

import { describe, expect, it } from "vitest";
import {
  DiagramRecoveryError,
  assertDiagramRecovery,
  validateSlideDiagrams,
} from "@/lib/pptx-diagram-validate";
import type { ParsedDeck, ParsedSlide, LayoutTextBody, ParsedDiagram, SlideLayout } from "@/lib/pptx-import";

const FRAME = { x: 1, y: 1, w: 6, h: 3 };

function textShape(text: string) {
  return {
    kind: "text" as const,
    z: 1,
    frame: FRAME,
    text: { paras: [{ runs: [{ text }] }] } as LayoutTextBody,
  };
}

function slide(partial: Partial<ParsedSlide>): ParsedSlide {
  return {
    index: 2,
    title: "",
    bullets: [],
    notes: "",
    images: [],
    charts: [],
    tables: [],
    diagrams: [],
    imageEmbedIds: [],
    media: [],
    hyperlinks: [],
    comments: [],
    hidden: false,
    hasAnimation: false,
    ...partial,
  } as ParsedSlide;
}

function deck(slides: ParsedSlide[]): ParsedDeck {
  return {
    filename: "fixture.pptx",
    slideCount: slides.length,
    slides,
    theme: { accents: [] },
    imagePayloadBytes: 0,
    imagesTruncated: false,
    graphicsSummary: {
      charts: 0,
      tables: 0,
      diagrams: slides.reduce((n, s) => n + s.diagrams.length, 0),
      media: 0,
      comments: 0,
      hyperlinks: 0,
      hiddenSlides: 0,
    },
    metadata: {},
    embeddedFonts: [],
    customXmlParts: [],
    templates: { masters: [], layouts: [] },
    sections: [],
  } as ParsedDeck;
}

describe("diagram recovery validation", () => {
  it("passes when nodes recovered real shapes carrying their labels", () => {
    const issues = validateSlideDiagrams(
      slide({
        diagrams: [
          {
            kind: "smartart",
            nodes: [
              { text: "Match Type", level: 0 },
              { text: "TM Match", level: 0 },
            ],
          } as ParsedDiagram,
        ],
        layout: {
          size: { w: 13.333, h: 7.5 },
          shapes: [textShape("Match Type"), textShape("TM Match")],
        } as SlideLayout,
      }),
    );
    expect(issues).toEqual([]);
  });

  it("flags a SmartArt frame that recovered no shapes", () => {
    const issues = validateSlideDiagrams(
      slide({
        layout: {
          size: { w: 13.333, h: 7.5 },
          shapes: [
            { kind: "diagram", z: 1, frame: FRAME, fallbackReason: "smartart-no-drawing" },
          ],
        } as SlideLayout,
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe("blank-diagram-frame");
    expect(issues[0]!.slideNumber).toBe(3);
    expect(issues[0]!.remedy).toMatch(/Re-save the deck in PowerPoint/i);
  });

  it("does not flag unknown (OLE / legacy) graphicFrame fallbacks", () => {
    const issues = validateSlideDiagrams(
      slide({
        layout: {
          size: { w: 13.333, h: 7.5 },
          shapes: [{ kind: "diagram", z: 1, frame: FRAME, fallbackReason: "unknown-payload" }],
        } as SlideLayout,
      }),
    );
    expect(issues).toEqual([]);
  });

  it("flags a diagram whose nodes have no readable labels", () => {
    const issues = validateSlideDiagrams(
      slide({
        diagrams: [{ kind: "smartart", nodes: [{ text: "   ", level: 0 }] } as ParsedDiagram],
        layout: { size: { w: 13.333, h: 7.5 }, shapes: [textShape("Heading")] } as SlideLayout,
      }),
    );
    expect(issues.map((i) => i.code)).toContain("empty-diagram-nodes");
  });

  it("flags labels that never reached a rendered layer", () => {
    const issues = validateSlideDiagrams(
      slide({
        diagrams: [{ kind: "smartart", nodes: [{ text: "Match Type", level: 0 }] } as ParsedDiagram],
        layout: { size: { w: 13.333, h: 7.5 }, shapes: [textShape("Unrelated title")] } as SlideLayout,
      }),
    );
    expect(issues.map((i) => i.code)).toContain("missing-node-labels");
  });

  it("throws an aggregated, slide-numbered error listing every problem", () => {
    const bad = deck([
      slide({
        index: 0,
        layout: {
          size: { w: 13.333, h: 7.5 },
          shapes: [
            { kind: "diagram", z: 1, frame: FRAME, fallbackReason: "smartart-empty-drawing" },
          ],
        } as SlideLayout,
      }),
    ]);
    try {
      assertDiagramRecovery(bad);
      throw new Error("expected assertDiagramRecovery to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(DiagramRecoveryError);
      const err = e as DiagramRecoveryError;
      expect(err.issues).toHaveLength(1);
      expect(err.message).toMatch(/Slide 1:/);
      expect(err.message).toMatch(/diagram recovery/i);
    }
  });

  it("passes a deck with no diagrams at all", () => {
    expect(() => assertDiagramRecovery(deck([slide({ index: 0 })]))).not.toThrow();
  });
});

describe("parsePptxBuffer diagram validation (end to end)", () => {
  it("fails the import when a SmartArt frame recovers nothing", async () => {
    const JSZip = (await import("jszip")).default;
    const { parsePptxBuffer } = await import("@/lib/pptx-import");
    const EMU = 914400;
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`,
    );
    zip.file(
      "ppt/presentation.xml",
      `<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
    );
    zip.file(
      "ppt/slides/slide1.xml",
      `<?xml version="1.0"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <p:cSld><p:spTree><p:graphicFrame><p:nvGraphicFramePr/>
  <p:xfrm><a:off x="${EMU}" y="${EMU}"/><a:ext cx="${6 * EMU}" cy="${3 * EMU}"/></p:xfrm>
  <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram">
   <dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" r:dm="rId1" r:lo="rId2"/>
  </a:graphicData></a:graphic>
 </p:graphicFrame></p:spTree></p:cSld></p:sld>`,
    );
    zip.file(
      "ppt/slides/_rels/slide1.xml.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="../diagrams/data1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout" Target="../diagrams/layout1.xml"/>
</Relationships>`,
    );
    zip.file(
      "ppt/diagrams/data1.xml",
      `<?xml version="1.0"?><dgm:dataModel xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"/>`,
    );
    zip.file(
      "ppt/diagrams/layout1.xml",
      `<?xml version="1.0"?><dgm:layoutDef xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" uniqueId="urn:process"/>`,
    );
    const buf = (await zip.generateAsync({ type: "uint8array" })) as Uint8Array;

    await expect(parsePptxBuffer(buf, "blank-smartart.pptx")).rejects.toThrow(
      /diagram recovery problem/i,
    );
    // Opting out still returns the positioned placeholder frame.
    const parsed = await parsePptxBuffer(buf, "blank-smartart.pptx", {
      validateDiagrams: false,
    });
    expect(parsed.slides[0]?.layout?.shapes[0]?.kind).toBe("diagram");
    // Building the fixture zip is slow when the whole suite runs in parallel.
  }, 20_000);
});
