import { describe, expect, it } from "vitest";

import { diagnoseImportedDeck, reviewQueue, safeFixes } from "./pptx-compat-diagnose";
import type {
  ImportLayerDescriptor,
  LayoutShape,
  ParsedDeck,
  ParsedSlide,
  SlideLayout,
} from "./pptx-import";
import { validatePackageEntries } from "./pptx-package-validate";

const SIZE = { w: 13.333, h: 7.5 };

function textShape(over: Partial<Extract<LayoutShape, { kind: "text" }>> = {}): LayoutShape {
  return {
    kind: "text",
    z: 0,
    frame: { x: 1, y: 1, w: 6, h: 2 },
    text: { paras: [{ runs: [{ text: "Hello", sizePt: 24, font: "Geist" }] }] },
    ...over,
  } as LayoutShape;
}

function imageShape(over: Partial<Extract<LayoutShape, { kind: "image" }>> = {}): LayoutShape {
  return {
    kind: "image",
    z: 1,
    frame: { x: 1, y: 4, w: 4, h: 2 },
    path: "ppt/media/image1.png",
    ...over,
  } as LayoutShape;
}

function slide(over: Partial<ParsedSlide> = {}, layoutOver: Partial<SlideLayout> = {}): ParsedSlide {
  const layout: SlideLayout = {
    size: SIZE,
    shapes: [textShape()],
    ...layoutOver,
  };
  return {
    index: 0,
    title: "Title",
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
    layout,
    ...over,
  } as ParsedSlide;
}

function deck(slides: ParsedSlide[], over: Partial<ParsedDeck> = {}): ParsedDeck {
  return {
    filename: "deck.pptx",
    slideCount: slides.length,
    slides,
    theme: { accents: ["#111", "#222", "#333", "#444", "#555", "#666"] },
    imagePayloadBytes: 0,
    imagesTruncated: false,
    graphicsSummary: {
      charts: 0,
      tables: 0,
      diagrams: 0,
      media: 0,
      comments: 0,
      hyperlinks: 0,
      hiddenSlides: 0,
    },
    metadata: {},
    embeddedFonts: [],
    customXmlParts: [],
    templates: {
      masters: [
        { kind: "master", path: "ppt/slideMasters/slideMaster1.xml", placeholders: [], decorLayers: [], usedBySlides: [0] },
      ],
      layouts: [],
    },
    sections: [],
    ...over,
  } as ParsedDeck;
}

function codes(report: ReturnType<typeof diagnoseImportedDeck>) {
  return report.issues.map((i) => i.code);
}

describe("diagnoseImportedDeck — clean deck", () => {
  it("reports no issues and full scores for a simple recovered slide", () => {
    const report = diagnoseImportedDeck(deck([slide()]));
    expect(report.issues).toEqual([]);
    expect(report.scores).toEqual({ compatibility: 100, editablePercent: 100, visualFidelity: 100 });
    expect(report.objects).toEqual({ source: 1, recovered: 1, editable: 1, fallback: 0 });
    expect(report.substitutedFonts).toEqual([]);
  });
});

describe("diagnoseImportedDeck — fonts", () => {
  it("flags substituted fonts once at deck level", () => {
    const s = slide({}, { shapes: [textShape({ text: { paras: [{ runs: [{ text: "a", font: "Futura PT" }] }] } })] });
    const report = diagnoseImportedDeck(deck([s, s]));
    const font = report.issues.filter((i) => i.category === "fonts" && i.code === "font-substitution");
    expect(font).toHaveLength(1);
    expect(font[0].severity).toBe("high");
    expect(report.substitutedFonts).toEqual(["Futura PT"]);
  });

  it("notes when the missing font is embedded in the source", () => {
    const s = slide({}, { shapes: [textShape({ text: { paras: [{ runs: [{ text: "a", font: "Futura PT" }] }] } })] });
    const report = diagnoseImportedDeck(
      deck([s], { embeddedFonts: [{ typeface: "Futura PT", variants: [] }] }),
    );
    const note = report.issues.find((i) => i.code === "font-embedded-available")!;
    expect(note.severity).toBe("info");
    expect(note.fix).toBe("safe");
  });

  it("respects a custom available-font list", () => {
    const s = slide({}, { shapes: [textShape({ text: { paras: [{ runs: [{ text: "a", font: "Futura PT" }] }] } })] });
    const report = diagnoseImportedDeck(deck([s]), { availableFonts: ["Futura PT"] });
    expect(report.substitutedFonts).toEqual([]);
  });
});

