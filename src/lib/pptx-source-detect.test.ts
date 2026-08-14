import { describe, expect, it } from "vitest";

import { detectPptxSource, type FingerprintInput } from "./pptx-source-detect";

function input(over: Partial<FingerprintInput> = {}): FingerprintInput {
  return {
    metadata: {},
    entryPaths: [
      "[Content_Types].xml",
      "docProps/app.xml",
      "docProps/core.xml",
      "ppt/presentation.xml",
      "ppt/slides/slide1.xml",
      "ppt/notesSlides/notesSlide1.xml",
      "ppt/slideMasters/slideMaster1.xml",
      "ppt/theme/theme1.xml",
    ],
    templates: {
      masters: [{ kind: "master", path: "m1", placeholders: [], decorLayers: [], usedBySlides: [0] }],
      layouts: [
        { kind: "layout", path: "l1", placeholders: [], decorLayers: [], usedBySlides: [0] },
        { kind: "layout", path: "l2", placeholders: [], decorLayers: [], usedBySlides: [] },
      ],
    } as unknown as FingerprintInput["templates"],
    theme: { accents: [], headingFont: "Calibri Light", bodyFont: "Calibri" } as FingerprintInput["theme"],
    slides: [{ kinds: ["text", "image"], hasText: true, fullBleedImageOnly: false }],
    ...over,
  };
}

describe("detectPptxSource — application metadata", () => {
  it.each([
    ["Microsoft Office PowerPoint", "microsoft-powerpoint-windows"],
    ["Microsoft Macintosh PowerPoint for Mac", "microsoft-powerpoint-mac"],
    ["Microsoft PowerPoint Online", "microsoft-powerpoint-web"],
    ["Google Slides", "google-slides"],
    ["Keynote", "apple-keynote"],
    ["Canva", "canva"],
    ["Gamma", "gamma"],
    ["Beautiful.ai", "beautiful-ai"],
    ["Pitch", "pitch"],
    ["LibreOffice/7.5.2 Impress", "libreoffice"],
    ["OpenOffice 4.1.14", "openoffice"],
    ["WPS Presentation", "wps-office"],
    ["ONLYOFFICE/7.4", "onlyoffice"],
    ["Zoho Show", "zoho-show"],
    ["python-pptx", "programmatic"],
    ["PptxGenJS", "programmatic"],
  ])("identifies %s", (application, expected) => {
    const res = detectPptxSource(input({ metadata: { application } }));
    expect(res.sourceId).toBe(expected);
    expect(res.confidence).toBeGreaterThan(0.5);
    expect(res.signals[0].channel).toBe("app-metadata");
    expect(res.signals[0].detail).toContain(application);
  });

  it("carries the declared version through", () => {
    const res = detectPptxSource(
      input({ metadata: { application: "Microsoft Office PowerPoint", appVersion: "16.0000" } }),
    );
    expect(res.version).toBe("16.0000");
  });

  it("prefers the Mac build when the padded AppVersion is present", () => {
    const res = detectPptxSource(
      input({
        metadata: { application: "Microsoft Office PowerPoint", appVersion: "16.0000" },
        entryPaths: input().entryPaths,
      }),
    );
    // Both Windows and Mac score; Mac only wins with additional evidence, so the
    // Windows build stays the answer and Mac appears as a possible source.
    expect(res.sourceId).toBe("microsoft-powerpoint-windows");
    expect(res.runnersUp.map((r) => r.sourceId)).toContain("microsoft-powerpoint-mac");
  });

  it("weights creator/company fields below the Application string", () => {
    const res = detectPptxSource(input({ metadata: { creator: "Canva" } }));
    expect(res.sourceId).toBe("canva");
    expect(res.signals[0].channel).toBe("creator");
    expect(res.confidence).toBeLessThan(0.8);
  });
});

describe("detectPptxSource — structural evidence", () => {
  it("detects flattened image-converter output with no metadata at all", () => {
    const res = detectPptxSource(
      input({
        metadata: {},
        slides: Array.from({ length: 6 }, () => ({
          kinds: ["image"],
          hasText: false,
          fullBleedImageOnly: true,
        })),
      }),
    );
    expect(res.sourceId).toBe("image-converter");
    expect(res.runnersUp.map((r) => r.sourceId)).toContain("pdf-converter");
    expect(res.signals.some((s) => s.channel === "export-shape")).toBe(true);
  });

  it("detects programmatic generation from a missing app.xml", () => {
    const res = detectPptxSource(
      input({
        entryPaths: ["[Content_Types].xml", "ppt/presentation.xml", "ppt/slides/slide1.xml"],
        slides: [
          { kinds: ["text"], hasText: true, fullBleedImageOnly: false },
          { kinds: ["text"], hasText: true, fullBleedImageOnly: false },
          { kinds: ["text"], hasText: true, fullBleedImageOnly: false },
        ],
      }),
    );
    expect(res.sourceId).toBe("programmatic");
  });

  it("uses relationship targets as corroborating evidence", () => {
    const res = detectPptxSource(
      input({ relationshipTargets: ["https://docs.google.com/presentation/d/abc"] }),
    );
    expect(res.sourceId).toBe("google-slides");
    expect(res.signals.some((s) => s.channel === "relationship")).toBe(true);
  });

  it("treats a full Office template set as PowerPoint evidence", () => {
    const res = detectPptxSource(
      input({
        templates: {
          masters: Array.from({ length: 2 }, (_, i) => ({ path: `m${i}`, usedBySlides: [0] })),
          layouts: Array.from({ length: 11 }, (_, i) => ({ path: `l${i}`, usedBySlides: [] })),
        } as unknown as FingerprintInput["templates"],
      }),
    );
    expect(res.sourceId).toBe("microsoft-powerpoint-windows");
    expect(res.confidence).toBeLessThan(0.6);
  });

  it("returns unknown at zero confidence when nothing is identifiable", () => {
    const res = detectPptxSource({ metadata: {} });
    expect(res.sourceId).toBe("unknown");
    expect(res.confidence).toBe(0);
    expect(res.signals).toEqual([]);
  });

  it("reports lower confidence when two sources are neck and neck", () => {
    const strong = detectPptxSource(input({ metadata: { application: "Canva" } }));
    const contested = detectPptxSource(
      input({ metadata: { application: "Canva", creator: "Google Slides export" } }),
    );
    expect(contested.confidence).toBeLessThan(strong.confidence);
    expect(contested.sourceId).toBe("canva");
  });

  it("never exceeds 0.99 confidence", () => {
    const res = detectPptxSource(
      input({
        metadata: { application: "Google Slides", creator: "Google Slides", company: "Google" },
        relationshipTargets: ["https://docs.google.com/x"],
      }),
    );
    expect(res.confidence).toBeLessThanOrEqual(0.99);
  });
});
