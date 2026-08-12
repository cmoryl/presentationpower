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
import type { ParsedDeck, ParsedSlide } from "@/lib/pptx-import";

const FRAME = { x: 1, y: 1, w: 6, h: 3 };

function textShape(text: string) {
  return {
    kind: "text" as const,
    z: 1,
    frame: FRAME,
    text: { paras: [{ runs: [{ text }] }] } as any,
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
          } as any,
        ],
        layout: {
          size: { w: 13.333, h: 7.5 },
          shapes: [textShape("Match Type"), textShape("TM Match")],
        } as any,
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
        } as any,
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
        } as any,
      }),
    );
    expect(issues).toEqual([]);
  });

  it("flags a diagram whose nodes have no readable labels", () => {
    const issues = validateSlideDiagrams(
      slide({
        diagrams: [{ kind: "smartart", nodes: [{ text: "   ", level: 0 }] } as any],
        layout: { size: { w: 13.333, h: 7.5 }, shapes: [textShape("Heading")] } as any,
      }),
    );
    expect(issues.map((i) => i.code)).toContain("empty-diagram-nodes");
  });

  it("flags labels that never reached a rendered layer", () => {
    const issues = validateSlideDiagrams(
      slide({
        diagrams: [{ kind: "smartart", nodes: [{ text: "Match Type", level: 0 }] } as any],
        layout: { size: { w: 13.333, h: 7.5 }, shapes: [textShape("Unrelated title")] } as any,
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
        } as any,
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