describe("diagnoseImportedDeck — layout and text", () => {
  it("flags a slide-size mismatch as a review fix, not a silent rescale", () => {
    const s = slide({}, { size: { w: 10, h: 7.5 }, shapes: [textShape()] });
    const report = diagnoseImportedDeck(deck([s]));
    const issue = report.issues.find((i) => i.code === "slide-size-mismatch")!;
    expect(issue.severity).toBe("high");
    expect(issue.fix).toBe("review");
  });

  it("flags fully off-canvas and merely overhanging objects differently", () => {
    const s = slide({}, {
      shapes: [
        textShape({ frame: { x: 14, y: 1, w: 2, h: 1 } }),
        imageShape({ frame: { x: 12.5, y: 1, w: 3, h: 1 } }),
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(codes(report)).toContain("off-canvas");
    expect(codes(report)).toContain("overhangs-canvas");
    expect(report.issues.find((i) => i.code === "off-canvas")!.detail).toMatch(/kept, not deleted/);
  });

  it("estimates text overflow and offers a safe shrink fix", () => {
    const overflowing = textShape({
      frame: { x: 1, y: 1, w: 3, h: 0.4 },
      text: {
        paras: [{ runs: [{ text: "x".repeat(600), sizePt: 28 }] }],
      },
    });
    const report = diagnoseImportedDeck(deck([slide({}, { shapes: [overflowing] })]));
    const issue = report.issues.find((i) => i.code === "text-overflow")!;
    expect(issue.severity).toBe("high");
    expect(issue.fix).toBe("safe");
    expect(issue.shapeIndex).toBe(0);
  });

  it("does not flag overflow when the box auto-fits to text", () => {
    const autofit = textShape({
      frame: { x: 1, y: 1, w: 3, h: 0.4 },
      text: { spAutoFit: true, paras: [{ runs: [{ text: "x".repeat(600), sizePt: 28 }] }] },
    });
    const report = diagnoseImportedDeck(deck([slide({}, { shapes: [autofit] })]));
    expect(codes(report)).not.toContain("text-overflow");
  });

  it("flags a group left with one surviving member", () => {
    const s = slide({}, { shapes: [textShape({ groupId: "g1", groupName: "Card 3" } as never)] });
    const report = diagnoseImportedDeck(deck([s]));
    expect(report.issues.find((i) => i.code === "broken-group")!.detail).toMatch(/Card 3/);
  });
});

describe("diagnoseImportedDeck — imagery, charts and integrity", () => {
  it("flags a flattened single-image slide", () => {
    const s = slide({ title: "", bullets: [] }, {
      shapes: [imageShape({ frame: { x: 0, y: 0, w: SIZE.w, h: SIZE.h } })],
    });
    const report = diagnoseImportedDeck(deck([s]));
    const issue = report.issues.find((i) => i.code === "flattened-slide")!;
    expect(issue.severity).toBe("high");
    expect(issue.detail).toMatch(/nothing on it is editable/);
  });

  it("flags missing image data and preserved crops", () => {
    const s = slide({}, {
      shapes: [
        imageShape({ path: undefined, embedId: undefined }),
        imageShape({ srcRect: { l: 0.1, t: 0, r: 0, b: 0 } }),
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(codes(report)).toContain("missing-image");
    expect(report.issues.find((i) => i.code === "image-crop-preserved")!.fix).toBe("safe");
  });

  it("treats a possible logo as review-only and never auto-edits it", () => {
    const layers: ImportLayerDescriptor[] = [
      { name: "TransPerfect Logo", node: "pic", role: "Picture" },
    ];
    const s = slide({}, {
      shapes: [imageShape()],
      audit: {
        source: { sp: 0, pic: 1, cxnSp: 0, graphicFrame: 0, grpSp: 0, total: 1 },
        recovered: { slide: 1, masterDecor: 0, layoutDecor: 0, total: 1, byKind: { image: 1 } },
        missing: 0,
        sourceLayers: layers,
      },
    });
    const report = diagnoseImportedDeck(deck([s]));
    const logo = report.issues.find((i) => i.code === "possible-logo")!;
    expect(logo.fix).toBe("review");
    expect(logo.detail).toMatch(/never recoloured/);
  });

  it("counts unrecoverable SmartArt as a visual fallback and a blocker-free high issue", () => {
    const s = slide({}, {
      shapes: [
        { kind: "diagram", z: 0, frame: { x: 1, y: 1, w: 4, h: 3 }, fallbackReason: "smartart-empty-drawing" } as LayoutShape,
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    const issue = report.issues.find((i) => i.code === "smartart-conversion")!;
    expect(issue.severity).toBe("high");
    expect(report.objects.fallback).toBe(1);
    expect(report.scores.editablePercent).toBe(0);
  });

  it("raises a blocker when the source XML had objects the importer did not rebuild", () => {
    const s = slide({}, {
      shapes: [textShape()],
      audit: {
        source: { sp: 4, pic: 1, cxnSp: 0, graphicFrame: 0, grpSp: 0, total: 5 },
        recovered: { slide: 1, masterDecor: 0, layoutDecor: 0, total: 1, byKind: { text: 1 } },
        missing: 4,
      },
    });
    const report = diagnoseImportedDeck(deck([s]));
    const issue = report.issues.find((i) => i.code === "objects-not-recovered")!;
    expect(issue.severity).toBe("blocker");
    expect(issue.detail).toMatch(/Nothing was deleted/);
    expect(report.objects.source).toBe(5);
    expect(report.scores.visualFidelity).toBeLessThan(50);
  });
});

describe("diagnoseImportedDeck — media, links and accessibility", () => {
  it("flags missing linked media, OLE fallbacks and risky codecs", () => {
    const s = slide({
      media: [
        { kind: "video", mime: "video/mp4", path: "ppt/media/a.mp4", dataUrl: "", bytes: 0 },
        { kind: "ole", mime: "application/octet-stream", path: "ppt/embeddings/o1.bin", dataUrl: "data:,x", bytes: 10 },
        { kind: "video", mime: "video/x-ms-wmv", path: "ppt/media/b.wmv", dataUrl: "data:,x", bytes: 10 },
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(codes(report)).toContain("missing-linked-media");
    expect(codes(report)).toContain("ole-object");
    expect(codes(report)).toContain("unsupported-codec");
    expect(report.issues.find((i) => i.code === "ole-object")!.detail).toMatch(/never opened or executed/);
  });

  it("flags empty and machine-local hyperlink targets but accepts real ones", () => {
    const s = slide({
      hyperlinks: [
        { rId: "rId2", target: "", external: true },
        { rId: "rId3", target: "C:\\Users\\me\\budget.xlsx", external: true },
        { rId: "rId4", target: "https://transperfect.com", external: true },
        { rId: "rId5", target: "mailto:hi@transperfect.com", external: true },
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(report.issues.filter((i) => i.code === "broken-link")).toHaveLength(2);
  });

  it("flags missing alt text on pictures and a title that is not first", () => {
    const layers: ImportLayerDescriptor[] = [
      { name: "Picture 2", node: "pic", role: "Picture" },
      { name: "Title 1", node: "sp", role: "Title placeholder", placeholder: "title", altText: "" },
    ];
    const s = slide({}, {
      shapes: [imageShape(), textShape()],
      audit: {
        source: { sp: 1, pic: 1, cxnSp: 0, graphicFrame: 0, grpSp: 0, total: 2 },
        recovered: { slide: 2, masterDecor: 0, layoutDecor: 0, total: 2, byKind: {} },
        missing: 0,
        sourceLayers: layers,
      },
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(report.issues.filter((i) => i.code === "missing-alt-text")).toHaveLength(1);
    expect(codes(report)).toContain("reading-order");
  });

  it("does not flag alt text that the author supplied", () => {
    const layers: ImportLayerDescriptor[] = [
      { name: "Picture 2", node: "pic", role: "Picture", altText: "Team photo" },
    ];
    const s = slide({}, {
      shapes: [imageShape()],
      audit: {
        source: { sp: 0, pic: 1, cxnSp: 0, graphicFrame: 0, grpSp: 0, total: 1 },
        recovered: { slide: 1, masterDecor: 0, layoutDecor: 0, total: 1, byKind: {} },
        missing: 0,
        sourceLayers: layers,
      },
    });
    expect(codes(diagnoseImportedDeck(deck([s])))).not.toContain("missing-alt-text");
  });

  it("flags low-contrast text against its resolved background", () => {
    const s = slide({}, {
      shapes: [
        textShape({
          fill: { kind: "solid", color: "#FFFFFF" },
          text: { paras: [{ runs: [{ text: "faint", sizePt: 18, color: "#EFEFEF" }] }] },
        }),
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    const issue = report.issues.find((i) => i.code === "low-contrast")!;
    expect(issue.category).toBe("accessibility");
    expect(issue.severity).toBe("high");
  });

  it("reports animations and transitions as non-destructive findings", () => {
    const report = diagnoseImportedDeck(deck([slide({ hasAnimation: true, transition: "morph" })]));
    expect(report.issues.find((i) => i.code === "animation-lost")!.severity).toBe("low");
    expect(report.issues.find((i) => i.code === "transition-mapped")!.fix).toBe("safe");
  });
});

describe("diagnoseImportedDeck — package findings and totals", () => {
  it("folds package risks in, mapping blockers and macro warnings", () => {
    const validation = validatePackageEntries([
      { path: "[Content_Types].xml", bytes: 100 },
      { path: "ppt/presentation.xml", bytes: 100 },
      { path: "ppt/vbaProject.bin", bytes: 100 },
      { path: "../evil", bytes: 1 },
    ]);
    const report = diagnoseImportedDeck(deck([slide()]), { packageValidation: validation });
    const macro = report.issues.find((i) => i.code === "package-macros-present")!;
    expect(macro.severity).toBe("medium");
    expect(macro.category).toBe("media");
    expect(report.issues.find((i) => i.code === "package-path-traversal")!.severity).toBe("blocker");
  });

  it("aggregates totals by severity, category and slide", () => {
    const bad = slide({ hasAnimation: true }, { shapes: [textShape({ frame: { x: 20, y: 1, w: 1, h: 1 } })] });
    const report = diagnoseImportedDeck(deck([slide(), bad]));
    expect(report.totals.bySlide[1]).toBeGreaterThan(0);
    expect(report.totals.bySlide[0] ?? 0).toBe(0);
    expect(report.totals.bySeverity.medium).toBeGreaterThan(0);
    expect(report.totals.byCategory.layout).toBeGreaterThan(0);
  });

  it("splits safe fixes from the review queue", () => {
    const s = slide({ transition: "fade" }, {
      shapes: [
        textShape({ frame: { x: 1, y: 1, w: 3, h: 0.3 }, text: { paras: [{ runs: [{ text: "y".repeat(400), sizePt: 24 }] }] } }),
        imageShape({ srcRect: { l: 0.2, t: 0, r: 0, b: 0 } }),
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    expect(safeFixes(report).every((i) => i.fix === "safe")).toBe(true);
    expect(safeFixes(report).length).toBeGreaterThan(0);
    expect(reviewQueue(report).some((i) => i.fix === "safe")).toBe(false);
    expect(safeFixes(report).length + reviewQueue(report).length).toBe(report.issues.length);
  });

  it("gives every issue a unique id and a slide anchor", () => {
    const s = slide({}, {
      shapes: [
        textShape({ frame: { x: 20, y: 1, w: 1, h: 1 } }),
        textShape({ frame: { x: 25, y: 1, w: 1, h: 1 } }),
      ],
    });
    const report = diagnoseImportedDeck(deck([s]));
    const ids = report.issues.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const issue of report.issues) {
      expect(issue.slideIndex === null || issue.slideIndex >= 0).toBe(true);
    }
  });

  it("does not punish a large clean deck relative to a small one", () => {
    const clean = (n: number) => diagnoseImportedDeck(deck(Array.from({ length: n }, () => slide())));
    expect(clean(3).scores.compatibility).toBe(clean(40).scores.compatibility);
  });
});
